import { useEffect, useRef } from 'react';
export default function ScrollProgress() {
  const ref = useRef(null);
  useEffect(() => {
    const update = () => { const max = document.documentElement.scrollHeight - innerHeight; if (ref.current) ref.current.style.transform = `scaleX(${max > 0 ? scrollY / max : 0})`; };
    update(); addEventListener('scroll', update, { passive: true }); addEventListener('resize', update);
    return () => { removeEventListener('scroll', update); removeEventListener('resize', update); };
  }, []);
  return <div ref={ref} aria-hidden="true" style={{position:'fixed',inset:'0 0 auto',height:2,background:'var(--bright)',transformOrigin:'left',zIndex:999}} />;
}
