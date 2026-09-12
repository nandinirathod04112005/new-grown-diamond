/**
 * Frozen column lists.
 *
 * The storefront never asks for `internal_notes` or `created_by`. RLS is the
 * enforcement layer, but requesting only what the page renders means those
 * columns are never on the wire in the first place — and keeping the list in
 * one place makes that auditable in a single read.
 */
/*
 * Polish, symmetry and fluorescence are on the card list because the stock
 * finder filters on them, and filtering happens against the rows already in
 * hand. Fetching them per-card is three more short strings on a list the page
 * loads once; fetching them on demand would be a request per stone.
 */
/*
 * Report number and price are on the card list because the card now carries
 * them, the way a trade stock list does: the report number on the strip across
 * the top, the price under the specification. Price is shown only where the
 * admin has set price_visible on that stone — the flag travels with the price
 * so the card can honour it without a second request.
 */
export const DIAMOND_CARD_COLUMNS =
  'public_id,stock_number,shape,carat,color,clarity,cut,polish,symmetry,' +
  'fluorescence,laboratory,growth_method,availability,image_path,featured,' +
  'certificate_url,created_at,report_number,total_price,currency,price_visible';

export const DIAMOND_DETAIL_COLUMNS =
  'public_id,stock_number,shape,carat,color,clarity,cut,polish,symmetry,' +
  'fluorescence,laboratory,report_number,certificate_number,certificate_url,' +
  'measurements,depth_percentage,table_percentage,ratio,growth_method,' +
  'availability,image_path,total_price,price_per_carat,currency,price_visible,' +
  /*
   * Added with the stock-list columns. The 360 viewer and the three trade
   * screens (shade/milky/eye clean) are the reason a buyer opens a stone at
   * all, and the proportions are what they check before asking a price.
   * Deliberately NOT on the card list: a grid of ninety stones does not need
   * ten more strings per row, and none of them are filtered on.
   */
  'video_url,girdle,culet,shade,milky,eye_clean,' +
  'crown_angle,crown_height,pavilion_angle,pavilion_height,' +
  'location';

/** Admin sees the whole row, archived and inactive stock included. */
export const DIAMOND_ADMIN_COLUMNS = '*';
