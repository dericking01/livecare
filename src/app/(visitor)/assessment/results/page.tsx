"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CheckCircle, AlertCircle, Stethoscope, Home, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { KioskLayout, KioskCard, AfyaLogo } from "@/components/shared/KioskLayout";
import type { HealthAssessment } from "@/types";

const riskConfig = {
  LOW: {
    icon: CheckCircle,
    iconColor: "text-green-500",
    bg: "bg-green-50",
    border: "border-green-200",
    title: "Low Risk",
    titleColor: "text-green-700",
    badge: "bg-green-100 text-green-700 border-green-200",
    barColor: "bg-green-500",
    barWidth: "33%",
  },
  MEDIUM: {
    icon: AlertTriangle,
    iconColor: "text-yellow-500",
    bg: "bg-yellow-50",
    border: "border-yellow-200",
    title: "Medium Risk",
    titleColor: "text-yellow-700",
    badge: "bg-yellow-100 text-yellow-700 border-yellow-200",
    barColor: "bg-yellow-500",
    barWidth: "66%",
  },
  HIGH: {
    icon: AlertCircle,
    iconColor: "text-red-500",
    bg: "bg-red-50",
    border: "border-red-200",
    title: "High Risk",
    titleColor: "text-red-700",
    badge: "bg-red-100 text-red-700 border-red-200",
    barColor: "bg-red-500",
    barWidth: "100%",
  },
};

function AssessmentResultsContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const assessmentId = searchParams.get("id");
  const visitorId = searchParams.get("visitorId") ?? "";
  const [assessment, setAssessment] = useState<HealthAssessment | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = sessionStorage.getItem("last_assessment");
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setAssessment(data);
        setIsLoading(false);
        return;
      } catch {}
    }

    if (!assessmentId) {
      router.push("/");
      return;
    }

    fetch(`/api/assessment?id=${assessmentId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.success) setAssessment(json.data);
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [assessmentId, router]);

  if (isLoading) {
    return (
      <KioskLayout centered>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center text-white">
            <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4" />
            <p className="text-lg font-medium">Calculating your results...</p>
          </div>
        </div>
      </KioskLayout>
    );
  }

  if (!assessment) {
    return (
      <KioskLayout centered>
        <div className="text-center p-8">
          <p className="text-white text-xl mb-6">Results not found</p>
          <Link href="/">
            <Button variant="kiosk-outline">Go Home</Button>
          </Link>
        </div>
      </KioskLayout>
    );
  }

  const config = riskConfig[assessment.riskLevel as keyof typeof riskConfig];
  const Icon = config.icon;

  return (
    <KioskLayout centered>
      <div className="py-8 px-4">
        <div className="max-w-lg mx-auto">
          <div className="text-center mb-6">
            <AfyaLogo size="sm" />
          </div>

          <KioskCard>
            <div className="p-8">
              {/* Risk Level Header */}
              <div className={`rounded-2xl ${config.bg} border ${config.border} p-6 mb-6 text-center`}>
                <div className={`inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white shadow-sm mb-4`}>
                  <Icon className={`w-8 h-8 ${config.iconColor}`} />
                </div>
                <div className={`text-xs font-semibold tracking-wider uppercase ${config.titleColor} mb-1`}>
                  Your Health Risk Profile
                </div>
                <div className={`text-4xl font-black ${config.titleColor}`}>
                  {config.title}
                </div>

                {/* Risk Bar */}
                <div className="mt-4 bg-white rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-1000 ${config.barColor}`}
                    style={{ width: config.barWidth }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>Low</span>
                  <span>Medium</span>
                  <span>High</span>
                </div>
              </div>

              {/* Recommendation */}
              <div className="mb-6">
                <h3 className="font-bold text-gray-800 mb-3 text-lg">Our Recommendation</h3>
                <p className="text-gray-600 leading-relaxed text-sm">
                  {assessment.recommendation}
                </p>
              </div>

              {/* Actions */}
              <div className="space-y-3">
                {assessment.riskLevel !== "LOW" && (
                  <button
                    onClick={async () => {
                      const res = await fetch("/api/queue", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ visitorId }),
                      });
                      const json = await res.json();
                      if (json.success) router.push(`/queue/${json.data.id}`);
                    }}
                    className="w-full h-14 rounded-2xl bg-afya-500 text-white font-bold text-base flex items-center justify-center gap-3 shadow-lg shadow-afya-500/30 hover:bg-afya-600 transition-colors active:scale-98"
                  >
                    <Stethoscope className="w-5 h-5" />
                    Speak to a Doctor Now
                    <ArrowRight className="w-5 h-5" />
                  </button>
                )}

                <Link href="/" className="block">
                  <button className="w-full h-14 rounded-2xl border-2 border-gray-200 text-gray-600 font-semibold text-base flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors">
                    <Home className="w-5 h-5" />
                    Return to Home
                  </button>
                </Link>
              </div>
            </div>
          </KioskCard>
        </div>
      </div>
    </KioskLayout>
  );
}

export default function AssessmentResultsPage() {
  return (
    <Suspense
      fallback={
        <KioskLayout centered>
          <div className="flex items-center justify-center min-h-screen">
            <div className="text-center text-white">
              <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4" />
              <p className="text-lg font-medium">Loading results...</p>
            </div>
          </div>
        </KioskLayout>
      }
    >
      <AssessmentResultsContent />
    </Suspense>
  );
}
