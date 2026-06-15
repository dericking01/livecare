"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  Users, Clock, Video, RefreshCw, Play, AlertCircle,
} from "lucide-react";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { formatDate, waitMinutes, formatWaitTime } from "@/lib/utils";
import type { QueueEntryWithVisitor } from "@/types";

type Stats = { waiting: number; active: number; completed: number };

export default function DoctorDashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueEntryWithVisitor[]>([]);
  const [stats, setStats] = useState<Stats>({ waiting: 0, active: 0, completed: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [startingId, setStartingId] = useState<string | null>(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await fetch("/api/queue?status=WAITING");
      const json = await res.json();
      if (json.success) {
        const data = json.data as QueueEntryWithVisitor[];
        setQueue(data);
        setStats((s) => ({ ...s, waiting: data.length }));
      }
    } catch (err) {
      console.error("Queue fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const [activeRes, completedRes] = await Promise.all([
        fetch("/api/queue?status=IN_PROGRESS"),
        fetch("/api/queue?status=COMPLETED"),
      ]);
      const [activeJson, completedJson] = await Promise.all([activeRes.json(), completedRes.json()]);
      setStats((s) => ({
        ...s,
        active: activeJson.success ? activeJson.data.length : s.active,
        completed: completedJson.success ? completedJson.data.length : s.completed,
      }));
    } catch {}
  }, []);

  useEffect(() => {
    fetchQueue();
    fetchStats();

    const socket = getSocket();
    if (session?.user?.id) {
      socket.emit("doctor:join", session.user.id);
    }

    socket.on("queue:updated", () => {
      fetchQueue();
      fetchStats();
    });

    socket.on("doctor:dashboard-update", () => {
      fetchQueue();
      fetchStats();
    });

    const interval = setInterval(() => {
      fetchQueue();
      fetchStats();
    }, 15_000);

    return () => {
      socket.off("queue:updated");
      socket.off("doctor:dashboard-update");
      clearInterval(interval);
    };
  }, [fetchQueue, fetchStats, session]);

  async function startConsultation(queueEntryId: string) {
    setStartingId(queueEntryId);
    try {
      const res = await fetch("/api/consultations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ queueEntryId }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      toast({
        variant: "success",
        title: "Consultation started",
        description: "Connecting to video room...",
      });

      router.push(
        `/doctor/consultation/${json.data.id}?token=${encodeURIComponent(json.data.room.doctorToken)}&room=${encodeURIComponent(json.data.room.roomUrl)}`
      );
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to start consultation",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setStartingId(null);
    }
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Doctor Dashboard</h1>
          <p className="text-gray-500 mt-1">Good {new Date().getHours() < 12 ? "morning" : "afternoon"}, {session?.user?.name?.split(" ")[0]}</p>
        </div>
        <Button
          variant="outline"
          onClick={() => { fetchQueue(); fetchStats(); }}
          className="gap-2"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-6">
        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Waiting</span>
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="text-4xl font-black text-gray-900">{stats.waiting}</div>
          <div className="text-sm text-gray-500 mt-1">patients in queue</div>
          {stats.waiting > 0 && (
            <div className="mt-3 h-1.5 bg-blue-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${Math.min(100, (stats.waiting / 10) * 100)}%` }}
              />
            </div>
          )}
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">In Progress</span>
            <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
              <Video className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="text-4xl font-black text-gray-900">{stats.active}</div>
          <div className="text-sm text-gray-500 mt-1">active consultations</div>
        </div>

        <div className="stat-card">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-500">Completed Today</span>
            <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
              <Clock className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <div className="text-4xl font-black text-gray-900">{stats.completed}</div>
          <div className="text-sm text-gray-500 mt-1">consultations done</div>
        </div>
      </div>

      {/* Queue Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-gray-900">Waiting Queue</h2>
            <p className="text-sm text-gray-500 mt-0.5">
              {queue.length} patient{queue.length !== 1 ? "s" : ""} waiting
            </p>
          </div>
          {queue.length > 0 && (
            <div className="flex items-center gap-2 text-sm text-orange-600 font-medium">
              <AlertCircle className="w-4 h-4" />
              Patients are waiting
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-afya-500/30 border-t-afya-500 rounded-full" />
          </div>
        ) : queue.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Users className="w-8 h-8 text-gray-300" />
            </div>
            <h3 className="text-lg font-semibold text-gray-600">No patients waiting</h3>
            <p className="text-gray-400 text-sm mt-1">New patients will appear here automatically</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">#</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Patient</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Joined At</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Wait Time</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Status</th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-500">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {queue.map((entry, index) => {
                  const waited = waitMinutes(entry.waitStartAt);
                  const isUrgent = waited > 15;

                  return (
                    <tr
                      key={entry.id}
                      className={`hover:bg-gray-50 transition-colors ${isUrgent ? "bg-red-50/30" : ""}`}
                    >
                      <td className="px-6 py-4">
                        <span className="queue-badge text-sm w-12 h-10">
                          {entry.queueNumber}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{entry.visitor.fullName}</div>
                        <div className="text-sm text-gray-500">{entry.visitor.phone}</div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {formatDate(entry.waitStartAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`text-sm font-medium ${isUrgent ? "text-red-600" : "text-gray-700"}`}>
                          {formatWaitTime(waited)}
                        </span>
                        {isUrgent && (
                          <span className="ml-2 text-xs text-red-500">⚠ Long wait</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant="waiting">
                          {index + 1 === 1 ? "Next" : `Position ${index + 1}`}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => startConsultation(entry.id)}
                          loading={startingId === entry.id}
                          className="gap-2"
                        >
                          <Play className="w-4 h-4" />
                          Start
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
