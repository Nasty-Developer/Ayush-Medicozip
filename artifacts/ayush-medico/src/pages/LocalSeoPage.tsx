import { Link } from "wouter";
import { MapPin, Phone, MessageCircle, Navigation, ChevronRight, CheckCircle2 } from "lucide-react";
import PageShell from "@/components/PageShell";
import { localPageBySlug, LOCAL_PAGES } from "@/content/localPages";

const PHONE_DISPLAY = "+91 98332 73838";
const PHONE_TEL = "+919833273838";
const WHATSAPP = "https://wa.me/919833273838?text=" + encodeURIComponent("Hi Ayush Medico, I want to check medicine availability.");
const MAPS_QUERY = encodeURIComponent("Ayush Medico, Halav Pool Road, Kurla West, Mumbai 400070");
const DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${MAPS_QUERY}`;

/** Store details block reused on every local page, with real business values. */
function StoreCard({ heading }: { heading: string }) {
  return (
    <section className="container mx-auto px-4 pb-10" aria-labelledby="store-details">
      <div className="rounded-2xl border border-border bg-card p-6 sm:p-8">
        <h2 id="store-details" className="mb-4 text-xl font-bold text-foreground sm:text-2xl">
          {heading}
        </h2>
        <div className="grid gap-6 md:grid-cols-2">
          <div className="space-y-3 text-sm text-muted-foreground">
            <p className="flex items-start gap-2">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>
                Shop No.1, Hut No.67 1/1, Gangaram Makad Wala Chawl, Halav Pool Road, near Rolex Hotel,
                Kurla West, Mumbai 400070
              </span>
            </p>
            <p className="flex items-center gap-2">
              <Phone className="h-4 w-4 shrink-0 text-primary" />
              <a href={`tel:${PHONE_TEL}`} className="hover:text-primary">{PHONE_DISPLAY}</a>
            </p>
            <p className="text-sm">
              <span className="font-semibold text-foreground">Open daily:</span> 8:00 AM – 10:00 PM
            </p>
            <p className="text-sm">
              <span className="font-semibold text-foreground">Delivery:</span> within approximately 4 km of Kurla West
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={`tel:${PHONE_TEL}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90">
                <Phone className="h-4 w-4" /> Call now
              </a>
              <a href={WHATSAPP} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-secondary/40 bg-secondary/10 px-4 py-2.5 text-sm font-semibold text-secondary hover:bg-secondary/15">
                <MessageCircle className="h-4 w-4" /> WhatsApp enquiry
              </a>
              <a href={DIRECTIONS} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:border-primary/40 hover:text-primary">
                <Navigation className="h-4 w-4" /> Get directions
              </a>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border">
            <iframe
              title="Ayush Medico location on Google Maps, Kurla West, Mumbai"
              src={`https://www.google.com/maps?q=${MAPS_QUERY}&output=embed`}
              width="100%"
              height="240"
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              style={{ border: 0 }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

export default function LocalSeoPage({ slug }: { slug: string }) {
  const page = localPageBySlug(slug);

  if (!page) {
    return (
      <PageShell>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Page not found</h1>
          <Link href="/" className="mt-4 inline-block text-primary">Go to homepage</Link>
        </div>
      </PageShell>
    );
  }

  const related = page.related
    .map((relatedSlug) => LOCAL_PAGES.find((entry) => entry.slug === relatedSlug))
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));

  return (
    <PageShell>
      <article>
        <header className="bg-gradient-to-b from-primary/8 to-background py-12 sm:py-16">
          <div className="container mx-auto px-4">
            <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
              <ol className="flex flex-wrap items-center gap-1">
                <li><Link href="/" className="hover:text-primary">Home</Link></li>
                <li aria-hidden="true" className="mx-1">/</li>
                <li className="text-foreground">{page.navLabel}</li>
              </ol>
            </nav>
            <h1 className="max-w-3xl text-3xl font-bold leading-tight text-foreground sm:text-4xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
              {page.h1}
            </h1>
            <p className="mt-4 max-w-3xl text-base leading-relaxed text-muted-foreground sm:text-lg">
              {page.intro}
            </p>
            <div className="mt-6 flex flex-wrap gap-3 text-sm">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/10 px-3 py-1 font-medium text-secondary">
                <CheckCircle2 className="h-3.5 w-3.5" /> Licensed pharmacy · MH-MZ4-518856
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-3 py-1 font-medium text-primary">
                Open 7 days · 8 AM – 10 PM
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-muted px-3 py-1 font-medium text-foreground">
                4 km delivery radius
              </span>
            </div>
          </div>
        </header>

        <div className="container mx-auto px-4 py-10">
          <div className="mx-auto max-w-3xl space-y-10">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="mb-3 text-xl font-bold text-foreground sm:text-2xl">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)} className="mb-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-3 space-y-2">
                    {section.bullets.map((bullet) => (
                      <li key={bullet} className="flex items-start gap-2 text-sm text-muted-foreground">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-secondary" />
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            ))}

            <section>
              <h2 className="mb-4 text-xl font-bold text-foreground sm:text-2xl">Common questions</h2>
              <div className="space-y-3">
                {page.faqs.map((faq) => (
                  <details key={faq.question} className="group rounded-xl border border-border bg-card p-4">
                    <summary className="cursor-pointer list-none text-sm font-semibold text-foreground">
                      {faq.question}
                    </summary>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.answer}</p>
                  </details>
                ))}
              </div>
            </section>
          </div>
        </div>

        <StoreCard heading="Visit, call or send your prescription" />

        <section className="container mx-auto px-4 pb-16">
          <h2 className="mb-4 text-lg font-bold text-foreground">More about Ayush Medico</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {related.map((entry) => (
              <Link
                key={entry.slug}
                href={`/${entry.slug}`}
                className="group flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:border-primary/40 hover:text-primary"
              >
                <span>{entry.navLabel}</span>
                <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" />
              </Link>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-4 text-sm">
            <Link href="/blog" className="text-primary hover:underline">Pharmacy guides</Link>
            <Link href="/about" className="text-primary hover:underline">About the pharmacy</Link>
            <Link href="/contact" className="text-primary hover:underline">Contact and timings</Link>
            <Link href="/categories" className="text-primary hover:underline">Browse medicine categories</Link>
            <Link href="/request-medicine" className="text-primary hover:underline">Request a medicine</Link>
          </div>
        </section>
      </article>
    </PageShell>
  );
}
