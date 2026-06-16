import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { startOfDay } from "date-fns";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const todayStart = startOfDay(new Date());

    const [waiting, active, completedToday, visitorsToday] = await Promise.all([
      prisma.queueEntry.count({
        where: { status: "WAITING", deletedAt: null },
      }),
      prisma.consultation.count({
        where: { status: "IN_PROGRESS", deletedAt: null },
      }),
      prisma.consultation.count({
        where: { status: "COMPLETED", startedAt: { gte: todayStart }, deletedAt: null },
      }),
      prisma.visitor.count({
        where: { createdAt: { gte: todayStart }, deletedAt: null },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: { waiting, active, completedToday, visitorsToday },
    });
  } catch (error) {
    console.error("[GET /api/stats]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch stats" },
      { status: 500 }
    );
  }
}
