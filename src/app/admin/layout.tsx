import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, Users, BarChart3, Bell } from "lucide-react";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { ForceLogoutWatcher } from "@/components/shared/ForceLogoutWatcher";

function NavLink({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-600 hover:bg-afya-50 hover:text-afya-700 transition-colors"
    >
      <Icon className="w-4 h-4" />
      {label}
    </Link>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || session.user.role !== "ADMIN") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-gray-100">
          <Image
            src="/assets/images/afyaCall-logo.png"
            alt="AfyaCall"
            width={140}
            height={53}
            className="object-contain"
            priority
          />
          <div className="text-xs text-gray-400 font-medium mt-1.5 tracking-wide uppercase">
            Admin Portal
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          <NavLink href="/admin/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavLink href="/admin/doctors" icon={Users} label="Staff & Doctors" />
          <NavLink href="/admin/reports" icon={BarChart3} label="Reports & Analytics" />
          <NavLink href="/admin/notifications" icon={Bell} label="Notifications" />
        </nav>

        <div className="px-3 py-4 border-t border-gray-100">
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-gray-50 mb-2">
            <div className="w-8 h-8 rounded-full bg-afya-100 flex items-center justify-center">
              <span className="text-afya-700 font-bold text-sm">
                {session.user.name.charAt(0)}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold text-gray-900 truncate">{session.user.name}</div>
              <div className="text-xs text-gray-500">Administrator</div>
            </div>
          </div>
          <SignOutButton className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 transition-colors w-full" />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
      <ForceLogoutWatcher />
    </div>
  );
}
