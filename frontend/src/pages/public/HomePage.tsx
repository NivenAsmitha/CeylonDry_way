import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "../../assets/hero.png";
import heroVideo from "../../assets/hero.mp4";
import { NearMeButton } from "../../features/places/components/NearMeButton";
import { PlaceList } from "../../features/places/components/PlaceList";
import { usePublicPlaces } from "../../features/places/hooks/usePlaces";
import { useLanguage } from "../../i18n/useLanguage";

const discoveryHighlights = [
  {
    number: "01",
    title: "Search nearby",
    text: "Search by city, district or your current location to find restrooms along your route.",
    tone: "border-brand-100 bg-brand-50",
    badge: "bg-brand-600",
  },
  {
    number: "02",
    title: "Check the details",
    text: "Compare opening hours, cost, accessibility, amenities and recent photos before you go.",
    tone: "border-amber-100 bg-amber-50",
    badge: "bg-amber-500",
  },
  {
    number: "03",
    title: "Get directions",
    text: "Open the exact location on the map and continue your journey with greater confidence.",
    tone: "border-cyan-100 bg-cyan-50",
    badge: "bg-cyan-600",
  },
] as const;

const projectBenefits = [
  {
    label: "For locals",
    title: "Make everyday journeys easier",
    text: "Quickly find a nearby restroom while commuting, shopping or travelling between towns.",
  },
  {
    label: "For tourists",
    title: "Explore Sri Lanka with confidence",
    text: "Find reliable restroom information even when the area and local facilities are unfamiliar.",
  },
  {
    label: "For families",
    title: "Choose the right facilities",
    text: "Check for baby-changing areas, handwashing facilities, parking and other useful amenities.",
  },
  {
    label: "For accessible travel",
    title: "Know before you arrive",
    text: "Use wheelchair-access information and detailed access notes to plan with fewer surprises.",
  },
] as const;

export function HomePage() {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const navigate = useNavigate();
  const featuredQuery = usePublicPlaces({
    page: 1,
    pageSize: 3,
    sort: "newest",
  });

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    navigate(`/explore${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <>
      <section className="relative isolate overflow-hidden bg-gradient-to-br from-white via-brand-50 to-amber-50">
        <div className="absolute -left-36 top-24 -z-10 size-80 rounded-full bg-brand-200/55 blur-3xl" />
        <div className="absolute -right-20 bottom-0 -z-10 size-96 rounded-full bg-amber-200/50 blur-3xl" />
        <div className="mx-auto grid min-h-[46rem] max-w-7xl gap-12 px-4 py-14 sm:px-6 sm:py-20 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:px-8">
          <div>
            <div className="inline-flex items-center gap-2.5 rounded-full border border-brand-200 bg-white/85 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-brand-900 shadow-sm backdrop-blur">
              <span className="size-2 rounded-full bg-brand-500 shadow-[0_0_0_5px_rgba(14,165,233,0.12)]" />
              {t("Sri Lanka's restroom finder")}
            </div>

            <h1 className="mt-7 max-w-3xl text-5xl font-black leading-[0.98] tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl">
              {t("Find a restroom.")}
              <span className="block text-brand-700">
                {t("Continue the journey.")}
              </span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-8 text-slate-600 sm:text-xl">
              {t(
                "ComfortGo helps locals and tourists across Sri Lanka quickly find nearby restroom facilities for a more comfortable and convenient journey.",
              )}
            </p>

            <form
              className="mt-9 max-w-2xl rounded-2xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/8 sm:flex"
              onSubmit={submitSearch}
            >
              <label className="sr-only" htmlFor="home-place-search">
                {t("Search places")}
              </label>
              <div className="flex min-h-14 flex-1 items-center gap-3 px-4">
                <span className="text-xl text-brand-700" aria-hidden="true">
                  ⌕
                </span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent py-3 text-slate-950 outline-none placeholder:text-slate-500"
                  id="home-place-search"
                  type="search"
                  maxLength={100}
                  placeholder={t("Search a place, city or district")}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <button
                className="min-h-14 w-full rounded-xl bg-brand-700 px-7 font-black text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700 sm:w-auto"
                type="submit"
              >
                {t("Find a facility")}
              </button>
            </form>

            <div className="mt-5 flex flex-wrap items-center gap-3">
              <NearMeButton
                active={false}
                onClear={() => undefined}
                onLocated={(latitude, longitude) => {
                  const params = new URLSearchParams({
                    latitude: latitude.toFixed(6),
                    longitude: longitude.toFixed(6),
                    radiusKm: "25",
                    sort: "distance",
                  });
                  navigate(`/explore?${params.toString()}`);
                }}
              />
              <Link
                className="inline-flex min-h-11 items-center rounded-xl px-4 text-sm font-black text-brand-800 transition hover:bg-white"
                to="/map"
              >
                {t("Explore the live map")}&nbsp; →
              </Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-xl lg:justify-self-end">
            <div className="overflow-hidden rounded-[2.25rem] border-[10px] border-white bg-slate-100 shadow-2xl shadow-brand-950/15">
              <video
                className="aspect-[4/5] w-full object-cover sm:aspect-[5/4] lg:aspect-[4/5]"
                autoPlay
                loop
                muted
                playsInline
                preload="metadata"
                poster={heroImage}
                aria-label={t("A journey across Sri Lanka")}
              >
                <source src={heroVideo} type="video/mp4" />
                {t("A journey across Sri Lanka")}
              </video>
              <div className="absolute inset-x-5 bottom-5 rounded-2xl border border-white/80 bg-white/90 p-5 text-slate-950 shadow-xl backdrop-blur-md">
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
                  {t("Find your nearest clean stop")}
                </p>
                <p className="mt-2 text-lg font-black">
                  {t("Nearby restrooms, useful details and clear directions.")}
                </p>
              </div>
            </div>
            <div className="absolute -left-5 top-8 hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-xl sm:block">
              <p className="text-xs font-bold text-slate-500">
                {t("Coverage")}
              </p>
              <p className="mt-1 font-black text-slate-950">
                {t("Island-wide discovery")}
              </p>
            </div>
          </div>
        </div>

        <div className="border-y border-brand-100 bg-white/75 py-5 backdrop-blur">
          <div className="mx-auto grid max-w-7xl gap-3 px-4 sm:grid-cols-3 sm:px-6 lg:px-8">
            <p className="rounded-2xl border border-brand-100 bg-brand-50 px-4 py-4 text-center text-sm font-bold text-slate-700">
              <span className="mr-2 text-brand-600" aria-hidden="true">
                ●
              </span>
              {t("Reviewer-checked listings")}
            </p>
            <p className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-4 text-center text-sm font-bold text-slate-700">
              <span className="mr-2 text-amber-500" aria-hidden="true">
                ●
              </span>
              {t("Exact locations and directions")}
            </p>
            <p className="rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-4 text-center text-sm font-bold text-slate-700">
              <span className="mr-2 text-cyan-600" aria-hidden="true">
                ●
              </span>
              {t("Helpful community reports")}
            </p>
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
              {t("Easy to use wherever you are")}
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl">
              {t("Find the right restroom in three simple steps.")}
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              {t(
                "Search trusted local information, compare the details that matter and open directions—all in one place.",
              )}
            </p>
          </div>

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {discoveryHighlights.map((highlight) => (
              <article
                className={`rounded-3xl border p-7 transition hover:-translate-y-1 hover:shadow-lg sm:p-8 ${highlight.tone}`}
                key={highlight.number}
              >
                <span
                  className={`grid size-11 place-items-center rounded-full text-sm font-black text-white ${highlight.badge}`}
                >
                  {highlight.number}
                </span>
                <h3 className="mt-7 text-2xl font-black text-slate-950">
                  {t(highlight.title)}
                </h3>
                <p className="mt-3 leading-7 text-slate-600">
                  {t(highlight.text)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-brand-100 bg-[#f6fbff] py-20 sm:py-24">
        <div className="mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.8fr_1.2fr] lg:items-start lg:px-8">
          <div className="lg:sticky lg:top-28">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
              {t("Made for everyone on the road")}
            </p>
            <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.04em] text-slate-950 sm:text-5xl">
              {t("A more comfortable journey for locals and visitors.")}
            </h2>
            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              {t(
                "Whether you are on a familiar daily route or discovering Sri Lanka for the first time, dependable restroom information should be easy to find.",
              )}
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {projectBenefits.map((benefit) => (
              <article
                className="rounded-3xl border border-brand-100 bg-white p-7 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
                key={benefit.label}
              >
                <p className="text-xs font-black uppercase tracking-[0.14em] text-brand-700">
                  {t(benefit.label)}
                </p>
                <h3 className="mt-4 text-xl font-black text-slate-950">
                  {t(benefit.title)}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {t(benefit.text)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#fffaf1] py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
                {t("Ready for your journey")}
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
                {t("Places ready to explore")}
              </h2>
            </div>
            <Link
              className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-5 font-black text-slate-800 transition hover:border-brand-300 hover:text-brand-800"
              to="/explore"
            >
              {t("View all places")}&nbsp; →
            </Link>
          </div>

          <div className="mt-9">
            {featuredQuery.isPending ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {[0, 1, 2].map((item) => (
                  <div
                    className="h-96 animate-pulse rounded-3xl bg-slate-200"
                    key={item}
                  />
                ))}
              </div>
            ) : featuredQuery.data?.items.length ? (
              <PlaceList places={featuredQuery.data.items} />
            ) : (
              <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
                <h3 className="text-2xl font-black text-slate-950">
                  {t("Verified places are on the way")}
                </h3>
                <p className="mt-2 text-slate-600">
                  {t("Newly approved public facilities will appear here.")}
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="relative overflow-hidden rounded-[2rem] border border-brand-200 bg-gradient-to-r from-brand-50 to-amber-50 px-6 py-12 text-slate-950 shadow-lg shadow-brand-950/5 sm:px-10 lg:flex lg:items-center lg:justify-between lg:gap-10 lg:px-14 lg:py-14">
            <div
              className="absolute -right-20 -top-24 size-72 rounded-full border-[40px] border-brand-200/40"
              aria-hidden="true"
            />
            <div className="relative max-w-3xl">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">
                {t("Help more people travel comfortably")}
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] sm:text-4xl">
                {t("Know a restroom that should be on the map?")}
              </h2>
              <p className="mt-4 max-w-2xl leading-7 text-slate-600">
                {t(
                  "Property owners can share accurate details and photos. Every submission is reviewed before it becomes publicly visible.",
                )}
              </p>
            </div>
            <Link
              className="relative mt-7 inline-flex min-h-12 shrink-0 items-center rounded-xl bg-brand-700 px-6 font-black text-white shadow-sm transition hover:bg-brand-800 lg:mt-0"
              to="/list-property"
            >
              {t("List a property")}&nbsp; →
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
