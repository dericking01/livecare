"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import { Stethoscope, ClipboardList, Info, ChevronLeft, ArrowRight } from "lucide-react";
import Link from "next/link";
import { KioskLayout, AfyaLogo } from "@/components/shared/KioskLayout";
import { toast } from "@/components/ui/toaster";

const services = [
  {
    id: "consultation",
    icon: Stethoscope,
    iconBg: "bg-afya-500",
    title: "Talk to a Doctor",
    description: "Video consultation with a qualified physician. Get medical advice and prescriptions.",
    time: "5–10 min wait",
    color: "afya",
  },
  {
    id: "assessment",
    icon: ClipboardList,
    iconBg: "bg-blue-500",
    title: "Health Assessment",
    description: "Complete a quick risk assessment and get personalized health recommendations.",
    time: "3 minutes",
    color: "blue",
  },
  {
    id: "about",
    icon: Info,
    iconBg: "bg-purple-500",
    title: "Learn About AfyaCall",
    description: "Discover our telemedicine services, subscriptions, and how we support your health journey.",
    time: "Browse freely",
    color: "purple",
  },
];

function ServicesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const visitorId = searchParams.get("visitorId") ?? "";
  const [loadingService, setLoadingService] = useState<string | null>(null);

  async function handleServiceSelect(serviceId: string) {
    setLoadingService(serviceId);

    try {
      if (serviceId === "consultation") {
        // Join the queue
        const res = await fetch("/api/queue", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId }),
        });

        const json = await res.json();
        if (!json.success) throw new Error(json.error);

        router.push(`/queue/${json.data.id}`);
      } else if (serviceId === "assessment") {
        router.push(`/assessment?visitorId=${visitorId}`);
      } else if (serviceId === "about") {
        router.push("/about");
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error instanceof Error ? error.message : "Please try again",
      });
      setLoadingService(null);
    }
  }

  return (
    <KioskLayout centered>
      <div className="py-8 px-4">
        <div className="max-w-xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <AfyaLogo size="md" />
            <div className="mt-6">
              <h1 className="text-3xl font-black text-white">How can we help?</h1>
              <p className="text-afya-200 mt-2">Choose a service to get started</p>
            </div>
          </div>

          {/* Service Cards */}
          <div className="space-y-4">
            {services.map((service) => {
              const Icon = service.icon;
              const isLoading = loadingService === service.id;

              return (
                <button
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  disabled={!!loadingService}
                  className="w-full text-left bg-white rounded-3xl p-6 shadow-xl transition-all duration-200 hover:shadow-2xl active:scale-98 disabled:opacity-60 disabled:cursor-not-allowed group"
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-16 h-16 rounded-2xl ${service.iconBg} flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform shrink-0`}>
                      {isLoading ? (
                        <svg className="animate-spin h-7 w-7 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                      ) : (
                        <Icon className="w-8 h-8 text-white" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xl font-bold text-gray-900">{service.title}</h2>
                      <p className="text-gray-500 text-sm mt-1 leading-relaxed">{service.description}</p>
                      <div className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-afya-600 bg-afya-50 px-3 py-1 rounded-full">
                        {service.time}
                      </div>
                    </div>
                    <ArrowRight className="w-6 h-6 text-gray-300 group-hover:text-gray-500 group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>

          <Link href="/" className="flex items-center justify-center gap-2 text-white/60 hover:text-white text-sm transition-colors py-6">
            <ChevronLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>
      </div>
    </KioskLayout>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <KioskLayout centered>
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full" />
        </div>
      </KioskLayout>
    }>
      <ServicesContent />
    </Suspense>
  );
}
