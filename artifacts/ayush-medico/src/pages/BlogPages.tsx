import { Link } from "wouter";
import { ChevronRight, BookOpen } from "lucide-react";
import PageShell from "@/components/PageShell";
import { BLOG_POSTS, blogPostBySlug } from "@/content/blog";
import { LOCAL_PAGES } from "@/content/localPages";

/** Blog index: lists every guide with its excerpt and a link to the local pages. */
export function BlogIndexPage() {
  return (
    <PageShell>
      <div className="container mx-auto px-4 py-12">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <ol className="flex items-center gap-1">
            <li><Link href="/" className="hover:text-primary">Home</Link></li>
            <li aria-hidden="true" className="mx-1">/</li>
            <li className="text-foreground">Pharmacy guides</li>
          </ol>
        </nav>

        <h1 className="text-3xl font-bold text-foreground sm:text-4xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
          Pharmacy Guides from Kurla West
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted-foreground">
          Practical notes on buying, storing and checking medicines — written by our counter team for
          customers around Kurla West, Mumbai. General information only; it does not replace your doctor.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {BLOG_POSTS.map((post) => (
            <article key={post.slug} className="rounded-2xl border border-border bg-card p-5">
              <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-primary">
                <BookOpen className="h-3.5 w-3.5" /> {post.readingMinutes} min read
              </p>
              <h2 className="text-lg font-bold leading-snug text-foreground">
                <Link href={`/blog/${post.slug}`} className="hover:text-primary">{post.title}</Link>
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{post.excerpt}</p>
              <Link href={`/blog/${post.slug}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
                Read the guide <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </article>
          ))}
        </div>

        <section className="mt-12">
          <h2 className="mb-3 text-xl font-bold text-foreground">Serving Kurla West and nearby</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {LOCAL_PAGES.map((page) => (
              <Link
                key={page.slug}
                href={`/${page.slug}`}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground hover:border-primary/40 hover:text-primary"
              >
                {page.navLabel}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </PageShell>
  );
}

/** Individual guide. Content comes from src/content/blog.ts so it stays editable. */
export function BlogPostPage({ slug }: { slug: string }) {
  const post = blogPostBySlug(slug);

  if (!post) {
    return (
      <PageShell>
        <div className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">Guide not found</h1>
          <Link href="/blog" className="mt-4 inline-block text-primary">All pharmacy guides</Link>
        </div>
      </PageShell>
    );
  }

  const published = new Date(post.published).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <PageShell>
      <article className="container mx-auto px-4 py-12">
        <nav aria-label="Breadcrumb" className="mb-4 text-xs text-muted-foreground">
          <ol className="flex flex-wrap items-center gap-1">
            <li><Link href="/" className="hover:text-primary">Home</Link></li>
            <li aria-hidden="true" className="mx-1">/</li>
            <li><Link href="/blog" className="hover:text-primary">Pharmacy guides</Link></li>
            <li aria-hidden="true" className="mx-1">/</li>
            <li className="text-foreground">{post.title}</li>
          </ol>
        </nav>

        <div className="mx-auto max-w-3xl">
          <h1 className="text-3xl font-bold leading-tight text-foreground sm:text-4xl" style={{ fontFamily: "'Poppins', sans-serif" }}>
            {post.h1}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">
            Published {published} · {post.readingMinutes} min read · Ayush Medico, Kurla West
          </p>

          <div className="mt-8 space-y-8">
            {post.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="mb-2 text-xl font-bold text-foreground">{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph.slice(0, 32)} className="mb-3 text-sm leading-relaxed text-muted-foreground sm:text-base">
                    {paragraph}
                  </p>
                ))}
                {section.bullets && (
                  <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
                    {section.bullets.map((bullet) => <li key={bullet}>{bullet}</li>)}
                  </ul>
                )}
              </section>
            ))}
          </div>

          <aside className="mt-10 rounded-2xl border border-border bg-muted/30 p-5 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">Need a medicine checked?</p>
            <p className="mt-1">
              Call <a href="tel:+919833273838" className="text-primary hover:underline">+91 98332 73838</a> or
              send your prescription on{" "}
              <a href="https://wa.me/919833273838" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">WhatsApp</a>.
              Ayush Medico is open 8 AM – 10 PM, seven days, in Kurla West.
            </p>
            <p className="mt-2 text-xs">
              This article is general information about pharmacy practice. It is not medical advice; your doctor
              decides on medicines and doses.
            </p>
          </aside>

          <div className="mt-6 flex flex-wrap gap-3 text-sm">
            <Link href="/blog" className="text-primary hover:underline">← All guides</Link>
            <Link href="/pharmacy-kurla-west" className="text-primary hover:underline">Pharmacy in Kurla West</Link>
            <Link href="/medicine-availability" className="text-primary hover:underline">Check medicine availability</Link>
          </div>
        </div>
      </article>
    </PageShell>
  );
}
