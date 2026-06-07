interface AlertProps {
  message: string;
  onDismiss?: () => void;
  variant?: "error" | "info" | "success";
}

const VARIANT_STYLES = {
  error:   "bg-red-50 border-red-200 text-red-700",
  info:    "bg-blue-50 border-blue-200 text-blue-700",
  success: "bg-emerald-50 border-emerald-200 text-emerald-700",
};

const DISMISS_STYLES = {
  error:   "text-red-400 hover:text-red-600",
  info:    "text-blue-400 hover:text-blue-600",
  success: "text-emerald-400 hover:text-emerald-600",
};

export default function Alert({ message, onDismiss, variant = "error" }: AlertProps) {
  return (
    <div className={`flex items-center justify-between border rounded-lg px-4 py-3 ${VARIANT_STYLES[variant]}`}>
      <span className="text-sm">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className={`ml-4 text-lg leading-none ${DISMISS_STYLES[variant]}`}>
          &times;
        </button>
      )}
    </div>
  );
}
