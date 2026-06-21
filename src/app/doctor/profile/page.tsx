"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { User, Mail, Phone, Lock, Save, ArrowLeft, Wifi, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { updateProfileSchema, type UpdateProfileInput } from "@/lib/validations";

type Profile = {
  id: string; name: string; email: string; phone: string | null;
  role: string; isActive: boolean; isOnline: boolean; lastLoginAt: string | null;
};

export default function DoctorProfilePage() {
  const router  = useRouter();
  const [profile,  setProfile]  = useState<Profile | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<UpdateProfileInput>({
    resolver: zodResolver(updateProfileSchema),
  });

  useEffect(() => {
    fetch("/api/profile")
      .then((r) => r.json())
      .then((j) => {
        if (j.success) {
          setProfile(j.data);
          reset({ name: j.data.name, email: j.data.email, phone: j.data.phone ?? "" });
        }
      })
      .finally(() => setLoading(false));
  }, [reset]);

  async function onSubmit(data: UpdateProfileInput) {
    setSaving(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      setProfile((p) => p ? { ...p, ...json.data } : p);
      reset({ name: json.data.name, email: json.data.email, phone: json.data.phone ?? "", currentPassword: "", newPassword: "" });
      toast({ variant: "success", title: "Profile updated successfully" });
    } catch (err) {
      toast({ variant: "destructive", title: "Update failed", description: (err as Error).message });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin w-8 h-8 border-2 border-afya-500/30 border-t-afya-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
      </div>

      <div>
        <h1 className="text-2xl font-black text-gray-900">My Profile</h1>
        <p className="text-gray-500 mt-1">Update your personal details and password</p>
      </div>

      {/* Status card */}
      {profile && (
        <div className={`flex items-center gap-3 px-5 py-3 rounded-2xl border ${profile.isOnline ? "bg-green-50 border-green-200" : "bg-gray-50 border-gray-200"}`}>
          {profile.isOnline
            ? <><Wifi className="w-4 h-4 text-green-600 animate-pulse" /><span className="text-sm font-semibold text-green-700">You are currently Online</span></>
            : <><WifiOff className="w-4 h-4 text-gray-400" /><span className="text-sm font-semibold text-gray-500">You are currently Offline</span></>
          }
          <span className="text-xs text-gray-400 ml-auto">Toggle from the Dashboard</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide pb-1 border-b border-gray-100">
          Personal Information
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            <User className="w-3.5 h-3.5 text-gray-400" /> Full Name
          </Label>
          <Input {...register("name")} placeholder="Your full name" />
          {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            <Mail className="w-3.5 h-3.5 text-gray-400" /> Email Address
          </Label>
          <Input {...register("email")} type="email" placeholder="your@email.com" />
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-gray-400" /> Phone Number
            <span className="text-gray-400 font-normal">(for SMS notifications)</span>
          </Label>
          <Input {...register("phone")} placeholder="0712345678" />
          {errors.phone && <p className="text-red-500 text-xs">{errors.phone.message}</p>}
        </div>

        <div className="text-sm font-semibold text-gray-500 uppercase tracking-wide pb-1 border-b border-gray-100 pt-2">
          Change Password <span className="text-gray-400 font-normal">(optional)</span>
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-gray-400" /> Current Password
          </Label>
          <Input {...register("currentPassword")} type="password" placeholder="Enter current password" />
          {errors.currentPassword && <p className="text-red-500 text-xs">{errors.currentPassword.message}</p>}
        </div>

        <div className="space-y-1.5">
          <Label className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-gray-400" /> New Password
          </Label>
          <Input {...register("newPassword")} type="password" placeholder="Min 8 chars, uppercase + number" />
          {errors.newPassword && <p className="text-red-500 text-xs">{errors.newPassword.message}</p>}
        </div>

        <Button type="submit" loading={saving} disabled={!isDirty} className="w-full gap-2 mt-2">
          <Save className="w-4 h-4" /> Save Changes
        </Button>
      </form>
    </div>
  );
}
