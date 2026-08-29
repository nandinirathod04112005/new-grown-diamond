import { useEffect } from 'react';

import Button from '@/components/primitives/Button.jsx';
import Eyebrow from '@/components/primitives/Eyebrow.jsx';
import styles from './ComingSoon.module.css';

export default function NotFound() {
  useEffect(() => {
    document.title = 'Page not found — New Grown Diamond';
  }, []);

  return (
    <main id="main" className={styles.page}>
      <div className="ngd-container-narrow">
        <Eyebrow>404</Eyebrow>
        <h1 className={styles.title}>That page does not exist.</h1>
        <p className={styles.copy}>
          The link may be out of date, or the stone it pointed to may have
          found an owner.
        </p>
        <Button to="/" variant="outline">Back to the homepage</Button>
      </div>
    </main>
  );
}
