import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { NotificationEventType, NotificationStatus } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const page      = Math.max(1, parseInt(searchParams.get("page")  ?? "1", 10));
    const pageSize  = Math.min(100, parseInt(searchParams.get("size") ?? "50", 10));
    const status    = searchParams.get("status")    as NotificationStatus | null;
    const eventType = searchParams.get("eventType") as NotificationEventType | null;
    const skip      = (page - 1) * pageSize;

    const where = {
      ...(status    ? { status }    : {}),
      ...(eventType ? { eventType } : {}),
    };

    const [logs, total] = await Promise.all([
      prisma.notificationLog.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id:               true,
          eventType:        true,
          recipientName:    true,
          recipientPhone:   true,
          recipientType:    true,
          renderedMessage:  true,
          status:           true,
          errorMessage:     true,
          gatewayRequestId: true,
          originatorConvId: true,
          createdAt:        true,
          template:         { select: { name: true } },
        },
      }),
      prisma.notificationLog.count({ where }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items: logs,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/notifications/logs]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch logs" }, { status: 500 });
  }
}
