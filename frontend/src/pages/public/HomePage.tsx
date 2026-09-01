import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "../../assets/hero.png";
import { NearMeButton } from "../../features/places/components/NearMeButton";
import { PlaceList } from "../../features/places/components/PlaceList";
import { usePublicPlaces } from "../../features/places/hooks/usePlaces";

const discoveryHighlights = [
  {
    number: "01",
    title: "Verified before publishing",
    text: "Trained reviewers check listing details and locations before travellers see them.",
  },
  {
    number: "02",
    title: "Useful accessibility detail",
    text: "Compare facilities, access notes, opening hours and practical amenities in one place.",
  },
  {
    number: "03",
    title: "Built around real journeys",
    text: "Use the live map, nearby search and exact directions to plan with more confidence.",
  },
] as const;

export function HomePage() {
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
      <section className="relative isolate min-h-[calc(100svh-4.25rem)] overflow-hidden bg-emerald-950 text-white">
        <video
          className="absolute inset-0 -z-30 size-full object-cover"
          autoPlay
          loop
          muted
          playsInline
          preload="metadata"
          poster={heroImage}
          aria-hidden="true"
        >
          <source src="/videos/home-hero-demo.mp4" type="video/mp4" />
        </video>
        <div className="absolute inset-0 -z-20 bg-[linear-gradient(90deg,rgba(2,44,34,0.96)_0%,rgba(2,44,34,0.82)_43%,rgba(2,44,34,0.28)_100%)]" />
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_75%_20%,rgba(253,224,71,0.18),transparent_32%)]" />

        <div className="mx-auto flex min-h-[calc(100svh-4.25rem)] max-w-7xl items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-4xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-black uppercase tracking-[0.18em] text-emerald-50 backdrop-blur-md">
              <span className="size-2 rounded-full bg-amber-300 shadow-[0_0_0_5px_rgba(253,224,71,0.15)]" />
              Reviewer-verified across Sri Lanka
            </div>

            <h1 className="mt-7 max-w-4xl text-5xl font-black leading-[0.98] tracking-[-0.045em] sm:text-6xl lg:text-8xl">
              Travel with fewer
              <span className="block text-amber-300">unknowns.</span>
            </h1>
            <p className="mt-7 max-w-2xl text-base leading-8 text-emerald-50/90 sm:text-xl">
              Find verified facilities, accessibility information and precise
              locations for journeys that feel easier from the start.
            </p>

            <form
              className="mt-9 max-w-3xl rounded-[1.5rem] border border-white/20 bg-white/95 p-2 shadow-2xl shadow-slate-950/30 backdrop-blur-xl sm:flex"
              onSubmit={submitSearch}
            >
              <label className="sr-only" htmlFor="home-place-search">
                Search places
              </label>
              <div className="flex min-h-14 flex-1 items-center gap-3 px-4">
                <span className="text-xl text-emerald-700" aria-hidden="true">
                  ⌕
                </span>
                <input
                  className="min-w-0 flex-1 border-0 bg-transparent py-3 text-slate-950 outline-none placeholder:text-slate-500"
                  id="home-place-search"
                  type="search"
                  maxLength={100}
                  placeholder="Search a place, city or district"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <button
                className="min-h-14 w-full rounded-[1.1rem] bg-emerald-700 px-7 font-black text-white transition hover:bg-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 sm:w-auto"
                type="submit"
              >
                Explore places
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
                className="inline-flex min-h-11 items-center rounded-xl border border-white/25 bg-white/10 px-4 text-sm font-bold text-white backdrop-blur transition hover:bg-white/20"
                to="/map"
              >
                Open live map&nbsp; →
              </Link>
            </div>

            <div className="mt-10 flex flex-wrap gap-x-8 gap-y-3 border-t border-white/20 pt-6 text-sm text-emerald-50/85">
              <span>✓ Approved active listings only</span>
              <span>✓ Exact map coordinates</span>
              <span>✓ Accessibility-first details</span>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr] lg:items-end">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Confidence by design
              </p>
              <h2 className="mt-3 text-4xl font-black leading-tight tracking-[-0.035em] text-slate-950 sm:text-5xl">
                Better information makes better journeys.
              </h2>
            </div>
            <p className="max-w-2xl text-lg leading-8 text-slate-600 lg:justify-self-end">
              Ceylon DryWay brings trustworthy facility information into a
              single calm experience—from discovery to directions.
            </p>
          </div>

          <div className="mt-11 grid overflow-hidden rounded-[2rem] border border-slate-200 bg-stone-50 md:grid-cols-3">
            {discoveryHighlights.map((highlight) => (
              <article
                className="border-b border-slate-200 p-7 last:border-b-0 md:border-b-0 md:border-r md:last:border-r-0 sm:p-8"
                key={highlight.number}
              >
                <span className="text-sm font-black text-emerald-700">
                  {highlight.number}
                </span>
                <h3 className="mt-8 text-xl font-black text-slate-950">
                  {highlight.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {highlight.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-stone-100 py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-end justify-between gap-5">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-emerald-700">
                Recently verified
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.035em] text-slate-950">
                Places ready to explore
              </h2>
            </div>
            <Link
              className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-5 font-black text-slate-800 transition hover:border-emerald-300 hover:text-emerald-800"
              to="/explore"
            >
              View all places&nbsp; →
            </Link>
          </div>

          <div className="mt-8">
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
                  Verified places are on the way
                </h3>
                <p className="mt-2 text-slate-600">
                  Check Explore for newly approved public facilities.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
}
