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

The public static site can be deployed now without additional configuration. Production editing at `/admin/` requires a GitHub OAuth provider. The repository and branch are already configured in `admin/config.yml`; add the OAuth provider details once the final hosting platform is confirmed.

The `/admin/` path is not a security boundary by itself. Only authenticated users with repository access should be allowed to publish changes.
