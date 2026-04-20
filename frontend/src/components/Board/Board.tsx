import { useEffect, useState, useCallback, useMemo } from 'react'
import { flushSync } from 'react-dom'
import { DragDropContext, type DropResult } from '@hello-pangea/dnd'
import { toast } from 'sonner'
import { Column } from './Column'
import { BoardHeader, type FilterState } from './BoardHeader'
import { TaskDetailPanel } from '@/components/Task/TaskDetailPanel'
import { NewTaskDialog } from '@/components/Task/NewTaskDialog'
import type { Task, TaskStatus, Member, Label } from '@/types'
import { getTasks, updateTask, getMembers, getLabels } from '@/lib/api'

const COLUMNS: { status: TaskStatus; label: string }[] = [
  { status: 'todo', label: 'To Do' },
  { status: 'in_progress', label: 'In Progress' },
  { status: 'in_review', label: 'In Review' },
  { status: 'done', label: 'Done' },
]

const DEFAULT_FILTERS: FilterState = {
  search: '',
  priority: 'all',
  assigneeId: 'all',
  labelId: 'all',
}

export function Board() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [newTaskOpen, setNewTaskOpen] = useState(false)
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS)

  useEffect(() => {
    Promise.all([getTasks(), getMembers(), getLabels()])
      .then(([t, m, l]) => { setTasks(t); setMembers(m); setLabels(l) })
      .catch(() => toast.error('Failed to load board'))
      .finally(() => setLoading(false))
  }, [])

  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      if (filters.search.trim()) {
        if (!t.title.toLowerCase().includes(filters.search.toLowerCase())) return false
      }
      if (filters.priority !== 'all' && t.priority !== filters.priority) return false
      if (filters.assigneeId !== 'all') {
        if (!t.assignees.find(a => a.id === filters.assigneeId)) return false
      }
      if (filters.labelId !== 'all') {
        if (!t.labels.find(l => l.id === filters.labelId)) return false
      }
      return true
    })
  }, [tasks, filters])

  const onDragEnd = useCallback(async (result: DropResult) => {
    const { source, destination, draggableId } = result
    if (!destination || source.droppableId === destination.droppableId) return

    const newStatus = destination.droppableId as TaskStatus

    flushSync(() => {
      setTasks(prev => prev.map(t =>
        t.id === draggableId ? { ...t, status: newStatus } : t
      ))
      setSelectedTask(prev =>
        prev?.id === draggableId ? { ...prev, status: newStatus } : prev
      )
    })

    try {
      await updateTask(draggableId, { status: newStatus })
    } catch {
      setTasks(prev => prev.map(t =>
        t.id === draggableId ? { ...t, status: source.droppableId as TaskStatus } : t
      ))
      toast.error('Failed to update task status')
    }
  }, [])

  const handleTaskClick = useCallback((task: Task) => setSelectedTask(task), [])

  function handleTaskUpdated(updated: Task) {
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t))
    setSelectedTask(updated)
    // Refresh members/labels in case they changed
    getMembers().then(setMembers)
    getLabels().then(setLabels)
  }

  function handleTaskDeleted(taskId: string) {
    setTasks(prev => prev.filter(t => t.id !== taskId))
    setSelectedTask(null)
  }

  function handleTaskCreated(task: Task) {
    setTasks(prev => [task, ...prev])
  }

  if (loading) {
    return (
      <div className="flex flex-col gap-4 p-6">
        <div className="h-8 w-48 rounded-md bg-muted animate-pulse" />
        <div className="flex gap-4">
          {COLUMNS.map(c => (
            <div key={c.status} className="w-72 shrink-0 space-y-2">
              <div className="h-5 w-24 rounded bg-muted animate-pulse" />
              {[1, 2, 3].map(i => (
                <div key={i} className="h-24 rounded-lg bg-muted animate-pulse" />
              ))}
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <>
      <BoardHeader
        tasks={tasks}
        filters={filters}
        members={members}
        labels={labels}
        onFiltersChange={setFilters}
        onNewTask={() => setNewTaskOpen(true)}
      />

      <div className="flex gap-4 p-4 sm:p-6 overflow-x-auto snap-x snap-mandatory sm:snap-none pb-6" style={{ scrollbarWidth: 'thin' }}>
        <DragDropContext onDragEnd={onDragEnd}>
          {COLUMNS.map(col => (
            <Column
              key={col.status}
              status={col.status}
              label={col.label}
              tasks={filteredTasks.filter(t => t.status === col.status)}
              onTaskClick={handleTaskClick}
            />
          ))}
        </DragDropContext>
      </div>

      <TaskDetailPanel
        task={selectedTask}
        open={!!selectedTask}
        onClose={() => setSelectedTask(null)}
        onTaskUpdated={handleTaskUpdated}
        onTaskDeleted={handleTaskDeleted}
      />

      <NewTaskDialog
        open={newTaskOpen}
        onClose={() => setNewTaskOpen(false)}
        onCreated={handleTaskCreated}
      />
    </>
  )
}
