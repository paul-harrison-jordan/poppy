import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { Prd } from '@/types/my-work'

export async function POST(request: Request) {
  const { prdId, dueDate } = await request.json()
  const dataPath = path.join(process.cwd(), 'src/data/myWork.json')
  const data = JSON.parse(await fs.readFile(dataPath, 'utf8'))
  const prds: Prd[] = data.prds || []
  const prd = prds.find(p => p.id === prdId)
  if (!prd) {
    return NextResponse.json({ error: 'PRD not found' }, { status: 404 })
  }
  prd.due_date = dueDate
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2))
  return NextResponse.json({ prd })
}
