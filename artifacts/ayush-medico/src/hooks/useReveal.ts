/**
 * useRevealInView — reveal-on-scroll that can never leave a section blank.
 *
 * Several homepage sections fade their content in from `opacity: 0` and only
 * animate once an IntersectionObserver reports them visible. On the live site
 * the observer occasionally never fires (page restored at a scroll offset, a
 * hidden tab, a fast scroll past the section), which left a correctly sized but
 * completely empty block on the page.
 *
 * This wrapper keeps the observer for the nice staggered reveal and adds a short
 * timer fallback, so the content always ends up visible with or without it.
 */

import { useEffect, useState } from "react";
import { useInView, type UseInViewOptions } from "framer-motion";
import type { RefObject } from "react";

/** How long we wait for the observer before showing the content anyway. */
const FALLBACK_MS = 1200;

export function useRevealInView(
  ref: RefObject<Element | null>,
  options: UseInViewOptions = { once: true, margin: "0px" },
): boolean {
  const observed = useInView(ref, options);
  const [fallback, setFallback] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => setFallback(true), FALLBACK_MS);
    return () => clearTimeout(id);
  }, []);

  return observed || fallback;
}
