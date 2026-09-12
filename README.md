# New Grown Diamond (NGD)

NGD is an animated React website and B2B catalogue for New Grown Diamond, a Surat-based manufacturer and supplier of laboratory-grown diamonds. It combines editorial brand storytelling with live diamond inventory, customer accounts, enquiries, blog publishing, and protected administration.

## Current status

- Production build: passing
- Lint: passing with one non-blocking warning in `ContinueNext.jsx`
- Responsive QA assets: 320, 375, 768, 1440, and 1920 pixel viewports
- Deployment targets: Vercel, Netlify/Cloudflare Pages, and Apache
- Backend: Supabase Auth, Database, and Storage
- Production readiness: functional foundation complete; SEO, route splitting, blog detail routing, and live deployment QA remain

See [DESIGN.md](./DESIGN.md) for the visual and interaction system, [DEPLOY.md](./DEPLOY.md) for hosting instructions, and [NGD-Project-Work-Report.pdf](./NGD-Project-Work-Report.pdf) for the project assessment.

## Technology

- React 19 and Vite 8
- CSS Modules with shared design tokens
- GSAP, Framer Motion, and Lenis
- Three.js, React Three Fiber, and postprocessing
- Supabase JS
- Oxlint

## Features

### Storefront

- Animated home experience with chapter-based storytelling
- Live diamond inventory and shape filtering
- Diamond specifications, images, certificates, video, and 360-degree views
- Jewellery, company, education, shape, FAQ, contact, and journal pages
- Structured B2B enquiry form with linked product references
- International office details for Surat, Mumbai, New York, and Hong Kong

### Accounts and administration

- Registration, sign-in, sign-out, and password recovery
- Customer profile and activity view
- Protected administrator routes
- Create and edit diamond records
- Supabase-backed inventory, enquiries, profiles, and blogs

### Experience and accessibility

- Smooth scrolling and covered route transitions
- Responsive navigation with keyboard focus management
- Dark and light themes
- Custom pointer experience on supported devices
- Reduced-motion fallbacks
- Semantic headings, alternative text, ARIA labels, and live status regions
- Loading, empty, missing-configuration, and error states

## Routes

| Route | Purpose | Access |
|---|---|---|
| `/` | Animated home and brand story | Public |
| `/diamonds` | Live diamond inventory | Public |
| `/jewellery` | Custom jewellery | Public |
| `/about` | Company history and manufacturing | Public |
| `/education` | CVD, HPHT, certification, and care | Public |
| `/shapes` | Diamond shape guide | Public |
| `/why-lab-grown` | NGD value proposition | Public |
| `/faq` | Frequently asked questions | Public |
| `/contact` | Offices and structured enquiry | Public |
| `/blogs` | Published journal index | Public |
| `/login` | Sign in | Public |
| `/register` | Create an account | Public |
| `/forgot-password` | Request a recovery email | Public |
| `/reset-password` | Set a new password | Recovery session |
| `/account` | Customer profile | Authenticated |
| `/admin/diamonds` | Inventory administration | Administrator |
| `/admin/diamonds/new` | Create a diamond | Administrator |
| `/admin/diamonds/:id/edit` | Edit a diamond | Administrator |

Known route gap: journal cards link to `/blogs/:slug`, but the blog detail route and page are not implemented yet.

## Project structure

```text
ngd/
|-- public/                 Static icons, host rewrites, and media placeholders
|-- src/
|   |-- assets/             Brand, company, diamond, font, and process assets
|   |-- components/         Auth, chrome, layout, media, motion, product, and WebGL UI
|   |-- hooks/              Auth, motion, pointer, tilt, and scroll hooks
|   |-- lib/                Router, theme, motion, Three.js, and Supabase clients
|   |-- pages/              Public, auth, account, blog, inventory, and admin pages
|   |-- providers/          Smooth-scroll provider
|   |-- sections/           Home, diamond, about, and shape experiences
|   `-- styles/             Reset, fonts, tokens, and global utilities
|-- supabase/               Database source files and policies
|-- tests-e2e/screenshots/  Responsive visual QA evidence
|-- DEPLOY.md               Production deployment guide
|-- DESIGN.md               Visual and interaction specification
|-- vercel.json             Vercel build, rewrite, and cache rules
`-- vite.config.js          Build aliases, chunk rules, and environment prefixes
```

## Local setup

Requirements: a current Node.js release and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite.

### Live client review

`npm.cmd run dev` starts the app on port 5173, bound to the local network. Open `http://localhost:5173` on this computer or use Vite's printed Network URL on another device on the same network. Saving source changes triggers Vite's live updates. Keep the development process running.

`npm.cmd run share` is prepared for an explicitly approved public review session through the installed Cloudflare Tunnel client. It creates a temporary public URL for the running development server, including its development assets. The computer, Vite and tunnel must stay running; restarting the tunnel produces a new URL. This is not a permanent hosted deployment.

## Environment variables

Create `.env.local` in the project root. Environment files are ignored and must never be committed.

```dotenv
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
```

The equivalent `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` names are also supported. Only use a browser-safe publishable key. Never place a service-role or secret key in a Vite variable.

Without these values, the presentation still renders while database-dependent screens show an explicit unconfigured state.

## Database

The application expects Supabase Auth and the following public data areas:

- `diamonds`: published inventory and product media references
- `profiles`: customer and administrator profile information
- `enquiries`: B2B enquiry submissions and public references
- `blogs`: journal entries; schema and RLS source live in `supabase/blogs.sql`

Row Level Security must remain enabled. Administrator access must be protected by database policies; client-side checks alone are not a security boundary.

## Commands

```bash
npm run dev      # development server
npm run build    # production build in dist/
npm run preview  # serve the production build locally
npm run lint     # Oxlint checks
```

On Windows PowerShell systems that block `npm.ps1`, use `npm.cmd run build` and the equivalent `npm.cmd` commands.

## Deployment

Build output is written to `dist/`. Because the site uses client-side routing, the host must rewrite public routes to `index.html` without changing the browser URL.

- Vercel: `vercel.json`
- Netlify/Cloudflare Pages: `public/_redirects`
- Apache/cPanel: `public/.htaccess`
- nginx: configure `try_files $uri $uri/ /index.html;`

Read [DEPLOY.md](./DEPLOY.md) before deploying. Supabase authentication redirect URLs and email delivery settings must be configured in the Supabase dashboard.

## Release checklist

1. Run `npm run lint` and resolve new errors.
2. Run `npm run build`.
3. Serve `dist/` and directly open nested routes such as `/diamonds` and `/login`.
4. Test registration, confirmation, password recovery, inventory, certificates, and enquiry submission.
5. Verify desktop, mobile, keyboard navigation, and reduced-motion mode.
6. Confirm that no secret or service-role key exists in `dist/`.
7. Test production cache rules and the deployment-specific 404 strategy.

## Known backlog

- Implement `/blogs/:slug` and a blog detail page.
- Add route-specific descriptions, canonical URLs, social metadata, structured data, `robots.txt`, and `sitemap.xml`.
- Prerender public marketing routes and return genuine HTTP 404 responses where possible.
- Mark authentication, account, and admin pages as `noindex`.
- Add route-level lazy loading for admin, auth, blogs, inventory, and Supabase code.
- Optimize video and other large media for low-power/mobile devices.
- Add a dedicated US wholesale page with commercial terms and US-focused calls to action.
- Resolve the lint warning in `ContinueNext.jsx`.

## Source-control policy

- Commit source, documentation, database migrations, deployment configuration, and intentional QA evidence.
- Do not commit `.env`, `.env.local`, API secrets, service-role keys, `node_modules`, or `dist`.
- Review `git status` and staged changes before every commit.
- Keep generated assets only when they are required deliverables or intentional test evidence.

## License

This is a private business project. No open-source license has been granted.
