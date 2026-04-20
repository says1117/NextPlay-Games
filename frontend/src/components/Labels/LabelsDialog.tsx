import { useState } from 'react'
import { toast } from 'sonner'
import { Tag, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { createLabel, deleteLabel } from '@/lib/api'
import type { Label } from '@/types'

interface LabelsDialogProps {
  open: boolean
  onClose: () => void
  labels: Label[]
  onLabelsChange: (labels: Label[]) => void
}

const PRESET_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#ef4444',
  '#f97316', '#eab308', '#22c55e', '#14b8a6',
  '#3b82f6', '#64748b',
]

export function LabelsDialog({ open, onClose, labels, onLabelsChange }: LabelsDialogProps) {
  const [name, setName] = useState('')
  const [color, setColor] = useState('#6366f1')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const label = await createLabel({ name: name.trim(), color })
      onLabelsChange([...labels, label])
      setName('')
      toast.success('Label created')
    } catch {
      toast.error('Failed to create label')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteLabel(id)
      onLabelsChange(labels.filter(l => l.id !== id))
      toast.success('Label deleted')
    } catch {
      toast.error('Failed to delete label')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-4 w-4" />
            Labels
          </DialogTitle>
        </DialogHeader>

        {/* Create form */}
        <div className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Label name (e.g. Bug, Feature)"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="flex-1"
            />
            <Button size="icon" onClick={handleCreate} disabled={!name.trim() || loading}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">Color:</span>
            {PRESET_COLORS.map(c => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`h-5 w-5 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-offset-1 ring-border' : 'hover:scale-110'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        <Separator />

        {/* Labels list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {labels.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No labels yet. Create one above.
            </p>
          )}
          {labels.map(l => (
            <div key={l.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: l.color }} />
              <span
                className="flex-1 text-sm font-medium rounded-full px-2 py-0.5 w-fit"
                style={{ backgroundColor: l.color + '22', color: l.color }}
              >
                {l.name}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(l.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
