import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { Prd } from '@/types/my-work'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const page = parseInt(url.searchParams.get('page') || '1', 10)
  const pageSize = parseInt(url.searchParams.get('pageSize') || '10', 10)

  const dataPath = path.join(process.cwd(), 'src/data/myWork.json')
  const data = JSON.parse(await fs.readFile(dataPath, 'utf8'))
  const prds: Prd[] = data.prds || []
  const prds_reviewers = data.prds_reviewers || []
  const prds_tasks = data.prds_tasks || []

  const start = (page - 1) * pageSize
  const paginated = prds.slice(start, start + pageSize)

  return NextResponse.json({
    prds: paginated,
    total: prds.length,
    prds_reviewers,
    prds_tasks
  })
}
