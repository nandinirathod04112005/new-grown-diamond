import { ENQUIRY_DESK } from '@/pages/siteContent.js';
import styles from './Footer.module.css';

export default function Footer(){return <footer className={styles.root}>
  <div className={styles.marquee} aria-hidden="true"><span>DIAMONDS WITH AN ORIGIN YOU CAN EXPLAIN · </span><span>DIAMONDS WITH AN ORIGIN YOU CAN EXPLAIN · </span></div>
  <div className={styles.pitch}><p className="u-eyebrow">The next stone / Start here</p><h2>Source brilliance.<br/><em>Verify everything.</em></h2><div className={styles.actions}><a href="/diamonds">Explore diamonds <b>→</b></a><a href="/contact">Request inventory <b>→</b></a></div></div>
  <div className={styles.grid}>
    <div className={styles.brand}><strong>NGD</strong><p>CVD and HPHT laboratory-grown diamonds manufactured in Surat for clients worldwide.</p></div>
    <nav aria-label="Explore"><p>Explore</p><a href="/diamonds">Diamond inventory</a><a href="/jewellery">Custom jewellery</a><a href="/shapes">Shape guide</a></nav>
    <nav aria-label="Company"><p>Company</p><a href="/about">Our story</a><a href="/why-lab-grown">Why NGD</a><a href="/faq">FAQ</a></nav>
    <address><p>Diamond desk</p><a href={`tel:${ENQUIRY_DESK.tel}`}>{ENQUIRY_DESK.phone}</a><a href="tel:+919913999794">+91 99139 99794</a><a href="mailto:newgrowndiamonds@gmail.com">newgrowndiamonds@gmail.com</a><span>Surat · Mumbai · New York · Hong Kong</span></address>
  </div>
  <div className={styles.base}><span>© {new Date().getFullYear()} New Grown Diamond</span><span>Grown with precision · Presented with proof</span></div>
  </footer>}
