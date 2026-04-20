import { useAuth } from './providers/AuthProvider'
import { Board } from './components/Board/Board'
import { AppNav } from './components/AppNav'

function App() {
  const { loading, session } = useAuth()

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-7 w-7 animate-spin rounded-full border-[3px] border-muted border-t-foreground" />
          <p className="text-xs text-muted-foreground tracking-wide">Loading…</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <p className="text-sm text-muted-foreground">Authentication failed. Please refresh.</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: 'oklch(0.985 0.002 250)' }}>
      <AppNav />
      <div className="flex-1 overflow-hidden flex flex-col">
        <Board />
      </div>
    </div>
  )
}

export default App
