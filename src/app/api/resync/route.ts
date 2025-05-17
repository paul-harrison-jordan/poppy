import { NextResponse } from 'next/server'
import { getAuthServerSession } from '@/lib/auth'
import { getUserIndex } from '@/lib/pinecone'

export async function POST(request: Request) {
  try {
    const authSession = await getAuthServerSession()
    if (!authSession?.user?.name) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { prefix, vectors } = await request.json() as { prefix: string; vectors: any[] }

    const formattedUsername = authSession.user.name
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    const index = getUserIndex(`${formattedUsername}`)
    const namespace = index.namespace('ns1')

    const listed = await namespace.list({ prefix })
    const ids = listed.vectors.map((v: any) => v.id)
    if (ids.length) {
      await namespace.deleteMany(ids)
    }

    await namespace.upsert(vectors)
    return NextResponse.json({ message: 'Resync completed' })
  } catch (error) {
    console.error('Error during resync:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
