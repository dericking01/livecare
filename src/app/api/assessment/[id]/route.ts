import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { ApiResponse } from "@/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const assessment = await prisma.healthAssessment.findUnique({
      where: { id, deletedAt: null },
      include: { visitor: true },
    });

    if (!assessment) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Assessment not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<typeof assessment>>({
      success: true,
      data: assessment,
    });
  } catch (error) {
    console.error("[GET /api/assessment/[id]]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch assessment" },
      { status: 500 }
    );
  }
}
