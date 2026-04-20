import { Draggable } from '@hello-pangea/dnd'
import { format, isAfter, parseISO, startOfToday } from 'date-fns'
import { CalendarDays, AlertCircle, ArrowUp, ArrowRight, ArrowDown, Minus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { Task } from '@/types'

interface TaskCardProps {
  task: Task
  index: number
  onClick: () => void
}

const priorityConfig = {
  urgent: { icon: AlertCircle, class: 'text-red-500' },
  high: { icon: ArrowUp, class: 'text-orange-500' },
  medium: { icon: ArrowRight, class: 'text-yellow-500' },
  low: { icon: ArrowDown, class: 'text-blue-400' },
}

export function TaskCard({ task, index, onClick }: TaskCardProps) {
  const isOverdue = task.due_date && task.status !== 'done'
    && isAfter(startOfToday(), parseISO(task.due_date))

  const Priority = priorityConfig[task.priority] ?? { icon: Minus, class: 'text-muted-foreground' }
  const PriorityIcon = Priority.icon

  return (
    <Draggable draggableId={task.id} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          onClick={onClick}
          className={`
            group rounded-lg border bg-card p-3 cursor-pointer select-none
            transition-all duration-150
            ${snapshot.isDragging
              ? 'shadow-lg rotate-1 border-primary/30'
              : 'shadow-sm hover:shadow-md hover:border-border/80'
            }
          `}
        >
          {/* Priority + Title */}
          <div className="flex items-start gap-2 mb-2">
            <PriorityIcon className={`h-3.5 w-3.5 mt-0.5 shrink-0 ${Priority.class}`} />
            <p className="text-sm font-medium leading-snug text-card-foreground line-clamp-2 flex-1">
              {task.title}
            </p>
          </div>

          {/* Labels */}
          {task.labels.length > 0 && (
            <div className="flex flex-wrap gap-1 mb-2">
              {task.labels.map(label => (
                <span
                  key={label.id}
                  className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                  style={{ backgroundColor: label.color + '22', color: label.color }}
                >
                  {label.name}
                </span>
              ))}
            </div>
          )}

          {/* Footer: due date + assignees */}
          <div className="flex items-center justify-between mt-2">
            {task.due_date ? (
              <div className={`flex items-center gap-1 text-[11px] font-medium ${
                isOverdue ? 'text-red-500' : 'text-muted-foreground'
              }`}>
                <CalendarDays className="h-3 w-3" />
                {isOverdue ? 'Overdue · ' : ''}
                {format(parseISO(task.due_date), 'MMM d')}
              </div>
            ) : <span />}

            {task.assignees.length > 0 && (
              <div className="flex -space-x-1.5">
                {task.assignees.slice(0, 3).map(m => (
                  <Avatar key={m.id} className="h-5 w-5 border border-background text-[9px]">
                    <AvatarFallback className="bg-primary/10 text-primary text-[9px]">
                      {m.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 3 && (
                  <Avatar className="h-5 w-5 border border-background">
                    <AvatarFallback className="bg-muted text-muted-foreground text-[9px]">
                      +{task.assignees.length - 3}
                    </AvatarFallback>
                  </Avatar>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </Draggable>
  )
}
