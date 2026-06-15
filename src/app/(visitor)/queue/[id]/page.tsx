"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Clock, Users, Video, X, CheckCircle } from "lucide-react";
import Link from "next/link";
import { getSocket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { KioskLayout, AfyaLogo } from "@/components/shared/KioskLayout";
import { formatWaitTime, timeAgo } from "@/lib/utils";

type QueueState = {
  entry: {
    id: string;
    queueNumber: number;
    status: string;
    waitStartAt: string;
    visitor: { fullName: string };
    consultation: {
      id: string;
      room: { roomUrl: string; visitorToken: string } | null;
    } | null;
  } | null;
  position: number;
  estimatedWaitMins: number;
  waitedMins: number;
};

type DoctorReadyEvent = {
  queueEntryId: string;
  consultationId: string;
  roomUrl: string;
  visitorToken: string;
};

export default function QueuePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [state, setState] = useState<QueueState>({
    entry: null,
    position: 0,
    estimatedWaitMins: 0,
    waitedMins: 0,
  });
  const [doctorReady, setDoctorReady] = useState<DoctorReadyEvent | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchQueueStatus = useCallback(async () => {
    try {
      const res = await fetch(`/api/queue/${id}`);
      const json = await res.json();
      if (json.success) {
        setState(json.data);

        if (json.data.entry?.consultation?.room && json.data.entry.status === "IN_PROGRESS") {
          setDoctorReady({
            queueEntryId: id,
            consultationId: json.data.entry.consultation.id,
            roomUrl: json.data.entry.consultation.room.roomUrl,
            visitorToken: json.data.entry.consultation.room.visitorToken,
          });
        }
      }
    } catch (err) {
      console.error("Queue fetch error:", err);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchQueueStatus();

    const socket = getSocket();
    socket.emit("queue:join", id);

    socket.on("queue:doctor-ready", (data: DoctorReadyEvent) => {
      if (data.queueEntryId === id) {
        setDoctorReady(data);
        fetchQueueStatus();
      }
    });

    socket.on("queue:position-changed", (data: { queueEntryId: string; position: number; estimatedWaitMins: number }) => {
      if (data.queueEntryId === id) {
        setState((s) => ({ ...s, position: data.position, estimatedWaitMins: data.estimatedWaitMins }));
      }
    });

    socket.on("consultation:ended", () => {
      fetchQueueStatus();
    });

    // Refresh every 30 seconds
    const interval = setInterval(fetchQueueStatus, 30_000);

    return () => {
      socket.off("queue:doctor-ready");
      socket.off("queue:position-changed");
      socket.off("consultation:ended");
      clearInterval(interval);
    };
  }, [id, fetchQueueStatus]);

  async function handleCancel() {
    try {
      await fetch(`/api/queue/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      });
      router.push("/");
    } catch (err) {
      console.error("Cancel error:", err);
    }
  }

  function joinConsultation() {
    if (doctorReady) {
      router.push(`/consultation/${doctorReady.consultationId}?token=${doctorReady.visitorToken}&room=${encodeURIComponent(doctorReady.roomUrl)}`);
    }
  }

  if (isLoading) {
    return (
      <KioskLayout centered>
        <div className="text-center text-white">
          <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4" />
          <p className="text-lg">Loading your queue status...</p>
        </div>
      </KioskLayout>
    );
  }

  const entry = state.entry;
  const isCompleted = entry?.status === "COMPLETED";
  const isCancelled = entry?.status === "CANCELLED";

  if (isCompleted) {
    return (
      <KioskLayout centered>
        <div className="py-8 px-4 max-w-md mx-auto text-center">
          <div className="bg-white rounded-3xl p-10 shadow-2xl">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-3">Consultation Complete</h1>
            <p className="text-gray-500 mb-8">
              Thank you for using AfyaCall. We hope your consultation was helpful.
            </p>
            <Link href="/">
              <Button variant="kiosk" className="w-full">Return to Home</Button>
            </Link>
          </div>
        </div>
      </KioskLayout>
    );
  }

  return (
    <KioskLayout centered>
      <div className="py-8 px-4 max-w-md mx-auto">
        <div className="text-center mb-6">
          <AfyaLogo size="sm" />
        </div>

        {doctorReady ? (
          // Doctor Ready State
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center animate-slide-up">
            <div className="w-24 h-24 bg-afya-100 rounded-full flex items-center justify-center mx-auto mb-6 pulse-green">
              <Video className="w-12 h-12 text-afya-600" />
            </div>
            <h1 className="text-3xl font-black text-gray-900 mb-3">Doctor is Ready!</h1>
            <p className="text-gray-500 mb-2">
              Your doctor is waiting in the video room.
            </p>
            <p className="text-afya-600 font-semibold mb-8">Please join now.</p>

            <Button variant="kiosk" className="w-full mb-4" onClick={joinConsultation}>
              <Video className="w-6 h-6 mr-2" />
              Join Video Consultation
            </Button>
          </div>
        ) : (
          // Waiting State
          <div className="bg-white rounded-3xl p-8 shadow-2xl text-center">
            <div className="inline-flex items-center gap-2 bg-afya-50 text-afya-700 rounded-full px-4 py-2 text-sm font-semibold mb-6">
              <div className="w-2 h-2 bg-afya-500 rounded-full animate-pulse" />
              In Queue
            </div>

            {/* Queue Number */}
            <div className="mb-8">
              <div className="text-gray-500 text-sm font-medium mb-2">Your Queue Number</div>
              <div className="text-8xl font-black text-afya-600 leading-none animate-number-tick">
                #{entry?.queueNumber ?? "—"}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 mb-8">
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-2">
                  <Users className="w-4 h-4" />
                  Position
                </div>
                <div className="text-3xl font-black text-gray-900">
                  {state.position > 0 ? `#${state.position}` : "—"}
                </div>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-center gap-2 text-gray-500 text-sm mb-2">
                  <Clock className="w-4 h-4" />
                  Est. Wait
                </div>
                <div className="text-xl font-black text-gray-900">
                  {formatWaitTime(state.estimatedWaitMins)}
                </div>
              </div>
            </div>

            {/* Waiting message */}
            <div className="bg-afya-50 rounded-2xl p-4 mb-6">
              <p className="text-afya-700 text-sm font-medium">
                Please stay nearby — you'll be notified when your doctor is ready.
              </p>
              <p className="text-afya-500 text-xs mt-1">
                Waiting since {entry?.waitStartAt ? timeAgo(entry.waitStartAt) : "just now"}
              </p>
            </div>

            {/* Cancel */}
            <button
              onClick={handleCancel}
              className="flex items-center justify-center gap-2 text-gray-400 hover:text-red-500 text-sm transition-colors mx-auto"
            >
              <X className="w-4 h-4" />
              Cancel & Leave Queue
            </button>
          </div>
        )}
      </div>
    </KioskLayout>
  );
}
