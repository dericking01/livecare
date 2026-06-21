"use client";

import { useState, useCallback, useEffect } from "react";
import {
  Bell, BellOff, Edit2, CheckCircle, XCircle, Clock, Users,
  Stethoscope, AlertTriangle, UserPlus, MessageSquare, RefreshCw,
  ChevronLeft, ChevronRight, Filter, Wifi, WifiOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";

// ── Types ─────────────────────────────────────────────────────────────────────

type EventType =
  | "PATIENT_JOINED_QUEUE"
  | "CONSULTATION_STARTED"
  | "CONSULTATION_ENDED_PATIENT"
  | "CONSULTATION_ENDED_DOCTOR"
  | "HIGH_RISK_ASSESSMENT"
  | "NEW_STAFF_ACCOUNT"
  | "LONG_WAIT_ALERT"
  | "DOCTOR_WENT_ONLINE"
  | "DOCTOR_WENT_OFFLINE";

type RecipientType =
  | "PATIENT" | "ALL_DOCTORS" | "ASSIGNED_DOCTOR"
  | "ALL_ADMINS" | "ALL_BOOTH_ATTENDANTS" | "ALL_STAFF" | "CUSTOM_PHONE"
  | "ONLINE_DOCTORS_ONLY" | "ONLINE_DOCTORS_ADMINS_BOOTH";

type LogStatus = "PENDING" | "SENT" | "FAILED" | "SKIPPED";

interface NotificationTemplate {
  id: string;
  eventType: EventType;
  name: string;
  description: string;
  messageTemplate: string;
  recipientType: RecipientType;
  isEnabled: boolean;
  updatedAt: string;
  _count: { logs: number };
  logs: { createdAt: string }[];
}

interface NotificationLog {
  id: string;
  eventType: EventType;
  recipientName: string;
  recipientPhone: string;
  recipientType: RecipientType;
  renderedMessage: string;
  status: LogStatus;
  errorMessage: string | null;
  gatewayRequestId: string | null;
  originatorConvId: string;
  createdAt: string;
  template: { name: string } | null;
}

interface LogsPage {
  items: NotificationLog[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const EVENT_META: Record<EventType, {
  label: string;
  icon: React.ElementType;
  color: string;
  bg: string;
  variables: string[];
}> = {
  PATIENT_JOINED_QUEUE: {
    label: "Patient Joined Queue",
    icon: Users,
    color: "text-blue-600",
    bg: "bg-blue-100",
    variables: ["patientName", "patientPhone", "queueNumber", "date", "time"],
  },
  CONSULTATION_STARTED: {
    label: "Consultation Started",
    icon: Stethoscope,
    color: "text-afya-600",
    bg: "bg-afya-100",
    variables: ["patientName", "doctorName", "date", "time"],
  },
  CONSULTATION_ENDED_PATIENT: {
    label: "Session Ended (Patient)",
    icon: CheckCircle,
    color: "text-green-600",
    bg: "bg-green-100",
    variables: ["patientName", "doctorName", "duration", "date"],
  },
  CONSULTATION_ENDED_DOCTOR: {
    label: "Session Ended (Doctor)",
    icon: MessageSquare,
    color: "text-purple-600",
    bg: "bg-purple-100",
    variables: ["patientName", "doctorName", "duration", "date"],
  },
  HIGH_RISK_ASSESSMENT: {
    label: "High Risk Assessment",
    icon: AlertTriangle,
    color: "text-red-600",
    bg: "bg-red-100",
    variables: ["patientName", "patientPhone", "riskScore", "riskLevel", "date"],
  },
  NEW_STAFF_ACCOUNT: {
    label: "New Staff Account",
    icon: UserPlus,
    color: "text-orange-600",
    bg: "bg-orange-100",
    variables: ["staffName", "staffRole", "recipientName", "date"],
  },
  LONG_WAIT_ALERT: {
    label: "Long Wait Alert",
    icon: Clock,
    color: "text-yellow-700",
    bg: "bg-yellow-100",
    variables: ["patientName", "queueNumber", "waitMinutes", "date", "time"],
  },
  DOCTOR_WENT_ONLINE: {
    label: "Doctor Went Online",
    icon: Wifi,
    color: "text-green-600",
    bg: "bg-green-100",
    variables: ["doctorName", "date", "time"],
  },
  DOCTOR_WENT_OFFLINE: {
    label: "Doctor Went Offline",
    icon: WifiOff,
    color: "text-gray-500",
    bg: "bg-gray-100",
    variables: ["doctorName", "date", "time"],
  },
};

const RECIPIENT_LABELS: Record<RecipientType, string> = {
  PATIENT:                    "Patient",
  ALL_DOCTORS:                "All Active Doctors",
  ASSIGNED_DOCTOR:            "Assigned Doctor",
  ALL_ADMINS:                 "All Active Admins",
  ALL_BOOTH_ATTENDANTS:       "All Active Booth Attendants",
  ALL_STAFF:                  "All Active Staff",
  CUSTOM_PHONE:               "New User (their phone)",
  ONLINE_DOCTORS_ONLY:        "Online Doctors Only",
  ONLINE_DOCTORS_ADMINS_BOOTH:"Online Doctors + Admins + Booth",
};

const STATUS_STYLES: Record<LogStatus, { label: string; class: string }> = {
  SENT:    { label: "Sent",    class: "bg-green-100 text-green-700" },
  FAILED:  { label: "Failed",  class: "bg-red-100 text-red-700" },
  PENDING: { label: "Pending", class: "bg-yellow-100 text-yellow-700" },
  SKIPPED: { label: "Skipped", class: "bg-gray-100 text-gray-500" },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(iso: string) {
  return new Date(iso).toLocaleString("en-TZ", {
    day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit",
  });
}

function charCount(s: string) {
  const sms = Math.ceil(s.length / 160);
  return `${s.length} chars · ~${sms} SMS`;
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

function EditDialog({
  template,
  onClose,
  onSaved,
}: {
  template: NotificationTemplate;
  onClose: () => void;
  onSaved: (t: NotificationTemplate) => void;
}) {
  const [message,       setMessage]       = useState(template.messageTemplate);
  const [recipientType, setRecipientType] = useState<RecipientType>(template.recipientType);
  const [saving,        setSaving]        = useState(false);
  const meta = EVENT_META[template.eventType];

  async function save() {
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/notifications/templates/${template.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messageTemplate: message, recipientType }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast({ variant: "success", title: "Template saved" });
      onSaved({ ...template, messageTemplate: message, recipientType });
    } catch (err) {
      toast({ variant: "destructive", title: "Save failed", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${meta.bg} flex items-center justify-center`}>
              <meta.icon className={`w-4 h-4 ${meta.color}`} />
            </div>
            {meta.label}
          </DialogTitle>
          <DialogDescription>{template.description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Recipient Type */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Send To
            </label>
            <select
              value={recipientType}
              onChange={(e) => setRecipientType(e.target.value as RecipientType)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-afya-500"
            >
              <optgroup label="Patient">
                <option value="PATIENT">Patient (the visitor)</option>
                <option value="CUSTOM_PHONE">New User (their own phone)</option>
              </optgroup>
              <optgroup label="Doctors">
                <option value="ONLINE_DOCTORS_ONLY">Online Doctors Only ★</option>
                <option value="ALL_DOCTORS">All Active Doctors</option>
                <option value="ASSIGNED_DOCTOR">Assigned Doctor (for that session)</option>
              </optgroup>
              <optgroup label="Staff">
                <option value="ONLINE_DOCTORS_ADMINS_BOOTH">Online Doctors + Admins + Booth ★</option>
                <option value="ALL_ADMINS">All Active Admins</option>
                <option value="ALL_BOOTH_ATTENDANTS">All Active Booth Attendants</option>
                <option value="ALL_STAFF">All Active Staff</option>
              </optgroup>
            </select>
            {(recipientType === "ONLINE_DOCTORS_ONLY" || recipientType === "ONLINE_DOCTORS_ADMINS_BOOTH") && (
              <p className="text-xs text-blue-600 mt-1">
                ★ Only staff with a phone number who are marked Active (and Online for doctors) will receive this SMS.
              </p>
            )}
          </div>

          {/* Message template */}
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1.5">
              Message Template
            </label>
            <Textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={5}
              maxLength={1600}
              className="font-mono text-sm resize-none"
              placeholder="Enter your SMS message..."
            />
            <div className="text-xs text-gray-400 mt-1 text-right">{charCount(message)}</div>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-500 mb-2 uppercase tracking-wide">
              Available variables — click to insert
            </div>
            <div className="flex flex-wrap gap-1.5">
              {meta.variables.map((v) => (
                <code
                  key={v}
                  className="text-xs bg-white border border-gray-200 text-blue-700 px-2 py-0.5 rounded cursor-pointer hover:bg-blue-50"
                  onClick={() => setMessage((m) => m + `{{${v}}}`)}
                  title={`Click to insert {{${v}}}`}
                >
                  {`{{${v}}}`}
                </code>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving} disabled={!message.trim()}>
            Save Template
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Template Card ─────────────────────────────────────────────────────────────

function TemplateCard({
  template,
  onToggle,
  onEdit,
}: {
  template: NotificationTemplate;
  onToggle: (id: string, enabled: boolean) => void;
  onEdit: (t: NotificationTemplate) => void;
}) {
  const meta = EVENT_META[template.eventType];
  const lastSent = template.logs[0]?.createdAt;

  return (
    <div className={`bg-white rounded-2xl border ${template.isEnabled ? "border-gray-100" : "border-dashed border-gray-200 opacity-70"} shadow-sm p-5 flex flex-col gap-4`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl ${meta.bg} flex items-center justify-center shrink-0`}>
            <meta.icon className={`w-5 h-5 ${meta.color}`} />
          </div>
          <div>
            <div className="font-semibold text-gray-900 text-sm">{meta.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">
              → {RECIPIENT_LABELS[template.recipientType]}
            </div>
          </div>
        </div>

        {/* Toggle */}
        <button
          onClick={() => onToggle(template.id, !template.isEnabled)}
          className={`relative w-11 h-6 rounded-full transition-colors shrink-0 ${
            template.isEnabled ? "bg-afya-500" : "bg-gray-200"
          }`}
          title={template.isEnabled ? "Click to disable" : "Click to enable"}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
              template.isEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      <p className="text-xs text-gray-500 leading-relaxed">{template.description}</p>

      {/* Message preview */}
      <div className="bg-gray-50 rounded-xl p-3">
        <div className="text-xs text-gray-400 font-medium mb-1">Message preview</div>
        <div className="text-xs text-gray-700 font-mono leading-relaxed line-clamp-3">
          {template.messageTemplate}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-400">
          {template._count.logs > 0
            ? `${template._count.logs} sent${lastSent ? ` · last ${fmt(lastSent)}` : ""}`
            : "No sends yet"}
        </div>
        <Button variant="outline" size="sm" onClick={() => onEdit(template)} className="gap-1.5 h-8 text-xs">
          <Edit2 className="w-3.5 h-3.5" />
          Edit
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [activeTab, setActiveTab]     = useState<"templates" | "logs">("templates");
  const [templates, setTemplates]     = useState<NotificationTemplate[]>([]);
  const [templatesLoading, setTL]     = useState(true);
  const [editingTemplate, setEditing] = useState<NotificationTemplate | null>(null);

  // Logs state
  const [logs, setLogs]               = useState<LogsPage | null>(null);
  const [logsLoading, setLL]          = useState(false);
  const [logsPage, setLogsPage]       = useState(1);
  const [filterStatus, setFS]         = useState<LogStatus | "">("");
  const [filterEvent, setFE]          = useState<EventType | "">("");

  // ── Fetch templates ──────────────────────────────────────────────────────
  const fetchTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/notifications/templates");
      const json = await res.json();
      if (json.success) setTemplates(json.data);
    } catch (err) {
      console.error("Templates fetch error:", err);
    } finally {
      setTL(false);
    }
  }, []);

  // ── Fetch logs ───────────────────────────────────────────────────────────
  const fetchLogs = useCallback(async (page = 1, status = filterStatus, event = filterEvent) => {
    setLL(true);
    try {
      const params = new URLSearchParams({ page: String(page), size: "50" });
      if (status) params.set("status", status);
      if (event)  params.set("eventType", event);
      const res = await fetch(`/api/admin/notifications/logs?${params}`);
      const json = await res.json();
      if (json.success) setLogs(json.data);
    } catch (err) {
      console.error("Logs fetch error:", err);
    } finally {
      setLL(false);
    }
  }, [filterStatus, filterEvent]);

  useEffect(() => { fetchTemplates(); }, [fetchTemplates]);
  useEffect(() => {
    if (activeTab === "logs") fetchLogs(1);
  }, [activeTab, fetchLogs]);

  // ── Handlers ─────────────────────────────────────────────────────────────
  async function toggleTemplate(id: string, enabled: boolean) {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isEnabled: enabled } : t))
    );
    try {
      const res = await fetch(`/api/admin/notifications/templates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isEnabled: enabled }),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      toast({
        variant: "success",
        title: enabled ? "Notification enabled" : "Notification disabled",
      });
    } catch (err) {
      // revert
      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, isEnabled: !enabled } : t))
      );
      toast({ variant: "destructive", title: "Toggle failed", description: (err as Error).message });
    }
  }

  function handleSaved(updated: NotificationTemplate) {
    setTemplates((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    setEditing(null);
  }

  // Summary stats
  const enabledCount = templates.filter((t) => t.isEnabled).length;
  const totalSent    = templates.reduce((s, t) => s + t._count.logs, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">Configure and monitor SMS notifications</p>
        </div>
        <Button
          variant="outline"
          onClick={() => { fetchTemplates(); if (activeTab === "logs") fetchLogs(logsPage); }}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Templates",    value: templates.length,  color: "bg-gray-100 text-gray-600" },
          { label: "Enabled",            value: enabledCount,       color: "bg-green-100 text-green-600" },
          { label: "Disabled",           value: templates.length - enabledCount, color: "bg-gray-100 text-gray-400" },
          { label: "Total SMS Sent",     value: totalSent,          color: "bg-blue-100 text-blue-600" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className={`text-3xl font-black text-gray-900`}>{s.value}</div>
            <div className="text-sm text-gray-500 mt-0.5">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 gap-1">
        {(["templates", "logs"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-5 py-2.5 text-sm font-semibold capitalize rounded-t-lg transition-colors ${
              activeTab === tab
                ? "text-afya-700 border-b-2 border-afya-600 bg-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            {tab === "templates" ? "SMS Templates" : "Delivery Logs"}
          </button>
        ))}
      </div>

      {/* ── TEMPLATES TAB ──────────────────────────────────────────────────── */}
      {activeTab === "templates" && (
        <div>
          {templatesLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-afya-500/30 border-t-afya-500 rounded-full" />
            </div>
          ) : templates.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No templates found. Run the seed script to create defaults.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {templates.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onToggle={toggleTemplate}
                  onEdit={setEditing}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── LOGS TAB ───────────────────────────────────────────────────────── */}
      {activeTab === "logs" && (
        <div className="space-y-4">
          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Filter className="w-4 h-4" />
              Filter:
            </div>

            <select
              value={filterStatus}
              onChange={(e) => {
                setFS(e.target.value as LogStatus | "");
                setLogsPage(1);
                fetchLogs(1, e.target.value as LogStatus | "", filterEvent);
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-afya-500"
            >
              <option value="">All Statuses</option>
              <option value="SENT">Sent</option>
              <option value="FAILED">Failed</option>
              <option value="SKIPPED">Skipped</option>
              <option value="PENDING">Pending</option>
            </select>

            <select
              value={filterEvent}
              onChange={(e) => {
                setFE(e.target.value as EventType | "");
                setLogsPage(1);
                fetchLogs(1, filterStatus, e.target.value as EventType | "");
              }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-afya-500"
            >
              <option value="">All Events</option>
              {(Object.keys(EVENT_META) as EventType[]).map((e) => (
                <option key={e} value={e}>{EVENT_META[e].label}</option>
              ))}
            </select>

            {(filterStatus || filterEvent) && (
              <button
                onClick={() => {
                  setFS(""); setFE(""); setLogsPage(1);
                  fetchLogs(1, "", "");
                }}
                className="text-xs text-red-500 hover:text-red-700 underline"
              >
                Clear filters
              </button>
            )}

            {logs && (
              <span className="text-xs text-gray-400 ml-auto">
                {logs.total} total entries
              </span>
            )}
          </div>

          {logsLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="animate-spin w-8 h-8 border-2 border-afya-500/30 border-t-afya-500 rounded-full" />
            </div>
          ) : !logs || logs.items.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <BellOff className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>No notification logs found.</p>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50">
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Time</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Event</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Recipient</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Phone</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Status</th>
                      <th className="text-left px-5 py-3 font-semibold text-gray-500 text-xs uppercase">Message</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {logs.items.map((log) => {
                      const meta   = EVENT_META[log.eventType];
                      const status = STATUS_STYLES[log.status];
                      return (
                        <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-5 py-3 text-xs text-gray-500 whitespace-nowrap">
                            {fmt(log.createdAt)}
                          </td>
                          <td className="px-5 py-3">
                            <div className="flex items-center gap-1.5">
                              <meta.icon className={`w-3.5 h-3.5 ${meta.color}`} />
                              <span className="text-xs font-medium text-gray-700">{meta.label}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3 text-xs text-gray-700">{log.recipientName}</td>
                          <td className="px-5 py-3 text-xs font-mono text-gray-500">{log.recipientPhone}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${status.class}`}>
                              {log.status === "SENT"   && <CheckCircle className="w-3 h-3" />}
                              {log.status === "FAILED" && <XCircle    className="w-3 h-3" />}
                              {status.label}
                            </span>
                            {log.status === "FAILED" && log.errorMessage && (
                              <div className="text-xs text-red-500 mt-0.5 max-w-[180px] truncate" title={log.errorMessage}>
                                {log.errorMessage}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3 max-w-xs">
                            <div className="text-xs text-gray-600 truncate" title={log.renderedMessage}>
                              {log.renderedMessage}
                            </div>
                            {log.gatewayRequestId && (
                              <div className="text-xs text-gray-400 font-mono mt-0.5">
                                GW: {log.gatewayRequestId.substring(0, 12)}…
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {logs.totalPages > 1 && (
                <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Page {logs.page} of {logs.totalPages}
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logs.page <= 1}
                      onClick={() => {
                        const p = logs.page - 1;
                        setLogsPage(p);
                        fetchLogs(p);
                      }}
                      className="gap-1 h-8"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" /> Prev
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={logs.page >= logs.totalPages}
                      onClick={() => {
                        const p = logs.page + 1;
                        setLogsPage(p);
                        fetchLogs(p);
                      }}
                      className="gap-1 h-8"
                    >
                      Next <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Edit dialog */}
      {editingTemplate && (
        <EditDialog
          template={editingTemplate}
          onClose={() => setEditing(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
