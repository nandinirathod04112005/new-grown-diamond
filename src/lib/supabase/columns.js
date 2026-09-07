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
export const DIAMOND_CARD_COLUMNS =
  'public_id,stock_number,shape,carat,color,clarity,cut,polish,symmetry,' +
  'fluorescence,laboratory,growth_method,availability,image_path,featured,' +
  'certificate_url,created_at';

export const DIAMOND_DETAIL_COLUMNS =
  'public_id,stock_number,shape,carat,color,clarity,cut,polish,symmetry,' +
  'fluorescence,laboratory,report_number,certificate_number,certificate_url,' +
  'measurements,depth_percentage,table_percentage,ratio,growth_method,' +
  'availability,image_path,total_price,price_per_carat,currency,price_visible';

/** Admin sees the whole row, archived and inactive stock included. */
export const DIAMOND_ADMIN_COLUMNS = '*';
