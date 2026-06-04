interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
}

const SIZE_CLASSES = { sm: "h-4 w-4", md: "h-8 w-8", lg: "h-12 w-12" };

export default function LoadingSpinner({ size = "md", label }: LoadingSpinnerProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <div className={`${SIZE_CLASSES[size]} animate-spin rounded-full border-2 border-blue-600 border-t-transparent`} />
      {label && <span className="text-sm text-gray-500">{label}</span>}
    </div>
  );
}
