import { Link } from "react-router-dom";
import heroImage from "../../assets/hero.png";
import { useAuth } from "../../features/auth/hooks/useAuth";

const foundationCards = [
  {
    title: "Clear account controls",
    description:
      "Your profile and session controls are available without placing tokens in browser storage.",
  },
  {
    title: "Inclusive by design",
    description:
      "The foundation prioritises readable content, keyboard access, and dependable mobile layouts.",
  },
  {
    title: "Built for what comes next",
    description:
      "Property discovery, maps, and reviews will arrive in later phases on top of this secure base.",
  },
] as const;

export function HomePage() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-emerald-950 via-emerald-900 to-teal-800 text-white">
        <div className="absolute -right-20 -top-28 size-80 rounded-full bg-lime-300/10 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 size-96 rounded-full bg-cyan-300/10 blur-3xl" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_0.9fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <p className="inline-flex rounded-full border border-emerald-300/30 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-100">
              Ceylon DryWay foundation
            </p>
            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              A more confident way to plan journeys across Sri Lanka.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-8 text-emerald-50/90 sm:text-lg">
              Start with a secure account and profile. Trusted place details,
              accessibility information, and travel tools will build on this
              foundation in future phases.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                className="inline-flex min-h-12 items-center justify-center rounded-xl bg-amber-300 px-6 py-3 font-extrabold text-emerald-950 transition hover:bg-amber-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                to={isAuthenticated ? "/profile" : "/register"}
              >
                {isAuthenticated ? "Open your profile" : "Create your account"}
              </Link>
              {!isAuthenticated ? (
                <Link
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/30 bg-white/10 px-6 py-3 font-bold text-white transition hover:bg-white/20 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"
                  to="/login"
                >
                  Sign in
                </Link>
              ) : null}
            </div>
          </div>

          <div className="relative mx-auto w-full max-w-lg">
            <div className="absolute inset-6 rounded-[2rem] bg-amber-300/20 blur-3xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/20 bg-white/10 p-3 shadow-2xl backdrop-blur">
              <img
                className="aspect-[4/3] w-full rounded-[1.4rem] object-cover"
                src={heroImage}
                alt="A scenic Sri Lankan landscape representing future journey planning"
              />
              <div className="absolute bottom-6 left-6 right-6 rounded-2xl bg-slate-950/75 p-4 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-amber-300">
                  Phase 7
                </p>
                <p className="mt-1 font-semibold text-white">
                  Secure authentication and account management are ready.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-18 lg:px-8">
        <div className="max-w-2xl">
          <p className="text-sm font-bold uppercase tracking-[0.16em] text-emerald-700">
            A dependable starting point
          </p>
          <h2 className="mt-3 text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">
            The essentials are in place.
          </h2>
        </div>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {foundationCards.map((card, index) => (
            <article
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
              key={card.title}
            >
              <span className="grid size-10 place-items-center rounded-xl bg-emerald-100 text-sm font-black text-emerald-800">
                0{index + 1}
              </span>
              <h3 className="mt-5 text-lg font-bold text-slate-950">
                {card.title}
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {card.description}
              </p>
            </article>
          ))}
        </div>
      </section>
    </>
  );
}
