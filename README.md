## Getting Started
Slack me that you want to use this, I need to add your email to the allowlist, and share the env.local values for you to use.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Setup

Install dependencies first so that linting and TypeScript checks work correctly:

```bash
npm install
```

Then you can run

```bash
npm run lint
npx tsc --noEmit
```

## Environment Variables

Local development requires a `.env.local` file containing values for:

- `OPENAI_API_KEY`
- `OPENAI_ORGANIZATION`
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI`
- `PINECONE_API_KEY`

Ask the maintainer to provide these values.
