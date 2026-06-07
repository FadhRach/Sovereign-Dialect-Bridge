"use client";

/** Primitive input/select dengan label konsisten. Dipakai ulang di form auth. */

import { forwardRef } from "react";

interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "id"> {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  invalid?: boolean;
}

export const FormInput = forwardRef<HTMLInputElement, InputProps>(
  ({ id, label, hint, required, invalid, className, ...rest }, ref) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <input
        ref={ref}
        id={id}
        name={id}
        required={required}
        className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
          invalid ? "border-red-400 bg-red-50" : "border-gray-300"
        } ${className ?? ""}`}
        {...rest}
      />
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  )
);
FormInput.displayName = "FormInput";

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "id"> {
  id: string;
  label: string;
  required?: boolean;
  options: readonly string[];
  placeholder?: string;
}

export function FormSelect({ id, label, required, options, placeholder, ...rest }: SelectProps) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      <select
        id={id}
        name={id}
        required={required}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        {...rest}
      >
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((opt) => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </div>
  );
}
