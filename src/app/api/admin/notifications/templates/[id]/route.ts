import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json() as {
      name?: string;
      description?: string;
      messageTemplate?: string;
      isEnabled?: boolean;
    };

    const template = await prisma.notificationTemplate.update({
      where: { id },
      data: {
        ...(body.name            !== undefined && { name:            body.name }),
        ...(body.description     !== undefined && { description:     body.description }),
        ...(body.messageTemplate !== undefined && { messageTemplate: body.messageTemplate }),
        ...(body.isEnabled       !== undefined && { isEnabled:       body.isEnabled }),
      },
    });

    return NextResponse.json<ApiResponse<typeof template>>({ success: true, data: template });
  } catch (error) {
    console.error("[PATCH /api/admin/notifications/templates/[id]]", error);
    return NextResponse.json({ success: false, error: "Failed to update template" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Nullify foreign keys in logs before deleting template
    await prisma.notificationLog.updateMany({
      where: { templateId: id },
      data: { templateId: null },
    });

    await prisma.notificationTemplate.delete({ where: { id } });

    return NextResponse.json<ApiResponse<never>>({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/notifications/templates/[id]]", error);
    return NextResponse.json({ success: false, error: "Failed to delete template" }, { status: 500 });
  }
}
