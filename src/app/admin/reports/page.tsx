"use client";

import { useState } from "react";
import { Download, FileSpreadsheet, FileText, Calendar } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

type ExportType = "visitors" | "consultations" | "assessments";
type ExportFormat = "xlsx" | "csv";

const EXPORT_OPTIONS: { type: ExportType; label: string; description: string; icon: string }[] = [
  {
    type: "visitors",
    label: "Visitors Report",
    description: "All registered visitors with demographics and queue status",
    icon: "👥",
  },
  {
    type: "consultations",
    label: "Consultations Report",
    description: "All consultations with doctor notes and durations",
    icon: "🩺",
  },
  {
    type: "assessments",
    label: "Health Assessments",
    description: "Health risk assessment results and recommendations",
    icon: "📋",
  },
];

export default function ReportsPage() {
  const [selectedType, setSelectedType] = useState<ExportType>("visitors");
  const [selectedFormat, setSelectedFormat] = useState<ExportFormat>("xlsx");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [isExporting, setIsExporting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const params = new URLSearchParams({
        type: selectedType,
        format: selectedFormat,
        ...(selectedDate && { date: selectedDate }),
      });

      const res = await fetch(`/api/admin/export?${params}`);

      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error ?? "Export failed");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const dateStr = selectedDate || format(new Date(), "yyyy-MM-dd");
      a.download = `afyacall-${selectedType}-${dateStr}.${selectedFormat}`;
      a.click();
      URL.revokeObjectURL(url);

      toast({ variant: "success", title: "Export complete", description: `Downloaded ${a.download}` });
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Export failed",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-black text-gray-900">Reports & Data Export</h1>
        <p className="text-gray-500 mt-1">Download exhibition data for analysis and reporting</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Export Configuration */}
        <div className="lg:col-span-2 space-y-6">
          {/* Report Type */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Select Report Type</h2>
            <div className="space-y-3">
              {EXPORT_OPTIONS.map((option) => (
                <button
                  key={option.type}
                  onClick={() => setSelectedType(option.type)}
                  className={`w-full text-left rounded-xl border-2 p-4 transition-all ${
                    selectedType === option.type
                      ? "border-afya-500 bg-afya-50"
                      : "border-gray-200 hover:border-afya-300"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{option.icon}</span>
                    <div>
                      <div className="font-semibold text-gray-900">{option.label}</div>
                      <div className="text-sm text-gray-500">{option.description}</div>
                    </div>
                    {selectedType === option.type && (
                      <div className="ml-auto w-5 h-5 rounded-full bg-afya-500 flex items-center justify-center">
                        <div className="w-2 h-2 rounded-full bg-white" />
                      </div>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Date Filter */}
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Date Filter</h2>
            <div className="flex items-center gap-4">
              <div className="relative flex-1">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  max={format(new Date(), "yyyy-MM-dd")}
                  className="w-full h-12 pl-11 pr-4 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-afya-500"
                />
              </div>
              {selectedDate && (
                <button
                  onClick={() => setSelectedDate("")}
                  className="text-sm text-gray-500 hover:text-gray-700 px-3 py-2"
                >
                  Clear (all dates)
                </button>
              )}
            </div>
            <p className="text-gray-400 text-xs mt-2">
              {selectedDate ? `Filtering for ${format(new Date(selectedDate), "dd MMMM yyyy")}` : "Showing all records"}
            </p>
          </div>
        </div>

        {/* Export Panel */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Export Format</h2>
            <div className="space-y-3">
              <button
                onClick={() => setSelectedFormat("xlsx")}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  selectedFormat === "xlsx" ? "border-afya-500 bg-afya-50" : "border-gray-200 hover:border-afya-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileSpreadsheet className="w-6 h-6 text-green-600" />
                  <div>
                    <div className="font-semibold text-gray-900">Excel (.xlsx)</div>
                    <div className="text-xs text-gray-500">For spreadsheet analysis</div>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setSelectedFormat("csv")}
                className={`w-full rounded-xl border-2 p-4 text-left transition-all ${
                  selectedFormat === "csv" ? "border-afya-500 bg-afya-50" : "border-gray-200 hover:border-afya-300"
                }`}
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-6 h-6 text-blue-600" />
                  <div>
                    <div className="font-semibold text-gray-900">CSV</div>
                    <div className="text-xs text-gray-500">For data processing</div>
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="bg-afya-50 rounded-2xl p-6 border border-afya-100">
            <div className="text-sm text-afya-700 space-y-2 mb-4">
              <div><strong>Type:</strong> {EXPORT_OPTIONS.find((o) => o.type === selectedType)?.label}</div>
              <div><strong>Format:</strong> .{selectedFormat.toUpperCase()}</div>
              <div><strong>Date:</strong> {selectedDate ? format(new Date(selectedDate), "dd/MM/yyyy") : "All records"}</div>
            </div>

            <Button
              onClick={handleExport}
              loading={isExporting}
              className="w-full gap-2"
            >
              <Download className="w-4 h-4" />
              {isExporting ? "Generating..." : "Download Report"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
