/**
 * Public testimonials are managed by the pharmacy in the admin panel.
 * This view only displays enabled database records; it never fabricates reviews.
 */
import { useEffect, useState } from "react";
import { Star, Quote, BadgeCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";

type PublishedTestimonial = {
  id: number;
  name: string;
  role: string | null;
  content: string;
  rating: number;
};

type LoadState =
  | { status: "loading" }
  | { status: "ready"; items: PublishedTestimonial[] }
  | { status: "error" };

const gradients = [
  "from-primary to-blue-700",
  "from-secondary to-green-700",
  "from-purple-500 to-violet-700",
];

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

function normalizeTestimonials(value: unknown): PublishedTestimonial[] {
  if (!Array.isArray(value)) throw new Error("Invalid testimonial response");
  return value.filter((item): item is PublishedTestimonial => (
    item !== null &&
    typeof item === "object" &&
    Number.isInteger(item.id) &&
    typeof item.name === "string" &&
    item.name.trim().length > 0 &&
    typeof item.content === "string" &&
    item.content.trim().length > 0 &&
    Number.isFinite(item.rating) &&
    item.rating >= 1 &&
    item.rating <= 5
  ));
}

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Star
          key={index}
          size={13}
          aria-hidden="true"
          className={index < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

export default function TestimonialsPreview() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    const apiPath = `${import.meta.env.BASE_URL}api/testimonials`;

    fetch(apiPath, { signal: controller.signal, headers: { Accept: "application/json" } })
      .then((response) => {
        if (!response.ok) throw new Error(`Testimonials request failed (${response.status})`);
        return response.json() as Promise<unknown>;
      })
      .then((body) => setState({ status: "ready", items: normalizeTestimonials(body) }))
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        console.error("[Testimonials] Could not load published reviews", {
          message: error instanceof Error ? error.message : "Unknown error",
        });
        setState({ status: "error" });
      });

    return () => controller.abort();
  }, []);

  const items = state.status === "ready" ? state.items : [];

  return (
    <section
      id="testimonials"
      className="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-br from-background via-primary/3 to-secondary/3"
    >
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            <BadgeCheck size={14} aria-hidden="true" />
            Customer Reviews
          </div>
          <h2
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4"
            style={{ fontFamily: "'Poppins', sans-serif" }}
          >
            What Our{" "}
            <span className="bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              Customers Say
            </span>
          </h2>
          <p className="text-muted-foreground text-base lg:text-lg max-w-lg mx-auto">
            Reviews published by the Ayush Medico team.
          </p>
        </div>

        {state.status === "loading" ? (
          <p className="text-center text-sm text-muted-foreground" role="status">Loading customer reviews…</p>
        ) : state.status === "error" ? (
          <p className="text-center text-sm text-muted-foreground" role="status">
            Customer reviews are temporarily unavailable.
          </p>
        ) : items.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground" role="status">
            No customer reviews have been published yet.
          </p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
            {items.slice(0, 3).map((testimonial, index) => (
              <article
                key={testimonial.id}
                className="relative p-7 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
              >
                {index === 1 && (
                  <div className="absolute -top-px left-8 right-8 h-0.5 rounded-b-full bg-gradient-to-r from-primary to-secondary" />
                )}
                <Quote size={28} aria-hidden="true" className="text-primary/20 mb-4" />
                <div className="flex items-center gap-3 mb-4">
                  <div
                    aria-hidden="true"
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${gradients[index % gradients.length]} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}
                  >
                    {initials(testimonial.name)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-foreground" style={{ fontFamily: "'Poppins', sans-serif" }}>
                      {testimonial.name}
                    </p>
                    {testimonial.role && (
                      <p className="text-[11px] text-muted-foreground">{testimonial.role}</p>
                    )}
                    <StarRating rating={testimonial.rating} />
                  </div>
                </div>
                <p className="text-foreground/80 text-sm leading-relaxed italic">“{testimonial.content}”</p>
              </article>
            ))}
          </div>
        )}

        <div className="text-center">
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary font-medium transition-colors duration-200"
          >
            Read more about us <ArrowRight size={14} aria-hidden="true" />
          </Link>
        </div>
      </div>
    </section>
  );
}
