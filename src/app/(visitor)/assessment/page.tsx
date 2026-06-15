"use client";

import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { KioskLayout, KioskCard, AfyaLogo } from "@/components/shared/KioskLayout";
import { toast } from "@/components/ui/toaster";

type AssessmentData = {
  age: number | null;
  gender: string;
  smokes: boolean | null;
  drinksAlcohol: boolean | null;
  exercisesRegularly: boolean | null;
  hasDiabetes: boolean | null;
  hasHypertension: boolean | null;
  hasFamilyHistory: boolean | null;
};

const INITIAL: AssessmentData = {
  age: null,
  gender: "",
  smokes: null,
  drinksAlcohol: null,
  exercisesRegularly: null,
  hasDiabetes: null,
  hasHypertension: null,
  hasFamilyHistory: null,
};

type Step = {
  key: keyof AssessmentData;
  question: string;
  subtext?: string;
  type: "number" | "gender" | "boolean";
};

const STEPS: Step[] = [
  { key: "age", question: "How old are you?", subtext: "Enter your age in years", type: "number" },
  { key: "gender", question: "What is your gender?", type: "gender" },
  { key: "smokes", question: "Do you currently smoke tobacco?", subtext: "Including cigarettes, shisha, or other tobacco products", type: "boolean" },
  { key: "drinksAlcohol", question: "Do you drink alcohol regularly?", subtext: "More than 3 times per week", type: "boolean" },
  { key: "exercisesRegularly", question: "Do you exercise regularly?", subtext: "At least 150 minutes of moderate activity per week", type: "boolean" },
  { key: "hasDiabetes", question: "Have you been diagnosed with diabetes?", type: "boolean" },
  { key: "hasHypertension", question: "Have you been diagnosed with high blood pressure?", subtext: "Also known as hypertension", type: "boolean" },
  { key: "hasFamilyHistory", question: "Do you have a family history of heart disease?", subtext: "Parents, siblings, or grandparents", type: "boolean" },
];

function YesNoButtons({
  value,
  onChange,
}: {
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-4 mt-6">
      <button
        type="button"
        onClick={() => onChange(true)}
        className={`h-20 rounded-2xl border-2 text-lg font-bold transition-all ${
          value === true
            ? "border-afya-500 bg-afya-50 text-afya-700 shadow-lg"
            : "border-gray-200 bg-white text-gray-600 hover:border-afya-300"
        }`}
      >
        Yes
      </button>
      <button
        type="button"
        onClick={() => onChange(false)}
        className={`h-20 rounded-2xl border-2 text-lg font-bold transition-all ${
          value === false
            ? "border-afya-500 bg-afya-50 text-afya-700 shadow-lg"
            : "border-gray-200 bg-white text-gray-600 hover:border-afya-300"
        }`}
      >
        No
      </button>
    </div>
  );
}

function AssessmentContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitorId = searchParams.get("visitorId") ?? "";
  const [step, setStep] = useState(0);
  const [data, setData] = useState<AssessmentData>(INITIAL);
  const [ageInput, setAgeInput] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStep = STEPS[step];
  const progress = ((step + 1) / STEPS.length) * 100;

  function canProceed(): boolean {
    const val = data[currentStep.key];
    if (currentStep.type === "number") return ageInput !== "" && parseInt(ageInput) > 0;
    if (currentStep.type === "gender") return data.gender !== "";
    return val !== null;
  }

  function handleNext() {
    if (currentStep.type === "number") {
      setData((d) => ({ ...d, age: parseInt(ageInput) }));
    }

    if (step < STEPS.length - 1) {
      setStep((s) => s + 1);
    } else {
      handleSubmit();
    }
  }

  function handleBack() {
    if (step > 0) setStep((s) => s - 1);
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    try {
      const payload = {
        visitorId,
        age: parseInt(ageInput) || data.age,
        gender: data.gender || "PREFER_NOT_TO_SAY",
        smokes: data.smokes ?? false,
        drinksAlcohol: data.drinksAlcohol ?? false,
        exercisesRegularly: data.exercisesRegularly ?? false,
        hasDiabetes: data.hasDiabetes ?? false,
        hasHypertension: data.hasHypertension ?? false,
        hasFamilyHistory: data.hasFamilyHistory ?? false,
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

  return (
    <KioskLayout centered>
      <div className="py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <AfyaLogo size="sm" />
            <div className="mt-4">
              <div className="text-white/70 text-sm mb-2">
                Question {step + 1} of {STEPS.length}
              </div>
              <Progress value={progress} className="h-2 bg-white/20" />
            </div>
          </div>

          <KioskCard>
            <div className="p-8">
              <div className="mb-6 animate-fade-in" key={step}>
                <h2 className="text-2xl font-black text-gray-900 leading-tight">
                  {currentStep.question}
                </h2>
                {currentStep.subtext && (
                  <p className="text-gray-500 text-sm mt-2">{currentStep.subtext}</p>
                )}

                {/* Number input */}
                {currentStep.type === "number" && (
                  <div className="mt-6">
                    <input
                      type="number"
                      value={ageInput}
                      onChange={(e) => setAgeInput(e.target.value)}
                      className="w-full h-20 text-5xl font-black text-center rounded-2xl border-2 border-gray-200 focus:border-afya-500 focus:outline-none bg-gray-50"
                      placeholder="—"
                      min="1"
                      max="120"
                      autoFocus
                    />
                    <p className="text-center text-gray-400 text-sm mt-2">years old</p>
                  </div>
                )}

                {/* Gender selection */}
                {currentStep.type === "gender" && (
                  <div className="grid grid-cols-2 gap-3 mt-6">
                    {[
                      { value: "MALE", label: "Male" },
                      { value: "FEMALE", label: "Female" },
                      { value: "OTHER", label: "Other" },
                      { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
                    ].map((g) => (
                      <button
                        key={g.value}
                        type="button"
                        onClick={() => setData((d) => ({ ...d, gender: g.value }))}
                        className={`h-16 rounded-xl border-2 text-sm font-semibold transition-all ${
                          data.gender === g.value
                            ? "border-afya-500 bg-afya-50 text-afya-700"
                            : "border-gray-200 bg-white text-gray-600 hover:border-afya-300"
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                )}

                {/* Boolean */}
                {currentStep.type === "boolean" && (
                  <YesNoButtons
                    value={data[currentStep.key] as boolean | null}
                    onChange={(v) =>
                      setData((d) => ({ ...d, [currentStep.key]: v }))
                    }
                  />
                )}
              </div>

              <div className="flex gap-3 mt-8">
                <Button
                  type="button"
                  variant="outline"
                  onClick={step === 0 ? undefined : handleBack}
                  className="flex-1 h-14"
                  disabled={step === 0}
                  asChild={step === 0}
                >
                  {step === 0 ? (
                    <Link href="/">
                      <ChevronLeft className="w-5 h-5 mr-1" /> Back
                    </Link>
                  ) : (
                    <>
                      <ChevronLeft className="w-5 h-5 mr-1" /> Back
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="kiosk"
                  onClick={handleNext}
                  className="flex-[2] h-14"
                  disabled={!canProceed() || isSubmitting}
                  loading={isSubmitting && step === STEPS.length - 1}
                >
                  {step === STEPS.length - 1 ? "Submit" : <>Next <ChevronRight className="w-5 h-5 ml-1" /></>}
                </Button>
              </div>
            </div>
          </KioskCard>
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
