import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { cn } from "@/lib/utils";
import { ChevronDown } from "lucide-react";

const Select = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Root>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Root
    ref={ref}
    className={cn(
      "inline-flex h-10 w-full items-center justify-between whitespace-nowrap rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50",
      className
    )}
    {...props}
  >
    <SelectPrimitive.Trigger className={cn("flex h-full w-full items-center justify-between text-left")}>
      <SelectPrimitive.Value placeholder="Sélectionner..." className="truncate" />
      <ChevronDown className="ml-2 h-4 w-4 opacity-50" />
    </SelectPrimitive.Trigger>
    <SelectPrimitive.Portal>
      <SelectPrimitive.Content
        className={cn(
          "z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-sm shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in"
        )}
      >
        <SelectPrimitive.Group>
          <SelectPrimitive.Item
            className={cn(
              "relative flex w-full cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50"
            )}
          >
            {children}
          </SelectPrimitive.Item>
        </SelectPrimitive.Group>
      </SelectPrimitive.Content>
    </SelectPrimitive.Portal>
  </SelectPrimitive.Root>
));
Select.displayName = SelectPrimitive.Root.displayName;

const SelectTrigger = SelectPrimitive.Trigger;
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;

const SelectValue = SelectPrimitive.Value;
SelectValue.displayName = SelectPrimitive.Value.displayName;

const SelectContent = SelectPrimitive.Content;
SelectContent.displayName = SelectPrimitive.Content.displayName;

const SelectItem = SelectPrimitive.Item;
SelectItem.displayName = SelectPrimitive.Item.displayName;

const SelectGroup = SelectPrimitive.Group;
SelectGroup.displayName = SelectPrimitive.Group.displayName;

const SelectSeparator = SelectPrimitive.Separator;
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;

const SelectPortal = SelectPrimitive.Portal;
SelectPortal.displayName = SelectPrimitive.Portal.displayName;

export {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  SelectGroup,
  SelectSeparator,
  SelectPortal,
};