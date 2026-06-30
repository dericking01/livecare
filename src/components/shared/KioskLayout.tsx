import React from "react";
import Image from "next/image";
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
        "min-h-screen bg-gradient-to-br from-afya-700 via-afya-600 to-afya-500",
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

const sizeConfig = {
  sm: { width: 96,  height: 36 },
  md: { width: 128, height: 48 },
  lg: { width: 176, height: 66 },
};

export function AfyaLogo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const { width, height } = sizeConfig[size];
  return (
    <Image
      src="/assets/images/afyaCall-logo.png"
      alt="AfyaCall"
      width={width}
      height={height}
      className="object-contain"
      style={{ filter: "drop-shadow(0 0 10px rgba(255,255,255,0.55)) drop-shadow(0 2px 6px rgba(0,0,0,0.25))" }}
      priority
    />
  );
}
