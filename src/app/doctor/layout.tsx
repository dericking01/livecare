import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { LayoutDashboard, UserCircle } from "lucide-react";
import { SignOutButton } from "@/components/shared/SignOutButton";
import { ForceLogoutWatcher } from "@/components/shared/ForceLogoutWatcher";

export default async function DoctorLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || !["DOCTOR", "ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <Image
                src="/assets/images/afyaCall-logo.png"
                alt="AfyaCall"
                width={120}
                height={45}
                className="object-contain"
                priority
              />
              <span className="text-xs text-gray-400 font-medium border-l border-gray-200 pl-2 ml-1">
                Doctor Portal
              </span>
            </div>

            <div className="flex items-center gap-4">
              <Link
                href="/doctor/dashboard"
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-afya-600 transition-colors"
              >
                <LayoutDashboard className="w-4 h-4" />
                Dashboard
              </Link>
              <Link
                href="/doctor/profile"
                className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-afya-600 transition-colors"
              >
                <UserCircle className="w-4 h-4" />
                My Profile
              </Link>

              <div className="h-6 w-px bg-gray-200" />

              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-afya-100 flex items-center justify-center">
                  <span className="text-afya-700 font-bold text-sm">
                    {session.user.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">{session.user.name}</div>
                  <div className="text-xs text-gray-500 capitalize">{session.user.role.toLowerCase()}</div>
                </div>
              </div>

              <SignOutButton className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 transition-colors" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
      <ForceLogoutWatcher />
    </div>
  );
}
