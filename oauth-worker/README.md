# Portfolio CMS OAuth Worker

This Cloudflare Worker provides the GitHub OAuth bridge required by Decap CMS in production.

## Deploy

```bash
npm run oauth:deploy
```

The GitHub OAuth app callback URL must be the deployed Worker URL followed by `/callback`.

Current production values:

- Worker URL: `https://timothy-portfolio-cms-auth.tmkm.workers.dev`
- GitHub OAuth homepage: `https://timothy-portfolio-cms-auth.tmkm.workers.dev`
- GitHub OAuth callback: `https://timothy-portfolio-cms-auth.tmkm.workers.dev/callback`

Store credentials as encrypted Worker secrets; never put them in this repository:

```bash
npm run oauth:secret:id
npm run oauth:secret:key
```

For local Worker testing, copy `.dev.vars.example` to `.dev.vars` and fill it locally. `.dev.vars` is ignored by Git.
