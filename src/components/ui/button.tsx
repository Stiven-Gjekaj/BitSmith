import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";
import { cn } from "../../lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:border-ring",
  {
    variants: {
      variant: {
        // The one action on a tool page. It carries the accent gradient
        // because there is only ever one of it on screen.
        default:
          "bg-gradient-to-r from-primary to-accent text-primary-foreground font-semibold hover:brightness-110 hover:-translate-y-0.5 shadow-lg shadow-primary/10",
        secondary:
          "bg-secondary text-secondary-foreground border border-border hover:border-ring hover:-translate-y-0.5",
        outline:
          "border border-border bg-card/60 hover:bg-secondary hover:border-ring",
        ghost: "hover:bg-secondary hover:text-foreground",
        link: "text-muted-foreground underline underline-offset-4 hover:text-primary",
        destructive:
          "bg-destructive text-destructive-foreground hover:brightness-110",
      },
      size: {
        default: "h-10 px-5 py-2",
        sm: "h-8 rounded-sm px-3 text-xs",
        lg: "h-12 rounded-lg px-7 text-base",
        icon: "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  // `asChild` lets a link wear the button's clothes without nesting an anchor
  // inside a button, which is invalid and confuses a screen reader.
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
