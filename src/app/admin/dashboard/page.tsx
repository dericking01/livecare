"use client";

import { useEffect, useState, useCallback } from "react";
import { Users, Video, Clock, TrendingUp, RefreshCw } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from "recharts";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import type { AnalyticsData } from "@/types";

const RISK_COLORS = { LOW: "#22c55e", MEDIUM: "#f59e0b", HIGH: "#ef4444" };
const GENDER_COLORS = { MALE: "#3b82f6", FEMALE: "#ec4899", OTHER: "#8b5cf6", PREFER_NOT_TO_SAY: "#6b7280" };

type LiveStats = { waiting: number; active: number; completedToday: number; visitorsToday: number };

function StatCard({
  title, value, subtitle, icon: Icon, color,
}: {
  title: string;
  value: number | string;
  subtitle: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
      </div>
      <div className="text-4xl font-black text-gray-900">{value}</div>
      <div className="text-sm text-gray-500 mt-1">{subtitle}</div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<LiveStats>({ waiting: 0, active: 0, completedToday: 0, visitorsToday: 0 });
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
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

  const fetchCharts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/analytics");
      const json = await res.json();
      if (json.success) setAnalytics(json.data);
    } catch (err) {
      console.error("Charts fetch error:", err);
    }
  }, []);

  useEffect(() => {
    fetchStats();
    fetchCharts();

    const socket = getSocket();
    socket.emit("admin:join");
    socket.on("admin:stats-update", () => {
      fetchStats();
      fetchCharts();
    });

    const statsInterval = setInterval(fetchStats, 15_000);
    const chartsInterval = setInterval(fetchCharts, 60_000);

    return () => {
      socket.off("admin:stats-update");
      clearInterval(statsInterval);
      clearInterval(chartsInterval);
    };
  }, [fetchStats, fetchCharts]);

  function handleRefresh() {
    fetchStats();
    fetchCharts();
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Analytics Dashboard</h1>
          <p className="text-gray-500 mt-1">Real-time overview for today</p>
        </div>
        <Button variant="outline" onClick={handleRefresh} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Visitors Today"
          value={isLoading ? "—" : stats.visitorsToday}
          subtitle="registered at booth"
          icon={Users}
          color="bg-afya-500"
        />
        <StatCard
          title="Currently Waiting"
          value={isLoading ? "—" : stats.waiting}
          subtitle="in queue"
          icon={Clock}
          color="bg-blue-500"
        />
        <StatCard
          title="Active Consultations"
          value={isLoading ? "—" : stats.active}
          subtitle="in progress now"
          icon={Video}
          color="bg-orange-500"
        />
        <StatCard
          title="Completed Today"
          value={isLoading ? "—" : stats.completedToday}
          subtitle="consultations done"
          icon={TrendingUp}
          color="bg-green-500"
        />
      </div>

      {/* Charts */}
      {analytics && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Hourly Activity (Last 12 Hours)</h2>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={analytics.hourlyData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="visitors" name="Visitors" fill="#00a65a" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="consultations" name="Consultations" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-6">Health Risk Distribution</h2>
              {analytics.riskDistribution.length === 0 ? (
                <div className="h-[220px] flex items-center justify-center text-gray-400">
                  No assessment data yet
                </div>
              ) : (
                <div className="flex items-center gap-6">
                  <ResponsiveContainer width="50%" height={220}>
                    <PieChart>
                      <Pie
                        data={analytics.riskDistribution}
                        dataKey="count"
                        nameKey="level"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                      >
                        {analytics.riskDistribution.map((entry) => (
                          <Cell
                            key={entry.level}
                            fill={RISK_COLORS[entry.level as keyof typeof RISK_COLORS] ?? "#9ca3af"}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-3">
                    {analytics.riskDistribution.map((d) => (
                      <div key={d.level} className="flex items-center gap-3">
                        <div
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ background: RISK_COLORS[d.level as keyof typeof RISK_COLORS] }}
                        />
                        <div>
                          <div className="text-sm font-semibold text-gray-700">{d.level}</div>
                          <div className="text-xs text-gray-500">{d.count} ({d.percentage}%)</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Gender Distribution</h2>
              {analytics.genderDistribution.length === 0 ? (
                <div className="h-[160px] flex items-center justify-center text-gray-400">No data yet</div>
              ) : (
                <div className="space-y-3">
                  {analytics.genderDistribution.map((g) => (
                    <div key={g.gender}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 capitalize">
                          {g.gender.replace(/_/g, " ").toLowerCase()}
                        </span>
                        <span className="text-gray-500">{g.count} ({g.percentage}%)</span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${g.percentage}%`,
                            background: GENDER_COLORS[g.gender as keyof typeof GENDER_COLORS] ?? "#9ca3af",
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Age Distribution</h2>
              {analytics.ageDistribution.length === 0 ? (
                <div className="h-[160px] flex items-center justify-center text-gray-400">No data yet</div>
              ) : (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={analytics.ageDistribution} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="ageGroup"
                      tick={{ fontSize: 10 }}
                      tickFormatter={(v: string) =>
                        v.replace("AGE_", "").replace("_", "-").replace("UNDER_18", "<18").replace("PLUS", "+")
                      }
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
