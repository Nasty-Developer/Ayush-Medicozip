/**
 * TestimonialsPreview — static 3-card snapshot shown on the homepage.
 * Links to the full testimonials section via the About page or a dedicated anchor.
 */
import { Star, Quote, BadgeCheck, ArrowRight } from "lucide-react";
import { Link } from "wouter";

const featured = [
  {
    name: "Priya Sharma",
    location: "Kurla West",
    rating: 5,
    text: "Ayush Medico has been my family's pharmacy for over 5 years. They always have the medicines we need and the staff is incredibly helpful.",
    initials: "PS",
    gradient: "from-primary to-blue-700",
    role: "Regular Customer",
  },
  {
    name: "Rajesh Kumar",
    location: "Ghatkopar",
    rating: 5,
    text: "Excellent service! I called ahead to check medicine availability and they had everything ready when I arrived. Genuine medicines and very fair prices.",
    initials: "RK",
    gradient: "from-secondary to-green-700",
    role: "Since 2018",
  },
  {
    name: "Anjali Mehta",
    location: "Kurla East",
    rating: 5,
    text: "The pharmacist here is very knowledgeable. He helped me understand my prescription and even suggested a more affordable alternative.",
    initials: "AM",
    gradient: "from-purple-500 to-violet-700",
    role: "Loyal Customer",
  },
];

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={13}
          className={i < rating ? "text-yellow-400 fill-yellow-400" : "text-muted-foreground/30"}
        />
      ))}
    </div>
  );
}

export default function TestimonialsPreview() {
  return (
    <section
      id="testimonials"
      className="relative py-20 lg:py-28 overflow-hidden bg-gradient-to-br from-background via-primary/3 to-secondary/3"
    >
      {/* Background glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-secondary/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-semibold border border-primary/20 mb-4">
            <BadgeCheck size={14} />
            Verified Reviews
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
            Real stories from families who trust Ayush Medico every day.
          </p>
        </div>

        {/* 3 static cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mb-10">
          {featured.map((t, idx) => (
            <div
              key={idx}
              className="relative p-7 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md hover:border-primary/20 transition-all duration-300"
            >
              {idx === 1 && (
                <div className="absolute -top-px left-8 right-8 h-0.5 rounded-b-full bg-gradient-to-r from-primary to-secondary" />
              )}
              <Quote size={28} className="text-primary/20 mb-4" />
              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-11 h-11 rounded-xl bg-gradient-to-br ${t.gradient} flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-md`}
                >
                  {t.initials}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <p
                      className="text-sm font-bold text-foreground"
                      style={{ fontFamily: "'Poppins', sans-serif" }}
                    >
                      {t.name}
                    </p>
                    <BadgeCheck size={12} className="text-primary" />
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {t.location} · {t.role}
                  </p>
                  <StarRating rating={t.rating} />
                </div>
              </div>
              <p className="text-foreground/80 text-sm leading-relaxed italic">"{t.text}"</p>
            </div>
          ))}
        </div>

        {/* Link to more reviews (About page has full context) */}
        <div className="text-center">
          <Link
            href="/about"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary font-medium transition-colors duration-200"
          >
            Read more about us <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </section>
  );
}
