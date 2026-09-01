import { useLocation } from 'react-router-dom';
import styles from './PageTransition.module.css';
export default function PageTransition({ children }) {
  const { pathname } = useLocation();
  return <div key={pathname} className={styles.page}>{children}<i className={styles.mask} aria-hidden="true" /></div>;
}
