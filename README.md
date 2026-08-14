# Timothy Kim — Portfolio

A personal portfolio showcasing my software engineering, data science, and machine learning projects.

**Live site:** [timothykim.tkimify.com](https://timothykim.tkimify.com)

## Overview

I built this portfolio to present my projects as interactive products rather than a collection of repository links. Each project includes a visual preview, a concise overview, and separate write-ups covering product decisions and technical implementation.

The site also includes a custom content-management system through Decap CMS, allowing me to easily make changes to the contents of the site.

## Features

- Responsive project portfolio
- Animated project cards and detail modals
- Expandable experience and education entries
- Image, GIF, and PDF uploads through Decap CMS
- GitHub-based CMS authentication
- Anonymous session and click analytics

## Technical Architecture

The public portfolio is a lightweight static site built with HTML, CSS, and vanilla JavaScript.

Portfolio content is stored in JSON and managed through Decap CMS. Published CMS changes are committed directly to GitHub, allowing the site to remain static while still providing a convenient editing interface.

A Cloudflare Worker handles:

- GitHub OAuth for the CMS
- Analytics event collection
- Dashboard authentication
- Signed dashboard sessions
- Analytics queries

Anonymous analytics events are stored in Cloudflare D1.

## Technology

- HTML5
- CSS3
- JavaScript
- Decap CMS
- GitHub
- Cloudflare Workers
- Cloudflare D1
- GitHub OAuth
- Cloudflare Web Analytics

## Project Structure

```text
.
├── analytics/              # Private analytics dashboard
├── assets/uploads/         # Project media and resume
├── admin/                  # Decap CMS configuration
├── content/site.json       # Portfolio content
├── oauth-worker/           # OAuth and analytics Worker
├── analytics-tracker.js    # Anonymous event tracking
├── index.html              # Portfolio markup
├── script.js               # Portfolio interactions
└── style.css               # Main visual system
