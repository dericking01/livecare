import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { healthAssessmentSchema } from "@/lib/validations";
import { triggerNotification } from "@/lib/notifications";
import type { ApiResponse, RiskLevel } from "@/types";

function calculateRisk(data: {
  age: number;
  smokes: boolean;
  drinksAlcohol: boolean;
  exercisesRegularly: boolean;
  hasDiabetes: boolean;
  hasHypertension: boolean;
  hasFamilyHistory: boolean;
  bmi?: number;
}): { riskLevel: RiskLevel; riskScore: number; recommendation: string } {
  let score = 0;

  if (data.age >= 45) score += 2;
  else if (data.age >= 35) score += 1;

  if (data.smokes) score += 3;
  if (data.drinksAlcohol) score += 2;
  if (!data.exercisesRegularly) score += 1;

  if (data.hasDiabetes) score += 3;
  if (data.hasHypertension) score += 3;
  if (data.hasFamilyHistory) score += 2;

  if (data.bmi !== undefined) {
    if (data.bmi >= 30) score += 3;
    else if (data.bmi >= 25) score += 1;
  }

  let riskLevel: RiskLevel;
  let recommendation: string;

  if (score <= 3) {
    riskLevel = "LOW";
    recommendation =
      "Your health indicators suggest a low risk profile. Maintain your healthy lifestyle with regular exercise and a balanced diet. Schedule a routine check-up with your doctor annually. Continue avoiding tobacco and limit alcohol intake.";
  } else if (score <= 7) {
    riskLevel = "MEDIUM";
    recommendation =
      "You have some modifiable risk factors for chronic disease. We recommend scheduling a consultation with a doctor to review your health. Focus on increasing physical activity to at least 150 minutes per week, eating a balanced diet, and reducing alcohol intake. If you smoke, consider cessation programs.";
  } else {
    riskLevel = "HIGH";
    recommendation =
      "Your assessment indicates a higher risk profile that warrants medical attention. We strongly recommend speaking with one of our doctors today. Key areas to address include managing existing conditions (diabetes/hypertension), quitting smoking if applicable, increasing physical activity, and adopting a heart-healthy diet. Regular monitoring and medication adherence are critical.";
  }

  return { riskLevel, riskScore: score, recommendation };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { visitorId, ...assessmentData } = body as { visitorId: string } & Record<string, unknown>;

    if (!visitorId) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Visitor ID is required" },
        { status: 400 }
      );
    }

    const parsed = healthAssessmentSchema.safeParse(assessmentData);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { riskLevel, riskScore, recommendation } = calculateRisk(parsed.data);

    const assessment = await prisma.healthAssessment.create({
      data: {
        visitorId,
        ...parsed.data,
        riskLevel,
        riskScore,
        recommendation,
      },
    });

    await prisma.activityLog.create({
      data: {
        visitorId,
        action: "ASSESSMENT_COMPLETED",
        entity: "health_assessment",
        entityId: assessment.id,
        metadata: { riskLevel, riskScore },
      },
    });

    if (riskLevel === "HIGH") {
      const visitor = await prisma.visitor.findUnique({
        where: { id: visitorId },
        select: { fullName: true, phone: true },
      });
      if (visitor) {
        triggerNotification("HIGH_RISK_ASSESSMENT", {
          patientName:  visitor.fullName,
          patientPhone: visitor.phone,
          riskScore,
          riskLevel,
        }).catch((err) => console.error("[notifications] HIGH_RISK_ASSESSMENT:", err));
      }
    }

    return NextResponse.json<ApiResponse<typeof assessment>>(
      { success: true, data: assessment },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/assessment]", error);
    return NextResponse.json<ApiResponse<never>>(
      { success: false, error: "Failed to save assessment" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "ID is required" },
        { status: 400 }
      );
    }

    const assessment = await prisma.healthAssessment.findUnique({
      where: { id, deletedAt: null },
    });

    if (!assessment) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Not found" },
        { status: 404 }
      );
    }

    return NextResponse.json<ApiResponse<typeof assessment>>({ success: true, data: assessment });
  } catch (error) {
    console.error("[GET /api/assessment]", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch assessment" },
      { status: 500 }
    );
  }
}
