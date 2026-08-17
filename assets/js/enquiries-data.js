/* ============================================================
   NEW GROWN DIAMOND — DEMO ENQUIRY DATA (admin console)
   ------------------------------------------------------------
   Static sample enquiries for the admin Enquiries page. In the
   Supabase phase this file is replaced by a select over the
   `enquiries` table (the same columns the public contact form
   already prepares: full_name, company_name, email, subject,
   message — plus the admin fields below):

     { id, customerId, name, company, email, subject, type,
       related, date, status, message }

   customerId joins NGD_DEMO_CUSTOMERS; null means a guest
   enquiry from the public contact form (name/company/email
   carried inline). `related` is a storefront reference —
   NGD-… (diamond), JW-… (jewellery) or null. Statuses:
   New → In Progress → Responded → Closed. All content is
   invented demo material.
   ============================================================ */
window.NGD_DEMO_ENQUIRIES = [
  { id: 'ENQ-2018', customerId: 'CU-1001', name: null, company: null, email: null,
    subject: 'Availability of matched oval pair', type: 'Diamonds', related: 'NGD-1015',
    date: '2026-08-16', status: 'New',
    message: 'We need a matched pair of 1.50 ct ovals for a client commission. Is NGD-1015 available for a hold, and do you have a sister stone within one grade?' },
  { id: 'ENQ-2017', customerId: 'CU-1012', name: null, company: null, email: null,
    subject: 'Trade account approval timeline', type: 'Business', related: null,
    date: '2026-08-15', status: 'New',
    message: 'Our registration is pending — how long does trade approval usually take, and do you need any further documents from our side?' },
  { id: 'ENQ-2016', customerId: null, name: 'Hannah Brooks', company: null, email: 'hannah.brooks@mail.example',
    subject: 'Question about lab-grown certification', type: 'General', related: null,
    date: '2026-08-14', status: 'New',
    message: 'Before I order an engagement ring I would like to understand how your lab-grown stones are certified and what appears on the report.' },
  { id: 'ENQ-2015', customerId: 'CU-1003', name: null, company: null, email: null,
    subject: 'Bulk pricing for eternity bands', type: 'Jewellery', related: 'JW-1003',
    date: '2026-08-13', status: 'In Progress',
    message: 'We are considering the Meridian Eternity Band for a boutique collection — what would pricing look like for a first order of twelve pieces?' },
  { id: 'ENQ-2014', customerId: 'CU-1007', name: null, company: null, email: null,
    subject: 'Video inspection for emerald cut', type: 'Diamonds', related: 'NGD-1009',
    date: '2026-08-12', status: 'New',
    message: 'Could we schedule a live video inspection of NGD-1009 this week? Our buyer would like to see the step cut under movement before committing.' },
  { id: 'ENQ-2013', customerId: 'CU-1005', name: null, company: null, email: null,
    subject: 'Invoice copy for July order', type: 'Support', related: null,
    date: '2026-08-11', status: 'Responded',
    message: 'Please resend the invoice for our July shipment — the original attachment did not reach our accounts inbox.' },
  { id: 'ENQ-2012', customerId: 'CU-1002', name: null, company: null, email: null,
    subject: 'Memo terms for repeat buyers', type: 'Business', related: null,
    date: '2026-08-09', status: 'In Progress',
    message: 'As a repeat buyer we would like to discuss memo terms for larger stones. What windows and limits do you currently offer established accounts?' },
  { id: 'ENQ-2011', customerId: 'CU-1013', name: null, company: null, email: null,
    subject: 'Custom pendant on 45 cm chain', type: 'Jewellery', related: 'JW-1008',
    date: '2026-08-08', status: 'Responded',
    message: 'I love the Nova Halo Pendant but need it on a 45 cm rose-gold chain with a slightly smaller centre. Is that a customisation you take on?' },
  { id: 'ENQ-2010', customerId: 'CU-1008', name: null, company: null, email: null,
    subject: 'CVD vs HPHT growth documentation', type: 'General', related: null,
    date: '2026-08-06', status: 'Responded',
    message: 'For our export paperwork we need the growth-method declaration per stone. Can this accompany each certificate as standard?' },
  { id: 'ENQ-2009', customerId: 'CU-1004', name: null, company: null, email: null,
    subject: 'Resize range for Aurora ring', type: 'Jewellery', related: 'JW-1001',
    date: '2026-08-04', status: 'In Progress',
    message: 'A client fell for the Aurora Solitaire but sits outside the listed size range. How far can the band be adjusted without resetting the stone?' },
  { id: 'ENQ-2008', customerId: 'CU-1011', name: null, company: null, email: null,
    subject: 'Hold extension for NGD-1021', type: 'Diamonds', related: 'NGD-1021',
    date: '2026-08-02', status: 'New',
    message: 'Our hold on NGD-1021 lapses on Friday and the client meeting moved a week. Could the hold be extended until the 12th?' },
  { id: 'ENQ-2007', customerId: null, name: 'Marcus Webb', company: 'Webb Estates', email: 'marcus@webbestates.example',
    subject: 'Corporate gifting enquiry', type: 'Business', related: null,
    date: '2026-07-29', status: 'Responded',
    message: 'We are exploring lab-grown pieces as long-service gifts for around forty colleagues. Who should we speak to about a corporate programme?' },
  { id: 'ENQ-2006', customerId: 'CU-1009', name: null, company: null, email: null,
    subject: 'Loose stones for atelier collection', type: 'Diamonds', related: 'NGD-1004',
    date: '2026-07-24', status: 'Closed',
    message: 'For my autumn collection I am sourcing six loose pears between 0.70 and 0.90 ct. NGD-1004 caught my eye — what else is in that window?' },
  { id: 'ENQ-2005', customerId: 'CU-1010', name: null, company: null, email: null,
    subject: 'Reactivating our account', type: 'Support', related: null,
    date: '2026-07-19', status: 'Closed',
    message: 'Our account went quiet over spring — we would like to reactivate it and refresh the saved preferences before the holiday season.' },
  { id: 'ENQ-2004', customerId: 'CU-1001', name: null, company: null, email: null,
    subject: 'GIA vs IGI grading preference', type: 'General', related: null,
    date: '2026-07-14', status: 'Closed',
    message: 'Do you grade with both GIA and IGI on request? Some of our clients ask for one house specifically.' },
  { id: 'ENQ-2003', customerId: 'CU-1005', name: null, company: null, email: null,
    subject: 'Tennis bracelet stone matching', type: 'Jewellery', related: 'JW-1013',
    date: '2026-07-08', status: 'Responded',
    message: 'How closely are the stones matched on the Ligne Tennis Bracelet — is it graded as a set or per stone?' },
  { id: 'ENQ-2002', customerId: 'CU-1002', name: null, company: null, email: null,
    subject: 'Princess cuts under 1 ct', type: 'Diamonds', related: 'NGD-1012',
    date: '2026-06-27', status: 'Closed',
    message: 'We are building inventory of princess cuts under a carat. Beyond NGD-1012, what does the pipeline look like for the next month?' },
  { id: 'ENQ-2001', customerId: 'CU-1014', name: null, company: null, email: null,
    subject: 'Opening a trade account', type: 'Business', related: null,
    date: '2026-06-20', status: 'Closed',
    message: 'Antwerp-based dealer here — what are the requirements and minimums for opening a trade account with the house?' }
];
