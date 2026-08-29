/**
 * Mock inventory shaped EXACTLY like a `public.diamonds` row as the storefront
 * selects it, so swapping in the live query changes the source and nothing
 * else. Column names, types and nullability all mirror the database:
 * `carat` numeric, `price_visible` boolean, `image_path` a Storage path or null.
 */
export const MOCK_DIAMONDS = [
  { public_id: 'd-round-152', stock_number: 'NGD-R-1520', shape: 'Round', carat: 1.52, color: 'E', clarity: 'VVS2', cut: 'Ideal', laboratory: 'IGI', growth_method: 'CVD', availability: 'Available', image_path: null, featured: true, total_price: 412000, currency: 'INR', price_visible: true },
  { public_id: 'd-oval-208', stock_number: 'NGD-O-2081', shape: 'Oval', carat: 2.08, color: 'F', clarity: 'VS1', cut: 'Excellent', laboratory: 'IGI', growth_method: 'HPHT', availability: 'Available', image_path: null, featured: true, total_price: 596000, currency: 'INR', price_visible: true },
  { public_id: 'd-emerald-311', stock_number: 'NGD-E-3110', shape: 'Emerald', carat: 3.11, color: 'D', clarity: 'VVS1', cut: 'Excellent', laboratory: 'GIA', growth_method: 'CVD', availability: 'Reserved', image_path: null, featured: true, total_price: null, currency: 'INR', price_visible: false },
  { public_id: 'd-pear-179', stock_number: 'NGD-P-1790', shape: 'Pear', carat: 1.79, color: 'E', clarity: 'VS2', cut: 'Excellent', laboratory: 'IGI', growth_method: 'CVD', availability: 'Available', image_path: null, featured: true, total_price: 388000, currency: 'INR', price_visible: true },
  { public_id: 'd-cushion-244', stock_number: 'NGD-C-2440', shape: 'Cushion', carat: 2.44, color: 'G', clarity: 'VVS2', cut: 'Ideal', laboratory: 'IGI', growth_method: 'HPHT', availability: 'Available', image_path: null, featured: true, total_price: 501000, currency: 'INR', price_visible: true },
  { public_id: 'd-radiant-190', stock_number: 'NGD-RA-1900', shape: 'Radiant', carat: 1.9, color: 'F', clarity: 'VS1', cut: 'Excellent', laboratory: 'IGI', growth_method: 'CVD', availability: 'Available', image_path: null, featured: true, total_price: 356000, currency: 'INR', price_visible: true },
];
