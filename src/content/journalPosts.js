/**
 * The journal's archive: the five articles the previous site published.
 *
 * Taken from newgrowndiamond.com/blog as it stood, with its own photographs
 * (src/assets/journal, keyed by `cover` below). That site had no article
 * pages — each card showed its whole text and linked nowhere — so the text
 * here is ALL the text there is. Nothing has been written to lengthen it.
 *
 * Edits, and only these:
 *   - typography and punctuation: straight quotes and hyphens set as ’ “ ” —,
 *     run-on questions given their question mark, "color" spelled "colour"
 *     as the rest of this site spells it, and the encoding damage on the old
 *     page (4C�s) repaired;
 *   - "Lab Grown Diamonds must ask questions before buying!" appeared twice,
 *     word for word, with two photographs. It is one article here, and the
 *     second photograph is its second figure;
 *   - three texts stopped mid-thought on the old page. The dangling "And,"
 *     after the last full sentence is dropped, a closing colon that introduced
 *     a list the page never had becomes a full stop, and one missing full stop
 *     is added. No sentence is invented to finish them.
 *
 * The old site gave day and month but no year, so `date` carries exactly that
 * and nothing is guessed.
 *
 * Plain data with no asset imports, so scripts/generate-seo-pages.mjs (plain
 * Node) can read the titles for the article pages' SEO.
 *
 * This is the English, and the English is what SEO uses. The Hindi and
 * Gujarati translations of these titles, texts and JOURNAL_INTRO live in
 * journalPosts.copy.js, keyed by slug, so they load only with the journal.
 */
export const JOURNAL_ARCHIVE = [
  {
    slug: 'how-lab-created-diamonds-become-more-popular',
    title: 'How lab-created diamonds become more popular?',
    date: { day: 18, month: 6 },
    cover: 'labVsMined',
    body: [
      'The word is getting out — there’s a new diamond in town that is 30–40% cheaper than mined diamonds but just as stunningly beautiful (and the exact same chemical, physical, and optical properties!). Of course, we’re talking about CVD Lab Diamonds, which started trickling into the market in 2013, when the scientific processes became sophisticated enough to produce nearly identical gemstones.',
      'According to Morgan Stanley, “Lab-grown diamonds could take a 15% market share in gem-quality melee diamonds and a 7.5% share in sales of larger diamonds by 2020.” Wondering what’s causing this boom in popularity?',
    ],
  },
  {
    slug: 'why-choose-cvd-diamonds-over-mined-diamonds',
    title: 'Why choose CVD diamonds over mined diamonds?',
    date: { day: 17, month: 6 },
    cover: 'labVsMined',
    body: [
      'Thinking about dropping mined diamonds in the past and covering the future of CVD diamonds? Smart move, if we may accurately say so!',
      'It’s true — there are ethical, economic, and environmental advantages to choosing CVD diamonds over mined diamonds, and we’re pointing them out in this blog. Here’s why choosing lab-grown is the savvy, smart, and conscious choice (as well as the only real way to get ethical diamonds) — for you, for others, and for Earth.',
    ],
  },
  {
    slug: 'lab-grown-diamonds-questions-before-buying',
    title: 'Lab-grown diamonds: must-ask questions before buying!',
    date: { day: 4, month: 6 },
    cover: 'buyingQuestions',
    figure: 'buyingQuestionsRing',
    body: [
      'Buying a diamond — Natural Diamonds or Lab Grown Diamonds — is a big deal. Usually recognized as a celebration of a major life event, we understand that a diamond is something you desire to get right.',
      'And, to be fair, the process can be overwhelming. From learning the 4C’s of grading diamonds to finding the right rings that fit within your budget, there is a lot to consider when it’s time to find the perfect shiny rock.',
    ],
  },
  {
    slug: 'history-of-lab-grown-diamonds',
    title: 'History of lab-grown diamonds',
    date: null,
    cover: 'history',
    body: [
      'The diamond industry life cycle has entered a new phase with the introduction of lab-grown diamonds. Lab-grown diamond manufacturing companies have disrupted the diamond trade as they produce lab-grown diamonds.',
    ],
  },
  {
    slug: 'why-pink-diamonds-are-so-expensive',
    title: 'Why pink diamonds are so expensive?',
    date: null,
    cover: 'pink',
    body: [
      'Why are pink diamonds so rare and expensive? Simply put, diamonds are commonest in colour starting from white, to brown and yellow.',
      'The more intense the natural colour, or within the case of white diamonds the shortage of colour, the more rare and expensive the stone.',
    ],
  },
];

/** The first sentence or so, for a meta description. */
export function archiveDescription(post) {
  const text = post.body.join(' ');
  if (text.length <= 158) return text;
  const cut = text.slice(0, 155);
  return `${cut.slice(0, cut.lastIndexOf(' '))}…`;
}

/** The previous site's own introduction to its blog, typo corrected. */
export const JOURNAL_INTRO =
  'Consumers around the world today are also considering the environmental and social impact each of their purchases has. This also includes their jewellery purchases, which is why lab-grown, or “created”, diamonds are more popular than ever.';
