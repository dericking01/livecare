import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { adminUpdateUserSchema } from "@/lib/validations";
import { emitForceLogout } from "@/lib/socket-server";
import bcrypt from "bcryptjs";
import type { ApiResponse } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({
      where: { id, deletedAt: null },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, isActive: true, isOnline: true,
        lastLoginAt: true, createdAt: true,
        _count: { select: { consultations: true } },
      },
    });

    if (!user) return NextResponse.json<ApiResponse<never>>({ success: false, error: "User not found" }, { status: 404 });

    return NextResponse.json<ApiResponse<typeof user>>({ success: true, data: user });
  } catch (error) {
    console.error("[GET /api/admin/users/[id]]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch user" }, { status: 500 });
  }
}

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
    const body = await req.json();
    const parsed = adminUpdateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, role, isActive, newPassword } = parsed.data;

    // Admin cannot deactivate their own account
    if (id === session.user.id && isActive === false) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "You cannot deactivate your own account" },
        { status: 400 }
      );
    }

    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: id }, deletedAt: null },
      });
      if (existing) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: "This email is already in use" },
          { status: 409 }
        );
      }
    }

    let hashedPassword: string | undefined;
    if (newPassword && newPassword.trim()) {
      hashedPassword = await bcrypt.hash(newPassword, 12);
    }

    const updated = await prisma.user.update({
      where: { id },
      data: {
        ...(name                !== undefined ? { name }                     : {}),
        ...(email               !== undefined ? { email }                    : {}),
        ...(phone               !== undefined ? { phone: phone || null }     : {}),
        ...(role                !== undefined ? { role }                     : {}),
        ...(isActive            !== undefined ? { isActive }                 : {}),
        ...(hashedPassword                    ? { password: hashedPassword } : {}),
      },
      select: {
        id: true, name: true, email: true, phone: true,
        role: true, isActive: true, isOnline: true, createdAt: true,
        _count: { select: { consultations: true } },
      },
    });

    // Force-logout the user if their account was deactivated
    if (isActive === false) {
      emitForceLogout(id);
    }

    prisma.activityLog.create({
      data: {
        userId: session.user.id,
        action: "USER_UPDATED",
        entity: "user",
        entityId: id,
        metadata: { fields: Object.keys(body) },
      },
    }).catch(() => {});

    return NextResponse.json<ApiResponse<typeof updated>>({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/admin/users/[id]]", error);
    return NextResponse.json({ success: false, error: "Failed to update user" }, { status: 500 });
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
    if (id === session.user.id) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "You cannot delete your own account" },
        { status: 400 }
      );
    }

    await prisma.user.update({
      where: { id },
      data: { deletedAt: new Date(), isActive: false, isOnline: false },
    });

    emitForceLogout(id);

    return NextResponse.json<ApiResponse<never>>({ success: true });
  } catch (error) {
    console.error("[DELETE /api/admin/users/[id]]", error);
    return NextResponse.json({ success: false, error: "Failed to delete user" }, { status: 500 });
  }
}
