import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

import Button from '@/components/primitives/Button.jsx';
import Eyebrow from '@/components/primitives/Eyebrow.jsx';
import styles from './ComingSoon.module.css';

/**
 * Holding page for routes the navigation already points at but later phases
 * will build. Without it, every header link would dead-end in a 404 — worse
 * for review than an honest placeholder.
 */
export default function ComingSoon({ title, phase }) {
  const { pathname } = useLocation();

  useEffect(() => {
    document.title = `${title} — New Grown Diamond`;
  }, [title]);

  return (
    <main id="main" className={styles.page}>
      <div className="ngd-container-narrow">
        <Eyebrow>Not yet built</Eyebrow>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.copy}>
          This page arrives in {phase}. The route (<code>{pathname}</code>) is
          wired so navigation can be reviewed end to end today.
        </p>
        <Button to="/" variant="outline">Back to the homepage</Button>
      </div>
    </main>
  );
}
