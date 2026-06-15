import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { estimateWaitTime, waitMinutes } from "@/lib/utils";
import type { ApiResponse, QueueEntryWithVisitor } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const entry = await prisma.queueEntry.findUnique({
      where: { id, deletedAt: null },
      include: {
        visitor: true,
        consultation: {
          include: {
            room: true,
            doctor: { select: { id: true, name: true } },
          },
        },
      },
    });

    if (!entry) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Queue entry not found" },
        { status: 404 }
      );
    }

    // Calculate position if still waiting
    let position = 0;
    let estimatedWaitMins = 0;

    if (entry.status === "WAITING") {
      position = await prisma.queueEntry.count({
        where: {
          status: "WAITING",
          deletedAt: null,
          waitStartAt: { lte: entry.waitStartAt },
        },
      });
      estimatedWaitMins = estimateWaitTime(position);
    }

    return NextResponse.json<ApiResponse<{
      entry: QueueEntryWithVisitor;
      position: number;
      estimatedWaitMins: number;
      waitedMins: number;
    }>>({
      success: true,
      data: {
        entry: entry as QueueEntryWithVisitor,
        position,
        estimatedWaitMins,
        waitedMins: waitMinutes(entry.waitStartAt),
      },
    });
  } catch (error) {
    console.error("[GET /api/queue/[id]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch queue entry" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status } = body as { status: "CANCELLED" };

    if (status !== "CANCELLED") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Invalid status transition" },
        { status: 400 }
      );
    }

    const entry = await prisma.queueEntry.update({
      where: { id, deletedAt: null },
      data: { status, cancelledAt: new Date() },
    });

    return NextResponse.json<ApiResponse<typeof entry>>({ success: true, data: entry });
  } catch (error) {
    console.error("[PATCH /api/queue/[id]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to update queue entry" },
      { status: 500 }
    );
  }
}
