"use client";

import { useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Download, FileSpreadsheet, FileText, Calendar, RefreshCw,
  Users, Stethoscope, ClipboardList, Clock, TrendingUp, AlertTriangle,
  BarChart2, Activity,
} from "lucide-react";
import { format, subDays } from "date-fns";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "@/components/ui/toaster";
import type { AnalyticsData } from "@/types";

// ── Colours ───────────────────────────────────────────────────────────────────
const RISK_COLORS: Record<string, string> = {
  LOW:    "#22c55e",
  MEDIUM: "#f59e0b",
  HIGH:   "#ef4444",
};

const GENDER_COLORS: Record<string, string> = {
  MALE:              "#3b82f6",
  FEMALE:            "#ec4899",
  OTHER:             "#8b5cf6",
  PREFER_NOT_TO_SAY: "#94a3b8",
};

const AGE_LABELS: Record<string, string> = {
  UNDER_18: "<18",
  AGE_18_24: "18-24",
  AGE_25_34: "25-34",
  AGE_35_44: "35-44",
  AGE_45_54: "45-54",
  AGE_55_64: "55-64",
  AGE_65_PLUS: "65+",
};

const GENDER_LABELS: Record<string, string> = {
  MALE: "Male",
  FEMALE: "Female",
  OTHER: "Other",
  PREFER_NOT_TO_SAY: "Prefer not to say",
};

// ── Types ─────────────────────────────────────────────────────────────────────
type ExportType = "visitors" | "consultations" | "assessments";
type ExportFormat = "xlsx" | "csv";

const EXPORT_OPTIONS: { type: ExportType; label: string; description: string; icon: string }[] = [
  { type: "visitors",      label: "Visitors Report",      description: "All registered visitors with demographics and queue status", icon: "👥" },
  { type: "consultations", label: "Consultations Report",  description: "All consultations with doctor notes and durations",          icon: "🩺" },
  { type: "assessments",   label: "Health Assessments",    description: "Health risk assessment results and recommendations",         icon: "📋" },
];

// ── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: number | string; sub?: string;
  icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${color}`}>
        <Icon className="w-5 h-5 text-white" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
        <p className="text-2xl font-black text-gray-900 leading-none mt-0.5">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
      </div>
    </div>
  );
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: {
  active?: boolean; payload?: { name: string; value: number; color: string }[]; label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
      <p className="font-bold text-gray-700 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }} className="font-medium">
          {p.name}: {p.value}
        </p>
      ))}
    </div>
  );
}

// ── Date Range Picker ─────────────────────────────────────────────────────────
function DateRangePicker({ from, to, onChange }: {
  from: string; to: string;
  onChange: (from: string, to: string) => void;
}) {
  const today = format(new Date(), "yyyy-MM-dd");

  function setPreset(days: number) {
    onChange(format(subDays(new Date(), days - 1), "yyyy-MM-dd"), today);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex gap-1.5">
        {[
          { label: "Today", days: 1 },
          { label: "7 days", days: 7 },
          { label: "30 days", days: 30 },
          { label: "90 days", days: 90 },
        ].map(({ label, days }) => {
          const presetFrom = format(subDays(new Date(), days - 1), "yyyy-MM-dd");
          const active = from === presetFrom && to === today;
          return (
            <button
              key={label}
              onClick={() => setPreset(days)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                active ? "bg-afya-600 text-white" : "bg-white border border-gray-200 text-gray-600 hover:border-afya-400"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-1.5">
        <Calendar className="w-4 h-4 text-gray-400" />
        <input
          type="date"
          value={from}
          max={to}
          onChange={(e) => onChange(e.target.value, to)}
          className="text-sm text-gray-700 bg-transparent focus:outline-none"
        />
        <span className="text-gray-400 text-sm">→</span>
        <input
          type="date"
          value={to}
          min={from}
          max={today}
          onChange={(e) => onChange(from, e.target.value)}
          className="text-sm text-gray-700 bg-transparent focus:outline-none"
        />
      </div>
    </div>
  );
}

// ── Empty State ────────────────────────────────────────────────────────────────
function EmptyChart({ label }: { label: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-2">
      <BarChart2 className="w-8 h-8 opacity-30" />
      <p className="text-sm">{label}</p>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function ReportsPage() {
  const today   = format(new Date(), "yyyy-MM-dd");
  const [from, setFrom] = useState(today);
  const [to,   setTo]   = useState(today);

  const handleRangeChange = useCallback((f: string, t: string) => {
    setFrom(f);
    setTo(t);
  }, []);

  const { data, isLoading, refetch, isFetching } = useQuery<AnalyticsData>({
    queryKey: ["analytics", from, to],
    queryFn: async () => {
      const res = await fetch(`/api/admin/analytics?from=${from}&to=${to}`);
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data as AnalyticsData;
    },
    staleTime: 60_000,
  });

  // ── Export State ─────────────────────────────────────────────────────────────
  const [exportType,   setExportType]   = useState<ExportType>("visitors");
  const [exportFormat, setExportFormat] = useState<ExportFormat>("xlsx");
  const [isExporting,  setIsExporting]  = useState(false);
  const [exportFrom,   setExportFrom]   = useState(today);
  const [exportTo,     setExportTo]     = useState(today);

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({ type: exportType, format: exportFormat, from: exportFrom, to: exportTo });
      const res = await fetch(`/api/admin/export?${params}`);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Export failed");
      }
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `afyacall-${exportType}-${exportFrom}_to_${exportTo}.${exportFormat}`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ variant: "success", title: "Export complete", description: `Downloaded ${a.download}` });
    } catch (error) {
      toast({ variant: "destructive", title: "Export failed", description: error instanceof Error ? error.message : "Please try again" });
    } finally {
      setIsExporting(false);
    }
  }

  const stats      = data?.stats;
  const daily      = data?.dailyTrend ?? [];
  const hourly     = data?.hourlyData ?? [];
  const riskDist   = data?.riskDistribution ?? [];
  const genderDist = data?.genderDistribution ?? [];
  const ageDist    = data?.ageDistribution ?? [];
  const docStats   = data?.doctorStats ?? [];

  const isSingleDay = from === to;
  const trendData   = isSingleDay ? hourly.map((h) => ({ date: h.hour, visitors: h.visitors, consultations: h.consultations, assessments: 0 })) : daily;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1 text-sm">Operational insights and data exports for AfyaCall</p>
        </div>
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-afya-600 px-3 py-2 rounded-xl border border-gray-200 bg-white transition-colors disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="bg-gray-100">
          <TabsTrigger value="overview" className="gap-2">
            <Activity className="w-4 h-4" /> Analytics Overview
          </TabsTrigger>
          <TabsTrigger value="export" className="gap-2">
            <Download className="w-4 h-4" /> Export Data
          </TabsTrigger>
        </TabsList>

        {/* ── ANALYTICS TAB ─────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Date Range */}
          <div className="bg-white rounded-2xl px-5 py-4 border border-gray-100 shadow-sm flex flex-wrap items-center justify-between gap-4">
            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-afya-500" /> Date Range
            </span>
            <DateRangePicker from={from} to={to} onChange={handleRangeChange} />
          </div>

          {/* Stats */}
          {isLoading ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 animate-pulse h-24" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              <StatCard label="Visitors" value={stats?.visitorsToday ?? 0} sub="in selected period" icon={Users} color="bg-afya-500" />
              <StatCard label="Consultations" value={stats?.completedConsultations ?? 0} sub="completed" icon={Stethoscope} color="bg-blue-500" />
              <StatCard label="Assessments" value={data?.totalAssessments ?? 0} sub="health checks done" icon={ClipboardList} color="bg-purple-500" />
              <StatCard label="Avg Duration" value={`${stats?.avgConsultationMinutes ?? 0} min`} sub="per consultation" icon={Clock} color="bg-amber-500" />
            </div>
          )}

          {/* Traffic Chart */}
          <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-afya-500" />
                {isSingleDay ? "Hourly Traffic (Today)" : "Daily Traffic Trend"}
              </h2>
              <span className="text-xs text-gray-400">
                {from === to ? format(new Date(from + "T12:00:00"), "dd MMM yyyy") : `${format(new Date(from + "T12:00:00"), "dd MMM")} – ${format(new Date(to + "T12:00:00"), "dd MMM yyyy")}`}
              </span>
            </div>
            <div className="h-64">
              {trendData.length === 0 ? <EmptyChart label="No traffic data for this period" /> : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gVisitors" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#1E6B4A" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#1E6B4A" stopOpacity={0.02} />
                      </linearGradient>
                      <linearGradient id="gConsultations" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor="#3b82f6" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                    <Tooltip content={<ChartTooltip />} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Area type="monotone" dataKey="visitors"      name="Visitors"      stroke="#1E6B4A" fill="url(#gVisitors)"      strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="consultations" name="Consultations" stroke="#3b82f6" fill="url(#gConsultations)" strokeWidth={2} dot={false} />
                    {!isSingleDay && (
                      <Area type="monotone" dataKey="assessments" name="Assessments" stroke="#8b5cf6" fill="none" strokeWidth={2} strokeDasharray="4 2" dot={false} />
                    )}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Middle row: Risk + Gender + Age */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Risk Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" /> Risk Distribution
              </h2>
              <div className="h-48">
                {riskDist.length === 0 ? <EmptyChart label="No assessment data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={riskDist.map((r) => ({ name: r.level, value: r.count }))}
                        cx="50%"
                        cy="50%"
                        innerRadius={48}
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {riskDist.map((r) => (
                          <Cell key={r.level} fill={RISK_COLORS[r.level] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name) => [`${val} visitors`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex justify-center gap-4 mt-2 flex-wrap">
                {riskDist.map((r) => (
                  <div key={r.level} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: RISK_COLORS[r.level] }} />
                    {r.level} ({r.percentage}%)
                  </div>
                ))}
              </div>
            </div>

            {/* Gender Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-500" /> Gender Split
              </h2>
              <div className="h-48">
                {genderDist.length === 0 ? <EmptyChart label="No visitor data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={genderDist.map((g) => ({ name: GENDER_LABELS[g.gender] ?? g.gender, value: g.count }))}
                        cx="50%"
                        cy="50%"
                        outerRadius={72}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {genderDist.map((g) => (
                          <Cell key={g.gender} fill={GENDER_COLORS[g.gender] ?? "#94a3b8"} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(val, name) => [`${val} visitors`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
              <div className="flex justify-center gap-3 mt-2 flex-wrap">
                {genderDist.map((g) => (
                  <div key={g.gender} className="flex items-center gap-1.5 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: GENDER_COLORS[g.gender] }} />
                    {GENDER_LABELS[g.gender] ?? g.gender} ({g.percentage}%)
                  </div>
                ))}
              </div>
            </div>

            {/* Age Distribution */}
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-purple-500" /> Age Groups
              </h2>
              <div className="h-56">
                {ageDist.length === 0 ? <EmptyChart label="No visitor data" /> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={ageDist.map((a) => ({ name: AGE_LABELS[a.ageGroup] ?? a.ageGroup, count: a.count }))}
                      margin={{ top: 4, right: 4, left: -20, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                      <XAxis dataKey="name" tick={{ fontSize: 10, fill: "#9ca3af" }} />
                      <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} allowDecimals={false} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="count" name="Visitors" radius={[4, 4, 0, 0]}>
                        {ageDist.map((a, i) => (
                          <Cell key={a.ageGroup} fill={`hsl(${260 + i * 14}, 70%, ${55 - i * 2}%)`} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          </div>

          {/* Doctor Performance */}
          {docStats.length > 0 && (
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-afya-500" /> Doctor Performance
              </h2>
              <div className="h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={docStats.map((d) => ({
                      name: d.doctorName.split(" ").slice(-1)[0],
                      fullName: d.doctorName,
                      consultations: d.consultations,
                      avgMins: d.avgDurationMins,
                    }))}
                    margin={{ top: 4, right: 8, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
                    <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9ca3af" }} />
                    <YAxis yAxisId="left"  tick={{ fontSize: 11, fill: "#9ca3af" }} allowDecimals={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11, fill: "#9ca3af" }} unit="m" />
                    <Tooltip
                      content={(props) => {
                        const { active, payload } = props;
                        if (!active || !payload?.length) return null;
                        const d = payload[0]?.payload as { fullName: string; consultations: number; avgMins: number };
                        return (
                          <div className="bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-sm">
                            <p className="font-bold text-gray-700 mb-1">{d.fullName}</p>
                            <p className="text-afya-600">Consultations: {d.consultations}</p>
                            <p className="text-blue-500">Avg duration: {d.avgMins} min</p>
                          </div>
                        );
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="left"  dataKey="consultations" name="Consultations" fill="#1E6B4A" radius={[4, 4, 0, 0]} />
                    <Bar yAxisId="right" dataKey="avgMins"       name="Avg (mins)"   fill="#93c5fd" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </TabsContent>

        {/* ── EXPORT TAB ────────────────────────────────────────────────────── */}
        <TabsContent value="export" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              {/* Report Type */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Select Report Type</h2>
                <div className="space-y-3">
                  {EXPORT_OPTIONS.map((option) => (
                    <button
                      key={option.type}
                      onClick={() => setExportType(option.type)}
                      className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                        exportType === option.type ? "border-afya-500 bg-afya-50" : "border-gray-200 hover:border-afya-300"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{option.icon}</span>
                        <div>
                          <div className="font-semibold text-gray-900">{option.label}</div>
                          <div className="text-sm text-gray-500">{option.description}</div>
                        </div>
                        {exportType === option.type && (
                          <div className="ml-auto w-5 h-5 rounded-full bg-afya-500 flex items-center justify-center">
                            <div className="w-2 h-2 rounded-full bg-white" />
                          </div>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Date Range */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-afya-500" /> Date Range
                </h2>
                <div className="flex flex-wrap gap-3 mb-4">
                  {[
                    { label: "Today", days: 1 },
                    { label: "Last 7 days", days: 7 },
                    { label: "Last 30 days", days: 30 },
                    { label: "All Time", days: 0 },
                  ].map(({ label, days }) => {
                    const today2 = format(new Date(), "yyyy-MM-dd");
                    const preFrom = days === 0 ? "2024-01-01" : format(subDays(new Date(), days - 1), "yyyy-MM-dd");
                    const active = exportFrom === preFrom && exportTo === today2;
                    return (
                      <button
                        key={label}
                        onClick={() => { setExportFrom(preFrom); setExportTo(today2); }}
                        className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                          active ? "bg-afya-600 text-white border-afya-600" : "bg-white border-gray-200 text-gray-600 hover:border-afya-400"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-medium mb-1 block">From</label>
                    <input
                      type="date"
                      value={exportFrom}
                      max={exportTo}
                      onChange={(e) => setExportFrom(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-afya-500"
                    />
                  </div>
                  <div className="pt-5 text-gray-400">→</div>
                  <div className="flex-1">
                    <label className="text-xs text-gray-500 font-medium mb-1 block">To</label>
                    <input
                      type="date"
                      value={exportTo}
                      min={exportFrom}
                      max={format(new Date(), "yyyy-MM-dd")}
                      onChange={(e) => setExportTo(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-afya-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Export Panel */}
            <div className="space-y-4">
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-lg font-bold text-gray-900 mb-4">Export Format</h2>
                <div className="space-y-3">
                  <button
                    onClick={() => setExportFormat("xlsx")}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      exportFormat === "xlsx" ? "border-afya-500 bg-afya-50" : "border-gray-200 hover:border-afya-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileSpreadsheet className="w-6 h-6 text-green-600" />
                      <div>
                        <div className="font-semibold text-gray-900">Excel (.xlsx)</div>
                        <div className="text-xs text-gray-500">Styled headers · coloured rows</div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() => setExportFormat("csv")}
                    className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                      exportFormat === "csv" ? "border-afya-500 bg-afya-50" : "border-gray-200 hover:border-afya-300"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <FileText className="w-6 h-6 text-blue-600" />
                      <div>
                        <div className="font-semibold text-gray-900">CSV</div>
                        <div className="text-xs text-gray-500">Plain text · for data processing</div>
                      </div>
                    </div>
                  </button>
                </div>
              </div>

              <div className="bg-afya-50 rounded-2xl p-5 border border-afya-100 space-y-3">
                <div className="text-sm text-afya-700 space-y-1.5">
                  <div className="flex justify-between">
                    <span className="text-afya-500 font-medium">Type</span>
                    <span className="font-semibold">{EXPORT_OPTIONS.find((o) => o.type === exportType)?.label}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-afya-500 font-medium">Format</span>
                    <span className="font-semibold">.{exportFormat.toUpperCase()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-afya-500 font-medium">From</span>
                    <span className="font-semibold">{format(new Date(exportFrom + "T12:00:00"), "dd MMM yyyy")}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-afya-500 font-medium">To</span>
                    <span className="font-semibold">{format(new Date(exportTo + "T12:00:00"), "dd MMM yyyy")}</span>
                  </div>
                </div>

                <Button onClick={handleExport} loading={isExporting} className="w-full gap-2 mt-1">
                  <Download className="w-4 h-4" />
                  {isExporting ? "Generating..." : "Download Report"}
                </Button>

                {exportFormat === "xlsx" && (
                  <p className="text-xs text-afya-500 text-center flex items-center justify-center gap-1">
                    <FileSpreadsheet className="w-3 h-3" /> Bold green headers · alternating row colours
                  </p>
                )}
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
