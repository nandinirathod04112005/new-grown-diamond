import { ENQUIRY_DESK } from '@/pages/siteContent.js';

/**
 * Enquiries that arrive on WhatsApp already knowing what they are about.
 *
 * A buyer who taps "enquire" on a stone and lands in an empty chat has to
 * describe the diamond from memory — and a message that says "the 2 carat one"
 * costs the desk a round trip before it can answer anything. So the message is
 * composed here, from the record already on screen, and the visitor sends it.
 *
 * WHAT THIS IS NOT: it does not replace the structured enquiry. That one is
 * written to Supabase, gets a reference, and survives a lost phone. This is the
 * fast path that sits beside it, and both are offered wherever there is room
 * for two.
 *
 * NOTHING HERE IS INVENTED. Every line is dropped unless the record actually
 * carries it — `blank()` also rejects the em dash the card mapping substitutes
 * for a missing column, because "Colour: —" in a message to a salesperson is
 * worse than no line at all.
 */

/* wa.me takes digits only: no plus, no spaces. */
const DIGITS = ENQUIRY_DESK.tel.replace(/\D/g, '');

const blank = (v) => v == null || v === '' || v === '—';

/*
 * An empty string is a deliberate blank line; null is a field that did not
 * exist. Only the second is dropped — filtering both, as this first did,
 * silently flattened the message into one unreadable block.
 *
 * Runs are then collapsed, because a whole group going missing would
 * otherwise leave its blank lines behind and open a hole in the middle of
 * the message.
 */
const lines = (list) => list
  .filter((line) => line != null)
  .join('\n')
  .replace(/\n{3,}/g, '\n\n')
  .trim();

function link(message) {
  return `https://wa.me/${DIGITS}?text=${encodeURIComponent(message)}`;
}

/** A field, or nothing at all — never a label with an em dash after it. */
const field = (label, value) => (blank(value) ? null : `${label}: ${value}`);

/**
 * "I want to talk about this stone", with the stone attached.
 *
 * Grouped the way a dealer reads a stone rather than the way the columns
 * happen to be ordered: identity, then the four Cs, then the finish, then
 * where the paperwork is.
 */
export function stoneEnquiryUrl(stone) {
  const carat = Number.isFinite(stone.carat) && stone.carat > 0 ? stone.carat.toFixed(2) : null;
  const headline = [carat && `${carat} ct`, !blank(stone.shape) && stone.shape]
    .filter(Boolean)
    .join(' ');

  return link(lines([
    'Hello New Grown Diamond — I would like to enquire about this diamond.',
    '',
    field('Stock', stone.stockNumber),
    headline || null,
    '',
    field('Colour', stone.colour),
    field('Clarity', stone.clarity),
    field('Cut', stone.cut),
    field('Polish', stone.polish),
    field('Symmetry', stone.symmetry),
    field('Fluorescence', stone.fluorescence),
    field('Lab', stone.lab),
    field('Growth', stone.growth),
    field('Availability', stone.availability),
    // Only when a report is genuinely attached; a promise of paperwork that
    // does not exist is the one thing an enquiry must not carry.
    stone.certificate_url ? `Certificate: ${stone.certificate_url}` : null,
  ]));
}

/**
 * The same hand-off after the structured form, carrying who is asking.
 *
 * Sent only once the enquiry has been stored and has a reference, so the
 * message and the record point at each other — the desk can answer in the chat
 * and still find the row.
 */
export function enquiryFollowUpUrl(details) {
  const { reference, product } = details;

  return link(lines([
    'Hello New Grown Diamond — I have just sent an enquiry through the website.',
    '',
    field('Reference', reference),
    product ? `Regarding: ${product.reference} (${product.type})` : null,
    '',
    field('Name', details.fullName),
    field('Company', details.companyName),
    field('Email', details.email),
    field('Mobile', details.mobile),
    field('Country', details.country),
    field('Enquiry', details.subject),
    '',
    blank(details.message) ? null : details.message,
  ]));
}

/** A plain "talk to the desk" link, with nothing attached. */
export function deskUrl() {
  return link('Hello New Grown Diamond — I would like to make an enquiry.');
}
