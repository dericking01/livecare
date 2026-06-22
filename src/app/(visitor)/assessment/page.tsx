"use client";

import { useState, useEffect, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight, Heart, Wind, Dumbbell, Droplets, Brain, Zap, Bone, Activity, Cigarette, Beer, AlertCircle, Smile } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { KioskLayout, KioskCard, AfyaLogo } from "@/components/shared/KioskLayout";
import { toast } from "@/components/ui/toaster";

// ── Types ─────────────────────────────────────────────────────────────────────

type AgeGroup = "UNDER_18" | "AGE_18_24" | "AGE_25_34" | "AGE_35_44" | "AGE_45_54" | "AGE_55_64" | "AGE_65_PLUS";
type Gender   = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

type VisitorProfile = {
  fullName: string;
  gender: Gender;
  ageGroup: AgeGroup;
};

type QuestionType = "boolean" | "choice";

type Question = {
  id: string;
  question: string;
  subtext?: string;
  context?: string;        // "Why we ask this"
  icon: React.ElementType;
  type: QuestionType;
  choices?: { value: string; label: string; emoji?: string }[];
  // If defined, this question only appears when the answer to `dependsOn` matches `dependsValue`
  dependsOn?: string;
  dependsValue?: string | boolean;
  // Which age groups see this question (undefined = all)
  forAgeGroups?: AgeGroup[];
  // Which genders see this question (undefined = all)
  forGenders?: Gender[];
};

// ── Question Bank ─────────────────────────────────────────────────────────────

const ALL_QUESTIONS: Question[] = [
  // ── Core: lifestyle ───────────────────────────────────────────────────────
  {
    id: "smokes",
    question: "Do you currently use tobacco products?",
    subtext: "Cigarettes, shisha, vaping, or any other form",
    context: "Tobacco is the leading preventable cause of heart disease and cancer",
    icon: Cigarette,
    type: "boolean",
  },
  {
    id: "smokingYears",
    question: "How long have you been smoking?",
    subtext: "Longer duration increases cumulative health risk",
    icon: Cigarette,
    type: "choice",
    choices: [
      { value: "LESS_1",  label: "Less than 1 year",  emoji: "🌱" },
      { value: "1_5",     label: "1 – 5 years",       emoji: "📅" },
      { value: "6_10",    label: "6 – 10 years",      emoji: "⚠️" },
      { value: "OVER_10", label: "More than 10 years", emoji: "🔴" },
    ],
    dependsOn: "smokes",
    dependsValue: true,
  },
  {
    id: "drinksAlcohol",
    question: "Do you drink alcohol regularly?",
    subtext: "3 or more times per week",
    context: "Regular alcohol use is linked to liver disease, high blood pressure, and certain cancers",
    icon: Beer,
    type: "boolean",
  },
  {
    id: "exercisesRegularly",
    question: "Do you get regular physical activity?",
    subtext: "At least 30 minutes of moderate exercise, 5 days a week",
    context: "Physical inactivity is one of the top risk factors for chronic disease",
    icon: Dumbbell,
    type: "boolean",
  },

  // ── Stress / mental health (for working-age groups) ───────────────────────
  {
    id: "hasStressAnxiety",
    question: "Do you often experience stress or anxiety that affects your daily life?",
    subtext: "Feeling overwhelmed, unable to switch off, or constantly worried",
    context: "Chronic stress raises cortisol and blood pressure, increasing cardiovascular risk",
    icon: Brain,
    type: "boolean",
    forAgeGroups: ["AGE_18_24", "AGE_25_34", "AGE_35_44", "AGE_45_54"],
  },
  {
    id: "hasFatigueLowEnergy",
    question: "Do you frequently feel tired or have low energy — even after rest?",
    subtext: "Persistent fatigue unrelated to activity level",
    context: "Unexplained fatigue can signal anaemia, thyroid conditions, diabetes, or heart issues",
    icon: Zap,
    type: "boolean",
    forAgeGroups: ["AGE_18_24", "AGE_25_34", "AGE_35_44", "AGE_45_54"],
  },

  // ── Cardiovascular symptoms (35+) ─────────────────────────────────────────
  {
    id: "hasChestPain",
    question: "Have you experienced chest pain, tightness, or pressure recently?",
    subtext: "Even mild or occasional discomfort in the chest, arm, or jaw",
    context: "Chest pain can be an early warning sign of heart disease and should be evaluated promptly",
    icon: Heart,
    type: "boolean",
    forAgeGroups: ["AGE_35_44", "AGE_45_54", "AGE_55_64", "AGE_65_PLUS"],
  },
  {
    id: "hasShortBreath",
    question: "Do you get shortness of breath with light physical activity?",
    subtext: "Walking short distances, climbing stairs, or light housework",
    context: "Breathlessness with minimal exertion can indicate heart or lung conditions",
    icon: Wind,
    type: "boolean",
    forAgeGroups: ["AGE_45_54", "AGE_55_64", "AGE_65_PLUS"],
  },
  {
    id: "hasHighCholesterol",
    question: "Have you been told you have high cholesterol?",
    subtext: "Diagnosed by a doctor or from a blood test",
    context: "High LDL cholesterol narrows arteries and significantly raises heart attack risk",
    icon: Droplets,
    type: "boolean",
    forAgeGroups: ["AGE_35_44", "AGE_45_54", "AGE_55_64", "AGE_65_PLUS"],
  },

  // ── Diagnosed conditions ──────────────────────────────────────────────────
  {
    id: "hasDiabetes",
    question: "Have you been diagnosed with diabetes?",
    subtext: "Type 1, Type 2, or gestational diabetes",
    context: "Diabetes is a major risk factor for heart disease, kidney failure, and nerve damage",
    icon: Droplets,
    type: "boolean",
  },
  {
    id: "diabetesOnMedication",
    question: "Is your diabetes currently being managed with medication or insulin?",
    subtext: "Including oral tablets, insulin injections, or other prescribed treatments",
    context: "Unmanaged diabetes causes significantly more organ damage than controlled diabetes",
    icon: Activity,
    type: "boolean",
    dependsOn: "hasDiabetes",
    dependsValue: true,
  },
  {
    id: "hasHypertension",
    question: "Have you been diagnosed with high blood pressure?",
    subtext: "Also known as hypertension — blood pressure above 140/90 mmHg",
    context: "High blood pressure is called the 'silent killer' as it often has no symptoms",
    icon: Activity,
    type: "boolean",
  },
  {
    id: "hypertensionControlled",
    question: "Is your blood pressure currently under control with medication?",
    subtext: "Consistently reading below 130/80 mmHg on treatment",
    icon: Activity,
    type: "boolean",
    dependsOn: "hasHypertension",
    dependsValue: true,
  },
  {
    id: "hasFamilyHistory",
    question: "Does your immediate family have a history of heart disease?",
    subtext: "Parents, siblings, or grandparents with heart attacks, strokes, or heart failure",
    context: "Genetic factors can significantly increase your own cardiovascular risk",
    icon: Heart,
    type: "boolean",
  },

  // ── Elderly-specific ──────────────────────────────────────────────────────
  {
    id: "hasDizziness",
    question: "Do you experience frequent dizziness or loss of balance?",
    subtext: "Feeling faint, spinning, or unsteady — especially when standing",
    context: "Dizziness can signal inner ear problems, low blood pressure, or cardiovascular issues",
    icon: AlertCircle,
    type: "boolean",
    forAgeGroups: ["AGE_55_64", "AGE_65_PLUS"],
  },
  {
    id: "hasJointPain",
    question: "Do you have persistent joint pain that limits your daily movement?",
    subtext: "Knees, hips, back, or other joints that affect walking, climbing stairs, etc.",
    context: "Mobility limitations reduce physical activity, which compounds cardiovascular risk",
    icon: Bone,
    type: "boolean",
    forAgeGroups: ["AGE_55_64", "AGE_65_PLUS"],
  },

  // ── Gender-specific ───────────────────────────────────────────────────────
  {
    id: "hasFatigueLowEnergy", // duplicate key guard handled in buildQuestions
    question: "Do you experience irregular or unusually heavy menstrual cycles?",
    subtext: "Cycles shorter than 21 days, longer than 35 days, or very heavy bleeding",
    context: "Menstrual irregularities can indicate hormonal imbalances or anaemia",
    icon: Activity,
    type: "boolean",
    forGenders: ["FEMALE"],
    forAgeGroups: ["AGE_18_24", "AGE_25_34", "AGE_35_44"],
  },
  {
    id: "hasProstateConcern",
    question: "Do you experience frequent or difficult urination, especially at night?",
    subtext: "Needing to urinate many times at night or a weak urine stream",
    context: "These symptoms can indicate prostate enlargement, which affects many men over 45",
    icon: AlertCircle,
    type: "boolean",
    forGenders: ["MALE"],
    forAgeGroups: ["AGE_45_54", "AGE_55_64", "AGE_65_PLUS"],
  },

  // ── Closing wellbeing ─────────────────────────────────────────────────────
  {
    id: "wellbeing",
    question: "Overall, how would you rate your current health and wellbeing?",
    subtext: "Your honest self-assessment helps us personalize your result",
    icon: Smile,
    type: "choice",
    choices: [
      { value: "POOR",      label: "Poor",      emoji: "😞", },
      { value: "FAIR",      label: "Fair",      emoji: "😐", },
      { value: "GOOD",      label: "Good",      emoji: "🙂", },
      { value: "EXCELLENT", label: "Excellent", emoji: "😄", },
    ],
  },
];

// ── Build personalized question list ──────────────────────────────────────────

function buildBaseQuestions(profile: VisitorProfile): Question[] {
  const seen = new Set<string>();
  return ALL_QUESTIONS.filter((q) => {
    if (seen.has(q.id)) return false;        // deduplicate (e.g. hasFatigueLowEnergy)
    if (q.dependsOn) return false;           // branching questions added dynamically
    if (q.forAgeGroups && !q.forAgeGroups.includes(profile.ageGroup)) return false;
    if (q.forGenders && !q.forGenders.includes(profile.gender)) return false;
    seen.add(q.id);
    return true;
  });
}

function getBranchQuestions(parentId: string, value: boolean | string, profile: VisitorProfile): Question[] {
  return ALL_QUESTIONS.filter((q) => {
    if (q.dependsOn !== parentId) return false;
    if (q.dependsValue !== undefined && q.dependsValue !== value) return false;
    if (q.forAgeGroups && !q.forAgeGroups.includes(profile.ageGroup)) return false;
    if (q.forGenders && !q.forGenders.includes(profile.gender)) return false;
    return true;
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const AGE_GROUP_LABELS: Record<AgeGroup, string> = {
  UNDER_18:    "Under 18",
  AGE_18_24:   "18 – 24",
  AGE_25_34:   "25 – 34",
  AGE_35_44:   "35 – 44",
  AGE_45_54:   "45 – 54",
  AGE_55_64:   "55 – 64",
  AGE_65_PLUS: "65 +",
};

const GENDER_LABELS: Record<Gender, string> = {
  MALE:              "Male",
  FEMALE:            "Female",
  OTHER:             "Other",
  PREFER_NOT_TO_SAY: "—",
};

// ── UI Components ─────────────────────────────────────────────────────────────

function BooleanButtons({ value, onChange }: { value: boolean | null; onChange: (v: boolean) => void }) {
  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      {[
        { v: true,  label: "Yes", base: "border-green-200 hover:border-green-400", active: "border-green-500 bg-green-50 text-green-700 shadow-lg shadow-green-100" },
        { v: false, label: "No",  base: "border-gray-200 hover:border-gray-400",   active: "border-gray-500 bg-gray-50 text-gray-700 shadow-lg" },
      ].map(({ v, label, base, active }) => (
        <button
          key={label}
          type="button"
          onClick={() => onChange(v)}
          className={`h-20 rounded-2xl border-2 text-xl font-black transition-all duration-200 ${value === v ? active : `bg-white text-gray-500 ${base}`}`}
        >
          <span className="block text-2xl mb-1">{v ? "✅" : "❌"}</span>
          {label}
        </button>
      ))}
    </div>
  );
}

function ChoiceCards({ choices, value, onChange }: {
  choices: NonNullable<Question["choices"]>;
  value: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 mt-6">
      {choices.map((c) => (
        <button
          key={c.value}
          type="button"
          onClick={() => onChange(c.value)}
          className={`py-4 px-3 rounded-2xl border-2 text-sm font-semibold transition-all duration-200 flex flex-col items-center gap-2 ${
            value === c.value
              ? "border-afya-500 bg-afya-50 text-afya-700 shadow-lg shadow-afya-100"
              : "border-gray-200 bg-white text-gray-600 hover:border-afya-300 hover:bg-afya-50/30"
          }`}
        >
          {c.emoji && <span className="text-2xl">{c.emoji}</span>}
          <span>{c.label}</span>
        </button>
      ))}
    </div>
  );
}

// ── Main assessment ───────────────────────────────────────────────────────────

function AssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitorId = searchParams.get("visitorId") ?? "";

  const [profile,       setProfile]       = useState<VisitorProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [answers,       setAnswers]        = useState<Record<string, boolean | string>>({});
  const [stepIndex,     setStepIndex]      = useState(0);
  const [isSubmitting,  setIsSubmitting]   = useState(false);
  const [animKey,       setAnimKey]        = useState(0);

  // Fetch visitor profile once
  useEffect(() => {
    if (!visitorId) { router.push("/"); return; }
    fetch(`/api/visitors?id=${visitorId}`)
      .then((r) => r.json())
      .then((j) => {
        if (j.success) setProfile(j.data as VisitorProfile);
        else router.push("/");
      })
      .catch(() => router.push("/"))
      .finally(() => setLoadingProfile(false));
  }, [visitorId, router]);

  // Build active question sequence reactively as answers change
  const questions = useMemo<Question[]>(() => {
    if (!profile) return [];

    const base = buildBaseQuestions(profile);
    const result: Question[] = [];

    for (const q of base) {
      result.push(q);
      // Inject branching questions right after their parent
      const answer = answers[q.id];
      if (answer !== undefined) {
        const branches = getBranchQuestions(q.id, answer, profile);
        result.push(...branches);
      }
    }
    return result;
  }, [profile, answers]);

  const currentQuestion = questions[stepIndex];
  const totalSteps      = questions.length;
  const progress        = totalSteps > 0 ? ((stepIndex + 1) / totalSteps) * 100 : 0;
  const currentValue    = currentQuestion ? answers[currentQuestion.id] : undefined;

  function canProceed(): boolean {
    if (!currentQuestion) return false;
    return currentValue !== undefined;
  }

  function handleAnswer(value: boolean | string) {
    if (!currentQuestion) return;
    const newAnswers = { ...answers, [currentQuestion.id]: value };

    // If a branching parent changes, clear child answers to avoid stale data
    ALL_QUESTIONS
      .filter((q) => q.dependsOn === currentQuestion.id)
      .forEach((q) => { delete newAnswers[q.id]; });

    setAnswers(newAnswers);
  }

  function handleNext() {
    if (stepIndex < questions.length - 1) {
      setStepIndex((i) => i + 1);
      setAnimKey((k) => k + 1);
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (stepIndex > 0) {
      setStepIndex((i) => i - 1);
      setAnimKey((k) => k + 1);
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const payload = {
        visitorId,
        smokes:                 answers.smokes                 ?? false,
        smokingYears:           answers.smokingYears,
        drinksAlcohol:          answers.drinksAlcohol          ?? false,
        exercisesRegularly:     answers.exercisesRegularly     ?? false,
        hasDiabetes:            answers.hasDiabetes            ?? false,
        diabetesOnMedication:   answers.diabetesOnMedication,
        hasHypertension:        answers.hasHypertension        ?? false,
        hypertensionControlled: answers.hypertensionControlled,
        hasFamilyHistory:       answers.hasFamilyHistory       ?? false,
        hasChestPain:           answers.hasChestPain,
        hasShortBreath:         answers.hasShortBreath,
        hasHighCholesterol:     answers.hasHighCholesterol,
        hasStressAnxiety:       answers.hasStressAnxiety,
        hasFatigueLowEnergy:    answers.hasFatigueLowEnergy,
        hasJointPain:           answers.hasJointPain,
        hasDizziness:           answers.hasDizziness,
        hasProstateConcern:     answers.hasProstateConcern,
        wellbeing:              answers.wellbeing,
      };

      const res = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      router.push(`/assessment/results?id=${json.data.id}&visitorId=${visitorId}`);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Assessment failed",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  // ── Loading state ─────────────────────────────────────────────────────────
  if (loadingProfile || !profile) {
    return (
      <KioskLayout centered>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-white space-y-4">
            <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto" />
            <p className="text-lg font-medium">Preparing your assessment…</p>
          </div>
        </div>
      </KioskLayout>
    );
  }

  const Icon = currentQuestion?.icon ?? Heart;
  const isLast = stepIndex === questions.length - 1;
  const firstName = profile.fullName.split(" ")[0];

  return (
    <KioskLayout centered>
      <div className="py-8 px-4">
        <div className="max-w-lg mx-auto">

          {/* Header */}
          <div className="text-center mb-5">
            <AfyaLogo size="sm" />
            <div className="mt-4 space-y-2">
              {/* Visitor profile chip */}
              <div className="flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1.5 bg-white/20 text-white text-xs font-medium px-3 py-1 rounded-full">
                  {GENDER_LABELS[profile.gender]} · {AGE_GROUP_LABELS[profile.ageGroup]} yrs
                </span>
              </div>
              <div className="text-white/70 text-sm">
                Question {stepIndex + 1} of {totalSteps} · {firstName}'s Health Check
              </div>
              <Progress value={progress} className="h-2 bg-white/20" />
            </div>
          </div>

          {/* Question card */}
          <KioskCard>
            <div className="p-8">
              <div key={animKey} className="mb-6 animate-fade-in">

                {/* Question icon */}
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-xl bg-afya-50 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5 text-afya-600" />
                  </div>
                  {currentQuestion?.context && (
                    <p className="text-xs text-gray-400 italic leading-tight">{currentQuestion.context}</p>
                  )}
                </div>

                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  {currentQuestion?.question}
                </h2>
                {currentQuestion?.subtext && (
                  <p className="text-gray-500 text-sm mt-2">{currentQuestion.subtext}</p>
                )}

                {/* Answer UI */}
                {currentQuestion?.type === "boolean" && (
                  <BooleanButtons
                    value={currentValue === undefined ? null : currentValue as boolean}
                    onChange={handleAnswer}
                  />
                )}

                {currentQuestion?.type === "choice" && currentQuestion.choices && (
                  <ChoiceCards
                    choices={currentQuestion.choices}
                    value={currentValue === undefined ? null : currentValue as string}
                    onChange={handleAnswer}
                  />
                )}
              </div>

              {/* Navigation */}
              <div className="flex gap-3 mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={stepIndex === 0 ? undefined : handleBack}
                  className="flex-1 h-14"
                  disabled={stepIndex === 0}
                  asChild={stepIndex === 0}
                >
                  {stepIndex === 0 ? (
                    <Link href="/">
                      <ChevronLeft className="w-5 h-5 mr-1" /> Back
                    </Link>
                  ) : (
                    <><ChevronLeft className="w-5 h-5 mr-1" /> Back</>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="kiosk"
                  onClick={handleNext}
                  className="flex-[2] h-14"
                  disabled={!canProceed() || isSubmitting}
                  loading={isSubmitting && isLast}
                >
                  {isLast
                    ? "Get My Results"
                    : <><span>Next</span> <ChevronRight className="w-5 h-5 ml-1" /></>}
                </Button>
              </div>
            </div>
          </KioskCard>

          {/* Step dots for quick orientation */}
          <div className="flex justify-center mt-4 gap-1.5">
            {questions.map((_, i) => (
              <div
                key={i}
                className={`rounded-full transition-all duration-300 ${
                  i === stepIndex
                    ? "w-6 h-2 bg-white"
                    : i < stepIndex
                      ? "w-2 h-2 bg-white/60"
                      : "w-2 h-2 bg-white/25"
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </KioskLayout>
  );
}

export default function AssessmentPage() {
  return (
    <Suspense fallback={
      <KioskLayout centered>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full" />
        </div>
      </KioskLayout>
    }>
      <AssessmentContent />
    </Suspense>
  );
}
