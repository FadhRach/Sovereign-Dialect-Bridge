/**
 * Input field reusable.
 *
 * Pakai:
 *   <Input value={x} onChange={e => setX(e.target.value)} placeholder="..." />
 *   <Input error type="email" />
 */

import { forwardRef } from "react";
import { cn } from "@/lib/cn";

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  error?: boolean;
};

const Input = forwardRef<HTMLInputElement, InputProps>(({ className, error, ...props }, ref) => {
  return (
    <input
      ref={ref}
      className={cn(
        "w-full px-3.5 py-2.5 border rounded-xl text-sm transition-colors bg-gray-50 placeholder:text-gray-400",
        "focus:outline-none focus:ring-2 focus:ring-[#2563EB]/30 focus:border-[#2563EB]",
        error ? "border-red-300" : "border-gray-200",
        className
      )}
      {...props}
    />
  );
});
Input.displayName = "Input";

export default Input;
