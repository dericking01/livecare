import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { triggerNotification } from "@/lib/notifications";
import { emitDoctorStatusChanged } from "@/lib/socket-server";
import type { ApiResponse } from "@/types";

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "DOCTOR") {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json() as { isOnline: boolean };

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: { isOnline: body.isOnline },
      select: { id: true, name: true, isOnline: true },
    });

    // Real-time socket broadcast
    emitDoctorStatusChanged(updated.id, updated.isOnline, updated.name);

    // SMS notifications (fire-and-forget)
    const eventType = updated.isOnline ? "DOCTOR_WENT_ONLINE" : "DOCTOR_WENT_OFFLINE";
    triggerNotification(eventType, {
      doctorName: updated.name,
      doctorId:   updated.id,
    }).catch((err) => console.error(`[notifications] ${eventType}:`, err));

    return NextResponse.json<ApiResponse<typeof updated>>({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/doctor/status]", error);
    return NextResponse.json({ success: false, error: "Failed to update status" }, { status: 500 });
  }
}
