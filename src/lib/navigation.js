/** Single source of truth for site navigation, shared by header and footer. */

export const DIAMOND_SHAPES = [
  'Round', 'Oval', 'Emerald', 'Pear',
  'Princess', 'Cushion', 'Radiant', 'Marquise',
];

export const JEWELLERY_CATEGORIES = [
  'Rings', 'Earrings', 'Pendants', 'Necklaces', 'Bracelets', 'Bangles',
];

export const PRIMARY_NAV = [
  {
    label: 'Diamonds',
    to: '/diamonds',
    columns: [
      {
        title: 'By shape',
        links: DIAMOND_SHAPES.map((shape) => ({
          label: shape,
          to: `/diamonds?shape=${shape.toLowerCase()}`,
        })),
      },
      {
        title: 'Ways to explore',
        links: [
          { label: 'Full inventory', to: '/diamonds' },
          { label: 'Diamond finder', to: '/diamond-finder' },
          { label: 'Compare stones', to: '/compare' },
      ],
      },
    ],
  },
  { label: 'Jewellery', to: '/jewellery' },
  { label: 'Manufacturing', to: '/manufacturing' },
  { label: 'Education', to: '/education' },
  { label: 'About', to: '/about' },
  { label: 'Contact', to: '/contact' },
];

export const FOOTER_NAV = [
  {
    title: 'Diamonds',
    links: [
      { label: 'All diamonds', to: '/diamonds' },
      { label: 'Diamond finder', to: '/diamond-finder' },
      { label: 'Compare stones', to: '/compare' },
      { label: 'The 4 Cs', to: '/education' },
    ],
  },
  {
    title: 'Jewellery',
    links: JEWELLERY_CATEGORIES.slice(0, 4).map((c) => ({
      label: c,
      to: `/jewellery?category=${c.toLowerCase()}`,
    })),
  },
  {
    title: 'House',
    links: [
      { label: 'Our story', to: '/about' },
      { label: 'Manufacturing', to: '/manufacturing' },
      { label: 'Contact', to: '/contact' },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', to: '/privacy' },
      { label: 'Terms', to: '/terms' },
    ],
  },
];
