"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, UserCheck, UserX, Stethoscope, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/components/ui/toaster";
import { createDoctorSchema, type CreateDoctorInput } from "@/lib/validations";
import { formatDate } from "@/lib/utils";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { consultations: number };
};

export default function DoctorsPage() {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: users = [], isLoading } = useQuery<StaffUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateDoctorInput) => {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setIsAddOpen(false);
      reset();
      toast({ variant: "success", title: "Staff member created" });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Creation failed", description: error.message });
    },
  });

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<CreateDoctorInput>({
    resolver: zodResolver(createDoctorSchema),
    defaultValues: { role: "DOCTOR" },
  });

  const roleConfig = {
    ADMIN: { label: "Admin", variant: "default" as const, icon: "🔐" },
    DOCTOR: { label: "Doctor", variant: "default" as const, icon: "🩺" },
    BOOTH_ATTENDANT: { label: "Booth Attendant", variant: "secondary" as const, icon: "🎫" },
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-gray-900">Staff & Doctors</h1>
          <p className="text-gray-500 mt-1">Manage doctors, attendants, and admin accounts</p>
        </div>
        <Button onClick={() => setIsAddOpen(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Add Staff Member
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Total Staff", value: users.length, icon: Users, color: "bg-gray-100 text-gray-600" },
          { label: "Doctors", value: users.filter((u) => u.role === "DOCTOR").length, icon: Stethoscope, color: "bg-afya-100 text-afya-600" },
          { label: "Active", value: users.filter((u) => u.isActive).length, icon: UserCheck, color: "bg-green-100 text-green-600" },
        ].map((s) => (
          <div key={s.label} className="stat-card">
            <div className="flex items-center gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${s.color}`}>
                <s.icon className="w-5 h-5" />
              </div>
              <div>
                <div className="text-2xl font-black text-gray-900">{s.value}</div>
                <div className="text-sm text-gray-500">{s.label}</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Staff Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-5 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">All Staff Members</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-afya-500/30 border-t-afya-500 rounded-full" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Name</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Email</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Role</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Status</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Consultations</th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {users.map((user) => {
                  const role = roleConfig[user.role as keyof typeof roleConfig];
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-afya-100 flex items-center justify-center">
                            <span className="text-afya-700 font-bold text-sm">{user.name.charAt(0)}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">{user.email}</td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-700">
                          {role?.icon} {role?.label}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.isActive ? (
                            <><UserCheck className="w-4 h-4 text-green-500" /><span className="text-sm text-green-600">Active</span></>
                          ) : (
                            <><UserX className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">Inactive</span></>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">
                          {user._count.consultations}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Staff Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>Create a new doctor, booth attendant, or admin account.</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit((d) => createMutation.mutate(d))} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input {...register("name")} placeholder="Dr. Jane Smith" />
              {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Email</Label>
              <Input {...register("email")} type="email" placeholder="jane@afyacall.co.tz" />
              {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Password</Label>
              <Input {...register("password")} type="password" placeholder="Minimum 8 characters" />
              {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
            </div>

            <div className="space-y-1">
              <Label>Role</Label>
              <Select defaultValue="DOCTOR" onValueChange={(v) => setValue("role", v as CreateDoctorInput["role"])}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                  <SelectItem value="BOOTH_ATTENDANT">Booth Attendant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" loading={createMutation.isPending}>
                Create Account
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
