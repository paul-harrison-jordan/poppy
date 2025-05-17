import { NextResponse } from 'next/server'
import path from 'path'
import fs from 'fs/promises'
import { nanoid } from 'nanoid'
import { Task } from '@/types/my-work'

export async function POST(request: Request) {
  const { prdId, title } = await request.json()
  const dataPath = path.join(process.cwd(), 'src/data/myWork.json')
  const data = JSON.parse(await fs.readFile(dataPath, 'utf8'))
  const tasks: Task[] = data.prds_tasks || []
  const newTask: Task = {
    id: nanoid(),
    prd_id: prdId,
    title,
    is_done: false,
    sort_order: tasks.length + 1
  }
  tasks.push(newTask)
  data.prds_tasks = tasks
  await fs.writeFile(dataPath, JSON.stringify(data, null, 2))
  return NextResponse.json({ task: newTask })
}
