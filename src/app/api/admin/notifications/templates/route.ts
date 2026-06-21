import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";
import type { NotificationEventType, NotificationRecipient } from "@prisma/client";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const templates = await prisma.notificationTemplate.findMany({
      orderBy: { eventType: "asc" },
      include: {
        _count: { select: { logs: true } },
        logs: {
          where: { status: "SENT" },
          orderBy: { createdAt: "desc" },
          take: 1,
          select: { createdAt: true },
        },
      },
    });

    return NextResponse.json<ApiResponse<typeof templates>>({ success: true, data: templates });
  } catch (error) {
    console.error("[GET /api/admin/notifications/templates]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch templates" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as {
      eventType: NotificationEventType;
      name: string;
      description: string;
      messageTemplate: string;
      recipientType: NotificationRecipient;
    };

    if (!body.eventType || !body.name || !body.messageTemplate || !body.recipientType) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "eventType, name, messageTemplate and recipientType are required" },
        { status: 400 }
      );
    }

    const template = await prisma.notificationTemplate.create({
      data: {
        eventType:       body.eventType,
        name:            body.name,
        description:     body.description ?? "",
        messageTemplate: body.messageTemplate,
        recipientType:   body.recipientType,
      },
    });

    return NextResponse.json<ApiResponse<typeof template>>({ success: true, data: template }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/admin/notifications/templates]", error);
    return NextResponse.json({ success: false, error: "Failed to create template" }, { status: 500 });
  }
}
