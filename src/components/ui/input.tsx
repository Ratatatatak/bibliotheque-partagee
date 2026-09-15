import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const inputVariants = cva(
  "flex h-10 w-full rounded-md border border-gris-pierre-chaude bg-creme-de-lait px-4 py-3 text-sm text-brun-cafe-doux placeholder:text-brun-cafe-doux/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-terre-cuite-chaleureuse focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 shadow-sm hover:shadow-md",
  {
    variants: {
      variant: {
        default: "",
        destructive: "border-error-atténue text-error-atténue placeholder-error-atténue/40",
        outline: "border-terre-cuite-chaleureuse text-terre-cuite-chaleureuse hover:bg-terre-cuite-chaleureuse/10",
        secondary: "border-bleu-canard-profond text-bleu-canard-profond placeholder-bleu-canard-profond/40 hover:bg-bleu-canard-profond/50",
        ghost: "hover:bg-terre-cuite-chaleureuse/5",
        link: "border-transparent underline-offset-4 hover:underline text-terre-cuite-chaleureuse",
      },
      size: {
        default: "h-10 px-4 py-3 text-sm",
        sm: "h-9 rounded-md px-3 text-xs",
        lg: "h-11 rounded-md px-4 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">, VariantProps<typeof inputVariants> {
  asChild?: boolean;
  startContent?: React.ReactNode;
  // Override size to avoid conflict with native input size attribute
  size?: VariantProps<typeof inputVariants>['size'];
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, variant, size, asChild = false, startContent, ...props }, ref) => {
    const Comp = asChild ? Slot : "input";
    const input = (
      <Comp
        className={cn(inputVariants({ variant, size, className: cn(startContent && "pl-10", className) }))}
        ref={ref}
        {...props}
      />
    );

    if (!startContent) {
      return input;
    }

    return (
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center" aria-hidden="true">
          {startContent}
        </span>
        {input}
      </div>
    );
  }
);
Input.displayName = "Input";

export { Input, inputVariants };