import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { healthAssessmentSchema, type HealthAssessmentInput } from "@/lib/validations";
import { triggerNotification } from "@/lib/notifications";
import type { ApiResponse, RiskLevel } from "@/types";

const AGE_GROUP_MIDPOINT: Record<string, number> = {
  UNDER_18:   15,
  AGE_18_24:  21,
  AGE_25_34:  29,
  AGE_35_44:  39,
  AGE_45_54:  49,
  AGE_55_64:  59,
  AGE_65_PLUS: 70,
};

function calculateRisk(
  data: HealthAssessmentInput,
  age: number,
  gender: string,
  ageGroup: string
): { riskLevel: RiskLevel; riskScore: number; recommendation: string } {
  let score = 0;

  // ── Age ──────────────────────────────────────────────────────────────────
  if (age >= 65) score += 3;
  else if (age >= 55) score += 2;
  else if (age >= 45) score += 2;
  else if (age >= 35) score += 1;

  // ── Core lifestyle ────────────────────────────────────────────────────────
  if (data.smokes) {
    score += 3;
    if (data.smokingYears === "6_10") score += 1;
    if (data.smokingYears === "OVER_10") score += 2;
  }
  if (data.drinksAlcohol)      score += 2;
  if (!data.exercisesRegularly) score += 1;

  // ── Diagnosed conditions ──────────────────────────────────────────────────
  if (data.hasDiabetes) {
    score += data.diabetesOnMedication === false ? 4 : 2;
  }
  if (data.hasHypertension) {
    score += data.hypertensionControlled === false ? 4 : 2;
  }
  if (data.hasFamilyHistory) score += 2;

  // ── Symptom-based ─────────────────────────────────────────────────────────
  if (data.hasChestPain)        score += 3;
  if (data.hasShortBreath)      score += 2;
  if (data.hasHighCholesterol)  score += 2;
  if (data.hasStressAnxiety)    score += 1;
  if (data.hasFatigueLowEnergy) score += 1;
  if (data.hasJointPain)        score += 1;
  if (data.hasDizziness)        score += 2;

  // ── Wellbeing ─────────────────────────────────────────────────────────────
  if (data.wellbeing === "POOR")  score += 2;
  if (data.wellbeing === "FAIR")  score += 1;

  // ── BMI ──────────────────────────────────────────────────────────────────
  if (data.bmi !== undefined) {
    if (data.bmi >= 35) score += 3;
    else if (data.bmi >= 30) score += 2;
    else if (data.bmi >= 25) score += 1;
  }

  // ── Risk level ────────────────────────────────────────────────────────────
  let riskLevel: RiskLevel;
  let recommendation: string;

  const isElderly  = age >= 55;
  const isMiddle   = age >= 35 && age < 55;
  const isFemale   = gender === "FEMALE";

  if (score <= 4) {
    riskLevel = "LOW";
    if (isElderly) {
      recommendation = "Your health profile looks encouraging for your age group. Continue staying active with gentle exercises like walking or swimming, eat a balanced diet rich in vegetables and whole grains, and schedule an annual check-up with your doctor. Keep monitoring your blood pressure and blood sugar regularly.";
    } else if (isFemale) {
      recommendation = "You have a healthy risk profile. Maintain your routine with regular physical activity, a balanced diet, and annual gynecological check-ups. Avoid tobacco and limit alcohol intake. Stay hydrated and prioritize quality sleep.";
    } else {
      recommendation = "Your health indicators suggest a low risk profile. Maintain your healthy lifestyle with regular exercise (at least 150 minutes/week), a balanced diet, and annual check-ups. Avoid tobacco and limit alcohol consumption.";
    }
  } else if (score <= 9) {
    riskLevel = "MEDIUM";
    const tips: string[] = [];
    if (data.smokes) tips.push("quitting tobacco (seek cessation support)");
    if (data.drinksAlcohol) tips.push("reducing alcohol to less than 3 days/week");
    if (!data.exercisesRegularly) tips.push("increasing physical activity to 150+ minutes/week");
    if (data.hasStressAnxiety) tips.push("stress management through mindfulness or counselling");
    if (data.hasFatigueLowEnergy) tips.push("improving sleep quality and reviewing diet for iron/vitamin deficiencies");
    const tipStr = tips.length > 0 ? ` Focus particularly on: ${tips.join(", ")}.` : "";
    recommendation = `You have some modifiable risk factors for chronic disease.${tipStr} We recommend scheduling a consultation with a doctor to review your health markers including blood pressure, blood sugar, and cholesterol levels. Adopt a heart-healthy diet low in salt and processed foods.`;
  } else {
    riskLevel = "HIGH";
    const urgent: string[] = [];
    if (data.hasChestPain) urgent.push("chest pain requires immediate evaluation");
    if (data.hasDizziness) urgent.push("dizziness can indicate cardiovascular or neurological concerns");
    if (data.hasDiabetes && data.diabetesOnMedication === false) urgent.push("unmanaged diabetes significantly increases organ damage risk");
    if (data.hasHypertension && data.hypertensionControlled === false) urgent.push("uncontrolled hypertension is a leading cause of stroke and heart attack");
    const urgentStr = urgent.length > 0 ? ` Urgently: ${urgent.join("; ")}.` : "";
    recommendation = `Your assessment indicates a high-risk profile that requires prompt medical attention.${urgentStr} Please speak with one of our doctors today. Key areas to address include managing existing conditions, adopting a heart-healthy lifestyle, and discussing medication options with your healthcare provider. Do not delay — early intervention significantly improves outcomes.`;
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

    // Fetch visitor to get gender and ageGroup (avoid re-collecting on assessment form)
    const visitor = await prisma.visitor.findUnique({
      where: { id: visitorId, deletedAt: null },
      select: { fullName: true, phone: true, gender: true, ageGroup: true },
    });
    if (!visitor) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: "Visitor not found" },
        { status: 404 }
      );
    }

    const parsed = healthAssessmentSchema.safeParse(assessmentData);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        { success: false, error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const age    = AGE_GROUP_MIDPOINT[visitor.ageGroup] ?? 30;
    const gender = visitor.gender;
    const { riskLevel, riskScore, recommendation } = calculateRisk(parsed.data, age, gender, visitor.ageGroup);

    // Store core boolean fields; extra branching answers are factored into score only
    const assessment = await prisma.healthAssessment.create({
      data: {
        visitorId,
        age,
        gender,
        smokes:              parsed.data.smokes,
        drinksAlcohol:       parsed.data.drinksAlcohol,
        exercisesRegularly:  parsed.data.exercisesRegularly,
        hasDiabetes:         parsed.data.hasDiabetes,
        hasHypertension:     parsed.data.hasHypertension,
        hasFamilyHistory:    parsed.data.hasFamilyHistory,
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
      triggerNotification("HIGH_RISK_ASSESSMENT", {
        patientName:  visitor.fullName,
        patientPhone: visitor.phone,
        riskScore,
        riskLevel,
      }).catch((err) => console.error("[notifications] HIGH_RISK_ASSESSMENT:", err));
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
