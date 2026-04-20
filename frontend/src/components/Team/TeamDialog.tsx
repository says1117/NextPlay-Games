import { useState } from 'react'
import { toast } from 'sonner'
import { Users, Plus, Trash2 } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { createMember, deleteMember } from '@/lib/api'
import type { Member } from '@/types'

interface TeamDialogProps {
  open: boolean
  onClose: () => void
  members: Member[]
  onMembersChange: (members: Member[]) => void
}

export function TeamDialog({ open, onClose, members, onMembersChange }: TeamDialogProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleCreate() {
    if (!name.trim()) return
    setLoading(true)
    try {
      const member = await createMember({ name: name.trim(), email: email.trim() || undefined })
      onMembersChange([...members, member])
      setName('')
      setEmail('')
      toast.success('Team member added')
    } catch {
      toast.error('Failed to add team member')
    } finally {
      setLoading(false)
    }
  }

  async function handleDelete(id: string) {
    try {
      await deleteMember(id)
      onMembersChange(members.filter(m => m.id !== id))
      toast.success('Team member removed')
    } catch {
      toast.error('Failed to remove team member')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members
          </DialogTitle>
        </DialogHeader>

        {/* Add member form */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Input
              placeholder="Name"
              value={name}
              onChange={e => setName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="flex-1"
            />
            <Input
              placeholder="Email (optional)"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              className="flex-1"
            />
            <Button size="icon" onClick={handleCreate} disabled={!name.trim() || loading}>
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Separator />

        {/* Members list */}
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {members.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              No team members yet. Add one above.
            </p>
          )}
          {members.map(m => (
            <div key={m.id} className="flex items-center gap-3 rounded-lg border px-3 py-2">
              <Avatar className="h-8 w-8 shrink-0">
                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                  {m.name.slice(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{m.name}</p>
                {m.email && <p className="text-xs text-muted-foreground truncate">{m.email}</p>}
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                onClick={() => handleDelete(m.id)}
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
