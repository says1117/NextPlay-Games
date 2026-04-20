import { useState } from 'react'
import { toast } from 'sonner'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { createTask } from '@/lib/api'
import type { Task } from '@/types'

interface NewTaskDialogProps {
  open: boolean
  onClose: () => void
  onCreated: (task: Task) => void
}

export function NewTaskDialog({ open, onClose, onCreated }: NewTaskDialogProps) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [priority, setPriority] = useState('medium')
  const [status, setStatus] = useState('todo')
  const [dueDate, setDueDate] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!title.trim()) return
    setLoading(true)
    try {
      const task = await createTask({
        title: title.trim(),
        description: description || undefined,
        priority: priority as Task['priority'],
        status: status as Task['status'],
        due_date: dueDate || undefined,
      })
      onCreated(task)
      onClose()
      setTitle('')
      setDescription('')
      setPriority('medium')
      setStatus('todo')
      setDueDate('')
      toast.success('Task created')
    } catch {
      toast.error('Failed to create task')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New Task</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <Input
            placeholder="Task title"
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
            autoFocus
          />
          <Textarea
            placeholder="Description (optional)"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="resize-none min-h-[80px] text-sm"
          />
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select value={status} onValueChange={v => v && setStatus(v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todo">To Do</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="in_review">In Review</SelectItem>
                  <SelectItem value="done">Done</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Priority</label>
              <Select value={priority} onValueChange={v => v && setPriority(v)}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Due Date</label>
            <Input
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              className="h-8 text-sm"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} size="sm">Cancel</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || loading} size="sm">
            {loading ? 'Creating...' : 'Create Task'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
