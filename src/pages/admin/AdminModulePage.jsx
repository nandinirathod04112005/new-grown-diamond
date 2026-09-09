import { SetupRequired } from '@/components/admin/AdminBits.jsx';
import { moduleForPath } from '@/components/admin/adminModules.js';
import styles from './AdminOverview.module.css';

/**
 * The landing page for a module the sidebar lists but nothing yet backs.
 *
 * The sidebar shows all eighteen modules deliberately — hiding the ones that
 * are not built would leave an admin unable to tell whether a feature is
 * missing or simply somewhere else. But an offered link has to lead somewhere
 * truthful, so this states exactly which table is absent and what adding it
 * would enable, and shows no figures at all.
 *
 * Modules whose tables DO exist but whose screens arrive in a later phase say
 * so in the same place, with the columns that were verified to exist.
 */
export default function AdminModulePage({ path }) {
  const m = moduleForPath(path);

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div>
          <p className={styles.eyebrow}>Control Centre</p>
          <h1>{m.label}</h1>
        </div>
      </header>
      <SetupRequired module={m} />
    </div>
  );
}
