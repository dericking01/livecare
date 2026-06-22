import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { emitForceLogout } from "@/lib/socket-server";
import type { ApiResponse } from "@/types";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { ids: string[]; isActive: boolean };
    const { ids, isActive } = body;

    if (!Array.isArray(ids) || ids.length === 0 || typeof isActive !== "boolean") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "ids (array) and isActive (boolean) are required" },
        { status: 400 }
      );
    }

    // Prevent admin from deactivating their own account via bulk
    const safeIds = ids.filter((id) => id !== session.user.id || isActive === true);

    await prisma.user.updateMany({
      where: { id: { in: safeIds }, deletedAt: null },
      data: {
        isActive,
        ...(isActive === false ? { isOnline: false } : {}),
      },
    });

    // Force-logout each deactivated user
    if (!isActive) {
      for (const id of safeIds) {
        emitForceLogout(id);
      }
    }

    prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "BULK_STATUS_UPDATE",
        entity: "user",
        entityId: "bulk",
        metadata: { ids: safeIds, isActive },
      },
    }).catch(() => {});

    return NextResponse.json<ApiResponse<{ updated: number }>>({
      success: true,
      data: { updated: safeIds.length },
    });
  } catch (error) {
    console.error("[PATCH /api/admin/users/bulk]", error);
    return NextResponse.json({ success: false, error: "Bulk update failed" }, { status: 500 });
  }
}
