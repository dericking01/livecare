import React from "react";
import { cn } from "@/lib/utils";

interface KioskLayoutProps {
  children: React.ReactNode;
  className?: string;
  centered?: boolean;
}

export function KioskLayout({ children, className, centered = false }: KioskLayoutProps) {
  return (
    <div
      className={cn(
        "min-h-screen bg-gradient-to-br from-afya-900 via-afya-700 to-afya-500",
        centered && "flex items-center justify-center",
        className
      )}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-afya-400/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-afya-300/20 rounded-full blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-white/5 rounded-full blur-3xl" />
      </div>
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
}

interface KioskCardProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "full";
}

const maxWidthMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
  full: "max-w-full",
};

export function KioskCard({ children, className, maxWidth = "lg" }: KioskCardProps) {
  return (
    <div className={cn("mx-auto w-full px-4", maxWidthMap[maxWidth], className)}>
      <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">{children}</div>
    </div>
  );
}

export function AfyaLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const sizeMap = { sm: "text-xl", md: "text-3xl", lg: "text-5xl" };
  const iconSizeMap = { sm: "w-6 h-6", md: "w-10 h-10", lg: "w-16 h-16" };

  return (
    <div className="flex items-center gap-3">
      <div className={cn("bg-white rounded-2xl p-2 shadow-lg flex items-center justify-center", iconSizeMap[size])}>
        <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <rect width="40" height="40" rx="10" fill="#00a65a" />
          <path
            d="M20 8C13.373 8 8 13.373 8 20s5.373 12 12 12 12-5.373 12-12S26.627 8 20 8zm0 4a3 3 0 110 6 3 3 0 010-6zm0 16.5c-4 0-7.55-2.054-9.634-5.168.05-3.193 6.434-4.932 9.634-4.932s9.584 1.739 9.634 4.932C27.55 26.446 24 28.5 20 28.5z"
            fill="white"
          />
          <path d="M18 19h4v7h-4z" fill="white" />
          <path d="M16 21h8v3h-8z" fill="#00a65a" />
        </svg>
      </div>
      <div>
        <div className={cn("font-black text-white leading-none", sizeMap[size])}>AfyaCall</div>
        {size !== "sm" && (
          <div className="text-afya-200 text-xs font-medium tracking-wider mt-0.5">
            SABA SABA DIGITAL
          </div>
        )}
      </div>
    </div>
  );
}
