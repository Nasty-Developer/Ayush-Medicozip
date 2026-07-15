---
name: wouter v3 Link renders its own anchor
description: Wrapping a manual <a> child inside wouter's <Link> (v2 API pattern) causes nested <a> tags and a React hydration error in wouter v3+.
---

In wouter v3+, `<Link href="...">children</Link>` renders the `<a>` element itself — pass `className`/styles as props directly on `<Link>`. Do not wrap a manual `<a className="...">` child inside it (that was the wouter v2 pattern).

**Why:** nesting `<a>` inside the `<a>` that `<Link>` already renders produces invalid HTML (`<a>` cannot be a descendant of `<a>`), which React reports as a hydration error and can cause blank/broken renders for the affected route.

**How to apply:** when auditing or writing any `<Link>` usage, grep for `<Link href=` followed by a child `<a `. Fix by moving the className/props onto `<Link>` and dropping the inner `<a>` wrapper entirely.
