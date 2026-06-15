"use client";

import * as React from "react";
import * as ToastPrimitive from "@radix-ui/react-toast";
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

const ToastProvider = ToastPrimitive.Provider;
const ToastViewport = React.forwardRef<
  React.ElementRef<typeof ToastPrimitive.Viewport>,
  React.ComponentPropsWithoutRef<typeof ToastPrimitive.Viewport>
>(({ className, ...props }, ref) => (
  <ToastPrimitive.Viewport
    ref={ref}
    className={cn(
      "fixed bottom-0 right-0 z-[100] flex max-h-screen w-full flex-col-reverse gap-2 p-4 sm:bottom-4 sm:right-4 sm:top-auto sm:max-w-[420px]",
      className
    )}
    {...props}
  />
));
ToastViewport.displayName = ToastPrimitive.Viewport.displayName;

export type ToastData = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "destructive" | "info";
};

const toastStore: {
  toasts: ToastData[];
  listeners: Array<(toasts: ToastData[]) => void>;
  add: (toast: Omit<ToastData, "id">) => void;
  remove: (id: string) => void;
} = {
  toasts: [],
  listeners: [],
  add(toast) {
    const id = Math.random().toString(36).slice(2);
    this.toasts = [...this.toasts, { ...toast, id }];
    this.listeners.forEach((l) => l(this.toasts));
    setTimeout(() => this.remove(id), 4000);
  },
  remove(id) {
    this.toasts = this.toasts.filter((t) => t.id !== id);
    this.listeners.forEach((l) => l(this.toasts));
  },
};

export function toast(data: Omit<ToastData, "id">) {
  toastStore.add(data);
}

export function Toaster() {
  const [toasts, setToasts] = React.useState<ToastData[]>([]);

  React.useEffect(() => {
    toastStore.listeners.push(setToasts);
    return () => {
      toastStore.listeners = toastStore.listeners.filter((l) => l !== setToasts);
    };
  }, []);

  return (
    <ToastProvider>
      {toasts.map((t) => (
        <ToastPrimitive.Root
          key={t.id}
          className={cn(
            "group pointer-events-auto relative flex w-full items-center justify-between space-x-4 overflow-hidden rounded-2xl border p-4 pr-8 shadow-lg transition-all data-[swipe=cancel]:translate-x-0 data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)] data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=move]:transition-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[swipe=end]:animate-out data-[state=closed]:fade-out-80 data-[state=closed]:slide-out-to-right-full data-[state=open]:slide-in-from-top-full",
            t.variant === "destructive" && "border-red-200 bg-red-50 text-red-900",
            t.variant === "success" && "border-green-200 bg-green-50 text-green-900",
            t.variant === "info" && "border-blue-200 bg-blue-50 text-blue-900",
            (!t.variant || t.variant === "default") && "border bg-white text-gray-900"
          )}
          open={true}
          onOpenChange={(open) => !open && toastStore.remove(t.id)}
        >
          <div className="flex items-start gap-3">
            {t.variant === "success" && <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 shrink-0" />}
            {t.variant === "destructive" && <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 shrink-0" />}
            {t.variant === "info" && <Info className="h-5 w-5 text-blue-500 mt-0.5 shrink-0" />}
            <div className="grid gap-1">
              {t.title && (
                <ToastPrimitive.Title className="text-sm font-semibold">
                  {t.title}
                </ToastPrimitive.Title>
              )}
              {t.description && (
                <ToastPrimitive.Description className="text-sm opacity-90">
                  {t.description}
                </ToastPrimitive.Description>
              )}
            </div>
          </div>
          <ToastPrimitive.Close
            className="absolute right-2 top-2 rounded-md p-1 text-current opacity-50 transition-opacity hover:opacity-100"
            onClick={() => toastStore.remove(t.id)}
          >
            <X className="h-4 w-4" />
          </ToastPrimitive.Close>
        </ToastPrimitive.Root>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
}
