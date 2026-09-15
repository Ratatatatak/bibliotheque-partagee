import * as React from "react";
import { cn } from "@/lib/utils";

interface BadgeProps extends React.ComponentPropsWithoutRef<"div"> {
  variant?: "default" | "primary" | "secondary" | "success" | "outline";
}

const Badge = React.forwardRef<HTMLDivElement, BadgeProps>(
  ({ className, variant = "default", ...props }, ref) => {
    const variants = {
      default: "bg-terre-cuite-chaleureuse/10 text-terre-cuite-chaleureuse font-medium px-3 py-1 rounded-md",
      primary: "bg-terre-cuite-chaleureuse/10 text-terre-cuite-chaleureuse font-medium px-3 py-1 rounded-md",
      secondary: "bg-bleu-canard-profond/10 text-bleu-canard-profond font-medium px-3 py-1 rounded-md",
      success: "bg-vert-sauge-doux/10 text-vert-sauge-doux font-medium px-3 py-1 rounded-md",
      outline: "border border-terre-cuite-chaleureuse/30 text-terre-cuite-chaleureuse font-medium px-3 py-1 rounded-md hover:bg-terre-cuite-chaleureuse/5",
    };

    return (
      <div
        ref={ref}
        className={cn(
          "inline-flex items-center",
          variants[variant],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = "Badge";

export { Badge };