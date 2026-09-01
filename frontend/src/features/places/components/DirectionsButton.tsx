import { buildGoogleMapsDirectionsUrl } from "../utils/directions";
import { useLanguage } from "../../../i18n/useLanguage";

export function DirectionsButton({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const { t } = useLanguage();
  const url = buildGoogleMapsDirectionsUrl(latitude, longitude);

  if (!url) {
    return (
      <span
        className="inline-flex min-h-11 items-center rounded-xl bg-slate-200 px-5 text-sm font-bold text-slate-500"
        aria-disabled="true"
      >
        {t("Directions unavailable")}
      </span>
    );
  }

  return (
    <a
      className="inline-flex min-h-11 items-center justify-center rounded-xl bg-brand-700 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
    >
      {t("Get directions")}
      <span className="ml-2" aria-hidden="true">
        &rarr;
      </span>
    </a>
  );
}
