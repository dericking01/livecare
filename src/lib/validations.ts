import { z } from "zod";

// ─── Phone validation (Tanzanian format) ─────────────────────────────────────

const tanzanianPhone = z
  .string()
  .min(1, "Phone number is required")
  .refine((val) => {
    const cleaned = val.replace(/[\s\-\(\)]/g, "");
    // Formats: +255XXXXXXXXX, 255XXXXXXXXX, 0XXXXXXXXX
    return /^(\+?255|0)[67]\d{8}$/.test(cleaned);
  }, "Enter a valid Tanzanian phone number (e.g. 0712345678 or +255712345678)");

// ─── Visitor Registration ─────────────────────────────────────────────────────

export const visitorRegistrationSchema = z.object({
  fullName: z
    .string()
    .min(2, "Full name must be at least 2 characters")
    .max(100, "Full name is too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Full name can only contain letters, spaces, hyphens and apostrophes"),
  phone: tanzanianPhone,
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"], {
    required_error: "Please select your gender",
  }),
  ageGroup: z.enum(
    ["UNDER_18", "AGE_18_24", "AGE_25_34", "AGE_35_44", "AGE_45_54", "AGE_55_64", "AGE_65_PLUS"],
    { required_error: "Please select your age group" }
  ),
});

export type VisitorRegistrationInput = z.infer<typeof visitorRegistrationSchema>;

// ─── Health Assessment ────────────────────────────────────────────────────────

export const healthAssessmentSchema = z.object({
  age: z
    .number({ required_error: "Age is required" })
    .int("Age must be a whole number")
    .min(1, "Age must be at least 1")
    .max(120, "Age seems incorrect"),
  gender: z.enum(["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"]),
  smokes: z.boolean(),
  drinksAlcohol: z.boolean(),
  exercisesRegularly: z.boolean(),
  hasDiabetes: z.boolean(),
  hasHypertension: z.boolean(),
  hasFamilyHistory: z.boolean(),
  bmi: z.number().min(10).max(80).optional(),
});

export type HealthAssessmentInput = z.infer<typeof healthAssessmentSchema>;

// ─── Consultation Notes ───────────────────────────────────────────────────────

export const consultationNoteSchema = z.object({
  summary: z
    .string()
    .min(10, "Summary must be at least 10 characters")
    .max(2000, "Summary is too long"),
  recommendation: z
    .string()
    .min(10, "Recommendation must be at least 10 characters")
    .max(2000, "Recommendation is too long"),
  followUpDays: z.number().int().min(1).max(365).optional(),
});

export type ConsultationNoteInput = z.infer<typeof consultationNoteSchema>;

// ─── Login ───────────────────────────────────────────────────────────────────

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ─── Doctor Management ────────────────────────────────────────────────────────

export const createDoctorSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Enter a valid email address"),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .regex(/[A-Z]/, "Password must contain an uppercase letter")
    .regex(/[0-9]/, "Password must contain a number"),
  role: z.enum(["DOCTOR", "BOOTH_ATTENDANT", "ADMIN"]).default("DOCTOR"),
  phone: tanzanianPhone.optional().or(z.literal("")),
});

export type CreateDoctorInput = z.infer<typeof createDoctorSchema>;
