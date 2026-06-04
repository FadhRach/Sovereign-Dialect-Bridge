interface ErrorAlertProps {
  message: string;
  onDismiss?: () => void;
}

export default function ErrorAlert({ message, onDismiss }: ErrorAlertProps) {
  return (
    <div className="flex items-center justify-between bg-red-50 border border-red-200 rounded-lg px-4 py-3">
      <span className="text-sm text-red-700">{message}</span>
      {onDismiss && (
        <button onClick={onDismiss} className="text-red-400 hover:text-red-600 ml-4 text-lg leading-none">
          &times;
        </button>
      )}
    </div>
  );
}
