import { useEffect, useState, useRef } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Trash2, Send, X, Tag, UserPlus, Pencil, Check } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { Task, Comment, ActivityLog, Member, Label } from '@/types'
import {
  getComments, createComment, deleteComment,
  getActivity, getMembers, getLabels,
  addAssignee, removeAssignee, addTaskLabel, removeTaskLabel,
  updateTask, deleteTask,
} from '@/lib/api'

interface TaskDetailPanelProps {
  task: Task | null
  open: boolean
  onClose: () => void
  onTaskUpdated: (task: Task) => void
  onTaskDeleted: (taskId: string) => void
}

const priorityOptions = ['low', 'medium', 'high', 'urgent'] as const
const statusOptions = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
]

export function TaskDetailPanel({ task, open, onClose, onTaskUpdated, onTaskDeleted }: TaskDetailPanelProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [activity, setActivity] = useState<ActivityLog[]>([])
  const [members, setMembers] = useState<Member[]>([])
  const [labels, setLabels] = useState<Label[]>([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [localTask, setLocalTask] = useState<Task | null>(null)

  // Inline editing state
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleDraft, setTitleDraft] = useState('')
  const [editingDescription, setEditingDescription] = useState(false)
  const [descriptionDraft, setDescriptionDraft] = useState('')
  const [editingDueDate, setEditingDueDate] = useState(false)
  const [dueDateDraft, setDueDateDraft] = useState('')

  const titleInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (task) {
      setLocalTask(task)
      setEditingTitle(false)
      setEditingDescription(false)
      setEditingDueDate(false)
      loadData(task.id)
    }
  }, [task])

  useEffect(() => {
    if (editingTitle && titleInputRef.current) {
      titleInputRef.current.focus()
      titleInputRef.current.select()
    }
  }, [editingTitle])

  useEffect(() => {
    if (editingDescription && descriptionRef.current) {
      descriptionRef.current.focus()
      const len = descriptionRef.current.value.length
      descriptionRef.current.setSelectionRange(len, len)
    }
  }, [editingDescription])

  async function loadData(taskId: string) {
    const [c, a, m, l] = await Promise.all([
      getComments(taskId),
      getActivity(taskId),
      getMembers(),
      getLabels(),
    ])
    setComments(c)
    setActivity(a)
    setMembers(m)
    setLabels(l)
  }

  async function saveTitle() {
    if (!localTask || !titleDraft.trim() || titleDraft.trim() === localTask.title) {
      setEditingTitle(false)
      return
    }
    try {
      const updated = await updateTask(localTask.id, { title: titleDraft.trim() })
      setLocalTask(updated)
      onTaskUpdated(updated)
    } catch {
      toast.error('Failed to update title')
    } finally {
      setEditingTitle(false)
    }
  }

  async function saveDescription() {
    if (!localTask) { setEditingDescription(false); return }
    const newDesc = descriptionDraft.trim() || null
    if (newDesc === (localTask.description ?? null)) { setEditingDescription(false); return }
    try {
      const updated = await updateTask(localTask.id, { description: newDesc ?? undefined })
      setLocalTask(updated)
      onTaskUpdated(updated)
    } catch {
      toast.error('Failed to update description')
    } finally {
      setEditingDescription(false)
    }
  }

  async function saveDueDate() {
    if (!localTask) { setEditingDueDate(false); return }
    const newDate = dueDateDraft || null
    if (newDate === (localTask.due_date ?? null)) { setEditingDueDate(false); return }
    try {
      const updated = await updateTask(localTask.id, { due_date: newDate ?? undefined })
      setLocalTask(updated)
      onTaskUpdated(updated)
    } catch {
      toast.error('Failed to update due date')
    } finally {
      setEditingDueDate(false)
    }
  }

  async function handleComment() {
    if (!localTask || !newComment.trim()) return
    setSubmitting(true)
    try {
      const c = await createComment(localTask.id, newComment.trim())
      setComments(prev => [...prev, c])
      setNewComment('')
      const a = await getActivity(localTask.id)
      setActivity(a)
    } catch {
      toast.error('Failed to post comment')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDeleteComment(commentId: string) {
    if (!localTask) return
    await deleteComment(localTask.id, commentId)
    setComments(prev => prev.filter(c => c.id !== commentId))
  }

  async function handleStatusChange(status: string | null) {
    if (!status || !localTask) return
    try {
      const updated = await updateTask(localTask.id, { status: status as Task['status'] })
      setLocalTask(updated)
      onTaskUpdated(updated)
      const a = await getActivity(localTask.id)
      setActivity(a)
    } catch {
      toast.error('Failed to update status')
    }
  }

  async function handlePriorityChange(priority: string | null) {
    if (!priority || !localTask) return
    try {
      const updated = await updateTask(localTask.id, { priority: priority as Task['priority'] })
      setLocalTask(updated)
      onTaskUpdated(updated)
    } catch {
      toast.error('Failed to update priority')
    }
  }

  async function handleAddAssignee(memberId: string | null) {
    if (!memberId || !localTask) return
    await addAssignee(localTask.id, memberId)
    const member = members.find(m => m.id === memberId)
    if (member) {
      const updated = { ...localTask, assignees: [...localTask.assignees, member] }
      setLocalTask(updated)
      onTaskUpdated(updated)
    }
    const a = await getActivity(localTask.id)
    setActivity(a)
  }

  async function handleRemoveAssignee(memberId: string) {
    if (!localTask) return
    await removeAssignee(localTask.id, memberId)
    const updated = { ...localTask, assignees: localTask.assignees.filter(m => m.id !== memberId) }
    setLocalTask(updated)
    onTaskUpdated(updated)
  }

  async function handleAddLabel(labelId: string | null) {
    if (!labelId || !localTask) return
    await addTaskLabel(localTask.id, labelId)
    const label = labels.find(l => l.id === labelId)
    if (label) {
      const updated = { ...localTask, labels: [...localTask.labels, label] }
      setLocalTask(updated)
      onTaskUpdated(updated)
    }
  }

  async function handleRemoveLabel(labelId: string) {
    if (!localTask) return
    await removeTaskLabel(localTask.id, labelId)
    const updated = { ...localTask, labels: localTask.labels.filter(l => l.id !== labelId) }
    setLocalTask(updated)
    onTaskUpdated(updated)
  }

  async function handleDelete() {
    if (!localTask) return
    await deleteTask(localTask.id)
    onTaskDeleted(localTask.id)
    onClose()
    toast.success('Task deleted')
  }

  const unassignedMembers = members.filter(m => !localTask?.assignees.find(a => a.id === m.id))
  const unappliedLabels = labels.filter(l => !localTask?.labels.find(tl => tl.id === l.id))

  if (!localTask) return null

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0" showCloseButton={false}>
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-start gap-2">
            {/* Title */}
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex items-center gap-1.5">
                  <Input
                    ref={titleInputRef}
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') saveTitle()
                      if (e.key === 'Escape') setEditingTitle(false)
                    }}
                    className="h-7 text-sm font-semibold flex-1"
                  />
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={saveTitle}>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0" onClick={() => setEditingTitle(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  className="group flex items-start gap-1.5 w-full text-left"
                  onClick={() => { setTitleDraft(localTask.title); setEditingTitle(true) }}
                >
                  <SheetTitle className="text-base font-semibold leading-snug text-left flex-1">
                    {localTask.title}
                  </SheetTitle>
                  <Pencil className="h-3.5 w-3.5 mt-1 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity shrink-0" />
                </button>
              )}
            </div>

            {/* Trash + Close side by side, no overlap with absolute X */}
            <div className="flex items-center gap-0.5 shrink-0">
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleDelete}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
                <X className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-4 space-y-6">
            {/* Status + Priority */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</label>
                <Select value={localTask.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statusOptions.map(o => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Priority</label>
                <Select value={localTask.priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorityOptions.map(p => (
                      <SelectItem key={p} value={p} className="capitalize">{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Description</label>
              {editingDescription ? (
                <div className="space-y-1.5">
                  <Textarea
                    ref={descriptionRef}
                    value={descriptionDraft}
                    onChange={e => setDescriptionDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') setEditingDescription(false)
                    }}
                    placeholder="Add a description…"
                    className="text-sm min-h-[80px] resize-none"
                  />
                  <div className="flex gap-1.5">
                    <Button size="sm" className="h-7 text-xs" onClick={saveDescription}>Save</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setEditingDescription(false)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                <button
                  className="group w-full text-left"
                  onClick={() => { setDescriptionDraft(localTask.description ?? ''); setEditingDescription(true) }}
                >
                  {localTask.description ? (
                    <p className="text-sm text-foreground whitespace-pre-wrap group-hover:text-foreground/80 transition-colors">
                      {localTask.description}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground/50 italic group-hover:text-muted-foreground transition-colors">
                      Add a description…
                    </p>
                  )}
                </button>
              )}
            </div>

            {/* Due Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</label>
              {editingDueDate ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={dueDateDraft}
                    onChange={e => setDueDateDraft(e.target.value)}
                    className="h-8 flex-1 rounded-lg border border-input bg-transparent px-2.5 py-1 text-sm outline-none focus-visible:border-ring"
                    autoFocus
                  />
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={saveDueDate}>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={() => setEditingDueDate(false)}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  className="group flex items-center gap-1.5 text-left"
                  onClick={() => { setDueDateDraft(localTask.due_date ?? ''); setEditingDueDate(true) }}
                >
                  {localTask.due_date ? (
                    <span className="text-sm text-foreground group-hover:text-foreground/80 transition-colors">
                      {format(parseISO(localTask.due_date), 'MMMM d, yyyy')}
                    </span>
                  ) : (
                    <span className="text-sm text-muted-foreground/50 italic group-hover:text-muted-foreground transition-colors">
                      No due date
                    </span>
                  )}
                  <Pencil className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-60 transition-opacity" />
                </button>
              )}
            </div>

            <Separator />

            {/* Assignees */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Assignees</label>
              <div className="flex flex-wrap gap-1.5">
                {localTask.assignees.map(m => (
                  <div key={m.id} className="flex items-center gap-1.5 rounded-full border bg-muted/50 pl-1 pr-2 py-0.5">
                    <Avatar className="h-5 w-5">
                      <AvatarFallback className="text-[9px] bg-primary/10 text-primary">
                        {m.name.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="text-xs">{m.name}</span>
                    <button onClick={() => handleRemoveAssignee(m.id)} className="text-muted-foreground hover:text-foreground ml-0.5">
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {unassignedMembers.length > 0 && (
                  <Select onValueChange={handleAddAssignee}>
                    <SelectTrigger className="h-7 w-auto gap-1 text-xs border-dashed px-2">
                      <UserPlus className="h-3 w-3" />
                      Add
                    </SelectTrigger>
                    <SelectContent>
                      {unassignedMembers.map(m => (
                        <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            </div>

            {/* Labels */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Labels</label>
              <div className="flex flex-wrap gap-1.5">
                {localTask.labels.map(l => (
                  <div key={l.id} className="flex items-center gap-1 rounded-full px-2 py-0.5"
                    style={{ backgroundColor: l.color + '22', color: l.color }}>
                    <span className="text-[11px] font-medium">{l.name}</span>
                    <button onClick={() => handleRemoveLabel(l.id)}>
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
                {unappliedLabels.length > 0 && (
                  <Select onValueChange={handleAddLabel}>
                    <SelectTrigger className="h-7 w-auto gap-1 text-xs border-dashed px-2">
                      <Tag className="h-3 w-3" />
                      Add label
                    </SelectTrigger>
                    <SelectContent>
                      {unappliedLabels.map(l => (
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
              </div>
            </div>

            <Separator />

            {/* Comments */}
            <div className="space-y-3">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Comments</label>
              {comments.length === 0 && (
                <p className="text-xs text-muted-foreground">No comments yet.</p>
              )}
              {comments.map(c => (
                <div key={c.id} className="group flex gap-2">
                  <Avatar className="h-6 w-6 shrink-0 mt-0.5">
                    <AvatarFallback className="text-[9px] bg-muted">U</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-muted-foreground">
                        {format(new Date(c.created_at), 'MMM d, h:mm a')}
                      </span>
                      <button
                        onClick={() => handleDeleteComment(c.id)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                    <p className="text-sm mt-0.5">{c.content}</p>
                  </div>
                </div>
              ))}

              <div className="flex gap-2 pt-1">
                <Textarea
                  placeholder="Add a comment…"
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleComment() } }}
                  className="text-sm min-h-[72px] resize-none"
                />
                <Button size="icon" onClick={handleComment} disabled={submitting || !newComment.trim()} className="shrink-0 self-end">
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Activity */}
            <div className="space-y-2 pb-4">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Activity</label>
              {activity.length === 0 && <p className="text-xs text-muted-foreground">No activity yet.</p>}
              {activity.map(a => (
                <div key={a.id} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/50 mt-1.5 shrink-0" />
                  <div>
                    <span className="capitalize">{a.action.replace('_', ' ')}</span>
                    {a.old_value && a.new_value && (
                      <span> · <span className="line-through">{a.old_value}</span> → <span className="text-foreground">{a.new_value}</span></span>
                    )}
                    {!a.old_value && a.new_value && <span> · <span className="text-foreground">{a.new_value}</span></span>}
                    <span className="ml-1.5">{format(new Date(a.created_at), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}
