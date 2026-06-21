import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateProfileSchema } from "@/lib/validations";
import bcrypt from "bcryptjs";
import type { ApiResponse } from "@/types";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id, deletedAt: null },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, isOnline: true, lastLoginAt: true, createdAt: true },
    });

    if (!user) return NextResponse.json<ApiResponse<never>>({ success: false, error: "Not found" }, { status: 404 });

    return NextResponse.json<ApiResponse<typeof user>>({ success: true, data: user });
  } catch (error) {
    console.error("[GET /api/profile]", error);
    return NextResponse.json({ success: false, error: "Failed to fetch profile" }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json<ApiResponse<never>>({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const parsed = updateProfileSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { name, email, phone, currentPassword, newPassword } = parsed.data;

    // If changing password, require current password verification
    let hashedPassword: string | undefined;
    if (newPassword && newPassword.trim()) {
      if (!currentPassword) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: "Current password is required to set a new password" },
          { status: 400 }
        );
      }
      const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { password: true } });
      const valid = user && await bcrypt.compare(currentPassword, user.password);
      if (!valid) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: "Current password is incorrect" },
          { status: 400 }
        );
      }
      hashedPassword = await bcrypt.hash(newPassword, 12);
    }

    // If changing email, ensure it's unique
    if (email) {
      const existing = await prisma.user.findFirst({
        where: { email, id: { not: session.user.id }, deletedAt: null },
      });
      if (existing) {
        return NextResponse.json<ApiResponse<never>>(
          { success: false, error: "This email is already in use" },
          { status: 409 }
        );
      }
    }

    const updated = await prisma.user.update({
      where: { id: session.user.id },
      data: {
        ...(name                     ? { name }                          : {}),
        ...(email                    ? { email }                         : {}),
        ...(phone !== undefined      ? { phone: phone || null }          : {}),
        ...(hashedPassword           ? { password: hashedPassword }      : {}),
      },
      select: { id: true, name: true, email: true, phone: true, role: true, isActive: true, isOnline: true },
    });

    return NextResponse.json<ApiResponse<typeof updated>>({ success: true, data: updated });
  } catch (error) {
    console.error("[PATCH /api/profile]", error);
    return NextResponse.json({ success: false, error: "Failed to update profile" }, { status: 500 });
  }
}
