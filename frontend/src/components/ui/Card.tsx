/**
 * Card wrapper reusable — bg-white + rounded + border + padding.
 *
 * Pakai:
 *   <Card>...</Card>
 *   <Card className="p-3">...</Card>     // override padding
 */

import { cn } from "@/lib/cn";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: "sm" | "md" | "lg" | "none";
}

const PADDING = { none: "", sm: "p-3", md: "p-5", lg: "p-6 sm:p-7" };

export default function Card({ className, padding = "md", ...props }: CardProps) {
  return (
    <div
      className={cn("bg-white rounded-2xl border border-gray-100", PADDING[padding], className)}
      {...props}
    />
  );
}
