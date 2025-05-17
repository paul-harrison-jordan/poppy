"use client"

import { useEffect, useState } from 'react'
import { Task } from '@/types/my-work'

export default function TaskList({ prdId }: { prdId: string }) {
  const [tasks, setTasks] = useState<Task[]>([])

  useEffect(() => {
    const fetchTasks = async () => {
      const res = await fetch('/api/my-work/list')
      if (res.ok) {
        const data = await res.json()
        const all = (data.prds_tasks || []) as Task[]
        setTasks(all.filter((t) => t.prd_id === prdId))
      }
    }
    fetchTasks()
  }, [prdId])

  return (
    <ul className="space-y-1">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center space-x-2">
          <input type="checkbox" checked={task.is_done} readOnly className="h-4 w-4" />
          <span className="text-sm">{task.title}</span>
        </li>
      ))}
    </ul>
  )
}
