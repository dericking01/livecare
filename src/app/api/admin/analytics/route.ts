import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subHours, format } from "date-fns";
import type { ApiResponse, AnalyticsData } from "@/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "DOCTOR"].includes(session.user.role)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const todayStart = startOfDay(new Date());
    const todayEnd = endOfDay(new Date());

    const [
      visitorsToday,
      visitorsWaiting,
      activeConsultations,
      completedConsultations,
      avgWaitResult,
      avgDurationResult,
      riskDistribution,
      genderDistribution,
      ageDistribution,
    ] = await Promise.all([
      prisma.visitor.count({
        where: { createdAt: { gte: todayStart, lte: todayEnd }, deletedAt: null },
      }),
      prisma.queueEntry.count({
        where: { status: "WAITING", deletedAt: null },
      }),
      prisma.consultation.count({
        where: { status: "IN_PROGRESS", deletedAt: null },
      }),
      prisma.consultation.count({
        where: {
          status: "COMPLETED",
          startedAt: { gte: todayStart },
          deletedAt: null,
        },
      }),
      prisma.queueEntry.aggregate({
        where: {
          status: "COMPLETED",
          deletedAt: null,
          completedAt: { gte: todayStart },
          assignedAt: { not: null },
        },
        _avg: { id: false } as Record<string, boolean>,
      }),
      prisma.consultation.aggregate({
        where: {
          status: "COMPLETED",
          startedAt: { gte: todayStart },
          durationSecs: { not: null },
          deletedAt: null,
        },
        _avg: { durationSecs: true },
      }),
      prisma.healthAssessment.groupBy({
        by: ["riskLevel"],
        where: { deletedAt: null, createdAt: { gte: todayStart } },
        _count: { riskLevel: true },
      }),
      prisma.visitor.groupBy({
        by: ["gender"],
        where: { deletedAt: null, createdAt: { gte: todayStart } },
        _count: { gender: true },
      }),
      prisma.visitor.groupBy({
        by: ["ageGroup"],
        where: { deletedAt: null, createdAt: { gte: todayStart } },
        _count: { ageGroup: true },
      }),
    ]);

    // Hourly data for last 12 hours
    const hourlyData = await Promise.all(
      Array.from({ length: 12 }, (_, i) => {
        const hourStart = subHours(new Date(), 11 - i);
        hourStart.setMinutes(0, 0, 0);
        const hourEnd = new Date(hourStart);
        hourEnd.setMinutes(59, 59, 999);

        return Promise.all([
          prisma.visitor.count({
            where: { createdAt: { gte: hourStart, lte: hourEnd } },
          }),
          prisma.consultation.count({
            where: {
              startedAt: { gte: hourStart, lte: hourEnd },
              status: { in: ["IN_PROGRESS", "COMPLETED"] },
            },
          }),
        ]).then(([visitors, consultations]) => ({
          hour: format(hourStart, "HH:mm"),
          visitors,
          consultations,
        }));
      })
    );

    const totalRisk = riskDistribution.reduce((sum, r) => sum + r._count.riskLevel, 0);
    const totalGender = genderDistribution.reduce((sum, g) => sum + g._count.gender, 0);
    const totalAge = ageDistribution.reduce((sum, a) => sum + a._count.ageGroup, 0);

    const analytics: AnalyticsData = {
      stats: {
        visitorsToday,
        visitorsWaiting,
        activeConsultations,
        completedConsultations,
        avgWaitMinutes: 0,
        avgConsultationMinutes: avgDurationResult._avg.durationSecs
          ? Math.round(avgDurationResult._avg.durationSecs / 60)
          : 0,
      },
      hourlyData,
      riskDistribution: riskDistribution.map((r) => ({
        level: r.riskLevel,
        count: r._count.riskLevel,
        percentage: totalRisk ? Math.round((r._count.riskLevel / totalRisk) * 100) : 0,
      })),
      genderDistribution: genderDistribution.map((g) => ({
        gender: g.gender,
        count: g._count.gender,
        percentage: totalGender ? Math.round((g._count.gender / totalGender) * 100) : 0,
      })),
      ageDistribution: ageDistribution.map((a) => ({
        ageGroup: a.ageGroup,
        count: a._count.ageGroup,
        percentage: totalAge ? Math.round((a._count.ageGroup / totalAge) * 100) : 0,
      })),
    };

    return NextResponse.json<ApiResponse<AnalyticsData>>({
      success: true,
      data: analytics,
    });
  } catch (error) {
    console.error("[GET /api/admin/analytics]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
