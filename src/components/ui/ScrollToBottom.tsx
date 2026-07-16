import { useState, useEffect, useCallback, type RefObject } from 'react';
import { ArrowDown } from 'lucide-react';

interface ScrollToBottomProps {
  scrollRef: RefObject<HTMLDivElement | null>;
  threshold?: number;
}

export default function ScrollToBottom({ scrollRef, threshold = 150 }: ScrollToBottomProps) {
  const [show, setShow] = useState(false);

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    setShow(distFromBottom > threshold);
  }, [scrollRef, threshold]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll, { passive: true });
    checkScroll();
    return () => el.removeEventListener('scroll', checkScroll);
  }, [scrollRef, checkScroll]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  };

  if (!show) return null;

  return (
    <button
      onClick={scrollToBottom}
      aria-label="Scroll to bottom"
      className="sticky bottom-2 left-1/2 -translate-x-1/2 z-10 mx-auto flex items-center gap-1.5 px-3 py-1.5 text-small font-medium rounded-full bg-secondary-darkSurface border border-secondary-borderGray text-secondary-midGray hover:text-accent-orange hover:border-accent-orange/30 transition-colors shadow-md"
    >
      <ArrowDown className="w-3.5 h-3.5" />
      Scroll to bottom
    </button>
  );
}
