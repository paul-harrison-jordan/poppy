## Getting Started
<!-- Slack me that you want to use this, I need to add your email to the allowlist -->


<!-- This repo requires a .env.local file in the root of the project folder. Add your own values for the below, we use pinecone.io as our vectordb, they're free. You do not need to create an index from them, just an API Key-->
PINECONE_API_KEY=
OPENAI_API_KEY=
OPENAI_ORGANIZATION=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
NEXTAUTH_URL=
NEXTAUTH_SECRET=

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
