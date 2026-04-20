import { Search, Plus, X, Users } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { Task, Member, Label, TaskPriority } from '@/types'
import { isAfter, parseISO, startOfToday } from 'date-fns'

export interface FilterState {
  search: string
  priority: TaskPriority | 'all'
  assigneeId: string | 'all'
  labelId: string | 'all'
}

interface BoardHeaderProps {
  tasks: Task[]
  filters: FilterState
  members: Member[]
  labels: Label[]
  onFiltersChange: (f: FilterState) => void
  onNewTask: () => void
  onManageTeam: () => void
}

export function BoardHeader({ tasks, filters, members, labels, onFiltersChange, onNewTask, onManageTeam }: BoardHeaderProps) {
  const total = tasks.length
  const completed = tasks.filter(t => t.status === 'done').length
  const overdue = tasks.filter(t => {
    if (!t.due_date || t.status === 'done') return false
    return isAfter(startOfToday(), parseISO(t.due_date))
  }).length

  const hasActiveFilters = filters.priority !== 'all' || filters.assigneeId !== 'all' || filters.labelId !== 'all'

  function update(patch: Partial<FilterState>) {
    onFiltersChange({ ...filters, ...patch })
  }

  function clearFilters() {
    onFiltersChange({ search: filters.search, priority: 'all', assigneeId: 'all', labelId: 'all' })
  }

  return (
    <div className="border-b border-border bg-background px-4 sm:px-6 py-4">
      {/* Top row: title + stats + new task */}
      <div className="flex items-start sm:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg sm:text-xl font-semibold tracking-tight text-foreground">Board</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Manage and track your work</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <div className="hidden sm:flex items-center gap-2">
            <Stat label="Total" value={total} />
            <Stat label="Done" value={completed} variant="success" />
            {overdue > 0 && <Stat label="Overdue" value={overdue} variant="destructive" />}
          </div>
          <Button variant="outline" size="sm" onClick={onManageTeam} className="gap-1.5">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Team</span>
          </Button>
          <Button onClick={onNewTask} size="sm" className="gap-1.5">
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">New Task</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      {/* Mobile stats row */}
      <div className="flex sm:hidden items-center gap-2 mb-3">
        <Stat label="Total" value={total} />
        <Stat label="Done" value={completed} variant="success" />
        {overdue > 0 && <Stat label="Overdue" value={overdue} variant="destructive" />}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-56">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search tasks..."
            value={filters.search}
            onChange={e => update({ search: e.target.value })}
            className="pl-8 h-8 text-sm w-full"
          />
        </div>

        <Select value={filters.priority} onValueChange={v => v && update({ priority: v as FilterState['priority'] })}>
          <SelectTrigger className="h-8 w-full sm:w-36 text-sm">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All priorities</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="low">Low</SelectItem>
          </SelectContent>
        </Select>

        {members.length > 0 && (
          <Select value={filters.assigneeId} onValueChange={v => v && update({ assigneeId: v })}>
            <SelectTrigger className="h-8 w-full sm:w-40 text-sm">
              <SelectValue placeholder="Assignee" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All assignees</SelectItem>
              {members.map(m => (
                <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {labels.length > 0 && (
          <Select value={filters.labelId} onValueChange={v => v && update({ labelId: v })}>
            <SelectTrigger className="h-8 w-full sm:w-36 text-sm">
              <SelectValue placeholder="Label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All labels</SelectItem>
              {labels.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: l.color }} />
                    {l.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1 text-muted-foreground">
            <X className="h-3.5 w-3.5" />
            Clear
          </Button>
        )}
      </div>
    </div>
  )
}

function Stat({ label, value, variant }: { label: string; value: number; variant?: 'success' | 'destructive' }) {
  return (
    <div className="flex items-center gap-1.5 text-sm">
      <span className="text-muted-foreground">{label}</span>
      <Badge
        variant={variant === 'destructive' ? 'destructive' : 'secondary'}
        className={variant === 'success' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : ''}
      >
        {value}
      </Badge>
    </div>
  )
}
