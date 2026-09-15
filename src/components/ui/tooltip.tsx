import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import {cn} from "@/lib/utils";

const Tooltip = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Root>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Root
    {...props}
    ref={ref}
    className={cn("inline", className)}
  />
));
Tooltip.displayName = TooltipPrimitive.Root.displayName;

const TooltipTrigger = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TooltipPrimitive.Trigger
    {...props}
    ref={ref}
    className={cn("inline", className)}
  />
));
TooltipTrigger.displayName = TooltipPrimitive.Trigger.displayName;

const TooltipPortal = TooltipPrimitive.Portal;
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    {...props}
    ref={ref}
    className={cn(
      "z-50 min-w-[8rem] max-w-[20rem] overflow-hidden rounded-md border bg-popover p-3 text-sm text-popover-foreground shadow-lg",
      "animate-in fade-in zoom-in",
      "fade-out zoom-out",
      "data-[state=open]:animate-in data-[state=closed]:fade-out",
      "data-[state=open]:zoom-in data-[state=closed]:zoom-out",
      "data-[side=bottom]:translate-y-1",
      "data-[side=left]:-translate-x-1",
      "data-[side=right]:translate-x-1",
      "data-[side=top]:-translate-y-1",
      className
    )}
    sideOffset={sideOffset}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

const TooltipArrow = TooltipPrimitive.Arrow;
const TooltipProvider = TooltipPrimitive.Provider;

export {
  Tooltip,
  TooltipTrigger,
  TooltipPortal,
  TooltipContent,
  TooltipArrow,
  TooltipProvider,
};