import { ENQUIRY_DESK } from '@/pages/siteContent.js';
import { useT } from '@/i18n/localeContext.js';
import styles from './Footer.module.css';

export default function Footer(){const t=useT();return <footer className={styles.root}>
  <div className={styles.marquee} aria-hidden="true"><span>DIAMONDS WITH AN ORIGIN YOU CAN EXPLAIN · </span><span>DIAMONDS WITH AN ORIGIN YOU CAN EXPLAIN · </span></div>
  <div className={styles.pitch}><p className="u-eyebrow">The next stone / Start here</p><h2>Source brilliance.<br/><em>Verify everything.</em></h2><div className={styles.actions}><a href="/diamonds">Explore diamonds <b>→</b></a><a href="/contact">Request inventory <b>→</b></a></div></div>
  <div className={styles.grid}>
    <div className={styles.brand}><strong>NGD</strong><p>{t('footer.tagline')}</p></div>
    <nav aria-label={t('footer.explore')}><p>{t('footer.explore')}</p><a href="/diamonds">{t('footer.inventory')}</a><a href="/jewellery">{t('terms.customJewellery')}</a><a href="/shapes">{t('footer.shapeGuide')}</a></nav>
    <nav aria-label={t('footer.company')}><p>{t('footer.company')}</p><a href="/about">{t('nav.ourStory')}</a><a href="/why-lab-grown">{t('footer.whyNgd')}</a><a href="/faq">{t('footer.faq')}</a></nav>
    <address><p>{t('footer.diamondDesk')}</p><a href={`tel:${ENQUIRY_DESK.tel}`}>{ENQUIRY_DESK.phone}</a><a href="tel:+919913999794">+91 99139 99794</a><a href="mailto:newgrowndiamonds@gmail.com">newgrowndiamonds@gmail.com</a><span>Surat · Mumbai · New York · Hong Kong</span></address>
  </div>
  <div className={styles.base}><span>© {new Date().getFullYear()} New Grown Diamond</span><span>{t('footer.rights')}</span></div>
  </footer>}
