import { Link } from "react-router-dom";

const sriLankaRoadImage = "/images/about-sri-lanka-road.jpg";
const accessibleRestroomImage = "/images/about-accessible-restroom.jpg";

const audiences = [
  {
    label: "For people who live here",
    title: "Useful on everyday journeys",
    text: "Find nearby restrooms while commuting, shopping, visiting a hospital or travelling between towns.",
    className: "border-brand-100 bg-brand-50",
  },
  {
    label: "For people discovering Sri Lanka",
    title: "Reassurance in unfamiliar places",
    text: "Plan comfortable stops using clear local information, even when you do not know the area.",
    className: "border-amber-100 bg-amber-50",
  },
] as const;

const trustSteps = [
  {
    number: "01",
    title: "A facility is submitted",
    text: "Property owners or authorised reviewers add its location, contact information, amenities and photos.",
  },
  {
    number: "02",
    title: "A reviewer checks it",
    text: "The listing is checked for completeness, useful detail and a valid location before publication.",
  },
  {
    number: "03",
    title: "Approved details go public",
    text: "Only the accepted version is shown to people searching the public directory and map.",
  },
  {
    number: "04",
    title: "The community keeps it current",
    text: "Visitors can report changed, missing or inaccurate information for the team to investigate.",
  },
] as const;

const facilityDetails = [
  {
    title: "Accessibility",
    text: "Wheelchair access and practical access notes help visitors prepare before arrival.",
  },
  {
    title: "Cost and opening times",
    text: "See whether a restroom is free or paid and when the facility is expected to be available.",
  },
  {
    title: "Useful amenities",
    text: "Check for handwashing, baby-changing, parking, toilet paper, washlets and other facilities.",
  },
  {
    title: "Location and photos",
    text: "Use precise coordinates, directions and recent images to recognise the place more easily.",
  },
] as const;

export function AboutPage() {
  return (
    <main>
      <section className="relative isolate overflow-hidden border-b border-brand-100 bg-gradient-to-br from-white via-brand-50 to-amber-50">
        <div className="absolute -left-28 top-12 -z-10 size-72 rounded-full bg-brand-200/55 blur-3xl" />
        <div className="absolute -right-24 bottom-0 -z-10 size-80 rounded-full bg-amber-200/45 blur-3xl" />
        <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-8 lg:py-24">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/85 px-4 py-2 text-xs font-black uppercase tracking-[0.16em] text-brand-800 shadow-sm backdrop-blur">
              <span className="size-2 rounded-full bg-amber-400" />
              About Ceylon DryWay
            </div>
            <h1 className="mt-6 text-5xl font-black leading-[1.02] tracking-[-0.05em] text-slate-950 sm:text-6xl lg:text-7xl">
              Comfort and confidence,
              <span className="block text-brand-700">
                wherever the road takes you.
              </span>
            </h1>
            <p className="mt-7 max-w-3xl text-lg leading-8 text-slate-600 sm:text-xl">
              Ceylon DryWay helps locals and tourists across Sri Lanka easily
              find nearby restroom facilities. We bring location, access and
              amenity information together so every journey can feel more
              convenient and prepared.
            </p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                className="inline-flex min-h-12 items-center rounded-xl bg-brand-700 px-6 font-black text-white transition hover:bg-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                to="/explore"
              >
                Explore restrooms&nbsp; →
              </Link>
              <a
                className="inline-flex min-h-12 items-center rounded-xl border border-slate-300 bg-white px-6 font-black text-slate-800 transition hover:border-brand-300 hover:text-brand-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-700"
                href="#how-it-works"
              >
                How it works
              </a>
            </div>
          </div>
          <figure className="relative mx-auto w-full max-w-2xl lg:justify-self-end">
            <div className="overflow-hidden rounded-[2rem] border-[8px] border-white bg-white shadow-2xl shadow-brand-950/15">
              <img
                className="aspect-[5/4] w-full object-cover"
                src={sriLankaRoadImage}
                alt="A scenic road beside Loggal Oya reservoir in Sri Lanka"
                fetchPriority="high"
              />
            </div>
            <figcaption className="absolute bottom-5 left-5 right-5 rounded-2xl border border-white/80 bg-white/90 px-5 py-4 text-sm text-slate-700 shadow-lg backdrop-blur-md">
              <span className="block font-black text-slate-950">
                Made for journeys across Sri Lanka
              </span>
              <span className="mt-1 block text-xs text-slate-500">
                Photo by{" "}
                <a
                  className="font-bold text-brand-700 underline-offset-2 hover:underline"
                  href="https://unsplash.com/photos/a-road-next-to-a-large-body-of-water-W-ptSCa4veA"
                  target="_blank"
                  rel="noreferrer"
                >
                  Nalaka Thalagala
                </a>
              </span>
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
              One practical need, shared by everyone
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Built for locals and visitors.
            </h2>
          </div>
          <div className="mt-12 grid gap-5 md:grid-cols-2">
            {audiences.map((audience) => (
              <article
                className={`rounded-3xl border p-8 sm:p-10 ${audience.className}`}
                key={audience.label}
              >
                <p className="text-xs font-black uppercase tracking-[0.16em] text-brand-700">
                  {audience.label}
                </p>
                <h3 className="mt-4 text-2xl font-black text-slate-950 sm:text-3xl">
                  {audience.title}
                </h3>
                <p className="mt-4 max-w-xl leading-7 text-slate-600">
                  {audience.text}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section
        className="border-y border-brand-100 bg-[#f6fbff] py-20 sm:py-24"
        id="how-it-works"
      >
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl">
            <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
              How trust works
            </p>
            <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
              Reviewed before it reaches the map.
            </h2>
            <p className="mt-5 text-lg leading-8 text-slate-600">
              A clear review process helps turn local submissions into useful
              public information.
            </p>
          </div>
          <ol className="mt-12 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {trustSteps.map((step) => (
              <li
                className="rounded-3xl border border-brand-100 bg-white p-7 shadow-sm"
                key={step.number}
              >
                <span className="grid size-11 place-items-center rounded-full bg-brand-700 text-sm font-black text-white">
                  {step.number}
                </span>
                <h3 className="mt-6 text-xl font-black text-slate-950">
                  {step.title}
                </h3>
                <p className="mt-3 text-sm leading-7 text-slate-600">
                  {step.text}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="bg-white py-20 sm:py-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:items-start">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.18em] text-brand-700">
                Know before you go
              </p>
              <h2 className="mt-3 text-4xl font-black tracking-[-0.04em] text-slate-950 sm:text-5xl">
                Details that make a real difference.
              </h2>
              <p className="mt-5 text-lg leading-8 text-slate-600">
                Each listing is designed to answer practical questions before a
                traveller reaches the facility.
              </p>
              <figure className="mt-8 overflow-hidden rounded-3xl border border-slate-200 bg-slate-100 shadow-lg shadow-slate-900/5">
                <img
                  className="aspect-[4/3] w-full object-cover"
                  src={accessibleRestroomImage}
                  alt="An accessible restroom sign on a clean tiled wall"
                  loading="lazy"
                />
                <figcaption className="bg-white px-4 py-3 text-xs text-slate-500">
                  Accessibility information helps travellers plan ahead. Photo
                  by{" "}
                  <a
                    className="font-bold text-brand-700 underline-offset-2 hover:underline"
                    href="https://www.pexels.com/photo/white-tiled-wall-with-men-s-restroom-sign-13554363/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Grant Hughes
                  </a>
                  .
                </figcaption>
              </figure>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {facilityDetails.map((detail) => (
                <article
                  className="rounded-3xl border border-slate-200 bg-[#fffaf1] p-7"
                  key={detail.title}
                >
                  <h3 className="text-xl font-black text-slate-950">
                    {detail.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-slate-600">
                    {detail.text}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white pb-20 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid overflow-hidden rounded-[2rem] border border-brand-200 bg-gradient-to-r from-brand-50 to-amber-50 lg:grid-cols-2">
            <div className="border-b border-brand-200 p-8 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">
                See something incorrect?
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950">
                Help keep information current.
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Anyone can report a closed facility, inaccurate details,
                accessibility concern, safety issue or inappropriate content
                from the restroom&apos;s public page.
              </p>
            </div>
            <div className="p-8 sm:p-10 lg:p-12">
              <p className="text-sm font-black uppercase tracking-[0.16em] text-brand-700">
                Own or manage a facility?
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-[-0.03em] text-slate-950">
                Add a restroom to Ceylon DryWay.
              </h2>
              <p className="mt-4 leading-7 text-slate-600">
                Create a listing with accurate details and photos, then manage
                updates and reviewer feedback from your property workspace.
              </p>
              <Link
                className="mt-6 inline-flex min-h-12 items-center rounded-xl bg-brand-700 px-6 font-black text-white transition hover:bg-brand-800"
                to="/list-property"
              >
                List a property&nbsp; →
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
