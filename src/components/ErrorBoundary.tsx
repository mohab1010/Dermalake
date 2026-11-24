import { Component, type ErrorInfo, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
}

// Last-resort safety net: catches render crashes anywhere in the tree so a
// bug in one page shows a recoverable screen instead of a blank white page.
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-cream px-4 text-center">
          <p className="font-display text-2xl text-lake-950">Something went wrong</p>
          <p className="max-w-sm text-sm text-stone-soft">
            Please refresh the page. If the problem continues, try again in a moment.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="cursor-pointer rounded-full bg-lake-900 px-6 py-3 text-sm font-medium text-cream hover:bg-lake-700"
          >
            Reload
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
