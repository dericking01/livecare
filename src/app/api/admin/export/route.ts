import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";
import { format } from "date-fns";
import { getAgeGroupLabel, getGenderLabel, waitMinutes } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user || session.user.role !== "ADMIN") {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const exportType = searchParams.get("type") ?? "visitors";
    const fileFormat = searchParams.get("format") ?? "xlsx";
    const date = searchParams.get("date");

    const dateFilter = date
      ? {
          createdAt: {
            gte: new Date(`${date}T00:00:00`),
            lte: new Date(`${date}T23:59:59`),
          },
        }
      : {};

    let rows: Record<string, unknown>[] = [];
    let sheetName = "Report";
    let filename = `afyacall-${exportType}-${format(new Date(), "yyyy-MM-dd")}`;

    if (exportType === "visitors") {
      const visitors = await prisma.visitor.findMany({
        where: { deletedAt: null, ...dateFilter },
        include: {
          queueEntries: { orderBy: { createdAt: "desc" }, take: 1 },
          healthAssessments: { orderBy: { createdAt: "desc" }, take: 1 },
        },
        orderBy: { createdAt: "desc" },
      });

      rows = visitors.map((v) => ({
        "Visitor ID": v.id,
        "Full Name": v.fullName,
        "Phone": v.phone,
        "Gender": getGenderLabel(v.gender),
        "Age Group": getAgeGroupLabel(v.ageGroup),
        "Registered At": format(v.createdAt, "dd/MM/yyyy HH:mm"),
        "Queue Status": v.queueEntries[0]?.status ?? "N/A",
        "Risk Level": v.healthAssessments[0]?.riskLevel ?? "N/A",
      }));
      sheetName = "Visitors";
    } else if (exportType === "consultations") {
      const consultations = await prisma.consultation.findMany({
        where: {
          deletedAt: null,
          ...(date ? { startedAt: { gte: new Date(`${date}T00:00:00`), lte: new Date(`${date}T23:59:59`) } } : {}),
        },
        include: {
          queueEntry: { include: { visitor: true } },
          doctor: { select: { name: true } },
          notes: true,
        },
        orderBy: { createdAt: "desc" },
      });

      rows = consultations.map((c) => ({
        "Consultation ID": c.id,
        "Visitor Name": c.queueEntry.visitor.fullName,
        "Visitor Phone": c.queueEntry.visitor.phone,
        "Doctor": c.doctor.name,
        "Status": c.status,
        "Started At": c.startedAt ? format(c.startedAt, "dd/MM/yyyy HH:mm") : "N/A",
        "Ended At": c.endedAt ? format(c.endedAt, "dd/MM/yyyy HH:mm") : "N/A",
        "Duration (mins)": c.durationSecs ? Math.round(c.durationSecs / 60) : "N/A",
        "Notes": c.notes[0]?.summary ?? "N/A",
        "Recommendation": c.notes[0]?.recommendation ?? "N/A",
      }));
      sheetName = "Consultations";
    } else if (exportType === "assessments") {
      const assessments = await prisma.healthAssessment.findMany({
        where: { deletedAt: null, ...dateFilter },
        include: { visitor: true },
        orderBy: { createdAt: "desc" },
      });

      rows = assessments.map((a) => ({
        "Assessment ID": a.id,
        "Visitor Name": a.visitor.fullName,
        "Age": a.age,
        "Gender": getGenderLabel(a.gender),
        "Smokes": a.smokes ? "Yes" : "No",
        "Drinks Alcohol": a.drinksAlcohol ? "Yes" : "No",
        "Exercises": a.exercisesRegularly ? "Yes" : "No",
        "Diabetes": a.hasDiabetes ? "Yes" : "No",
        "Hypertension": a.hasHypertension ? "Yes" : "No",
        "Family History": a.hasFamilyHistory ? "Yes" : "No",
        "BMI": a.bmi ?? "N/A",
        "Risk Score": a.riskScore,
        "Risk Level": a.riskLevel,
        "Assessed At": format(a.createdAt, "dd/MM/yyyy HH:mm"),
      }));
      sheetName = "Health Assessments";
    }

    if (fileFormat === "csv") {
      const ws = XLSX.utils.json_to_sheet(rows);
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${filename}.csv"`,
        },
      });
    }

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

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
