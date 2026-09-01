import type { PublicAmenity } from "../types/place.types";
import { useLanguage } from "../../../i18n/useLanguage";

export function AmenityList({ amenities }: { amenities: PublicAmenity[] }) {
  const { t } = useLanguage();
  if (amenities.length === 0) {
    return (
      <p className="text-sm text-slate-500">{t("No amenities listed.")}</p>
    );
  }

  return (
    <ul className="flex flex-wrap gap-2" aria-label={t("Amenities")}>
      {amenities.map((amenity) => (
        <li
          className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-800"
          key={amenity.code}
        >
          {t(amenity.name)}
        </li>
      ))}
    </ul>
  );
}
