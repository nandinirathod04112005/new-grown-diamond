import { useEffect, useRef, useState } from 'react';

export default function DeferredSection({ children, minHeight = 320 }) {
  const root = useRef(null);
  // On phones each deferred chunk is small, while stacked placeholders can
  // become several blank screens before IntersectionObserver catches up with
  // a fast touch scroll. Render the content immediately there; its images keep
  // their native lazy-loading behaviour.
  const [visible, setVisible] = useState(() => window.matchMedia?.('(max-width: 767px)').matches ?? false);
  useEffect(() => {
    if (visible) return undefined;
    if (!('IntersectionObserver' in window)) {
      // oxlint-disable-next-line react/set-state-in-effect -- capability fallback must reveal content
      setVisible(true);
      return undefined;
    }
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) { setVisible(true); observer.disconnect(); }
    }, { rootMargin: window.innerWidth < 768 ? '240px 0px' : '520px 0px' });
    observer.observe(root.current);
    return () => observer.disconnect();
  }, [visible]);
  return <div ref={root} style={visible ? undefined : { minHeight }} aria-hidden={visible ? undefined : 'true'}>{visible ? children : null}</div>;
}
