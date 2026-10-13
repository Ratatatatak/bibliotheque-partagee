import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-center text-sm font-semibold ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-terre-cuite-chaleureuse text-white hover:bg-terre-cuite-chaleureuse/90",
        primary: "bg-terre-cuite-chaleureuse text-white hover:bg-terre-cuite-chaleureuse/90",
        destructive: "bg-error-atténue text-brun-cafe-doux hover:bg-error-atténue/90",
        outline: "border border-terre-cuite-chaleureuse bg-transparent text-brun-cafe-doux hover:bg-terre-cuite-chaleureuse/10",
        secondary: "bg-bleu-canard-profond text-white hover:bg-bleu-canard-profond/80",
        ghost: "text-brun-cafe-doux hover:bg-terre-cuite-chaleureuse/10",
        link: "text-bleu-canard-profond underline underline-offset-4 hover:no-underline",
      },
      size: {
        // 48 px de haut pour les cibles tactiles (CLAUDE.md, accessibilité).
        default: "h-12 px-6 py-2",
        sm: "h-10 rounded-md px-4 text-sm",
        lg: "h-12 rounded-md px-8 text-base",
        icon: "h-12 w-12",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    );
  }
);
Button.displayName = "Button";

export { Button, buttonVariants };