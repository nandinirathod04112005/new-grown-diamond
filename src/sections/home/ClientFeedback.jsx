import { useEffect, useRef, useState } from 'react';
import { ArrowUpRight } from 'lucide-react';

import Rail from '@/components/journal/Rail.jsx';
import { FeedbackCard } from '@/components/feedback/FeedbackWall.jsx';
import { StarsDisplay } from '@/components/feedback/Stars.jsx';
import { useReveal } from '@/hooks/useReveal.js';
import { loadFeedbackSummary, loadFeedbackWall } from '@/lib/supabase/queries/feedback.js';
import { interpolate } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './ClientFeedback.copy.js';
import s from './ClientFeedback.module.css';

/**
 * Client feedback on the homepage.
 *
 * Renders NOTHING until there is approved feedback to show — not a heading
 * over an empty rail, and never sample quotes. So until the team has approved
 * a piece in the Control Centre, the homepage is exactly as it was.
 */
export default function ClientFeedback() {
  const [data, setData] = useState({ items: [], summary: null });
  const root = useRef(null);
  const c = useCopy(COPY);

  useEffect(() => {
    let alive = true;
    Promise.all([loadFeedbackWall({ limit: 8 }), loadFeedbackSummary()])
      .then(([wall, summary]) => { if (alive) setData({ items: wall.items, summary }); })
      .catch((err) => console.error('[NGD home] feedback', err));
    return () => { alive = false; };
  }, []);

  useReveal(root, [data.items.length]);

  if (!data.items.length) return null;
  const { summary } = data;

  return (
    <section ref={root} className={s.section} aria-labelledby="client-feedback-title" data-reveal="">
      <div className={s.head}>
        <div>
          <p className={s.eyebrow}>{c.eyebrow}</p>
          <h2 id="client-feedback-title">{c.title} <em>{c.accent}</em></h2>
        </div>
        {summary?.count > 0 && (
          <p className={s.score}>
            <b>{summary.average?.toFixed(1)}</b>
            <StarsDisplay value={summary.average} size={16} />
            <span>{interpolate(summary.count === 1 ? c.reviews.one : c.reviews.other, { count: summary.count })}</span>
          </p>
        )}
      </div>

      <Rail
        label={c.rail}
        items={data.items}
        getKey={(f) => f.id}
        renderItem={(f, i) => <FeedbackCard item={f} index={i % 4} />}
      />

      <div className={s.actions}>
        <a className={s.primary} href="/feedback#wall">{c.readAll} <ArrowUpRight size={17} aria-hidden="true" /></a>
        <a className={s.textLink} href="/feedback">{c.share}</a>
      </div>
    </section>
  );
}
