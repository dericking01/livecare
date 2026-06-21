// Server-side socket emitter (used in API routes and server actions)
import type { Server as SocketServer } from "socket.io";

function getIo(): SocketServer | undefined {
  return (global as Record<string, unknown>).io as SocketServer | undefined;
}

export function emitToRoom(room: string, event: string, data: unknown): void {
  const io = getIo();
  if (io) {
    io.to(room).emit(event, data);
  }
}

export function emitQueueUpdate(queueEntries: unknown[]): void {
  emitToRoom("doctor:dashboard", "queue:updated", { queueEntries });
  emitToRoom("admin:dashboard", "queue:updated", { queueEntries });
}

export function emitDoctorReady(
  queueEntryId: string,
  consultationId: string,
  roomUrl: string,
  visitorToken: string
): void {
  emitToRoom(`queue:${queueEntryId}`, "queue:doctor-ready", {
    queueEntryId,
    consultationId,
    roomUrl,
    visitorToken,
  });
  emitToRoom("doctor:dashboard", "doctor:dashboard-update", {});
  emitToRoom("admin:dashboard", "admin:stats-update", {});
}

export function emitConsultationEnded(
  queueEntryId: string,
  consultationId: string
): void {
  emitToRoom(`queue:${queueEntryId}`, "consultation:ended", { consultationId });
  emitToRoom("doctor:dashboard", "queue:updated", {});
  emitToRoom("admin:dashboard", "admin:stats-update", {});
}

export function emitQueuePositionUpdate(
  queueEntryId: string,
  position: number,
  estimatedWaitMins: number
): void {
  emitToRoom(`queue:${queueEntryId}`, "queue:position-changed", {
    queueEntryId,
    position,
    estimatedWaitMins,
  });
}

export function emitDoctorStatusChanged(doctorId: string, isOnline: boolean, name: string): void {
  emitToRoom("admin:dashboard", "doctor:status-changed", { doctorId, isOnline, name });
  emitToRoom("doctor:dashboard", "doctor:status-changed", { doctorId, isOnline, name });
}

export function emitNewVisitorJoined(): void {
  emitToRoom("doctor:dashboard", "doctor:dashboard-update", {});
  emitToRoom("admin:dashboard", "admin:stats-update", {});
}
