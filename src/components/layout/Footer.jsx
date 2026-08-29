import { Link } from 'react-router-dom';
import { Mail, Phone, MapPin } from 'lucide-react';

import Logo from './Logo.jsx';
import Reveal from '@/components/motion/Reveal.jsx';
import { FOOTER_NAV } from '@/lib/navigation.js';
import styles from './Footer.module.css';

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className={styles.footer}>
      <div className="ngd-page">
        <Reveal className={styles.top} selector={`.${styles.topCell}`} stagger={0.08} y={26}>
          <div className={`${styles.brand} ${styles.topCell}`}>
            <Logo />
            <p className={styles.blurb}>
              Lab-grown diamonds and fine jewellery, grown and cut in Surat.
              Certified by IGI and GIA.
            </p>
            <ul className={styles.contact}>
              <li>
                <MapPin size={15} aria-hidden="true" />
                <span>Surat, Gujarat, India</span>
              </li>
              <li>
                <Phone size={15} aria-hidden="true" />
                <a href="tel:+917339220840">+91 73392 20840</a>
              </li>
              <li>
                <Mail size={15} aria-hidden="true" />
                <a href="mailto:hello@newgrowndiamond.com">hello@newgrowndiamond.com</a>
              </li>
            </ul>
          </div>

          {FOOTER_NAV.map((col) => (
            <nav key={col.title} className={styles.topCell} aria-labelledby={`f-${col.title}`}>
              <p className={styles.colTitle} id={`f-${col.title}`}>{col.title}</p>
              <ul className={styles.colList}>
                {col.links.map((link) => (
                  <li key={link.label}>
                    <Link to={link.to} className={styles.link}>{link.label}</Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </Reveal>

        <div className={styles.bottom}>
          <p>© {year} New Grown Diamond. All rights reserved.</p>
          <p className={styles.made}>Grown, cut and polished in India</p>
        </div>
      </div>
    </footer>
  );
}
