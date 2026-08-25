interface ErrorMessageProps {
  message: string | string[];
  title?: string;
}

export function ErrorMessage({
  message,
  title = "Something went wrong",
}: ErrorMessageProps) {
  const messages = typeof message === "string" ? [message] : message;

  return (
    <div
      className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900"
      role="alert"
    >
      <p className="font-semibold">{title}</p>
      {messages.length === 1 ? (
        <p className="mt-1">{messages[0]}</p>
      ) : (
        <ul className="mt-1 list-disc space-y-1 pl-5">
          {messages.map((item) => (
            <li key={item}>{item}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
