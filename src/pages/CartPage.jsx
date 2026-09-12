import { ArrowLeft, ArrowUpRight, ShoppingBag, Trash2 } from 'lucide-react';
import fallback from '@/assets/diamonds/ngd-brilliant-macro.webp';
import { useCart } from '@/cart/useCart.js';
import { resizedImage } from '@/lib/storageImages.js';
import { interpolate, useLocale } from '@/i18n/localeContext.js';
import { useCopy } from '@/i18n/useCopy.js';
import { ENQUIRY_DESK } from './siteContent.js';
import COPY from './CartPage.copy.js';
import styles from './CartPage.module.css';

/* No price reads as null here; the page words it ("Price on request") in the visitor's language. */
const money = (value, currency = 'USD') => value == null ? null : new Intl.NumberFormat('en', { style: 'currency', currency }).format(value);

export default function CartPage() {
  const { items, remove, clear } = useCart();
  const { t } = useLocale();
  const c = useCopy(COPY);
  const summary = items.map((item) => `${item.stockNumber}: ${item.carat} ct ${item.shape}, ${item.colour}/${item.clarity}`).join('\n');
  const email = `mailto:newgrowndiamonds@gmail.com?subject=${encodeURIComponent('Cart availability request')}&body=${encodeURIComponent(`Hello New Grown Diamond,\n\nPlease share availability and details for:\n${summary}\n\nThank you.`)}`;
  const whatsapp = `https://wa.me/${ENQUIRY_DESK.tel.replace(/\D/g, '')}?text=${encodeURIComponent(`Hello New Grown Diamond, please share availability for:\n${summary}`)}`;

  return <main className={styles.page}>
    <header className={styles.hero}>
      <p>{interpolate(c.eyebrow, { n: String(items.length).padStart(2, '0') })}</p>
      <h1>{c.title.lead}<em>{c.title.em}</em></h1>
      <span>{c.intro}</span>
    </header>
    {items.length === 0 ? <section className={styles.empty}>
      <ShoppingBag size={38} strokeWidth={1} />
      <h2>{c.empty.title}</h2>
      <p>{c.empty.body}</p>
      <a href="/diamonds">{t('common.exploreDiamonds')} <ArrowUpRight size={17} /></a>
    </section> : <section className={styles.layout}>
      <div className={styles.list}>{items.map((item, index) => <article key={item.publicId} className={styles.item}>
        <span className={styles.index}>{String(index + 1).padStart(2, '0')}</span>
        <img src={resizedImage(item.imageUrl, 320) || fallback} alt={interpolate(c.alt, { carat: item.carat, shape: item.shape })} />
        <div><p>{item.stockNumber}</p><h2>{item.carat} ct {item.shape}</h2><dl><div><dt>{t('terms.colour')}</dt><dd>{item.colour}</dd></div><div><dt>{t('terms.clarity')}</dt><dd>{item.clarity}</dd></div><div><dt>{t('terms.cut')}</dt><dd>{item.cut}</dd></div><div><dt>{t('terms.lab')}</dt><dd>{item.lab}</dd></div></dl></div>
        <div className={styles.price}><strong>{money(item.price, item.currency) ?? t('terms.priceOnRequest')}</strong><button onClick={() => remove(item.publicId)} aria-label={interpolate(c.removeLabel, { stock: item.stockNumber })}><Trash2 size={17} /> {c.remove}</button></div>
      </article>)}</div>
      <aside className={styles.summary}><p>{c.summary}</p><h2>{interpolate(items.length === 1 ? c.countOne : c.countMany, { n: items.length })}</h2><span>{c.note}</span><a className={styles.primary} href={whatsapp} target="_blank" rel="noreferrer">{c.whatsapp} <ArrowUpRight size={17} /></a><a className={styles.secondary} href={email}>{c.email}</a><a className={styles.accountLink} href="/account">{c.account}</a><button onClick={clear}>{c.clear}</button></aside>
      <a className={styles.back} href="/diamonds"><ArrowLeft size={16} /> {c.back}</a>
    </section>}
  </main>;
}
