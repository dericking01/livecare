import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { consultationNoteSchema } from "@/lib/validations";
import { emitConsultationEnded } from "@/lib/socket-server";
import { triggerNotification } from "@/lib/notifications";
import type { ApiResponse } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const consultation = await prisma.consultation.findUnique({
      where: { id, deletedAt: null },
      include: {
        queueEntry: { include: { visitor: true } },
        doctor: { select: { id: true, name: true, email: true } },
        room: true,
        notes: true,
      },
    });

    if (!consultation) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Consultation not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<typeof consultation>>({
      success: true,
      data: consultation,
    });
  } catch (error) {
    console.error("[GET /api/consultations/[id]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch consultation" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || !["DOCTOR", "ADMIN"].includes(session.user.role)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id } = await params;
    const body = await req.json();
    const { action, noteData } = body as {
      action: "end" | "add-note";
      noteData?: unknown;
    };

    const consultation = await prisma.consultation.findUnique({
      where: { id, deletedAt: null },
      include: { queueEntry: true },
    });

    if (!consultation) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Consultation not found" },
        { status: 404 }
      );
    }

    if (action === "end") {
      const endedAt = new Date();
      const durationSecs = consultation.startedAt
        ? Math.floor((endedAt.getTime() - consultation.startedAt.getTime()) / 1000)
        : 0;
      const durationMins = Math.round(durationSecs / 60);

      // Fetch patient details for notifications
      const fullConsultation = await prisma.consultation.findUnique({
        where: { id },
        include: { queueEntry: { include: { visitor: true } } },
      });

      const [updated] = await prisma.$transaction([
        prisma.consultation.update({
          where: { id },
          data: { status: "COMPLETED", endedAt, durationSecs },
        }),
        prisma.queueEntry.update({
          where: { id: consultation.queueEntryId },
          data: { status: "COMPLETED", completedAt: endedAt },
        }),
      ]);

      await prisma.activityLog.create({
        data: {
          userId: session.user.id,
          action: "CONSULTATION_ENDED",
          entity: "consultation",
          entityId: id,
          metadata: { durationSecs },
        },
      });

      emitConsultationEnded(consultation.queueEntryId, id);

      if (fullConsultation) {
        const visitor = fullConsultation.queueEntry.visitor;
        const sharedCtx = {
          patientName:    visitor.fullName,
          patientPhone:   visitor.phone,
          doctorName:     session.user.name,
          doctorId:       session.user.id,
          consultationId: id,
          queueEntryId:   consultation.queueEntryId,
          duration:       durationMins,
        };
        // Thank-you SMS to patient
        triggerNotification("CONSULTATION_ENDED_PATIENT", sharedCtx)
          .catch((err) => console.error("[notifications] CONSULTATION_ENDED_PATIENT:", err));
        // Summary SMS to doctor
        triggerNotification("CONSULTATION_ENDED_DOCTOR", sharedCtx)
          .catch((err) => console.error("[notifications] CONSULTATION_ENDED_DOCTOR:", err));
      }

      return NextResponse.json<ApiResponse<typeof updated>>({ success: true, data: updated });
    }

    if (action === "add-note") {
      const parsed = consultationNoteSchema.safeParse(noteData);
      if (!parsed.success) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: parsed.error.errors[0].message },
          { status: 400 }
        );
      }

      const note = await prisma.consultationNote.create({
        data: { consultationId: id, ...parsed.data },
      });

      return NextResponse.json<ApiResponse<typeof note>>({ success: true, data: note });
    }

    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Invalid action" },
      { status: 400 }
    );
  } catch (error) {
    console.error("[PATCH /api/consultations/[id]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update consultation" },
      { status: 500 }
    );
  }
}
