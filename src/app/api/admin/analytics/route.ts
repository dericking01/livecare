import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, subHours, format, eachDayOfInterval, parseISO } from "date-fns";
import type { ApiResponse, AnalyticsData } from "@/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || !["ADMIN", "DOCTOR"].includes(session.user.role)) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get("from");
    const toParam = searchParams.get("to");

    const rangeFrom = fromParam ? startOfDay(parseISO(fromParam)) : startOfDay(new Date());
    const rangeTo   = toParam   ? endOfDay(parseISO(toParam))     : endOfDay(new Date());

    const todayStart = startOfDay(new Date());
    const todayEnd   = endOfDay(new Date());

    const [
      visitorsToday,
      visitorsWaiting,
      activeConsultations,
      completedConsultations,
      avgDurationResult,
      riskDistribution,
      genderDistribution,
      ageDistribution,
      totalAssessments,
    ] = await Promise.all([
      prisma.visitor.count({
        where: { createdAt: { gte: rangeFrom, lte: rangeTo }, deletedAt: null },
      }),
      prisma.queueEntry.count({
        where: { status: "WAITING", deletedAt: null },
      }),
      prisma.consultation.count({
        where: { status: "IN_PROGRESS", deletedAt: null },
      }),
      prisma.consultation.count({
        where: { status: "COMPLETED", startedAt: { gte: rangeFrom, lte: rangeTo }, deletedAt: null },
      }),
      prisma.consultation.aggregate({
        where: {
          status: "COMPLETED",
          startedAt: { gte: rangeFrom, lte: rangeTo },
          durationSecs: { not: null },
          deletedAt: null,
        },
        _avg: { durationSecs: true },
      }),
      prisma.healthAssessment.groupBy({
        by: ["riskLevel"],
        where: { deletedAt: null, createdAt: { gte: rangeFrom, lte: rangeTo } },
        _count: { riskLevel: true },
      }),
      prisma.visitor.groupBy({
        by: ["gender"],
        where: { deletedAt: null, createdAt: { gte: rangeFrom, lte: rangeTo } },
        _count: { gender: true },
      }),
      prisma.visitor.groupBy({
        by: ["ageGroup"],
        where: { deletedAt: null, createdAt: { gte: rangeFrom, lte: rangeTo } },
        _count: { ageGroup: true },
      }),
      prisma.healthAssessment.count({
        where: { deletedAt: null, createdAt: { gte: rangeFrom, lte: rangeTo } },
      }),
    ]);

    // Hourly data — last 12 hours (always live, not range-filtered)
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

    // Daily trend — each day in the selected range (max 90 days)
    const days = eachDayOfInterval({ start: rangeFrom, end: rangeTo }).slice(0, 90);
    const dailyTrend = await Promise.all(
      days.map(async (day) => {
        const dayStart = startOfDay(day);
        const dayEnd   = endOfDay(day);
        const [visitors, consultations, assessments] = await Promise.all([
          prisma.visitor.count({ where: { createdAt: { gte: dayStart, lte: dayEnd }, deletedAt: null } }),
          prisma.consultation.count({ where: { startedAt: { gte: dayStart, lte: dayEnd }, deletedAt: null } }),
          prisma.healthAssessment.count({ where: { createdAt: { gte: dayStart, lte: dayEnd }, deletedAt: null } }),
        ]);
        return { date: format(day, "MMM d"), visitors, consultations, assessments };
      })
    );

    // Doctor stats
    const consultationsByDoctor = await prisma.consultation.groupBy({
      by: ["doctorId"],
      where: { status: "COMPLETED", startedAt: { gte: rangeFrom, lte: rangeTo }, deletedAt: null },
      _count: { id: true },
      _avg: { durationSecs: true },
    });

    const doctorIds = consultationsByDoctor.map((d) => d.doctorId).filter(Boolean) as string[];
    const doctors = doctorIds.length
      ? await prisma.user.findMany({
          where: { id: { in: doctorIds } },
          select: { id: true, name: true },
        })
      : [];

    const doctorStats = consultationsByDoctor.map((d) => {
      const doc = doctors.find((u) => u.id === d.doctorId);
      return {
        doctorId: d.doctorId ?? "",
        doctorName: doc?.name ?? "Unknown",
        consultations: d._count.id,
        avgDurationMins: d._avg.durationSecs ? Math.round(d._avg.durationSecs / 60) : 0,
      };
    }).sort((a, b) => b.consultations - a.consultations);

    const totalRisk   = riskDistribution.reduce((s, r) => s + r._count.riskLevel, 0);
    const totalGender = genderDistribution.reduce((s, g) => s + g._count.gender, 0);
    const totalAge    = ageDistribution.reduce((s, a) => s + a._count.ageGroup, 0);

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
      dailyTrend,
      doctorStats,
      totalAssessments,
      dateRange: {
        from: format(rangeFrom, "yyyy-MM-dd"),
        to:   format(rangeTo,   "yyyy-MM-dd"),
      },
    };

    return NextResponse.json<ApiResponse<AnalyticsData>>({ success: true, data: analytics });
  } catch (error) {
    console.error("[GET /api/admin/analytics]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch analytics" },
      { status: 500 }
    );
  }
}
