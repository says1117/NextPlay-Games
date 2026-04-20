import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { Trash2, Send, X, Tag, UserPlus } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
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

  useEffect(() => {
    if (task) {
      setLocalTask(task)
      loadData(task.id)
    }
  }, [task])

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

  async function handleStatusChange(status: string) {
    if (!localTask) return
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

  async function handlePriorityChange(priority: string) {
    if (!localTask) return
    try {
      const updated = await updateTask(localTask.id, { priority: priority as Task['priority'] })
      setLocalTask(updated)
      onTaskUpdated(updated)
    } catch {
      toast.error('Failed to update priority')
    }
  }

  async function handleAddAssignee(memberId: string) {
    if (!localTask) return
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

  async function handleAddLabel(labelId: string) {
    if (!localTask) return
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
      <SheetContent className="w-full sm:max-w-lg flex flex-col p-0 gap-0">
        <SheetHeader className="px-6 py-4 border-b">
          <div className="flex items-start justify-between gap-2">
            <SheetTitle className="text-base font-semibold leading-snug text-left">
              {localTask.title}
            </SheetTitle>
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 text-muted-foreground" />
            </Button>
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

            {/* Due Date */}
            {localTask.due_date && (
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</label>
                <p className="text-sm text-foreground">{format(parseISO(localTask.due_date), 'MMMM d, yyyy')}</p>
              </div>
            )}

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
                  placeholder="Add a comment..."
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
