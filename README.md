# Timothy Kim Portfolio

A static portfolio with content managed through Decap CMS.

## Edit content directly

All public site content lives in `content/site.json`. Uploaded images and GIFs live in `assets/uploads/`.

## Run the public site locally

```bash
npm run dev
```

Open <http://localhost:4173/>.

## Run the local CMS editor

Keep the public site running, then open a second terminal in this repository and run:

```bash
npm run cms
```

Open <http://localhost:4173/admin/>. Changes saved through the local editor are written to `content/site.json` and `assets/uploads/`. They remain local until committed and pushed.

## Production editor

The production editor uses the GitHub backend through the Cloudflare Worker in `oauth-worker/`. GitHub OAuth credentials are stored as encrypted Worker secrets and must never be committed to this repository. See `oauth-worker/README.md` for deployment commands.

The `/admin/` path is not a security boundary by itself. Only authenticated GitHub users with repository access can publish changes.

## Private analytics

The live site records anonymous page views and intentional clicks through `analytics-tracker.js`. Each browser-tab session receives a random ID stored in `sessionStorage`; the tracker does not store names or complete IP addresses.

The private dashboard is available at `/analytics/`. Its PIN is checked by the Cloudflare Worker and is stored only as an encrypted Worker secret. Analytics data is stored in the `portfolio-analytics` D1 database.

Analytics records are automatically removed after 90 days.

Deployment commands:

```bash
npm run analytics:db:migrate
npm run analytics:secret:pin
npm run analytics:secret:session
npm run oauth:deploy
```
