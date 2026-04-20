import { useAuth } from '@/providers/AuthProvider'

export function AppNav() {
  const { session } = useAuth()
  const initials = session?.user.id.slice(0, 2).toUpperCase() ?? 'G'

  return (
    <header className="h-11 shrink-0 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-background z-10">
      <div className="flex items-center gap-2.5">
        {/* Logo mark */}
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-foreground">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="1" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.9"/>
            <rect x="8" y="1" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
            <rect x="1" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.5"/>
            <rect x="8" y="8" width="5" height="5" rx="1" fill="white" fillOpacity="0.25"/>
          </svg>
        </div>
        <span className="text-sm font-semibold tracking-tight text-foreground">NextPlay</span>
        <span className="hidden sm:block text-muted-foreground/40 text-xs">|</span>
        <span className="hidden sm:block text-xs text-muted-foreground">Board</span>
      </div>

      {/* User indicator */}
      <div className="flex items-center gap-2">
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground select-none">
          {initials}
        </div>
        <span className="hidden sm:block text-[11px] text-muted-foreground">Guest</span>
      </div>
    </header>
  )
}
