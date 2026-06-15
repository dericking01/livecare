import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { visitorRegistrationSchema } from "@/lib/validations";
import { checkRateLimit } from "@/lib/redis";
import { emitNewVisitorJoined } from "@/lib/socket-server";
import type { ApiResponse } from "@/types";

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";
    const rateLimit = await checkRateLimit(`visitor:register:${ip}`, 20, 60_000);
    if (!rateLimit.allowed) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Too many registrations. Please wait a moment." },
        { status: 429 }
      );
    }

    const body = await req.json();
    const parsed = visitorRegistrationSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const visitor = await prisma.visitor.create({
      data: parsed.data,
    });

    await prisma.activityLog.create({
      data: {
        visitorId: visitor.id,
        action: "VISITOR_REGISTERED",
        entity: "visitor",
        entityId: visitor.id,
        ipAddress: ip,
        userAgent: req.headers.get("user-agent") ?? undefined,
      },
    });

    emitNewVisitorJoined();

    return NextResponse.json<ApiResponse<typeof visitor>>(
      { success: true, data: visitor },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/visitors]", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Registration failed. Please try again." },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const pageSize = Math.min(100, parseInt(searchParams.get("pageSize") ?? "20", 10));
    const search = searchParams.get("search") ?? "";

    const where = search
      ? {
          deletedAt: null,
          OR: [
            { fullName: { contains: search, mode: "insensitive" as const } },
            { phone: { contains: search } },
          ],
        }
      : { deletedAt: null };

    const [total, items] = await Promise.all([
      prisma.visitor.count({ where }),
      prisma.visitor.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          queueEntries: { orderBy: { createdAt: "desc" }, take: 1 },
          healthAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (error) {
    console.error("[GET /api/visitors]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch visitors" },
      { status: 500 }
    );
  }
}
