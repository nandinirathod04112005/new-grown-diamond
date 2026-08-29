/**
 * Developer-facing diagnostic shown when the Supabase environment is
 * incomplete. It replaces the app so the failure is impossible to miss,
 * instead of leaving a blank page and a console message.
 *
 * Deliberately styled with literal values rather than design tokens: this is
 * diagnostic plumbing, not part of the product's design system, and it has to
 * render correctly even before the token layer exists.
 */

import styles from './EnvironmentNotice.module.css';

/**
 * @param {{problems: string[], instructions: string[]}} props
 */
export default function EnvironmentNotice({ problems, instructions }) {
  return (
    <main className={styles.root} role="alert">
      <div className={styles.panel}>
        <p className={styles.eyebrow}>New Grown Diamond</p>
        <h1 className={styles.heading}>Supabase is not configured</h1>
        <p className={styles.lead}>
          The app cannot load data until these environment variables are set.
        </p>

        <h2 className={styles.subheading}>What is wrong</h2>
        <ul className={styles.list}>
          {problems.map((problem) => (
            <li key={problem}>{problem}</li>
          ))}
        </ul>

        <h2 className={styles.subheading}>How to fix it</h2>
        <ol className={styles.list}>
          {instructions.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>

        <p className={styles.footnote}>
          Only the project URL and the publishable key belong in{' '}
          <code>.env.local</code>. Vite publishes every <code>VITE_</code>{' '}
          variable to every visitor, so a service-role key must never be placed
          there.
        </p>
      </div>
    </main>
  );
}
