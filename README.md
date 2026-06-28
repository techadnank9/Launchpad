# Launchpad

**Paste your URL. We build your entire go-to-market.**

Launchpad is a zero-setup, agentic GTM platform built for the Orange Slice AI Growth Hackathon (June 27–28, 2026). A founder pastes their website URL and within minutes has a live outbound pipeline and a full inbound content calendar, automatically segmented by every viable buyer persona the AI detects.

## Features

- **Persona Detection** — GPT-4o reads your site and discovers 3–5 distinct buyer personas
- **Outbound Pipeline** — Fiber AI lead discovery + Orange Slice intent scoring + personalized cold emails
- **Inbound Content** — DALL-E 3 posters + social captions scheduled via Postiz
- **Live Dashboard** — Convex real-time streaming as each agent completes

## Tech Stack

- **Frontend:** Next.js 16 + Tailwind CSS
- **Backend:** Convex (database, job queues, real-time subscriptions)
- **AI:** OpenAI GPT-4o + DALL-E 3
- **Integrations:** Fiber AI, Orange Slice, Postiz

## Getting Started

### Prerequisites

- Node.js 20+
- API keys for OpenAI, Fiber AI, and Orange Slice (required). Postiz is optional.

### Install

```bash
npm install
```

### Environment Variables

**One file for all keys:** [`.env.local`](/Users/adnan/Documents/Launchpad/.env.local)

```bash
cp .env.local.example .env.local
```

Open `.env.local` and paste your keys next to each variable:

| Variable | Required | Used for |
|----------|----------|----------|
| `OPENAI_API_KEY` | Yes | GPT-4o analysis, emails, captions, DALL-E 3 posters |
| `FIBER_API_KEY` | Yes | Lead discovery |
| `ORANGESLICE_API_KEY` | Yes | Intent scoring via the [Orange Slice](https://www.npmjs.com/package/orangeslice) npm package (job openings, news, web search) |
| `POSTIZ_API_KEY` | No | Only if self-hosting [Postiz](https://github.com/gitroomhq/postiz-app) for real social publishing |
| `POSTIZ_BASE_URL` | No | Postiz Public API URL (e.g. `http://localhost:4007/public/v1`) |
| `NEXT_PUBLIC_CONVEX_URL` | Auto | Set by `npx convex dev` — leave as-is locally |
| `CONVEX_DEPLOYMENT` | Auto | Set by `npx convex dev` — leave as-is locally |

After pasting keys, sync them to the Convex backend:

```bash
npm run env:sync
```

Then start the app:

```bash
npm run dev
```

**Why two steps?** Next.js reads `.env.local` for the frontend. Convex agents run on the backend and need keys pushed via `npm run env:sync` (or `npx convex env set KEY value` individually).

#### Orange Slice (npm package — not MCP)

[Orange Slice](https://www.npmjs.com/package/orangeslice) is a sales enrichment SDK with access to 30+ data providers (Apollo, PeopleDataLabs, Crustdata, Hunter, etc.) for company enrichment, contact lookup, email verification, web scraping, and more. Launchpad calls it from Convex backend scripts via the installed `orangeslice` package — not through MCP.

**Setup:**

```bash
# 1. Bootstrap + sign in (opens browser, saves key locally)
npx orangeslice@latest login

# 2. Copy key into .env.local automatically
npm run orangeslice:import

# 3. Push key to Convex backend
npm run env:sync
```

The key is stored at `~/.config/orangeslice/config.json` (starts with `osk_`). Launchpad uses Orange Slice for intent scoring: PredictLeads job openings, company news events, and Reddit/web mentions per lead.

### Run Development

In two terminals:

```bash
# Terminal 1 — Convex backend
npm run dev:backend

# Terminal 2 — Next.js frontend
npm run dev:frontend
```

Or run both together:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## 60-Second Demo Script

1. Open Launchpad, paste a URL (e.g. a well-known bike brand)
2. Hit **Go** — watch persona cards appear (3–5 buyer types)
3. Click into a persona — lead list populates with intent scores, email sequence ready
4. Click another persona — different leads, tone, poster generating live
5. Show content calendar — posters and captions queued per persona
6. **One URL. Five minutes. Full go-to-market across every buyer segment.**

## Project Structure

```
app/              Next.js pages
components/       React UI components
convex/           Convex backend, schema, agents, workflow
convex/agents/    Site Analyst, Lead, Copy, Poster, Scheduler agents
convex/lib/       OpenAI, Fiber, Orange Slice, Postiz integrations
```

## License

MIT
