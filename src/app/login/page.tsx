"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Mail, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { loginSchema, type LoginInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import { KioskLayout, KioskCard, AfyaLogo } from "@/components/shared/KioskLayout";

export default function LoginPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(data: LoginInput) {
    setIsLoading(true);
    try {
      const result = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });

      if (result?.error) {
        toast({
          variant: "destructive",
          title: "Login failed",
          description: "Invalid email or password",
        });
        return;
      }

      // Redirect based on role (we fetch session after sign-in)
      const res = await fetch("/api/auth/session");
      const session = await res.json();
      const role = session?.user?.role;

      if (role === "ADMIN") router.push("/admin/dashboard");
      else if (role === "DOCTOR") router.push("/doctor/dashboard");
      else router.push("/");
    } catch {
      toast({
        variant: "destructive",
        title: "Login error",
        description: "Please try again",
      });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <KioskLayout centered>
      <div className="py-8 px-4">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-8">
            <AfyaLogo size="md" />
            <div className="mt-6">
              <h1 className="text-3xl font-black text-white">Staff Login</h1>
              <p className="text-afya-200 mt-2">Access the AfyaCall management portal</p>
            </div>
          </div>

          <KioskCard>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-base">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="email"
                    {...register("email")}
                    type="email"
                    placeholder="your@email.com"
                    className="pl-12 h-14 text-base"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-base">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <Input
                    id="password"
                    {...register("password")}
                    type="password"
                    placeholder="Enter your password"
                    className="pl-12 h-14 text-base"
                    autoComplete="current-password"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                variant="kiosk"
                className="w-full"
                loading={isLoading}
              >
                Sign In
              </Button>

              <Link href="/" className="flex items-center justify-center gap-2 text-gray-500 hover:text-gray-700 text-sm transition-colors py-2">
                <ChevronLeft className="w-4 h-4" />
                Back to Visitor Portal
              </Link>
            </form>
          </KioskCard>

          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 border border-white/20">
            <p className="text-white/70 text-xs text-center font-medium mb-2">Demo Credentials</p>
            <div className="space-y-1 text-xs text-afya-200">
              <div className="flex justify-between">
                <span>Admin:</span>
                <span className="font-mono">admin@afyacall.co.tz / Admin@2024!</span>
              </div>
              <div className="flex justify-between">
                <span>Doctor:</span>
                <span className="font-mono">dr.amina@afyacall.co.tz / Doctor@2024!</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </KioskLayout>
  );
}
