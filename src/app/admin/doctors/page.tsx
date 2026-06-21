"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Plus, UserCheck, UserX, Stethoscope, Users, Edit2, Trash2, Wifi,
  ChevronUp, ChevronDown, ChevronsUpDown, Search, X, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/components/ui/toaster";
import {
  createDoctorSchema, adminUpdateUserSchema,
  type CreateDoctorInput, type AdminUpdateUserInput,
} from "@/lib/validations";
import { formatDate } from "@/lib/utils";
import { getSocket } from "@/lib/socket";

type StaffUser = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: string;
  isActive: boolean;
  isOnline: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  _count: { consultations: number };
};

type SortKey = "name" | "role" | "status" | "sessions" | "lastLogin";
type SortDir = "asc" | "desc";

const roleConfig = {
  ADMIN:           { label: "Admin",           icon: "🔐" },
  DOCTOR:          { label: "Doctor",          icon: "🩺" },
  BOOTH_ATTENDANT: { label: "Booth Attendant", icon: "🎫" },
};

function SortIcon({ col, sortKey, sortDir }: { col: SortKey; sortKey: SortKey; sortDir: SortDir }) {
  if (col !== sortKey) return <ChevronsUpDown className="w-3.5 h-3.5 text-gray-300 ml-1 inline" />;
  return sortDir === "asc"
    ? <ChevronUp   className="w-3.5 h-3.5 text-afya-500 ml-1 inline" />
    : <ChevronDown className="w-3.5 h-3.5 text-afya-500 ml-1 inline" />;
}

export default function DoctorsPage() {
  const [isAddOpen,    setIsAddOpen]    = useState(false);
  const [editingUser,  setEditingUser]  = useState<StaffUser | null>(null);
  const [deletingUser, setDeletingUser] = useState<StaffUser | null>(null);
  const [myId,         setMyId]         = useState<string | null>(null);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [search,       setSearch]       = useState("");
  const [filterRole,   setFilterRole]   = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");

  // ── Sort ─────────────────────────────────────────────────────────────────
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const queryClient = useQueryClient();

  useEffect(() => {
    fetch("/api/auth/session").then((r) => r.json()).then((s) => setMyId(s?.user?.id ?? null));
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.emit("admin:join");
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    };
    socket.on("doctor:status-changed", handler);
    return () => { socket.off("doctor:status-changed", handler); };
  }, [queryClient]);

  const { data: users = [], isLoading } = useQuery<StaffUser[]>({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res  = await fetch("/api/admin/users");
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
  });

  // ── Filtered + sorted rows ────────────────────────────────────────────────
  const displayedUsers = useMemo(() => {
    let rows = [...users];

    if (search.trim()) {
      const q = search.toLowerCase();
      rows = rows.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    if (filterRole !== "ALL")   rows = rows.filter((u) => u.role === filterRole);
    if (filterStatus === "ACTIVE")   rows = rows.filter((u) =>  u.isActive);
    if (filterStatus === "INACTIVE") rows = rows.filter((u) => !u.isActive);
    if (filterStatus === "ONLINE")   rows = rows.filter((u) => u.isOnline);
    if (filterStatus === "OFFLINE")  rows = rows.filter((u) => u.role === "DOCTOR" && !u.isOnline);

    rows.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "name")      cmp = a.name.localeCompare(b.name);
      if (sortKey === "role")      cmp = a.role.localeCompare(b.role);
      if (sortKey === "status")    cmp = Number(b.isActive) - Number(a.isActive);
      if (sortKey === "sessions")  cmp = a._count.consultations - b._count.consultations;
      if (sortKey === "lastLogin") {
        const ta = a.lastLoginAt ? new Date(a.lastLoginAt).getTime() : 0;
        const tb = b.lastLoginAt ? new Date(b.lastLoginAt).getTime() : 0;
        cmp = ta - tb;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });

    return rows;
  }, [users, search, filterRole, filterStatus, sortKey, sortDir]);

  function toggleSort(col: SortKey) {
    if (sortKey === col) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortKey(col); setSortDir("asc"); }
  }

  function clearFilters() {
    setSearch("");
    setFilterRole("ALL");
    setFilterStatus("ALL");
  }
  const hasFilters = search || filterRole !== "ALL" || filterStatus !== "ALL";

  // ── Mutations ─────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: CreateDoctorInput) => {
      const res  = await fetch("/api/admin/users", {
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
      resetCreate();
      toast({ variant: "success", title: "Staff member created" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Creation failed", description: e.message }),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: AdminUpdateUserInput }) => {
      const res  = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
      return json.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setEditingUser(null);
      resetEdit();
      toast({ variant: "success", title: "Profile updated" });
    },
    onError: (e: Error) => toast({ variant: "destructive", title: "Update failed", description: e.message }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res  = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!json.success) throw new Error(json.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setDeletingUser(null);
      toast({ variant: "success", title: "User removed" });
    },
    onError: (e: Error) => {
      toast({ variant: "destructive", title: "Delete failed", description: e.message });
      setDeletingUser(null);
    },
  });

  // ── Forms ─────────────────────────────────────────────────────────────────
  const {
    register: regCreate, handleSubmit: hsCreate,
    setValue: svCreate,  reset: resetCreate, formState: { errors: errCreate },
  } = useForm<CreateDoctorInput>({ resolver: zodResolver(createDoctorSchema), defaultValues: { role: "DOCTOR" } });

  const {
    register: regEdit, handleSubmit: hsEdit,
    setValue: svEdit,  reset: resetEdit, formState: { errors: errEdit },
  } = useForm<AdminUpdateUserInput>({ resolver: zodResolver(adminUpdateUserSchema) });

  function openEdit(user: StaffUser) {
    setEditingUser(user);
    resetEdit({
      name:     user.name,
      email:    user.email,
      phone:    user.phone ?? "",
      role:     user.role as AdminUpdateUserInput["role"],
      isActive: user.isActive,
    });
  }

  const online  = users.filter((u) => u.role === "DOCTOR" && u.isOnline).length;
  const doctors = users.filter((u) => u.role === "DOCTOR").length;

  const thClass = "text-left px-6 py-4 text-sm font-semibold text-gray-500 select-none cursor-pointer hover:text-gray-700 whitespace-nowrap";

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
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Total Staff",    value: users.length,                            icon: Users,       color: "bg-gray-100 text-gray-600" },
          { label: "Doctors",        value: doctors,                                 icon: Stethoscope, color: "bg-afya-100 text-afya-600" },
          { label: "Active",         value: users.filter((u) => u.isActive).length,  icon: UserCheck,   color: "bg-green-100 text-green-600" },
          { label: "Doctors Online", value: online,                                  icon: Wifi,        color: "bg-blue-100 text-blue-600" },
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
        {/* Table header + filters */}
        <div className="px-6 py-4 border-b border-gray-100 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">All Staff Members</h2>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear filters
              </button>
            )}
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-afya-400/30 focus:border-afya-400 transition"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Role filter */}
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="text-sm rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-afya-400/30 focus:border-afya-400 transition text-gray-700"
            >
              <option value="ALL">All Roles</option>
              <option value="DOCTOR">Doctor</option>
              <option value="BOOTH_ATTENDANT">Booth Attendant</option>
              <option value="ADMIN">Admin</option>
            </select>

            {/* Status filter */}
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="text-sm rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-afya-400/30 focus:border-afya-400 transition text-gray-700"
            >
              <option value="ALL">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ONLINE">Online (Doctors)</option>
              <option value="OFFLINE">Offline (Doctors)</option>
            </select>

            {/* Result count */}
            <span className="text-xs text-gray-400 shrink-0">
              {displayedUsers.length} of {users.length}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="animate-spin w-8 h-8 border-2 border-afya-500/30 border-t-afya-500 rounded-full" />
          </div>
        ) : displayedUsers.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No staff members match your filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className={thClass} onClick={() => toggleSort("name")}>
                    Name <SortIcon col="name" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-left px-6 py-4 text-sm font-semibold text-gray-500">Email / Phone</th>
                  <th className={thClass} onClick={() => toggleSort("role")}>
                    Role <SortIcon col="role" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort("status")}>
                    Status <SortIcon col="status" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort("sessions")}>
                    Sessions <SortIcon col="sessions" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className={thClass} onClick={() => toggleSort("lastLogin")}>
                    Last Login <SortIcon col="lastLogin" sortKey={sortKey} sortDir={sortDir} />
                  </th>
                  <th className="text-right px-6 py-4 text-sm font-semibold text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {displayedUsers.map((user) => {
                  const role = roleConfig[user.role as keyof typeof roleConfig];
                  return (
                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-9 h-9 rounded-full bg-afya-100 flex items-center justify-center">
                              <span className="text-afya-700 font-bold text-sm">{user.name.charAt(0)}</span>
                            </div>
                            {user.role === "DOCTOR" && (
                              <span
                                className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${user.isOnline ? "bg-green-500" : "bg-gray-300"}`}
                                title={user.isOnline ? "Online" : "Offline"}
                              />
                            )}
                          </div>
                          <span className="font-semibold text-gray-900">{user.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600">{user.email}</div>
                        {user.phone && <div className="text-xs text-gray-400 mt-0.5">{user.phone}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-700">{role?.icon} {role?.label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.isActive ? (
                            <><UserCheck className="w-4 h-4 text-green-500" /><span className="text-sm text-green-600">Active</span></>
                          ) : (
                            <><UserX className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-500">Inactive</span></>
                          )}
                          {user.role === "DOCTOR" && user.isActive && (
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${user.isOnline ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                              {user.isOnline ? "Online" : "Offline"}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-semibold text-gray-900">{user._count.consultations}</span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openEdit(user)}
                            className="gap-1.5 h-8 text-xs"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                            Edit
                          </Button>
                          {user.id !== myId && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDeletingUser(user)}
                              className="gap-1.5 h-8 text-xs text-red-500 hover:text-red-600 hover:border-red-300"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add Staff Dialog ──────────────────────────────────────────────────── */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Staff Member</DialogTitle>
            <DialogDescription>Create a new doctor, booth attendant, or admin account.</DialogDescription>
          </DialogHeader>
          <form onSubmit={hsCreate((d) => createMutation.mutate(d))} className="space-y-4 mt-2">
            <div className="space-y-1">
              <Label>Full Name</Label>
              <Input {...regCreate("name")} placeholder="Dr. Jane Smith" />
              {errCreate.name && <p className="text-red-500 text-xs">{errCreate.name.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input {...regCreate("email")} type="email" placeholder="jane@afyacall.co.tz" />
              {errCreate.email && <p className="text-red-500 text-xs">{errCreate.email.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Password</Label>
              <Input {...regCreate("password")} type="password" placeholder="Min 8 chars, uppercase + number" />
              {errCreate.password && <p className="text-red-500 text-xs">{errCreate.password.message}</p>}
            </div>
            <div className="space-y-1">
              <Label>Role</Label>
              <Select defaultValue="DOCTOR" onValueChange={(v) => svCreate("role", v as CreateDoctorInput["role"])}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="DOCTOR">Doctor</SelectItem>
                  <SelectItem value="BOOTH_ATTENDANT">Booth Attendant</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Phone <span className="text-gray-400 font-normal">(optional — for SMS notifications)</span></Label>
              <Input {...regCreate("phone")} placeholder="e.g. 0712345678" />
              {errCreate.phone && <p className="text-red-500 text-xs">{errCreate.phone.message}</p>}
            </div>
            <DialogFooter className="gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button>
              <Button type="submit" loading={createMutation.isPending}>Create Account</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Edit User Dialog ──────────────────────────────────────────────────── */}
      {editingUser && (
        <Dialog open onOpenChange={() => setEditingUser(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Edit — {editingUser.name}</DialogTitle>
              <DialogDescription>
                Update profile details, role, or account status. Leave password blank to keep current.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={hsEdit((d) => updateMutation.mutate({ id: editingUser.id, data: d }))} className="space-y-4 mt-2">
              <div className="space-y-1">
                <Label>Full Name</Label>
                <Input {...regEdit("name")} placeholder="Full name" />
                {errEdit.name && <p className="text-red-500 text-xs">{errEdit.name.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Email</Label>
                <Input {...regEdit("email")} type="email" />
                {errEdit.email && <p className="text-red-500 text-xs">{errEdit.email.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Phone <span className="text-gray-400 font-normal">(optional)</span></Label>
                <Input {...regEdit("phone")} placeholder="0712345678" />
                {errEdit.phone && <p className="text-red-500 text-xs">{errEdit.phone.message}</p>}
              </div>
              <div className="space-y-1">
                <Label>Role</Label>
                <Select
                  defaultValue={editingUser.role}
                  onValueChange={(v) => svEdit("role", v as AdminUpdateUserInput["role"])}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="DOCTOR">Doctor</SelectItem>
                    <SelectItem value="BOOTH_ATTENDANT">Booth Attendant</SelectItem>
                    <SelectItem value="ADMIN">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Account Status</Label>
                <Select
                  defaultValue={editingUser.isActive ? "true" : "false"}
                  disabled={editingUser.id === myId}
                  onValueChange={(v) => svEdit("isActive", v === "true")}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive (blocked from login)</SelectItem>
                  </SelectContent>
                </Select>
                {editingUser.id === myId && (
                  <p className="text-xs text-gray-400">You cannot change your own status.</p>
                )}
              </div>
              <div className="space-y-1">
                <Label>New Password <span className="text-gray-400 font-normal">(leave blank to keep current)</span></Label>
                <Input {...regEdit("newPassword")} type="password" placeholder="Min 8 chars, uppercase + number" />
                {errEdit.newPassword && <p className="text-red-500 text-xs">{errEdit.newPassword.message}</p>}
              </div>
              {editingUser.role === "DOCTOR" && (
                <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                  Online status:{" "}
                  <span className={`font-semibold ${editingUser.isOnline ? "text-green-600" : "text-gray-500"}`}>
                    {editingUser.isOnline ? "● Online" : "○ Offline"}
                  </span>{" "}
                  (doctor controls this from their dashboard)
                </div>
              )}
              <DialogFooter className="gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setEditingUser(null)}>Cancel</Button>
                <Button type="submit" loading={updateMutation.isPending}>Save Changes</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Delete Confirmation Dialog ────────────────────────────────────────── */}
      {deletingUser && (
        <Dialog open onOpenChange={() => !deleteMutation.isPending && setDeletingUser(null)}>
          <DialogContent className="sm:max-w-sm">
            <DialogHeader>
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <DialogTitle className="text-gray-900">Remove Staff Member</DialogTitle>
              </div>
              <DialogDescription className="pt-1">
                Are you sure you want to remove{" "}
                <span className="font-semibold text-gray-800">{deletingUser.name}</span>?
                Their account will be deactivated and they will no longer be able to log in.
                This action cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setDeletingUser(null)}
                disabled={deleteMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                loading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(deletingUser.id)}
                className="bg-red-600 hover:bg-red-700 text-white border-red-600"
              >
                <Trash2 className="w-4 h-4 mr-1.5" />
                Remove
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
