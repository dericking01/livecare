"use client";

import Link from "next/link";
import { Stethoscope, ClipboardList, Info, ChevronRight, Shield, Clock, Users } from "lucide-react";
import { KioskLayout, AfyaLogo } from "@/components/shared/KioskLayout";

export default function LandingPage() {
  return (
    <KioskLayout>
      <div className="min-h-screen flex flex-col">
        {/* Header */}
        <header className="px-6 pt-10 pb-4">
          <div className="flex items-center justify-between max-w-4xl mx-auto">
            <AfyaLogo size="lg" />
            <div className="text-right text-white/80">
              <div className="text-sm font-medium">Saba Saba</div>
              <div className="text-xs opacity-70">Exhibition 2024</div>
            </div>
          </div>
        </header>

        {/* Hero */}
        <div className="px-6 py-8 text-center">
          <h1 className="text-4xl md:text-5xl font-black text-white leading-tight mb-4">
            Your Health,<br />
            <span className="text-afya-200">Our Priority</span>
          </h1>
          <p className="text-afya-100 text-lg max-w-md mx-auto leading-relaxed">
            Free health consultations with qualified doctors. No appointment needed — just register and we'll be with you shortly.
          </p>
        </div>

        {/* Action Cards */}
        <div className="flex-1 px-4 pb-8">
          <div className="max-w-2xl mx-auto grid gap-4">
            <Link href="/register?service=consultation" className="block group">
              <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-transparent hover:border-afya-300 transition-all duration-200 active:scale-98">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-afya-500 flex items-center justify-center shadow-lg shadow-afya-500/30 group-hover:scale-105 transition-transform">
                    <Stethoscope className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">Chat With a Doctor</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Video consultation with a qualified physician
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-afya-600 font-medium">
                        <Clock className="w-3 h-3" /> 5–10 min wait
                      </span>
                      <span className="flex items-center gap-1 text-xs text-afya-600 font-medium">
                        <Users className="w-3 h-3" /> Free
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-afya-500 transition-colors" />
                </div>
              </div>
            </Link>

            <Link href="/register?service=assessment" className="block group">
              <div className="bg-white rounded-3xl p-6 shadow-xl border-2 border-transparent hover:border-blue-300 transition-all duration-200 active:scale-98">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-blue-500 flex items-center justify-center shadow-lg shadow-blue-500/30 group-hover:scale-105 transition-transform">
                    <ClipboardList className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-gray-900">Health Assessment</h2>
                    <p className="text-gray-500 text-sm mt-1">
                      Quick health risk check with personalized advice
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <Clock className="w-3 h-3" /> 3 minutes
                      </span>
                      <span className="flex items-center gap-1 text-xs text-blue-600 font-medium">
                        <Shield className="w-3 h-3" /> Private
                      </span>
                    </div>
                  </div>
                  <ChevronRight className="w-6 h-6 text-gray-300 group-hover:text-blue-500 transition-colors" />
                </div>
              </div>
            </Link>

            <Link href="/about" className="block group">
              <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-6 border border-white/20 hover:bg-white/15 transition-all duration-200 active:scale-98">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-white/20 flex items-center justify-center group-hover:scale-105 transition-transform">
                    <Info className="w-8 h-8 text-white" />
                  </div>
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-white">About AfyaCall</h2>
                    <p className="text-afya-200 text-sm mt-1">
                      Services, subscriptions, and doctor support
                    </p>
                  </div>
                  <ChevronRight className="w-6 h-6 text-white/40 group-hover:text-white/80 transition-colors" />
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 pb-6 text-center">
          <p className="text-afya-300 text-xs">
            Powered by AfyaCall Telemedicine · Tanzania
          </p>
          <div className="flex justify-center gap-6 mt-3">
            <Link href="/login" className="text-afya-300/60 text-xs hover:text-white transition-colors">
              Staff Login
            </Link>
          </div>
        </footer>
      </div>
    </KioskLayout>
  );
}
