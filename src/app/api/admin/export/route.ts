import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const XLSXStyle = require("xlsx-js-style");
import { format, parseISO, startOfDay, endOfDay } from "date-fns";
import { getAgeGroupLabel, getGenderLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

const HEADER_STYLE = {
  font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Calibri" },
  fill: { fgColor: { rgb: "1E6B4A" } },
  alignment: { horizontal: "center", vertical: "center", wrapText: true },
  border: {
    top:    { style: "thin", color: { rgb: "155236" } },
    bottom: { style: "thin", color: { rgb: "155236" } },
    left:   { style: "thin", color: { rgb: "155236" } },
    right:  { style: "thin", color: { rgb: "155236" } },
  },
};

const ALT_ROW_STYLE = {
  fill: { fgColor: { rgb: "F0FAF5" } },
};

function applyStyles(ws: Record<string, unknown>, rows: Record<string, unknown>[]) {
  const range = XLSXStyle.utils.decode_range((ws["!ref"] as string) ?? "A1");

  // Style header row (row 0)
  for (let col = range.s.c; col <= range.e.c; col++) {
    const cellRef = XLSXStyle.utils.encode_cell({ r: 0, c: col });
    if (ws[cellRef]) {
      (ws[cellRef] as Record<string, unknown>).s = HEADER_STYLE;
    }
  }

  // Alternate row shading for data rows
  for (let row = 1; row <= rows.length; row++) {
    if (row % 2 === 0) continue;
    for (let col = range.s.c; col <= range.e.c; col++) {
      const cellRef = XLSXStyle.utils.encode_cell({ r: row, c: col });
      if (ws[cellRef]) {
        (ws[cellRef] as Record<string, unknown>).s = ALT_ROW_STYLE;
      }
    }
  }

  // Freeze header row
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };
}

function buildDateFilter(from: string | null, to: string | null, date: string | null) {
  if (from && to) {
    return {
      gte: startOfDay(parseISO(from)),
      lte: endOfDay(parseISO(to)),
    };
  }
  if (date) {
    return {
      gte: new Date(`${date}T00:00:00`),
      lte: new Date(`${date}T23:59:59`),
    };
  }
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get("type") ?? "visitors";
    const fileFormat = searchParams.get("format") ?? "xlsx";
    const date       = searchParams.get("date");
    const from       = searchParams.get("from");
    const to         = searchParams.get("to");

    const createdAtFilter = buildDateFilter(from, to, date);
    const dateFilter = createdAtFilter ? { createdAt: createdAtFilter } : {};

    const rangeLabel = from && to
      ? `${from}_to_${to}`
      : date ?? format(new Date(), "yyyy-MM-dd");

    let rows: Record<string, unknown>[] = [];
    let sheetName = "Report";
    const filename = `afyacall-${exportType}-${rangeLabel}`;

    if (exportType === "visitors") {
      const visitors = await prisma.visitor.findMany({
        where: { deletedAt: null, ...dateFilter },
        include: {
          queueEntries:      { orderBy: { createdAt: "desc" }, take: 1 },
          healthAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });

      rows = visitors.map((v) => ({
        "Visitor ID":    v.id,
        "Full Name":     v.fullName,
        "Phone":         v.phone,
        "Gender":        getGenderLabel(v.gender),
        "Age Group":     getAgeGroupLabel(v.ageGroup),
        "Registered At": format(v.createdAt, "dd/MM/yyyy HH:mm"),
        "Queue Status":  v.queueEntries[0]?.status ?? "N/A",
        "Risk Level":    v.healthAssessments[0]?.riskLevel ?? "N/A",
        "Risk Score":    v.healthAssessments[0]?.riskScore ?? "N/A",
      }));
      sheetName = "Visitors";

    } else if (exportType === "consultations") {
      const filter = createdAtFilter
        ? { startedAt: createdAtFilter }
        : {};

      const consultations = await prisma.consultation.findMany({
        where: { deletedAt: null, ...filter },
        include: {
          queueEntry: { include: { visitor: true } },
          doctor: { select: { name: true } },
          notes: true,
        },
        orderBy: { createdAt: "desc" },
      });

      rows = consultations.map((c) => ({
        "Consultation ID":  c.id,
        "Visitor Name":     c.queueEntry.visitor.fullName,
        "Visitor Phone":    c.queueEntry.visitor.phone,
        "Doctor":           c.doctor.name,
        "Status":           c.status,
        "Started At":       c.startedAt ? format(c.startedAt, "dd/MM/yyyy HH:mm") : "N/A",
        "Ended At":         c.endedAt   ? format(c.endedAt,   "dd/MM/yyyy HH:mm") : "N/A",
        "Duration (mins)":  c.durationSecs ? Math.round(c.durationSecs / 60) : "N/A",
        "Summary":          c.notes[0]?.summary ?? "N/A",
        "Recommendation":   c.notes[0]?.recommendation ?? "N/A",
        "Follow-up (days)": c.notes[0]?.followUpDays ?? "N/A",
      }));
      sheetName = "Consultations";

    } else if (exportType === "assessments") {
      const assessments = await prisma.healthAssessment.findMany({
        where: { deletedAt: null, ...dateFilter },
        include: { visitor: true },
        orderBy: { createdAt: "desc" },
      });

      rows = assessments.map((a) => ({
        "Assessment ID":  a.id,
        "Visitor Name":   a.visitor.fullName,
        "Visitor Phone":  a.visitor.phone,
        "Age":            a.age,
        "Gender":         getGenderLabel(a.gender),
        "Smokes":         a.smokes ? "Yes" : "No",
        "Drinks Alcohol": a.drinksAlcohol ? "Yes" : "No",
        "Exercises":      a.exercisesRegularly ? "Yes" : "No",
        "Diabetes":       a.hasDiabetes ? "Yes" : "No",
        "Hypertension":   a.hasHypertension ? "Yes" : "No",
        "Family History": a.hasFamilyHistory ? "Yes" : "No",
        "BMI":            a.bmi ?? "N/A",
        "Risk Score":     a.riskScore,
        "Risk Level":     a.riskLevel,
        "Recommendation": a.recommendation,
        "Assessed At":    format(a.createdAt, "dd/MM/yyyy HH:mm"),
      }));
      sheetName = "Health Assessments";
    }

    if (fileFormat === "csv") {
      const ws  = XLSXStyle.utils.json_to_sheet(rows);
      const csv = XLSXStyle.utils.sheet_to_csv(ws);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    const wb = XLSXStyle.utils.book_new();
    const ws = XLSXStyle.utils.json_to_sheet(rows);

    // Auto-width columns
    const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
      wch: Math.max(key.length, 14),
    }));
    ws["!cols"] = colWidths;

    // Row height for header
    ws["!rows"] = [{ hpt: 24 }];

    applyStyles(ws, rows);

    XLSXStyle.utils.book_append_sheet(wb, ws, sheetName);
    const buffer = XLSXStyle.write(wb, { type: "buffer", bookType: "xlsx" });

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}.xlsx"`,
      },
    });
  } catch (error) {
    console.error("[GET /api/admin/export]", error);
    return NextResponse.json({ success: false, error: "Export failed" }, { status: 500 });
  }
}
