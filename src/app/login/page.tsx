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

      const res = await fetch("/api/auth/session");
      const session = await res.json();
      const role = session?.user?.role;

      if (role === "ADMIN") router.push("/admin/dashboard");
      else if (role === "DOCTOR") router.push("/doctor/dashboard");
      else if (role === "BOOTH_ATTENDANT") router.push("/booth");
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
          {/* Logo + title */}
          <div className="text-center mb-7">
            <div className="flex justify-center mb-5">
              <AfyaLogo size="md" />
            </div>
            <h1 className="text-2xl font-black text-white">Staff Login</h1>
            <p className="text-afya-200/80 text-sm mt-1">Access the management portal</p>
          </div>

          <KioskCard>
            <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-gray-600">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="email"
                    {...register("email")}
                    type="email"
                    placeholder="your@email.com"
                    className="pl-11 h-12 text-sm"
                    autoComplete="email"
                    autoFocus
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-xs">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-sm font-semibold text-gray-600">
                  Password
                </Label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="password"
                    {...register("password")}
                    type="password"
                    placeholder="Enter your password"
                    className="pl-11 h-12 text-sm"
                    autoComplete="current-password"
                  />
                </div>
                {errors.password && (
                  <p className="text-red-500 text-xs">{errors.password.message}</p>
                )}
              </div>

              <div className="pt-1">
                <Button
                  type="submit"
                  variant="kiosk"
                  className="w-full"
                  loading={isLoading}
                >
                  Sign In
                </Button>
              </div>

              <Link
                href="/"
                className="flex items-center justify-center gap-1.5 text-gray-400 hover:text-gray-600 text-sm transition-colors py-1"
              >
                <ChevronLeft className="w-4 h-4" />
                Back to Visitor Portal
              </Link>
            </form>
          </KioskCard>
        </div>
      </div>
    </KioskLayout>
  );
}
