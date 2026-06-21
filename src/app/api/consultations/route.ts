import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createConsultationRoom } from "@/lib/daily";
import { emitDoctorReady } from "@/lib/socket-server";
import { triggerNotification } from "@/lib/notifications";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["DOCTOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const consultation = await prisma.consultation.findFirst({
      where: { doctorId: session.user.id, status: "IN_PROGRESS", deletedAt: null },
      include: {
        room: true,
        queueEntry: { include: { visitor: true } },
      },
      orderBy: { startedAt: "desc" },
    });

    return NextResponse.json<ApiResponse<typeof consultation>>({
      success: true,
      data: consultation,
    });
  } catch (error) {
    console.error("[GET /api/consultations]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch active consultation" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["DOCTOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { queueEntryId } = body as { queueEntryId: string };

    if (!queueEntryId) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Queue entry ID is required" },
        { status: 400 }
      );
    }

    const queueEntry = await prisma.queueEntry.findUnique({
      where: { id: queueEntryId, deletedAt: null },
      include: { visitor: true },
    });

    if (!queueEntry || queueEntry.status !== "WAITING") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Queue entry not available" },
        { status: 400 }
      );
    }

    // Create Daily.co room
    const roomData = await createConsultationRoom(
      queueEntryId,
      session.user.name,
      queueEntry.visitor.fullName
    );

    // Create consultation and update queue entry in a transaction
    const [consultation] = await prisma.$transaction([
      prisma.consultation.create({
        data: {
          queueEntryId,
          doctorId: session.user.id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
          room: {
            create: {
              roomName: roomData.roomName,
              roomUrl: roomData.roomUrl,
              doctorToken: roomData.doctorToken,
              visitorToken: roomData.visitorToken,
              expiresAt: roomData.expiresAt,
            },
          },
        },
        include: { room: true, queueEntry: { include: { visitor: true } } },
      }),
      prisma.queueEntry.update({
        where: { id: queueEntryId },
        data: { status: "IN_PROGRESS", assignedAt: new Date() },
      }),
    ]);

    await prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "CONSULTATION_STARTED",
        entity: "consultation",
        entityId: consultation.id,
      },
    });

    // Fire-and-forget: notify patient that doctor is ready via SMS
    triggerNotification("CONSULTATION_STARTED", {
      patientName:    queueEntry.visitor.fullName,
      patientPhone:   queueEntry.visitor.phone,
      doctorName:     session.user.name,
      doctorId:       session.user.id,
      queueEntryId:   queueEntryId,
      consultationId: consultation.id,
    }).catch((err) => console.error("[notifications] CONSULTATION_STARTED:", err));

    // Notify visitor that doctor is ready
    emitDoctorReady(
      queueEntryId,
      consultation.id,
      roomData.roomUrl,
      roomData.visitorToken
    );

    return NextResponse.json<ApiResponse<typeof consultation>>(
      { success: true, data: consultation },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/consultations]", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Failed to start consultation" },
      { status: 500 }
    );
  }
}
