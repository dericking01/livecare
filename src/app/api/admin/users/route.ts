import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createDoctorSchema } from "@/lib/validations";
import { triggerNotification } from "@/lib/notifications";
import bcrypt from "bcryptjs";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        isOnline: true,
        lastLoginAt: true,
        createdAt: true,
        _count: { select: { consultations: true } },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json<ApiResponse<typeof users>>({ success: true, data: users });
  } catch (error) {
    console.error("[GET /api/admin/users]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await req.json();
    const parsed = createDoctorSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (existing) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "A user with this email already exists" },
        { status: 409 }
      );
    }

    const hashedPassword = await bcrypt.hash(parsed.data.password, 12);

    const { phone, ...userDataWithoutPhone } = parsed.data;
    const user = await prisma.user.create({
      data: {
        ...userDataWithoutPhone,
        ...(phone ? { phone } : {}),
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });

    prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "USER_CREATED",
        entity: "user",
        entityId: user.id,
        metadata: { role: user.role },
      },
    }).catch((e) => console.error("Activity log failed:", e));

    const roleLabel: Record<string, string> = {
      DOCTOR: "Doctor", BOOTH_ATTENDANT: "Booth Attendant", ADMIN: "Administrator",
    };
    triggerNotification("NEW_STAFF_ACCOUNT", {
      staffName:     user.name,
      staffRole:     roleLabel[user.role] ?? user.role,
      recipientName: user.name,
      recipientPhone: user.phone ?? undefined,
    }).catch((e) => console.error("[notifications] NEW_STAFF_ACCOUNT:", e));

    return NextResponse.json<ApiResponse<typeof user>>(
      { success: true, data: user },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/admin/users]", error);
    return NextResponse.json(
      { success: false, error: "Failed to create user" },
      { status: 500 }
    );
  }
}
