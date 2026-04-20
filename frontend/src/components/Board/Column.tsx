import { memo, type ReactElement } from 'react'
import { Droppable } from '@hello-pangea/dnd'
import { TaskCard } from '@/components/Task/TaskCard'
import type { Task, TaskStatus } from '@/types'

interface ColumnProps {
  status: TaskStatus
  label: string
  tasks: Task[]
  onTaskClick: (task: Task) => void
}

const columnConfig: Record<TaskStatus, { dot: string; empty: string; bg: string; bgOver: string }> = {
  todo: {
    dot: 'bg-slate-400',
    empty: 'text-slate-300',
    bg: 'bg-slate-50/70',
    bgOver: 'bg-slate-100/80',
  },
  in_progress: {
    dot: 'bg-blue-500',
    empty: 'text-blue-200',
    bg: 'bg-blue-50/50',
    bgOver: 'bg-blue-100/60',
  },
  in_review: {
    dot: 'bg-amber-500',
    empty: 'text-amber-200',
    bg: 'bg-amber-50/50',
    bgOver: 'bg-amber-100/60',
  },
  done: {
    dot: 'bg-emerald-500',
    empty: 'text-emerald-200',
    bg: 'bg-emerald-50/50',
    bgOver: 'bg-emerald-100/60',
  },
}

function EmptyState({ status }: { status: TaskStatus }) {
  const config = columnConfig[status]

  const icons: Record<TaskStatus, ReactElement> = {
    todo: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={config.empty}>
        <rect x="4" y="6" width="24" height="4" rx="2" fill="currentColor" />
        <rect x="4" y="14" width="18" height="4" rx="2" fill="currentColor" />
        <rect x="4" y="22" width="21" height="4" rx="2" fill="currentColor" />
      </svg>
    ),
    in_progress: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={config.empty}>
        <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="3" strokeDasharray="6 4" />
        <circle cx="16" cy="16" r="4" fill="currentColor" />
      </svg>
    ),
    in_review: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={config.empty}>
        <circle cx="14" cy="14" r="9" stroke="currentColor" strokeWidth="3" />
        <path d="M21 21L27 27" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
        <path d="M10 14L13 17L18 11" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    done: (
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className={config.empty}>
        <circle cx="16" cy="16" r="11" stroke="currentColor" strokeWidth="3" />
        <path d="M10 16L14 20L22 12" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  }

  const messages: Record<TaskStatus, { title: string; sub: string }> = {
    todo: { title: 'Nothing queued', sub: 'Add a task to get started' },
    in_progress: { title: 'All clear', sub: 'No active work right now' },
    in_review: { title: 'Nothing to review', sub: 'Move tasks here when ready' },
    done: { title: 'Not yet', sub: 'Completed tasks appear here' },
  }

  return (
    <div className="flex flex-col items-center justify-center py-10 px-4 text-center gap-2.5">
      <div className="opacity-60">{icons[status]}</div>
      <div>
        <p className="text-[12px] font-semibold text-muted-foreground">{messages[status].title}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-0.5">{messages[status].sub}</p>
      </div>
    </div>
  )
}

export const Column = memo(function Column({ status, label, tasks, onTaskClick }: ColumnProps) {
  const config = columnConfig[status]

  return (
    <div className="flex flex-col w-[85vw] sm:w-[calc(25vw-24px)] sm:min-w-[220px] sm:max-w-[300px] shrink-0 snap-center sm:snap-align-none">
      {/* Column header */}
      <div className="flex items-center gap-2.5 mb-3 px-1">
        <span className={`h-3 w-3 rounded-full shrink-0 ${config.dot}`} />
        <span className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex-1">
          {label}
        </span>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-muted px-2 text-sm font-semibold text-muted-foreground tabular-nums">
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
              flex flex-col gap-2 rounded-xl p-2 min-h-[240px] flex-1
              transition-colors duration-200 border
              ${snapshot.isDraggingOver
                ? `${config.bgOver} border-border/60`
                : `${config.bg} border-transparent`
              }
            `}
          >
            {tasks.length === 0 && !snapshot.isDraggingOver && (
              <EmptyState status={status} />
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
})
