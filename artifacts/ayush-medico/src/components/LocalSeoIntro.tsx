/**
 * LocalSeoIntro — homepage copy block targeting "pharmacy in Kurla" and
 * "order medicine online".
 *
 * Kept as short, genuinely useful copy rather than keyword stuffing: it explains
 * what the shop is, where it delivers and links to the four local pages that go
 * deeper. Those links are the internal links that let the local pages rank.
 */

import { Link } from "wouter";
import { MapPin, Truck, ShieldCheck, MessageCircle } from "lucide-react";

const LOCAL_LINKS = [
  { label: "Pharmacy in Kurla West", href: "/pharmacy-kurla-west", icon: MapPin },
  { label: "Medicine delivery", href: "/medicine-delivery-kurla-west", icon: Truck },
  { label: "Chemist near Kurla station", href: "/chemist-kurla-west", icon: MessageCircle },
  { label: "Licences & compliance", href: "/compliance", icon: ShieldCheck },
];

export default function LocalSeoIntro() {
  return (
    <section className="border-y border-slate-200/70 bg-white py-14 sm:py-16" aria-labelledby="local-pharmacy-heading">
      <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr] lg:gap-14">
          <div>
            <p className="mb-3 text-xs font-bold uppercase tracking-[0.18em] text-primary">
              Licensed pharmacy · Kurla West, Mumbai
            </p>
            <h2
              id="local-pharmacy-heading"
              className="mb-4 text-2xl font-bold leading-snug text-slate-900 sm:text-3xl"
              style={{ fontFamily: "'Poppins', sans-serif" }}
            >
              Ordering medicine online from a pharmacy in Kurla West
            </h2>
            <div className="space-y-4 text-[15px] leading-relaxed text-slate-600">
              <p>
                Ayush Medico is a licensed retail pharmacy on Halav Pool Road, Kurla West, open
                8 AM to 10 PM seven days a week. Prescription medicines, over-the-counter
                remedies, Ayurvedic products, baby care, surgical supplies and health devices are
                all available at the counter and by home delivery.
              </p>
              <p>
                To order medicine online, send a photo of your prescription on WhatsApp or call the
                shop. A pharmacist checks the prescription, confirms stock and price, and shares the
                bill before anything is dispatched. Delivery runs within roughly 4 km of Kurla West,
                covering the Kurla, Sion and Chunabhatti side; outside that radius you can collect
                from the counter.
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-center gap-2.5">
            {LOCAL_LINKS.map(({ label, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3 text-sm font-semibold text-slate-700 transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary"
              >
                <Icon size={16} className="shrink-0 text-primary" strokeWidth={2.2} />
                <span className="flex-1">{label}</span>
                <span className="text-slate-400 transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
