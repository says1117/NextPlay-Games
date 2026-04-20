import { Droppable } from '@hello-pangea/dnd'
import { TaskCard } from '@/components/Task/TaskCard'
import type { Task, TaskStatus } from '@/types'

interface ColumnProps {
  status: TaskStatus
  label: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

const columnColors: Record<TaskStatus, string> = {
  todo: 'bg-slate-400',
  in_progress: 'bg-blue-500',
  in_review: 'bg-amber-500',
  done: 'bg-emerald-500',
}

export function Column({ status, label, tasks, onTaskClick }: ColumnProps) {
  return (
    <div className="flex flex-col w-72 shrink-0">
      {/* Column header */}
      <div className="flex items-center gap-2 mb-3 px-1">
        <span className={`h-2 w-2 rounded-full ${columnColors[status]}`} />
        <span className="text-sm font-medium text-foreground">{label}</span>
        <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-muted text-[11px] font-medium text-muted-foreground">
          {tasks.length}
        </span>
      </div>

      {/* Droppable area */}
      <Droppable droppableId={status}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`
              flex flex-col gap-2 rounded-xl p-2 min-h-[200px] flex-1 transition-colors duration-150
              ${snapshot.isDraggingOver ? 'bg-muted/60' : 'bg-muted/30'}
            `}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center mb-2">
                  <span className={`h-2 w-2 rounded-full ${columnColors[status]}`} />
                </div>
                <p className="text-xs text-muted-foreground">No tasks</p>
              </div>
            )}

            {tasks.map((task, index) => (
              <TaskCard
                key={task.id}
                task={task}
                index={index}
                onClick={() => onTaskClick(task)}
              />
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}
