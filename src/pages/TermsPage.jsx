import LegalLayout, { H } from './LegalLayout.jsx';
import styles from './LegalPage.module.css';

/**
 * Terms & Conditions.
 *
 * THE TEXT IS THE ONE THE OWNER SUPPLIED, every section and every sentence in
 * its order, with ONE kind of change: it arrived as another jeweller's terms,
 * naming that company ("Flora", "Flora.co", "FloraStone") and sending disputes
 * to its address (info@flora.co) and customers to its site. Published as it
 * stood, New Grown Diamond's terms would have directed its own customers'
 * disputes and returns to someone else. Those identifiers are replaced with
 * New Grown Diamond's, and nothing else is reworded:
 *
 *   "Prices on Flora.co"                      → "Prices on newgrowndiamond.com"
 *   "the Flora merchandise"                   → "the New Grown Diamond merchandise"
 *   "visit https://www.flora.co/shipping-return.html"
 *                                             → "contact us at newgrowndiamonds@gmail.com"
 *   "Flora reserves the right"                → "New Grown Diamond reserves the right"
 *   "resolved at info@flora.co"               → "resolved at newgrowndiamonds@gmail.com"
 *   "Flora may change"                        → "New Grown Diamond may change"
 *   "on www.flora.co, the Flora app and offline stores (www.flora.co/store.html)"
 *                                             → "on newgrowndiamond.com and offline stores"
 *   "on www.flora.co" / "on flora.co"         → "on newgrowndiamond.com"
 *   "flora.co Gift Card(s)", "florastone's", "floraStone" (×4), "FloraStone" (×4),
 *   "FloaStone", "Flora Credits"              → New Grown Diamond
 *
 * Three slips in the source are corrected: "Gujrat" (Gujarat), a garbled clause
 * in the gold-exchange section ("account in the value is credited" → "account.
 * Once the value is credited"), and one sentence that appeared twice word for
 * word under Cancellation & Returns now appears once.
 *
 * NOTE FOR THE OWNER: several sections describe programmes this business may
 * not run — gift cards, the Big Gold Upgrade, Disney merchandise, coins, Visa
 * offers, free gifts, a 15-day money-back policy and cash on delivery. They are
 * published as supplied; whether they belong in these terms is the owner's and
 * their lawyer's decision, not the page's.
 */

const EMAIL = 'newgrowndiamonds@gmail.com';
const Mail = () => <a href={`mailto:${EMAIL}`}>{EMAIL}</a>;

const TOC = [
  { id: 'use-of-the-website', label: 'Use of the Website' },
  { id: 'trademarks', label: 'Trademarks' },
  { id: 'external-links', label: 'External links' },
  { id: 'warranties', label: 'Warranties' },
  { id: 'prices', label: 'Prices' },
  { id: 'disclaimer-of-liability', label: 'Disclaimer of liability' },
  { id: 'conflict-of-terms', label: 'Conflict of terms' },
  { id: 'severability', label: 'Severability' },
  { id: 'cancellation-and-returns', label: 'Cancellation & Returns' },
  { id: 'applicable-laws', label: 'Applicable laws' },
  { id: 'visa-terms', label: 'Visa Terms and Conditions' },
  { id: 'free-gift', label: 'Free Gift' },
  { id: 'other-conditions', label: 'Other conditions' },
  { id: 'offer-terms', label: 'Offer Terms & Conditions' },
  { id: 'gift-card', label: 'Gift Card' },
  { id: 'big-gold-upgrade', label: 'Big Gold Upgrade' },
];

const GIFT_CARD = [
  <>You can redeem Gift Card(s) on newgrowndiamond.com and offline stores.</>,
  <>Gift Card(s) can be redeemed on the purchase of any jewellery products on newgrowndiamond.com</>,
  <>Gift Card(s) can be redeemed on Plain Gold Jewellery, Gold Coins, Silver Coins, Solitaires, Preset Solitaires, Diamond Jewellery and Gemstone Jewellery. Please check the type of Gift Card before confirming the type of jewellery or coin that can be bought via it. Certain Gift Card(s) can be used on specific categories only.</>,
  <>On the Cart page, click on the link &quot;I have a voucher code/gift card&quot; and enter your 16-digit Gift Card number and pin for redemption.</>,
  <>Multiple Gift Card(s) can be used in a single transaction. You may combine Gift Card(s) with any other payment type on newgrowndiamond.com</>,
  <>Gift Card(s) can also be partially redeemed, as often as a user wishes to, till its balance is consumed or it expires.</>,
  <>Gift Card(s) are valid for a period of 6 months from the date of issuance to the recipient.</>,
  <>Gift Card(s) cannot be used to purchase another Gift Card.</>,
  <>Payment mode will be Net Banking, Credit/Debit Card.</>,
  <>Gift Card(s), once bought online, shall be considered as sold and cannot be Cancelled, Exchanged or Refunded.</>,
  <>If lost or misused, the Gift Card(s) cannot be replaced. Gift Card(s) are void if resold, cannot be exchanged for credit(s) or cash, and cannot be re-validated once expired</>,
  <>In addition to these Terms and Conditions, New Grown Diamond Gift Card(s) and their use on our website are also subject to New Grown Diamond&apos;s general Terms of Use &amp; New Grown Diamond&apos;s decision will be final in case of any dispute.</>,
  <>New Grown Diamond may change (add to, delete, or amend) these terms from time to time. Unless stated otherwise, the changes will apply to any new New Grown Diamond gift card. Any Gift Card(s) you purchase are for personal, non-commercial use and enjoyment only. The same may be shared with family and friends but may not be advertised, sold or used as promotional items by the purchaser or anyone else without New Grown Diamond&apos;s prior written consent.</>,
  <>All disputes concerning the products and services offered in this connection are subject to Gujarat jurisdiction.</>,
];

const GOLD = [
  <>The Old Gold must be plain gold jewellery, biscuits, bars, or coins. This offer does not cover Old Gold with diamonds or gemstones.</>,
  <>You may avail the Big Gold Upgrade benefit up to a limit of 10 grams (in gross weight) within a year. For any gold exchange exceeding 10 grams within a year, New Grown Diamond will provide a benefit of 2% over the current market gold rate.</>,
  <>For 24Kt gold exchange, New Grown Diamond will provide a benefit of 2% over the current market gold rate to the customer.</>,
  <>The value of the Old Gold will be calculated based on its purity and weight. To avail this offer, the customer must consent to the cutting/melting of the products. New Grown Diamond&apos;s Karatmeters will generate the purity reading.</>,
  <>Once all participating parties agree on purity, weight and valuation, the offered value against the Old Gold jewellery will be credited to the customer&apos;s OTP-verified New Grown Diamond account. Once the value is credited to your New Grown Diamond account, the Old Gold cannot be returned to you.</>,
  <>Your New Grown Diamond Credits are valid at most for one year (365 days) from the day you receive them and can be used to purchase any jewellery from New Grown Diamond except Coins and Solitaires.</>,
  <>You&apos;ll be required to sign a collection receipt at the store. It indicates that you have read, understood and accepted the terms and conditions of our Big Gold Upgrade/Old Gold Exchange programme.</>,
  <>PAN Card is mandatory for Big Gold Upgrade/Old Gold Exchange. The name on the PAN Card should match the customer&apos;s name. The 10-gram limit will be applicable against each unique PAN Card number.</>,
];

export default function TermsPage() {
  return (
    <LegalLayout title={<>Terms &amp; <em>Conditions</em></>} toc={TOC}>
      <section aria-labelledby="use-of-the-website">
        <H id="use-of-the-website">Use of the Website</H>
        <p>
          By accessing the website, you warrant and represent to the website owner that you are legally entitled to do
          so and to make use of information made available via the website.
        </p>
      </section>

      <section aria-labelledby="trademarks">
        <H id="trademarks">Trademarks</H>
        <p>
          The trademarks, names, logos and service marks (collectively &quot;trademarks&quot;) displayed on this website
          are registered and unregistered trademarks of the website owner. Nothing contained on this website should be
          construed as granting any license or right to use any trademark without the prior written permission of the
          website owner.
        </p>
      </section>

      <section aria-labelledby="external-links">
        <H id="external-links">External links</H>
        <p>
          External links may be provided for your convenience, but they are beyond the control of the website owner
          and no representation is made as to their content. Use or reliance on any external links and the content
          thereon provided is at your own risk.
        </p>
      </section>

      <section aria-labelledby="warranties">
        <H id="warranties">Warranties</H>
        <p>
          The website owner makes no warranties, representations, statements or guarantees (whether express, implied in
          law or residual) regarding the website.
        </p>
      </section>

      <section aria-labelledby="prices">
        <H id="prices">Prices</H>
        <p>
          Our pricing is calculated using current precious metal and gem prices to give you the best possible value.
          These prices do change from time to time, owing to the fluctuations in prices of precious metal and gem
          prices, so our prices change as well.
        </p>
        <p>
          Prices on newgrowndiamond.com are subject to change without notice. Please expect to be charged the price for
          the New Grown Diamond merchandise you buy as it is listed on the day of purchase.
        </p>
      </section>

      <section aria-labelledby="disclaimer-of-liability">
        <H id="disclaimer-of-liability">Disclaimer of liability</H>
        <p>
          The website owner shall not be responsible for and disclaims all liability for any loss, liability, damage
          (whether direct, indirect or consequential), personal injury or expense of any nature whatsoever which may be
          suffered by you or any third party (including your company), as a result of or which may be attributable,
          directly or indirectly, to your access and use of the website, any information contained on the website,
          your or your company&apos;s personal information or material and information transmitted over our system. In
          particular, neither the website owner nor any third party or data or content provider shall be liable in any
          way to you or to any other person, firm or corporation whatsoever for any loss, liability, damage (whether
          direct or consequential), personal injury or expense of any nature whatsoever arising from any delays,
          inaccuracies, errors in, or omission of any share price information or the transmission thereof, or for any
          actions taken in reliance thereon or occasioned thereby or by reason of non-performance or interruption, or
          termination thereof.
        </p>
        <p>
          We as a merchant shall be under no liability whatsoever in respect of any loss or damage arising directly or
          indirectly out of the decline of authorization for any Transaction, on Account of the Cardholder having
          exceeded the preset limit mutually agreed by us with our acquiring bank from time to time.
        </p>
      </section>

      <section aria-labelledby="conflict-of-terms">
        <H id="conflict-of-terms">Conflict of terms</H>
        <p>
          If there is a conflict or contradiction between the provisions of these website terms and conditions and any
          other relevant terms and conditions, policies or notices, the other relevant terms and conditions, policies or
          notices which relate specifically to a particular section or module of the website shall prevail in respect of
          your use of the relevant section or module of the website.
        </p>
      </section>

      <section aria-labelledby="severability">
        <H id="severability">Severability</H>
        <p>
          Any provision of any relevant terms and conditions, policies and notices, which is or becomes unenforceable in
          any jurisdiction, whether due to being void, invalidity, illegality, unlawfulness or for any reason whatever,
          shall, in such jurisdiction only and only to the extent that it is so unenforceable, be treated as void and
          the remaining provisions of any relevant terms and conditions, policies and notices shall remain in full force
          and effect.
        </p>
      </section>

      <section aria-labelledby="cancellation-and-returns">
        <H id="cancellation-and-returns">Cancellation &amp; Returns</H>
        <p>
          You can cancel your order for a product at no cost any time before we send the Dispatch Confirmation E-mail
          relating to that product. You can cancel one order item within an order without cancelling the entire order if
          the order contains 2 or more order items.
        </p>
        <p>For prepaid orders, the amount will be credited to the payment source (Credit Card/Debit Card /Net Banking).</p>
        <p>
          Once the product is returned under our 15 Day Money Back policy (not applicable on coins) the refund will be
          credited to your account. You may choose to either make another purchase using the same or get the amount
          refunded to your bank account
        </p>
        <p>For cash on delivery orders, the refund will be processed to your bank account.</p>
        <p>
          Upon cancellation/ return of orders placed using gift cards, the gift card amount will be refunded back to the
          gift card.
        </p>
        <p>Please contact us at <Mail /> for more details about our Returns Policy.</p>
      </section>

      <section aria-labelledby="applicable-laws">
        <H id="applicable-laws">Applicable laws</H>
        <p>
          Use of this website shall in all respects be governed by the laws of the state of Gujarat, India, regardless of
          the laws that might be applicable under principles of conflicts of law. The parties agree that the courts
          located in India country, Surat, shall have exclusive jurisdiction over all controversies arising under this
          agreement and agree that venue is proper in those courts.
        </p>
        <p>
          As per the current guidelines mandated by the Government of India, a customer has to provide the Permanent
          Account Number (PAN) for all purchases above INR 2 lakh.
        </p>
        <p>The winners of contests and giveaways will be selected at the company&apos;s discretion.</p>
        <p>The prizes/ gifts/ giveaways are non-returnable/ exchangeable.</p>
        <p>
          New Grown Diamond reserves the right to change the terms and conditions of contests/ giveaways without prior
          intimation.
        </p>
        <p>All disputes will be resolved at <Mail /></p>
      </section>

      <section aria-labelledby="visa-terms">
        <H id="visa-terms">Visa Terms and Conditions</H>
        <p>
          Offer details as shown are based on information provided by the Merchant. No warranties are made by Visa that
          the information is correct. Please check directly with Merchant to confirm availability and validity of the
          Offer.
        </p>
        <p>
          The Merchant is the sole provider of all goods and/or services under this offer. Accordingly, the Visa
          Cardholder understands, acknowledges and agrees that the procurement by him/her of any goods and/or services
          under this Offer shall constitute a contract solely between the merchant and him/her, and Visa is not, nor
          will become, a party thereto.
        </p>
        <p>
          By utilizing or attempting to utilize any of the goods and services under this Offer, the Visa Cardholder
          understands, acknowledges and agrees that:
        </p>
        <ol className={styles.lettered}>
          <li>
            Any claim, complaint or dispute of any nature arising out of or in relation to the procurement, or attempted
            procurement by the cardholder of any goods and/or services under this offer (each a &quot;Claim&quot;) shall
            be settled by the Visa Cardholder directly with the Merchant, and Visa Cardholder shall not make any Claim
            against Visa.
          </li>
          <li>
            Without prejudice to the foregoing, and to the fullest extent permitted by law, Visa shall not be liable to
            any person for any loss, damage, expenses or claim (whether direct or indirect) in relation to any personal
            injury, death, false representation, damage or omission arising from or in connection with the usage or
            attempted usage of the Offer or goods and/or services provided under the Offer.
          </li>
        </ol>
      </section>

      <section aria-labelledby="free-gift">
        <H id="free-gift">Free Gift</H>
        <p>All free gifts are treated as discounts.</p>
        <p>
          In Case of Partial Cancellation or Returns of Orders with a Free gift, the Amount refunded will not include the
          discount attributed to the Free Gift.
        </p>
      </section>

      <section aria-labelledby="other-conditions">
        <H id="other-conditions">Other conditions</H>
        <p>
          All Disney merchandise orders to be shipped within India, international orders cannot be fulfilled for this
          collection.
        </p>
        <p>Sign up credits cannot be used for purchase of coins</p>
      </section>

      <section aria-labelledby="offer-terms">
        <H id="offer-terms">Offer Terms &amp; Conditions</H>
        <p>Special offer is valid only on select designs on jewellery.</p>
        <p>New Grown Diamond may change (add to, delete, or amend) these terms from time to time.</p>
        <p>
          All disputes, with respect to the products and services offered in this connection, are subject to Gujarat
          jurisdiction.
        </p>
      </section>

      <section aria-labelledby="gift-card">
        <H id="gift-card">Gift Card</H>
        <ul className={styles.list}>
          {GIFT_CARD.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      </section>

      <section aria-labelledby="big-gold-upgrade">
        <H id="big-gold-upgrade">Big Gold Upgrade</H>
        <ul className={styles.list}>
          {GOLD.map((line, i) => <li key={i}>{line}</li>)}
        </ul>
      </section>
    </LegalLayout>
  );
}
