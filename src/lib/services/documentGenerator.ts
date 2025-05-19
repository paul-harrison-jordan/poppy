import { collectStream } from "../collectStream"
export async function generateDocument(
  type: string,
  title: string,
  query: string,
  answers?: Record<string, string>,
  matchedContext?: string[]
) {
  // If we have answers, we're in content generation mode
  if (answers) {
    const storedContext = localStorage.getItem('personalContext')
    const teamTerms = JSON.parse(localStorage.getItem('teamTerms') || '{}')
    const questions = Object.keys(answers)

    // Generate content
    const contentRes = await fetch('/api/generate-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        type,
        title,
        query,
        teamTerms,
        storedContext,
        matchedContext,
        questions,
        questionAnswers: answers
      })
    })
    const markdown = await collectStream(contentRes)

    // Create Google Doc
    const docRes = await fetch('/api/create-google-doc', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, content: markdown })
    })
    if (!docRes.ok) throw new Error('Failed to create Google Doc')
    const docData = await docRes.json()
    return docData
  }

  // Initial setup path
  // 1. Embed request
  const embedRes = await fetch('/api/embed-request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, query })
  })
  if (!embedRes.ok) throw new Error('Failed to get embedding')
  const { queryEmbedding } = await embedRes.json()
  if (!queryEmbedding || !Array.isArray(queryEmbedding)) throw new Error('Invalid embedding response')
  const embedding = queryEmbedding[0].embedding

  // 2. Match embeddings
  const matchRes = await fetch('/api/match-embeds', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(embedding)
  })
  if (!matchRes.ok) throw new Error('Failed to match embeddings')
  const { matchedContext: context } = await matchRes.json()
  if (!context || !Array.isArray(context)) throw new Error('Invalid matched context response')
  
  // Store matched context in localStorage
  localStorage.setItem('matchedContext', JSON.stringify(context))

  // 3. Generate vocabulary
  const vocabRes = await fetch('/api/generate-vocabulary', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, query, matchedContext: context, type })
  })
  if (!vocabRes.ok) throw new Error('Failed to generate vocabulary')
  await vocabRes.json()

  const storedContext = localStorage.getItem('personalContext')
  const teamTerms = JSON.parse(localStorage.getItem('teamTerms') || '{}')

  // 4. Generate questions
  const questionsRes = await fetch('/api/generate-questions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, query, matchedContext: context, storedContext, teamTerms, type })
  })
  if (!questionsRes.ok) throw new Error('Failed to generate questions')
  return await questionsRes.json()
}
