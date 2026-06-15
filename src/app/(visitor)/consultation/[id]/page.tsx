"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toaster";

declare global {
  interface Window {
    DailyIframe: {
      createFrame: (
        container: HTMLElement,
        options: Record<string, unknown>
      ) => {
        join: (opts: Record<string, unknown>) => Promise<void>;
        leave: () => Promise<void>;
        destroy: () => Promise<void>;
        setLocalAudio: (enabled: boolean) => void;
        setLocalVideo: (enabled: boolean) => void;
        on: (event: string, handler: (...args: unknown[]) => void) => void;
      };
    };
  }
}

function VisitorConsultationContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<ReturnType<typeof window.DailyIframe.createFrame> | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [isEnded, setIsEnded] = useState(false);

  const rawToken = searchParams.get("token") ?? "";
  const token = rawToken.includes("%") ? decodeURIComponent(rawToken) : rawToken;
  const rawRoom = searchParams.get("room") ?? "";
  const roomUrl = rawRoom.includes("%") ? decodeURIComponent(rawRoom) : rawRoom;

  useEffect(() => {
    if (!roomUrl || !token || !containerRef.current) return;

    let mounted = true;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/@daily-co/daily-js@0.70.0";
    script.async = true;
    script.onload = () => { if (mounted) initCall(); };
    script.onerror = () => {
      if (mounted) toast({ variant: "destructive", title: "Failed to load video SDK", description: "Check your internet connection" });
    };
    document.head.appendChild(script);

    return () => {
      mounted = false;
      script.remove();
      callFrameRef.current?.destroy().catch(console.error);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomUrl, token]);

  async function initCall() {
    if (!containerRef.current || !window.DailyIframe) return;

    try {
      const frame = window.DailyIframe.createFrame(containerRef.current, {
        iframeStyle: { width: "100%", height: "100%", border: "0" },
        showLeaveButton: false,
        showFullscreenButton: false,
      });

      callFrameRef.current = frame;

      // Hide our spinner immediately — Daily.co iframe has its own connecting UI
      setIsLoading(false);

      frame.on("joined-meeting", () => {
        startTimer();
      });

      frame.on("left-meeting", () => {
        setIsEnded(true);
      });

      frame.on("error", (e: unknown) => {
        const msg = e && typeof e === "object" && "errorMsg" in e
          ? String((e as Record<string, unknown>).errorMsg)
          : String(e);
        console.error("[Daily] Error event:", e);
        toast({ variant: "destructive", title: "Video connection error", description: msg });
      });

      console.log("[Daily] Joining room:", roomUrl, "token length:", token.length);
      await frame.join({ url: roomUrl, token });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[Daily] Join error:", msg, { roomUrl, tokenLen: token.length });
      toast({ variant: "destructive", title: "Failed to join call", description: msg });
    }
  }

  let timerInterval: ReturnType<typeof setInterval>;
  function startTimer() {
    timerInterval = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(timerInterval);
  }

  function formatDuration(secs: number) {
    const m = Math.floor(secs / 60).toString().padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  }

  function toggleAudio() {
    callFrameRef.current?.setLocalAudio(!isAudioOn);
    setIsAudioOn((v) => !v);
  }

  function toggleVideo() {
    callFrameRef.current?.setLocalVideo(!isVideoOn);
    setIsVideoOn((v) => !v);
  }

  async function endCall() {
    await callFrameRef.current?.leave();
    setIsEnded(true);
  }

  if (isEnded) {
    return (
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-green-400" />
          </div>
          <h1 className="text-3xl font-bold mb-3">Consultation Complete</h1>
          <p className="text-gray-300 mb-8">Duration: {formatDuration(duration)}</p>
          <p className="text-gray-400 mb-8 text-sm max-w-xs">
            Thank you for your consultation. Your doctor will send follow-up notes shortly.
          </p>
          <Button
            variant="kiosk"
            onClick={() => router.push("/")}
            className="min-w-[200px]"
          >
            Return to Home
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Video Frame */}
      <div ref={containerRef} className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center text-white">
              <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4" />
              <p className="text-lg">Connecting to doctor...</p>
            </div>
          </div>
        )}
      </div>

      {/* Controls Bar */}
      <div className="bg-gray-900/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          {/* Timer */}
          <div className="text-white/70 text-sm font-mono">
            {formatDuration(duration)}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-4">
            <button
              onClick={toggleAudio}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isAudioOn
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>

            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center transition-all shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="w-7 h-7" />
            </button>

            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isVideoOn
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-red-500 hover:bg-red-600 text-white"
              }`}
            >
              {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
          </div>

          {/* Placeholder */}
          <div className="w-16" />
        </div>
      </div>
    </div>
  );
}

export default function VisitorConsultationPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full" />
      </div>
    }>
      <VisitorConsultationContent />
    </Suspense>
  );
}
