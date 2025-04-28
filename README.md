## Getting Started

<!-- Add these to your env.local file in the root of this folder to enable login -->
GOOGLE_CLIENT_ID=490186627107-k3vbrnhdjllrhm302ovporhltlukf328.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=cMDPTAuFjsjFXh1PrWLIHUth0wtG5TQ+eZpXGbQBDRg

<!-- Slack me that you want to use this, I need to add your email to the allowlist -->

<!-- add your own values for these, we use pinecone.io as our vectordb, they're free-->
PINECONE_API_KEY=
OPENAI_API_KEY=
OPENAI_ORGANIZATION=

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
