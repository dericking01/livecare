import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, differenceInMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string): string {
  return format(new Date(date), "dd MMM yyyy, HH:mm");
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), "HH:mm");
}

export function timeAgo(date: Date | string): string {
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

export function waitMinutes(from: Date | string): number {
  return differenceInMinutes(new Date(), new Date(from));
}

export function formatWaitTime(minutes: number): string {
  if (minutes < 1) return "Less than 1 minute";
  if (minutes === 1) return "1 minute";
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours} hour${hours > 1 ? "s" : ""}`;
}

export function estimateWaitTime(position: number, avgMinutesPerConsult = 5): number {
  return Math.max(1, (position - 1) * avgMinutesPerConsult);
}

export function formatPhoneNumber(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.startsWith("255") && cleaned.length === 12) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  if (cleaned.startsWith("0") && cleaned.length === 10) {
    return `0${cleaned.slice(1, 4)} ${cleaned.slice(4, 7)} ${cleaned.slice(7)}`;
  }
  return phone;
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getAgeGroupLabel(ageGroup: string): string {
  const labels: Record<string, string> = {
    UNDER_18: "Under 18",
    AGE_18_24: "18 – 24",
    AGE_25_34: "25 – 34",
    AGE_35_44: "35 – 44",
    AGE_45_54: "45 – 54",
    AGE_55_64: "55 – 64",
    AGE_65_PLUS: "65+",
  };
  return labels[ageGroup] ?? ageGroup;
}

export function getGenderLabel(gender: string): string {
  const labels: Record<string, string> = {
    MALE: "Male",
    FEMALE: "Female",
    OTHER: "Other",
    PREFER_NOT_TO_SAY: "Prefer not to say",
  };
  return labels[gender] ?? gender;
}

export function getRiskColor(riskLevel: string): string {
  const colors: Record<string, string> = {
    LOW: "text-green-600 bg-green-50 border-green-200",
    MEDIUM: "text-yellow-600 bg-yellow-50 border-yellow-200",
    HIGH: "text-red-600 bg-red-50 border-red-200",
  };
  return colors[riskLevel] ?? "";
}

export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    WAITING: "text-blue-600 bg-blue-50",
    ASSIGNED: "text-purple-600 bg-purple-50",
    IN_PROGRESS: "text-orange-600 bg-orange-50",
    COMPLETED: "text-green-600 bg-green-50",
    CANCELLED: "text-gray-600 bg-gray-50",
    NO_SHOW: "text-red-600 bg-red-50",
  };
  return colors[status] ?? "";
}

export function generateQueueToken(visitorId: string, queueEntryId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ visitorId, queueEntryId, ts: Date.now() })
  ).toString("base64url");
  return payload;
}
