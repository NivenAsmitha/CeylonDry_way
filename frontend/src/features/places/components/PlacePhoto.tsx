import { useState } from "react";
import { normalizeMediaUrl } from "../utils/media-url";

export function PlacePhoto({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className: string;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const normalizedSource = normalizeMediaUrl(src);

  if (failedSource === normalizedSource) {
    return (
      <div
        className={`grid place-items-center bg-gradient-to-br from-brand-100 to-brand-100 text-center text-sm font-black text-brand-900 ${className}`}
        role="img"
        aria-label={`${alt}. Image unavailable.`}
      >
        <span className="rounded-full bg-white/70 px-4 py-2">Photo unavailable</span>
      </div>
    );
  }

  return (
    <img
      className={className}
      src={normalizedSource}
      alt={alt}
      loading="lazy"
      decoding="async"
      onError={() => setFailedSource(normalizedSource)}
    />
  );
}
