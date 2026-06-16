"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Stethoscope, ClipboardList, Users, Video, Clock, RefreshCw } from "lucide-react";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";

type LiveStats = { waiting: number; active: number; completedToday: number; visitorsToday: number };

export default function BoothPage() {
  const router = useRouter();
  const [stats, setStats] = useState<LiveStats>({ waiting: 0, active: 0, completedToday: 0, visitorsToday: 0 });
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/stats");
      const json = await res.json();
      if (json.success) setStats(json.data);
    } catch (err) {
      console.error("Stats fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();

    const socket = getSocket();
    socket.on("queue:updated", fetchStats);
    socket.on("admin:stats-update", fetchStats);

    const interval = setInterval(fetchStats, 15_000);

    return () => {
      socket.off("queue:updated", fetchStats);
      socket.off("admin:stats-update", fetchStats);
      clearInterval(interval);
    };
  }, [fetchStats]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Kiosk Control Panel</h1>
          <p className="text-gray-500 mt-1">Register visitors and monitor the queue</p>
        </div>
        <Button variant="outline" onClick={fetchStats} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Live Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Waiting", value: stats.waiting, icon: Clock, color: "bg-blue-500", textColor: "text-blue-600", bg: "bg-blue-50" },
          { label: "In Session", value: stats.active, icon: Video, color: "bg-orange-500", textColor: "text-orange-600", bg: "bg-orange-50" },
          { label: "Completed Today", value: stats.completedToday, icon: Users, color: "bg-green-500", textColor: "text-green-600", bg: "bg-green-50" },
          { label: "Visitors Today", value: stats.visitorsToday, icon: Users, color: "bg-afya-500", textColor: "text-afya-600", bg: "bg-afya-50" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.textColor}`} />
            </div>
            <div className="text-3xl font-black text-gray-900">{isLoading ? "—" : s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Register a Visitor</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => router.push("/register?service=consultation")}
            className="group bg-white rounded-3xl p-7 shadow-sm border-2 border-transparent hover:border-afya-300 hover:shadow-lg transition-all text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-afya-500 flex items-center justify-center mb-4 shadow-lg shadow-afya-500/25 group-hover:scale-105 transition-transform">
              <Stethoscope className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Doctor Consultation</h3>
            <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
              Register the visitor for a video consultation with a doctor. They'll be added to the queue immediately.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-afya-600 bg-afya-50 px-3 py-1.5 rounded-full">
              <Clock className="w-3 h-3" /> ~5–10 min wait
            </div>
          </button>

          <button
            onClick={() => router.push("/register?service=assessment")}
            className="group bg-white rounded-3xl p-7 shadow-sm border-2 border-transparent hover:border-blue-300 hover:shadow-lg transition-all text-left"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform">
              <ClipboardList className="w-7 h-7 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-900">Health Assessment</h3>
            <p className="text-gray-500 text-sm mt-1.5 leading-relaxed">
              Guide the visitor through a quick health risk assessment with personalized recommendations.
            </p>
            <div className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 bg-blue-50 px-3 py-1.5 rounded-full">
              <Clock className="w-3 h-3" /> ~3 minutes
            </div>
          </button>
        </div>
      </div>

      {/* Queue Indicator */}
      {stats.waiting > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-blue-900">
              {stats.waiting} patient{stats.waiting !== 1 ? "s" : ""} currently waiting
            </div>
            <div className="text-sm text-blue-600 mt-0.5">
              Estimated wait: ~{stats.waiting * 7} minutes
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
