import { memo } from 'react'
import { Draggable } from '@hello-pangea/dnd'
import { format, isAfter, parseISO, startOfToday } from 'date-fns'
import { CalendarDays, AlertCircle, ArrowUp, ArrowRight, ArrowDown } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  index: number
  onClick: () => void
}

const priorityConfig = {
  urgent: {
    icon: AlertCircle,
    iconClass: 'text-red-600',
    chipClass: 'bg-red-50 text-red-600',
    label: 'Urgent',
  },
  high: {
    icon: ArrowUp,
    iconClass: 'text-orange-500',
    chipClass: 'bg-orange-50 text-orange-600',
    label: 'High',
  },
  medium: {
    icon: ArrowRight,
    iconClass: 'text-amber-500',
    chipClass: 'bg-amber-50 text-amber-600',
    label: 'Medium',
  },
  low: {
    icon: ArrowDown,
    iconClass: 'text-blue-400',
    chipClass: 'bg-blue-50 text-blue-500',
    label: 'Low',
  },
}

export const TaskCard = memo(function TaskCard({ task, index, onClick }: TaskCardProps) {
  const isOverdue = task.due_date && task.status !== 'done'
    && isAfter(startOfToday(), parseISO(task.due_date))

  const priority = priorityConfig[task.priority] ?? priorityConfig.medium
  const PriorityIcon = priority.icon

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`
            group rounded-lg bg-card border border-border cursor-pointer select-none
            transition-all duration-150
            ${snapshot.isDragging
              ? 'shadow-xl rotate-1 border-border/60 scale-[1.02]'
              : 'shadow-sm hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] hover:border-border/70 hover:-translate-y-px'
            }
          `}
        >
          <div className="p-4">
            {/* Title */}
            <p className="text-sm font-medium leading-snug text-foreground line-clamp-2 mb-3">
              {task.title}
            </p>

            {/* Labels */}
            {task.labels.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {task.labels.map(label => (
                  <span
                    key={label.id}
                    className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold tracking-wide"
                    style={{ backgroundColor: label.color + '18', color: label.color }}
                  >
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                {/* Priority chip */}
                <span className={`inline-flex items-center gap-1 rounded px-2 py-0.5 text-xs font-semibold ${priority.chipClass}`}>
                  <PriorityIcon className="h-3 w-3" />
                  {priority.label}
                </span>

                {/* Due date */}
                {task.due_date && (
                  <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                    isOverdue
                      ? 'text-red-600 bg-red-50 px-2 py-0.5 rounded'
                      : 'text-muted-foreground'
                  }`}>
                    <CalendarDays className="h-3 w-3" />
                    {isOverdue ? 'Overdue' : format(parseISO(task.due_date), 'MMM d')}
                  </span>
                )}
              </div>

              {/* Assignees */}
              {task.assignees.length > 0 && (
                <div className="flex -space-x-1.5">
                  {task.assignees.slice(0, 3).map(m => (
                    <Avatar key={m.id} className="h-6 w-6 border-2 border-card">
                      <AvatarFallback className="bg-foreground/10 text-foreground text-[9px] font-bold">
                        {m.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {task.assignees.length > 3 && (
                    <Avatar className="h-6 w-6 border-2 border-card">
                      <AvatarFallback className="bg-muted text-muted-foreground text-[9px]">
                        +{task.assignees.length - 3}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Draggable>
  )
})
