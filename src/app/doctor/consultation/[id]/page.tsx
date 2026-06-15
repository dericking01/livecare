"use client";

import { useEffect, useRef, useState, Suspense } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { Mic, MicOff, Video, VideoOff, PhoneOff, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { consultationNoteSchema, type ConsultationNoteInput } from "@/lib/validations";

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

type ConsultationPhase = "call" | "notes" | "done";

function DoctorConsultationContent() {
  const { id } = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const callFrameRef = useRef<ReturnType<typeof window.DailyIframe.createFrame> | null>(null);

  const [phase, setPhase] = useState<ConsultationPhase>("call");
  const [isLoading, setIsLoading] = useState(true);
  const [isAudioOn, setIsAudioOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const token = searchParams.get("token") ?? "";
  const roomUrl = searchParams.get("room") ? decodeURIComponent(searchParams.get("room")!) : "";

  const { register, handleSubmit, formState: { errors } } = useForm<ConsultationNoteInput>({
    resolver: zodResolver(consultationNoteSchema),
    defaultValues: { followUpDays: 7 },
  });

  useEffect(() => {
    if (!roomUrl || !containerRef.current) return;

    const script = document.createElement("script");
    script.src = "https://unpkg.com/@daily-co/daily-js";
    script.async = true;
    script.onload = () => initCall();
    document.head.appendChild(script);

    return () => {
      script.remove();
      callFrameRef.current?.destroy().catch(console.error);
    };
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

      frame.on("joined-meeting", () => {
        setIsLoading(false);
        let secs = 0;
        const timer = setInterval(() => setDuration(++secs), 1000);
        (window as unknown as Record<string, unknown>)._callTimer = timer;
      });

      await frame.join({ url: roomUrl, token });
    } catch (err) {
      console.error("Join error:", err);
      toast({ variant: "destructive", title: "Failed to join call" });
      setIsLoading(false);
    }
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
    clearInterval((window as unknown as Record<string, unknown>)._callTimer as number);
    await callFrameRef.current?.leave();

    // End consultation on server
    try {
      await fetch(`/api/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "end" }),
      });
    } catch (err) {
      console.error("End consultation error:", err);
    }

    setPhase("notes");
  }

  async function onSubmitNote(data: ConsultationNoteInput) {
    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/consultations/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "add-note", noteData: data }),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      toast({ variant: "success", title: "Notes saved successfully" });
      setPhase("done");
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to save notes",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsSubmittingNote(false);
    }
  }

  if (phase === "notes") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <div className="max-w-2xl w-full">
          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-12 h-12 bg-afya-100 rounded-2xl flex items-center justify-center">
                <FileText className="w-6 h-6 text-afya-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Post-Consultation Notes</h1>
                <p className="text-gray-500 text-sm">Duration: {formatDuration(duration)}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit(onSubmitNote)} className="space-y-6">
              <div className="space-y-2">
                <Label className="text-base">Consultation Summary</Label>
                <Textarea
                  {...register("summary")}
                  placeholder="Describe the patient's condition, symptoms discussed, findings..."
                  className="min-h-[120px]"
                  autoFocus
                />
                {errors.summary && (
                  <p className="text-red-500 text-sm">{errors.summary.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base">Recommendation & Prescription</Label>
                <Textarea
                  {...register("recommendation")}
                  placeholder="Treatment plan, medications, lifestyle changes, follow-up instructions..."
                  className="min-h-[120px]"
                />
                {errors.recommendation && (
                  <p className="text-red-500 text-sm">{errors.recommendation.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label className="text-base">Follow-up in (days)</Label>
                <input
                  type="number"
                  {...register("followUpDays", { valueAsNumber: true })}
                  className="w-32 h-12 rounded-xl border border-input text-center text-lg font-bold focus:outline-none focus:ring-2 focus:ring-afya-500"
                  min="1"
                  max="365"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setPhase("done")}
                >
                  Skip Notes
                </Button>
                <Button
                  type="submit"
                  className="flex-[2]"
                  loading={isSubmittingNote}
                >
                  Save & Complete
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-6">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Video className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-3">Consultation Complete</h1>
          <p className="text-gray-500 mb-8">
            The consultation has been recorded. Duration: {formatDuration(duration)}
          </p>
          <Button onClick={() => router.push("/doctor/dashboard")} variant="default" size="lg">
            Back to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      <div ref={containerRef} className="flex-1 relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 z-10">
            <div className="text-center text-white">
              <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full mx-auto mb-4" />
              <p className="text-lg">Connecting to patient...</p>
            </div>
          </div>
        )}
      </div>

      <div className="bg-gray-900/95 backdrop-blur-sm px-6 py-4">
        <div className="flex items-center justify-between max-w-md mx-auto">
          <div className="text-white/70 text-sm font-mono">{formatDuration(duration)}</div>

          <div className="flex items-center gap-4">
            <button
              onClick={toggleAudio}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isAudioOn ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-500 text-white"
              }`}
            >
              {isAudioOn ? <Mic className="w-6 h-6" /> : <MicOff className="w-6 h-6" />}
            </button>

            <button
              onClick={endCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-lg shadow-red-500/30"
            >
              <PhoneOff className="w-7 h-7" />
            </button>

            <button
              onClick={toggleVideo}
              className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                isVideoOn ? "bg-gray-700 hover:bg-gray-600 text-white" : "bg-red-500 text-white"
              }`}
            >
              {isVideoOn ? <Video className="w-6 h-6" /> : <VideoOff className="w-6 h-6" />}
            </button>
          </div>

          <div className="w-16" />
        </div>
      </div>
    </div>
  );
}

export default function DoctorConsultationPage() {
  return (
    <Suspense fallback={
      <div className="fixed inset-0 bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-16 h-16 border-4 border-white/30 border-t-white rounded-full" />
      </div>
    }>
      <DoctorConsultationContent />
    </Suspense>
  );
}
