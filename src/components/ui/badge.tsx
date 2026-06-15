import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-afya-500 text-white hover:bg-afya-600",
        secondary: "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive: "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        waiting: "border-transparent bg-blue-100 text-blue-700",
        "in-progress": "border-transparent bg-orange-100 text-orange-700",
        completed: "border-transparent bg-green-100 text-green-700",
        cancelled: "border-transparent bg-gray-100 text-gray-600",
        "risk-low": "border-green-200 bg-green-100 text-green-700",
        "risk-medium": "border-yellow-200 bg-yellow-100 text-yellow-700",
        "risk-high": "border-red-200 bg-red-100 text-red-700",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
