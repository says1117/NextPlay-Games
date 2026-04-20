import { Search, Plus, X, Users, Tag } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
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
  onManageLabels: () => void
}

export function BoardHeader({ tasks, filters, members, labels, onFiltersChange, onNewTask, onManageTeam, onManageLabels }: BoardHeaderProps) {
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
    <div className="border-b border-border bg-background px-4 sm:px-6 pt-4 pb-3">
      {/* Top row */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-4">
          <div>
            <h1 className="text-[15px] font-semibold tracking-tight text-foreground">Board</h1>
          </div>
          {/* Stats inline — desktop */}
          <div className="hidden sm:flex items-center gap-1">
            <StatPill label="Tasks" value={total} />
            <StatPill label="Done" value={completed} variant="success" />
            {overdue > 0 && <StatPill label="Overdue" value={overdue} variant="overdue" />}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            onClick={onManageLabels}
            className="h-7 gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2"
          >
            <Tag className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Labels</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onManageTeam}
            className="h-7 gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground px-2"
          >
            <Users className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Team</span>
          </Button>
          <div className="w-px h-4 bg-border mx-0.5" />
          <Button
            onClick={onNewTask}
            size="sm"
            className="h-7 gap-1.5 text-[11px] font-semibold px-3"
          >
            <Plus className="h-3.5 w-3.5" />
            New Task
          </Button>
        </div>
      </div>

      {/* Mobile stats */}
      <div className="flex sm:hidden items-center gap-1 mb-2.5">
        <StatPill label="Tasks" value={total} />
        <StatPill label="Done" value={completed} variant="success" />
        {overdue > 0 && <StatPill label="Overdue" value={overdue} variant="overdue" />}
      </div>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-1.5">
        <div className="relative w-full sm:w-52">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder="Search tasks…"
            value={filters.search}
            onChange={e => update({ search: e.target.value })}
            className="pl-7 h-7 text-[12px] w-full border-border/60 bg-muted/30 focus:bg-background"
          />
        </div>

        <Select value={filters.priority} onValueChange={v => v && update({ priority: v as FilterState['priority'] })}>
          <SelectTrigger className="h-7 w-full sm:w-32 text-[12px] border-border/60 bg-muted/30">
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
            <SelectTrigger className="h-7 w-full sm:w-36 text-[12px] border-border/60 bg-muted/30">
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
            <SelectTrigger className="h-7 w-full sm:w-32 text-[12px] border-border/60 bg-muted/30">
              <SelectValue placeholder="Label" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All labels</SelectItem>
              {labels.map(l => (
                <SelectItem key={l.id} value={l.id}>
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
                    {l.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="inline-flex items-center gap-1 h-7 px-2 rounded text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="h-3 w-3" />
            Clear
          </button>
        )}
      </div>
    </div>
  )
}

function StatPill({ label, value, variant }: { label: string; value: number; variant?: 'success' | 'overdue' }) {
  const colorClass =
    variant === 'success'
      ? 'text-emerald-600 bg-emerald-50'
      : variant === 'overdue'
      ? 'text-red-600 bg-red-50'
      : 'text-muted-foreground bg-muted'

  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold tabular-nums ${colorClass}`}>
      {value}
      <span className="font-normal opacity-70">{label}</span>
    </span>
  )
}
