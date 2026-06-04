"use client";

/** Indikator kekuatan password sederhana — tidak menggantikan validator backend. */

interface Props {
  password: string;
}

interface Rule {
  label: string;
  test: (p: string) => boolean;
}

const RULES: Rule[] = [
  { label: "Minimal 8 karakter", test: (p) => p.length >= 8 },
  { label: "Mengandung huruf", test: (p) => /[a-zA-Z]/.test(p) },
  { label: "Mengandung angka", test: (p) => /\d/.test(p) },
];

export default function PasswordStrength({ password }: Props) {
  if (!password) return null;
  return (
    <ul className="mt-2 space-y-0.5">
      {RULES.map((rule) => {
        const passed = rule.test(password);
        return (
          <li
            key={rule.label}
            className={`text-xs flex items-center gap-1.5 ${passed ? "text-green-600" : "text-gray-400"}`}
          >
            <span aria-hidden>{passed ? "✓" : "○"}</span>
            {rule.label}
          </li>
        );
      })}
    </ul>
  );
}
