/* ============================================================
   NEW GROWN DIAMOND — DEMO CUSTOMER DATA (admin console)
   ------------------------------------------------------------
   Static sample accounts for the admin Customers page. In the
   Supabase phase this file is replaced by a select over the
   RLS-protected `profiles` table (joined with auth metadata)
   returning objects of the same shape:

     { id, name, company, email, mobile, country,
       status, joined, lastActive }

   Every name, company, email (.example domains) and number
   here is invented demo content — nothing refers to a real
   person or business.
   ============================================================ */
window.NGD_DEMO_CUSTOMERS = [
  { id: 'CU-1001', name: 'Priya Mehta',     company: 'Mehta Gems LLP',          email: 'priya@mehtagems.example',          mobile: '+91 98200 11001',  country: 'India',                status: 'Active',   joined: '2026-02-14', lastActive: '2026-08-15' },
  { id: 'CU-1002', name: 'Daniel Rosen',    company: 'Rosen & Sons Diamonds',   email: 'daniel@rosensons.example',         mobile: '+1 212 555 0142',  country: 'United States',        status: 'Active',   joined: '2026-01-28', lastActive: '2026-08-14' },
  { id: 'CU-1003', name: 'Aisha Al Farsi',  company: 'Al Farsi Jewels',         email: 'aisha@alfarsijewels.example',      mobile: '+971 50 555 0110', country: 'United Arab Emirates', status: 'Active',   joined: '2026-03-02', lastActive: '2026-08-12' },
  { id: 'CU-1004', name: 'James Whitfield', company: 'Whitfield Fine Jewellery', email: 'james@whitfieldfine.example',     mobile: '+44 20 7946 0803', country: 'United Kingdom',       status: 'Active',   joined: '2026-03-19', lastActive: '2026-08-10' },
  { id: 'CU-1005', name: 'Lotte Vermeer',   company: 'Vermeer Diamant BV',      email: 'lotte@vermeerdiamant.example',     mobile: '+32 3 555 0177',   country: 'Belgium',              status: 'Active',   joined: '2026-04-05', lastActive: '2026-08-08' },
  { id: 'CU-1006', name: 'Noa Shapiro',     company: 'Shapiro Trading Ltd',     email: 'noa@shapirotrading.example',       mobile: '+972 3 555 0129',  country: 'Israel',               status: 'Pending',  joined: '2026-08-01', lastActive: '2026-08-06' },
  { id: 'CU-1007', name: 'Wei-Lin Chan',    company: 'Chan Heritage Jewels',    email: 'weilin@chanheritage.example',      mobile: '+852 5555 0163',   country: 'Hong Kong',            status: 'Active',   joined: '2026-04-22', lastActive: '2026-08-05' },
  { id: 'CU-1008', name: 'Arjun Shah',      company: 'Shah Diamond Exports',    email: 'arjun@shahdiamond.example',        mobile: '+91 98200 11008',  country: 'India',                status: 'Active',   joined: '2026-02-27', lastActive: '2026-08-04' },
  { id: 'CU-1009', name: 'Sofia Marchetti', company: null,                      email: 'sofia.marchetti@atelier.example',  mobile: '+39 02 5555 0185', country: 'Italy',                status: 'Active',   joined: '2026-05-11', lastActive: '2026-07-30' },
  { id: 'CU-1010', name: 'Ethan Cole',      company: 'Cole & Grey',             email: 'ethan@colegrey.example',           mobile: '+1 310 555 0197',  country: 'United States',        status: 'Inactive', joined: '2026-01-15', lastActive: '2026-05-19' },
  { id: 'CU-1011', name: 'Mei Tan',         company: 'Tan Brilliance Pte',      email: 'mei@tanbrilliance.example',        mobile: '+65 8555 0114',    country: 'Singapore',            status: 'Active',   joined: '2026-05-29', lastActive: '2026-08-02' },
  { id: 'CU-1012', name: 'Omar Haddad',     company: 'Haddad Luxury Trading',   email: 'omar@haddadluxury.example',        mobile: '+971 55 555 0126', country: 'United Arab Emirates', status: 'Pending',  joined: '2026-08-09', lastActive: '2026-08-11' },
  { id: 'CU-1013', name: 'Ananya Iyer',     company: null,                      email: 'ananya.iyer@studio.example',       mobile: '+91 98200 11013',  country: 'India',                status: 'Active',   joined: '2026-06-16', lastActive: '2026-08-13' },
  { id: 'CU-1014', name: 'Viktor Baranov',  company: 'Baranov Antwerp',         email: 'viktor@baranovantwerp.example',    mobile: '+32 3 555 0191',   country: 'Belgium',              status: 'Inactive', joined: '2026-03-08', lastActive: '2026-06-21' }
];
