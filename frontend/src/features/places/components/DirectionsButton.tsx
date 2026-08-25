export function DirectionsButton({ url }: { url: string }) {
  return (
    <a
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-emerald-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-700"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      Get directions
      <span className="ml-2" aria-hidden="true">
        &rarr;
      </span>
    </a>
  );
}
