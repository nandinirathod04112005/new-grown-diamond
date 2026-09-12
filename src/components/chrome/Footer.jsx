import { useSiteSettings } from '@/hooks/useSiteSettings.js';
import { useT } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import COPY from './Footer.copy.js';
import SocialLinks from './SocialLinks.jsx';
import styles from './Footer.module.css';

/* The desk line, the desk email and the city list come from Settings in the
   Control Centre (built-in values until something is saved). */
export default function Footer(){const t=useT();const c=useCopy(COPY);const {desk,offices}=useSiteSettings();return <footer className={styles.root}>
  <div className={styles.marquee} aria-hidden="true"><span>{c.marquee}</span><span>{c.marquee}</span></div>
  <div className={styles.pitch}><p className="u-eyebrow">{c.eyebrow}</p><h2>{c.title}<br/><em>{c.accent}</em></h2><div className={styles.actions}><a href="/diamonds">{t('common.exploreDiamonds')} <b>→</b></a><a href="/contact">{c.request} <b>→</b></a></div></div>
  <div className={styles.grid}>
    <div className={styles.brand}><strong>NGD</strong><p>{t('footer.tagline')}</p><div className={styles.social}><SocialLinks label={t('footer.follow')} /></div></div>
    <nav aria-label={t('footer.explore')}><p>{t('footer.explore')}</p><a href="/diamonds">{t('footer.inventory')}</a><a href="/jewellery">{t('terms.customJewellery')}</a><a href="/shapes">{t('footer.shapeGuide')}</a><a href="/blogs">{t('footer.journal')}</a></nav>
    <nav aria-label={t('footer.company')}><p>{t('footer.company')}</p><a href="/about">{t('nav.ourStory')}</a><a href="/why-lab-grown">{t('footer.whyNgd')}</a><a href="/faq">{t('footer.faq')}</a><a href="/feedback">{t('footer.feedback')}</a><a href="/privacy-policy">{t('footer.privacy')}</a><a href="/terms-and-conditions">{t('footer.terms')}</a></nav>
    <address><p>{t('footer.diamondDesk')}</p><a href={`tel:${desk.tel}`}>{desk.phone}</a><a href={`mailto:${desk.email}`}>{desk.email}</a><span>{offices.map((o)=>o.city).join(' · ')}</span></address>
  </div>
  <div className={styles.base}><span>© {new Date().getFullYear()} New Grown Diamond</span><span>{t('footer.rights')}</span></div>
  </footer>}
