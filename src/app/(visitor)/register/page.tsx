"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Phone, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { visitorRegistrationSchema, type VisitorRegistrationInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "@/components/ui/toaster";
import { KioskLayout, KioskCard, AfyaLogo } from "@/components/shared/KioskLayout";

const AGE_GROUPS = [
  { value: "UNDER_18", label: "Under 18" },
  { value: "AGE_18_24", label: "18 – 24 years" },
  { value: "AGE_25_34", label: "25 – 34 years" },
  { value: "AGE_35_44", label: "35 – 44 years" },
  { value: "AGE_45_54", label: "45 – 54 years" },
  { value: "AGE_55_64", label: "55 – 64 years" },
  { value: "AGE_65_PLUS", label: "65 years and above" },
];

const GENDERS = [
  { value: "MALE", label: "Male" },
  { value: "FEMALE", label: "Female" },
  { value: "OTHER", label: "Other" },
  { value: "PREFER_NOT_TO_SAY", label: "Prefer not to say" },
];

export default function RegisterPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const service = searchParams.get("service") ?? "consultation";
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<VisitorRegistrationInput>({
    resolver: zodResolver(visitorRegistrationSchema),
  });

  const gender = watch("gender");
  const ageGroup = watch("ageGroup");

  async function onSubmit(data: VisitorRegistrationInput) {
    setIsLoading(true);
    try {
      const res = await fetch("/api/visitors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const json = await res.json();
      if (!json.success) throw new Error(json.error);

      const visitorId = json.data.id;
      localStorage.setItem("afyacall_visitor_id", visitorId);
      localStorage.setItem("afyacall_visitor_name", data.fullName);

      if (service === "assessment") {
        router.push(`/assessment?visitorId=${visitorId}`);
      } else {
        router.push(`/services?visitorId=${visitorId}`);
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KioskLayout centered>
      <div className="py-8 px-4">
        <div className="max-w-lg mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <AfyaLogo size="md" />
            <div className="mt-6">
              <div className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-sm rounded-full px-4 py-2 text-white text-sm mb-4">
                <User className="w-4 h-4" />
                Quick Registration
              </div>
              <h1 className="text-3xl font-black text-white">Welcome!</h1>
              <p className="text-afya-200 mt-2">
                Please fill in your details to get started
              </p>
            </div>
          </div>

          <KioskCard>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-base">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="fullName"
                    {...register("fullName")}
                    placeholder="Enter your full name"
                    className="pl-12 h-14 text-base"
                    autoComplete="name"
                    autoFocus
                  />
                </div>
                {errors.fullName && (
                  <p className="text-red-500 text-sm">{errors.fullName.message}</p>
                )}
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone" className="text-base">Mobile Number</Label>
                <div className="relative">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="phone"
                    {...register("phone")}
                    placeholder="e.g. 0712 345 678"
                    className="pl-12 h-14 text-base"
                    type="tel"
                    autoComplete="tel"
                  />
                </div>
                {errors.phone && (
                  <p className="text-red-500 text-sm">{errors.phone.message}</p>
                )}
              </div>

              {/* Gender */}
              <div className="space-y-2">
                <Label className="text-base">Gender</Label>
                <div className="grid grid-cols-2 gap-3">
                  {GENDERS.map((g) => (
                    <button
                      key={g.value}
                      type="button"
                      onClick={() => setValue("gender", g.value as VisitorRegistrationInput["gender"])}
                      className={`h-14 rounded-xl border-2 text-sm font-semibold transition-all ${
                        gender === g.value
                          ? "border-afya-500 bg-afya-50 text-afya-700"
                          : "border-gray-200 bg-white text-gray-600 hover:border-afya-300"
                      }`}
                    >
                      {g.label}
                    </button>
                  ))}
                </div>
                {errors.gender && (
                  <p className="text-red-500 text-sm">{errors.gender.message}</p>
                )}
              </div>

              {/* Age Group */}
              <div className="space-y-2">
                <Label className="text-base">Age Group</Label>
                <Select onValueChange={(v) => setValue("ageGroup", v as VisitorRegistrationInput["ageGroup"])}>
                  <SelectTrigger className="h-14 text-base">
                    <SelectValue placeholder="Select your age group" />
                  </SelectTrigger>
                  <SelectContent>
                    {AGE_GROUPS.map((ag) => (
                      <SelectItem key={ag.value} value={ag.value}>
                        {ag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.ageGroup && (
                  <p className="text-red-500 text-sm">{errors.ageGroup.message}</p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="kiosk"
                className="w-full"
                loading={isLoading}
              >
                Continue
              </Button>

              <Link href="/" className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors py-2">
                <ChevronLeft className="w-4 h-4" />
                Back to Home
              </Link>
            </form>
          </KioskCard>
        </div>
      </div>
    </KioskLayout>
  );
}
