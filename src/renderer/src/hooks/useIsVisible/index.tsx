import { useState, useEffect, RefObject } from 'react';

export function useIsVisible(ref: RefObject<HTMLElement>) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting));

    ref.current && observer.observe(ref.current);
  }, [ref]);

  return { isVisible };
}
