"use client";

import Link from "next/link";
import { Stethoscope, ClipboardList, ChevronRight, Shield, Clock, Users } from "lucide-react";
import { KioskLayout, AfyaLogo } from "@/components/shared/KioskLayout";

export default function LandingPage() {
  return (
    <KioskLayout>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 pt-6 pb-2">
          <div className="flex items-center max-w-4xl mx-auto">
            <AfyaLogo size="lg" />
          </div>
        </header>

        {/* Hero */}
        <div className="px-6 py-6 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-3">
            Your Health,<br />
            <span className="text-afya-200">Our Priority</span>
          </h1>
          <p className="text-afya-100 text-base max-w-sm mx-auto leading-relaxed opacity-90">
            Free health consultations with qualified doctors — no appointment needed.
          </p>
        </div>

        {/* Action Cards */}
        <div className="flex-1 px-4 pb-6">
          <div className="max-w-2xl mx-auto grid gap-4">
            <Link href="/register?service=consultation" className="block group">
              <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-transparent hover:border-afya-300 transition-all duration-200 active:scale-98">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-afya-500 flex items-center justify-center shadow-lg shadow-afya-500/30 group-hover:scale-105 transition-transform shrink-0">
                    <Stethoscope className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">Chat With a Doctor</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Video consultation with a qualified physician
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-afya-600 font-semibold">
                        <Clock className="w-3 h-3" /> 5–10 min wait
                      </span>
                      <span className="flex items-center gap-1 text-xs text-afya-600 font-semibold">
                        <Users className="w-3 h-3" /> Free
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-afya-500 transition-colors shrink-0" />
                </div>
              </div>
            </Link>

            <Link href="/register?service=assessment" className="block group">
              <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-transparent hover:border-blue-300 transition-all duration-200 active:scale-98">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform shrink-0">
                    <ClipboardList className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">Health Assessment</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Quick health risk check with personalized advice
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                        <Clock className="w-3 h-3" /> 3 minutes
                      </span>
                      <span className="flex items-center gap-1 text-xs text-blue-600 font-semibold">
                        <Shield className="w-3 h-3" /> Private
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-500 transition-colors shrink-0" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 pb-8 text-center">
          <p className="text-afya-300/70 text-xs mb-4 tracking-wide">
            Powered by AfyaCall Health Services · Tanzania
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full border border-white/25 bg-white/10 text-white/80 text-sm font-medium hover:bg-white/20 hover:text-white active:scale-95 transition-all"
          >
            <Shield className="w-4 h-4" />
            Staff Login
          </Link>
        </footer>
      </div>
    </KioskLayout>
  );
}
