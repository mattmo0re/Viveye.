# Viveye OSINT Fusion Platform

Viveye is a bleeding-edge open-source intelligence (OSINT) operations console designed for modern analysts. It blends persona discovery, infrastructure reconnaissance, and breach telemetry into a cinematic, silver-toned interface.

## Features

- **Persona Surface Mapper** – Correlate GitHub intelligence and launch pivots to other social ecosystems instantly.
- **Infrastructure Reconnaissance** – Resolve DNS footprints and enrich IPs with live geolocation, ownership, and proxy signals.
- **Exposure Intelligence** – Integrate curated breach datasets into your workflow with a single click.
- **Fusion Workbench** – Automatically prioritizes captured signals with confidence-weighted scoring.
- **Report Composer** – Generate downloadable JSON intelligence packs and executive-ready narrative drafts.
- **Resource Launchpad** – Quickly pivot into respected OSINT frameworks, toolkits, and feeds.

## Getting Started

1. Install dependencies and build the web application:

   ```bash
   cd webapp
   npm install
   npm run dev
   ```

2. Open `http://localhost:5173` to access the Viveye console.

### Available Scripts

Inside the `webapp` directory:

- `npm run dev` – Start the Vite development server.
- `npm run build` – Type-check and generate a production build.
- `npm run lint` – Run ESLint with the TypeScript plugin suite.
- `npm run preview` – Preview the production build locally.

## Tech Stack

- React 18 + TypeScript
- Vite 5
- Tailwind CSS 3
- Framer Motion, Lucide icons, and Headless UI enhancements

## Notes

- IP enrichment leverages the public `ip-api.com` endpoint; DNS resolution uses `dns.google` over HTTPS.
- GitHub persona intelligence consumes the official GitHub REST API and respects rate limits.
- Linting currently emits a warning because the TypeScript 5.9 toolchain exceeds the officially supported range for `@typescript-eslint`.
