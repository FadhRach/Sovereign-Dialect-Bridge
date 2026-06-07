/**
 * Tombol reusable dengan 3 variant: primary / secondary / ghost.
 *
 * Pakai:
 *   <Button onClick={...}>Simpan</Button>
 *   <Button variant="secondary" size="sm">Batal</Button>
 *   <Button variant="ghost" disabled>...</Button>
 */

import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 font-semibold rounded-xl transition-colors disabled:opacity-60 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-[#2563EB]/30",
  {
    variants: {
      variant: {
        primary:   "bg-[#2563EB] hover:bg-[#1D4ED8] text-white",
        secondary: "bg-gray-100 hover:bg-gray-200 text-[#1E2A4A]",
        ghost:     "text-gray-600 hover:bg-gray-100 hover:text-[#1E2A4A]",
        danger:    "bg-red-50 hover:bg-red-100 text-red-600",
      },
      size: {
        sm: "text-xs px-3 py-1.5",
        md: "text-sm px-4 py-2.5",
        lg: "text-base px-5 py-3",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export default function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
