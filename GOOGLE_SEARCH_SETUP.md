# Google Custom Search Setup

To use real Google search results instead of mock data, you need to set up Google Custom Search API.

## Setup Steps

### 1. Create Google Custom Search Engine
1. Go to [Google Custom Search](https://cse.google.com/cse/)
2. Click "Add" to create a new search engine
3. In "Sites to search", enter `*` (to search the entire web)
4. Give it a name like "Competitive Analysis Search"
5. Click "Create"
6. Copy the **Search Engine ID** (it looks like: `017576662512468239146:omuauf_lfve`)

### 2. Get Google API Key
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the "Custom Search API"
4. Go to "Credentials" → "Create Credentials" → "API Key"
5. Copy the **API Key**

### 3. Add Environment Variables
Add these to your `.env.local`:

```bash
# Google Custom Search (for competitive analysis)
GOOGLE_SEARCH_API_KEY=your_api_key_here
GOOGLE_SEARCH_ENGINE_ID=your_search_engine_id_here
```

### 4. Restart Your Development Server
```bash
npm run dev
```

## What This Enables

With real Google search:
- **Actual competitor pages** from zendesk.com, intercom.com, etc.
- **Recent blog posts** and documentation
- **Real URLs** users can click to verify
- **Current information** about competitor features

Without Google search (current fallback):
- **Realistic mock URLs** that look like real competitor pages
- **Plausible content** based on known competitor features  
- **Immediate testing** without API setup required

## Cost Information

Google Custom Search API provides:
- **100 searches/day FREE**
- **$5 per 1,000 additional queries**

For development and testing, the free tier is usually sufficient.

## Testing

To verify it's working:
1. Check browser console for `[WebSearchService] Searching with provider google`
2. Look for real domains like `zendesk.com`, `intercom.com` in results
3. Click source links to verify they go to actual competitor pages

If you see `[WebSearchService] Searching with provider mock`, it's using fallback data (which still works great for testing!).