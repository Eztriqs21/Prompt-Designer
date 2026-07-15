import { useRef, useState, useEffect } from 'react';

interface ScrollRevealOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

interface ScrollRevealResult {
  ref: React.RefObject<HTMLDivElement | null>;
  shouldReveal: boolean;
}

export function useScrollReveal(options: ScrollRevealOptions = {}): ScrollRevealResult {
  const { threshold = 0.15, rootMargin = '-10%', triggerOnce = true } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [shouldReveal, setShouldReveal] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldReveal(true);
          if (triggerOnce) observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, shouldReveal };
}
