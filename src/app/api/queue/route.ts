import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getNextQueueNumber } from "@/lib/redis";
import { emitNewVisitorJoined, emitQueuePositionUpdate } from "@/lib/socket-server";
import { triggerNotification } from "@/lib/notifications";
import type { ApiResponse, QueueEntryWithVisitor } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitorId } = body as { visitorId: string };

    if (!visitorId) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Visitor ID is required" },
        { status: 400 }
      );
    }

    const visitor = await prisma.visitor.findUnique({
      where: { id: visitorId, deletedAt: null },
    });

    if (!visitor) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Visitor not found" },
        { status: 404 }
      );
    }

    // Check if visitor is already in active queue
    const existing = await prisma.queueEntry.findFirst({
      where: {
        visitorId,
        status: { in: ["WAITING", "ASSIGNED", "IN_PROGRESS"] },
        deletedAt: null,
      },
    });

    if (existing) {
      return NextResponse.json<ApiResponse<typeof existing>>(
        { success: true, data: existing, message: "Already in queue" },
        { status: 200 }
      );
    }

    const queueNumber = await getNextQueueNumber();

    const entry = await prisma.queueEntry.create({
      data: {
        visitorId,
        queueNumber,
        status: "WAITING",
      },
      include: { visitor: true, consultation: true },
    });

    await prisma.activityLog.create({
      data: {
        visitorId,
        action: "QUEUE_JOINED",
        entity: "queue_entry",
        entityId: entry.id,
      },
    });

    emitNewVisitorJoined();

    // Fire-and-forget: notify all doctors that a new patient is waiting
    triggerNotification("PATIENT_JOINED_QUEUE", {
      patientName:  entry.visitor.fullName,
      patientPhone: entry.visitor.phone,
      queueNumber:  entry.queueNumber,
      queueEntryId: entry.id,
    }).catch((err) => console.error("[notifications] PATIENT_JOINED_QUEUE:", err));

    // Notify visitor of their position
    const position = await prisma.queueEntry.count({
      where: {
        status: "WAITING",
        deletedAt: null,
        waitStartAt: { lte: entry.waitStartAt },
      },
    });

    emitQueuePositionUpdate(entry.id, position, position * 5);

    return NextResponse.json<ApiResponse<typeof entry>>(
      { success: true, data: entry },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/queue]", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Failed to join queue" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");

    const where = {
      deletedAt: null,
      ...(status ? { status: status as "WAITING" } : {}),
    };

    const entries = await prisma.queueEntry.findMany({
      where,
      orderBy: [{ priority: "desc" }, { waitStartAt: "asc" }],
      include: {
        visitor: true,
        consultation: {
          include: {
            room: true,
            doctor: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    // Fire-and-forget: alert staff for any entry waiting >15 minutes (rate-limited per entry/60 min)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60 * 1000);
    const longWaiters = (entries as QueueEntryWithVisitor[]).filter(
      (e) => e.status === "WAITING" && new Date(e.waitStartAt) <= fifteenMinsAgo
    );
    for (const e of longWaiters) {
      const waited = Math.floor((Date.now() - new Date(e.waitStartAt).getTime()) / 60_000);
      triggerNotification("LONG_WAIT_ALERT", {
        patientName:  e.visitor.fullName,
        patientPhone: e.visitor.phone,
        queueNumber:  e.queueNumber,
        queueEntryId: e.id,
        waitMinutes:  waited,
      }).catch((err) => console.error("[notifications] LONG_WAIT_ALERT:", err));
    }

    return NextResponse.json<ApiResponse<QueueEntryWithVisitor[]>>({
      success: true,
      data: entries as QueueEntryWithVisitor[],
    });
  } catch (error) {
    console.error("[GET /api/queue]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch queue" },
      { status: 500 }
    );
  }
}
