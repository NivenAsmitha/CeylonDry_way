import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import heroImage from "../../assets/hero.png";
import { NearMeButton } from "../../features/places/components/NearMeButton";
import { PlaceList } from "../../features/places/components/PlaceList";
import { usePublicPlaces } from "../../features/places/hooks/usePlaces";
import { useAuth } from "../../features/auth/hooks/useAuth";

export function HomePage() {
  const [search, setSearch] = useState("");
  const { user } = useAuth();
  const navigate = useNavigate();
  const featuredQuery = usePublicPlaces({ page: 1, pageSize: 3, sort: "newest" });

  function submitSearch(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    navigate(`/explore${params.size ? `?${params.toString()}` : ""}`);
  }

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 text-white">
        <div className="absolute -right-20 -top-28 size-80 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/30 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
              Reviewer-verified places
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              Find facilities that make every journey easier.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-emerald-50/90 sm:text-lg">
              Discover approved public facilities across Sri Lanka, compare
              accessibility details, and get directions from exact verified coordinates.
            </p>
            <form className="mt-8 flex max-w-2xl flex-col gap-3 sm:flex-row" onSubmit={submitSearch}>
              <label className="sr-only" htmlFor="home-place-search">Search places</label>
              <input
                className="min-h-12 flex-1 rounded-xl border-0 bg-white px-4 text-slate-950 outline-none ring-2 ring-transparent focus:ring-amber-300"
                id="home-place-search"
                type="search"
                maxLength={100}
                placeholder="Search a place, city, or district"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
              <button
                className="min-h-12 rounded-xl bg-amber-300 px-6 font-extrabold text-emerald-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                type="submit"
              >
                Explore places
              </button>
            </form>
            <div className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-3">
              <p className="mb-2 text-sm text-emerald-50">
                Or share your location once to see the nearest verified places.
              </p>
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
            </div>
            <div className="mt-4 flex flex-wrap gap-4 text-sm font-bold text-emerald-100">
              <Link className="underline underline-offset-4" to="/explore?wheelchairAccessible=true">
                Wheelchair accessible
              </Link>
              <Link className="underline underline-offset-4" to="/explore?isFree=true">
                Free facilities
              </Link>
              <Link className="underline underline-offset-4" to="/map">Location view</Link>
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute inset-6 rounded-[2rem] bg-amber-300/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur">
              <img
                className="aspect-[4/3] w-full rounded-[1.4rem] object-cover"
                src={heroImage}
                alt="A scenic Sri Lankan landscape"
              />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-slate-950/75 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">Public discovery</p>
                <p className="mt-1 font-semibold text-white">Only approved, active listings appear in search.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-black uppercase tracking-[0.16em] text-emerald-700">Recently verified</p>
            <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-950">Start exploring</h2>
          </div>
          <Link className="inline-flex min-h-11 items-center font-bold text-emerald-800" to="/explore">
            View all places &rarr;
          </Link>
        </div>

        <div className="mt-7">
          {featuredQuery.isPending ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[0, 1, 2].map((item) => (
                <div className="h-80 animate-pulse rounded-3xl bg-slate-200" key={item} />
              ))}
            </div>
          ) : featuredQuery.data?.items.length ? (
            <PlaceList places={featuredQuery.data.items} />
          ) : (
            <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
              <h3 className="text-xl font-black text-slate-950">Verified places are on the way</h3>
              <p className="mt-2 text-slate-600">Check Explore for newly approved public facilities.</p>
            </div>
          )}
        </div>
        {!user || user.roles.includes("CLIENT") ? (
        <div className="mt-10 rounded-3xl bg-slate-900 px-6 py-8 text-white sm:flex sm:items-center sm:justify-between sm:gap-8">
          <div>
            <h2 className="text-2xl font-black">Know a useful facility?</h2>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              List it for reviewer verification and help make journeys more
              predictable.
            </p>
          </div>
          <Link
            className="mt-5 inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-300 px-5 font-black text-emerald-950 sm:mt-0"
            to="/list-property"
          >
            List your property
          </Link>
        </div>
        ) : null}
      </section>
    </>
  );
}
