import type {
  User,
  Visitor,
  QueueEntry,
  Consultation,
  ConsultationNote,
  HealthAssessment,
  DailyRoom,
  ActivityLog,
  Role,
  Gender,
  AgeGroup,
  QueueStatus,
  ConsultationStatus,
  RiskLevel,
} from "@prisma/client";

// Re-export prisma types
export type {
  User,
  Visitor,
  QueueEntry,
  Consultation,
  ConsultationNote,
  HealthAssessment,
  DailyRoom,
  ActivityLog,
  Role,
  Gender,
  AgeGroup,
  QueueStatus,
  ConsultationStatus,
  RiskLevel,
};

// ─── Extended Types ───────────────────────────────────────────────────────────

export type QueueEntryWithVisitor = QueueEntry & {
  visitor: Visitor;
  consultation: (Consultation & { room: DailyRoom | null }) | null;
};

export type ConsultationWithDetails = Consultation & {
  queueEntry: QueueEntry & { visitor: Visitor };
  doctor: Pick<User, "id" | "name" | "email">;
  room: DailyRoom | null;
  notes: ConsultationNote[];
};

// ─── API Response Types ───────────────────────────────────────────────────────

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
};

export type PaginatedResponse<T> = ApiResponse<{
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}>;

// ─── Auth Session ─────────────────────────────────────────────────────────────

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

// ─── Analytics Types ──────────────────────────────────────────────────────────

export type DashboardStats = {
  visitorsToday: number;
  visitorsWaiting: number;
  activeConsultations: number;
  completedConsultations: number;
  avgWaitMinutes: number;
  avgConsultationMinutes: number;
};

export type HourlyData = {
  hour: string;
  visitors: number;
  consultations: number;
};

export type RiskDistribution = {
  level: RiskLevel;
  count: number;
  percentage: number;
};

export type GenderDistribution = {
  gender: Gender;
  count: number;
  percentage: number;
};

export type AgeDistribution = {
  ageGroup: AgeGroup;
  count: number;
  percentage: number;
};

export type DailyTrend = {
  date: string;
  visitors: number;
  consultations: number;
  assessments: number;
};

export type DoctorStat = {
  doctorId: string;
  doctorName: string;
  consultations: number;
  avgDurationMins: number;
};

export type AnalyticsData = {
  stats: DashboardStats;
  hourlyData: HourlyData[];
  riskDistribution: RiskDistribution[];
  genderDistribution: GenderDistribution[];
  ageDistribution: AgeDistribution[];
  dailyTrend?: DailyTrend[];
  doctorStats?: DoctorStat[];
  totalAssessments?: number;
  dateRange?: { from: string; to: string };
};

// ─── Socket Events ────────────────────────────────────────────────────────────

export type SocketEvents = {
  // Queue events
  "queue:updated": (data: { queueEntries: QueueEntryWithVisitor[] }) => void;
  "queue:position-changed": (data: { queueEntryId: string; position: number; estimatedWaitMins: number }) => void;
  "queue:doctor-ready": (data: { queueEntryId: string; consultationId: string; roomUrl: string; visitorToken: string }) => void;
  "queue:cancelled": (data: { queueEntryId: string }) => void;

  // Consultation events
  "consultation:started": (data: { consultationId: string; roomUrl: string }) => void;
  "consultation:ended": (data: { consultationId: string }) => void;

  // Doctor events
  "doctor:dashboard-update": (data: { waiting: number; active: number }) => void;

  // Admin events
  "admin:stats-update": (data: Partial<DashboardStats>) => void;
};

// ─── Form Types ───────────────────────────────────────────────────────────────

export type VisitorRegistrationData = {
  fullName: string;
  phone: string;
  gender: Gender;
  ageGroup: AgeGroup;
};

export type HealthAssessmentData = {
  age: number;
  gender: Gender;
  smokes: boolean;
  drinksAlcohol: boolean;
  exercisesRegularly: boolean;
  hasDiabetes: boolean;
  hasHypertension: boolean;
  hasFamilyHistory: boolean;
  bmi?: number;
};

export type ConsultationNoteData = {
  summary: string;
  recommendation: string;
  followUpDays?: number;
};
