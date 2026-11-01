import type { ComponentProps } from "react";

import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "bg-surface border-border rounded-card shadow-card border-2 p-5",
        className,
      )}
      {...props}
    />
  );
}

export function CardTitle({ className, ...props }: ComponentProps<"h2">) {
  return (
    <h2 className={cn("text-kid-lg font-extrabold", className)} {...props} />
  );
}

export function CardNote({ className, ...props }: ComponentProps<"p">) {
  return (
    <p className={cn("text-ink-muted text-kid-sm", className)} {...props} />
  );
}
