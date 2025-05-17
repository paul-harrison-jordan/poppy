"use client"

import { Task } from '@/types/my-work'

export default function TaskList({ tasks }: { tasks: Task[] }) {
  return (
    <ul className="space-y-1">
      {tasks.map((task) => (
        <li key={task.id} className="flex items-center space-x-2">
          <input
            type="checkbox"
            checked={task.is_done}
            readOnly
            className="h-4 w-4"
          />
          <span className="text-sm">{task.title}</span>
        </li>
      ))}
    </ul>
  )
}
