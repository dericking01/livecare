import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Image from "next/image";
import { SignOutButton } from "@/components/shared/SignOutButton";

export default async function BoothLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  if (!session?.user || !["BOOTH_ATTENDANT", "ADMIN"].includes(session.user.role)) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 sticky top-0 z-40">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <Image
                src="/assets/images/afyaCall-logo.png"
                alt="AfyaCall"
                width={110}
                height={42}
                className="object-contain"
                priority
              />
              <span className="text-xs text-gray-400 font-medium border-l border-gray-200 pl-3">
                Booth Mode
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-semibold text-gray-900">{session.user.name}</div>
                <div className="text-xs text-gray-400">Booth Attendant</div>
              </div>
              <div className="w-9 h-9 rounded-full bg-afya-100 flex items-center justify-center">
                <span className="text-afya-700 font-bold text-sm">
                  {session.user.name.charAt(0)}
                </span>
              </div>
              <SignOutButton className="text-sm text-gray-400 hover:text-red-500 transition-colors" />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
}
