/* ============================================================
   NEW GROWN DIAMOND — CMS section registry
   ------------------------------------------------------------
   The stable section keys the Content console and the public
   pages agree on. Field lists are per-section: display headings
   with styled accents stay part of the designed HTML, so the
   CMS drives the eyebrow (subheading), lead/body copy, CTAs and
   media URLs. Image URLs are stored and previewed; the public
   loader binds them wherever a template exposes a
   data-cms-src slot.
   ============================================================ */
(function () {
  'use strict';

  window.NGD_CONTENT_SECTIONS = [
    { key: 'homepage_hero', label: 'Homepage · Hero', page: 'index.html',
      fields: ['subheading', 'body', 'cta_text', 'cta_url', 'cta2_text', 'cta2_url'],
      hint: 'Eyebrow line, lead paragraph and the two hero buttons.' },
    { key: 'homepage_diamonds', label: 'Homepage · Signature Stones', page: 'index.html#featured-diamonds',
      fields: ['subheading', 'body'],
      hint: 'Eyebrow and lead above the featured diamonds grid.' },
    { key: 'homepage_jewellery', label: 'Homepage · Fine Jewellery', page: 'index.html#fine-jewellery',
      fields: ['subheading', 'body', 'cta_text', 'cta_url'],
      hint: 'Eyebrow, lead and the Explore All Jewellery button.' },
    { key: 'homepage_story', label: 'Homepage · Manufacturing Story', page: 'index.html#manufacturing-story',
      fields: ['subheading', 'body'],
      hint: 'Eyebrow and lead above the six-stage journey.' },
    { key: 'about_intro', label: 'About · Introduction', page: 'about.html',
      fields: ['subheading', 'body', 'image_url'],
      hint: 'Hero eyebrow and lead on the About page.' },
    { key: 'manufacturing_intro', label: 'Manufacturing · Introduction', page: 'manufacturing.html',
      fields: ['subheading', 'body', 'image_url'],
      hint: 'Hero eyebrow and lead on the Manufacturing page.' },
    { key: 'education_intro', label: 'Education · Introduction', page: 'education.html',
      fields: ['subheading', 'body', 'image_url'],
      hint: 'Hero eyebrow and lead on the Education page.' },
    { key: 'contact_intro', label: 'Contact · Introduction', page: 'contact.html',
      fields: ['subheading', 'body', 'image_url'],
      hint: 'Hero eyebrow and lead on the Contact page.' },
    { key: 'footer_content', label: 'Footer · Brand line', page: 'all public pages',
      fields: ['body'],
      hint: 'The short brand paragraph under the footer logo.' }
  ];

  window.NGD_CONTENT_FIELD_LABELS = {
    heading: 'Heading',
    subheading: 'Eyebrow / subheading',
    body: 'Body / lead text',
    cta_text: 'Button text',
    cta_url: 'Button URL',
    cta2_text: 'Second button text',
    cta2_url: 'Second button URL',
    image_url: 'Image URL',
    secondary_image_url: 'Secondary image URL'
  };
})();
