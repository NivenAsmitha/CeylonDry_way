interface LoadingScreenProps {
  message?: string;
}

export function LoadingScreen({
  message = "Preparing your session…",
}: LoadingScreenProps) {
  return (
    <div
      className="flex min-h-screen items-center justify-center bg-stone-50 px-6"
      role="status"
      aria-live="polite"
    >
      <div className="text-center">
        <span className="mx-auto block size-11 animate-spin rounded-full border-4 border-brand-100 border-t-brand-700" />
        <p className="mt-4 text-sm font-medium text-slate-700">{message}</p>
      </div>
    </div>
  );
}
