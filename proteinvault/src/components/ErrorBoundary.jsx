import { Component } from 'react'

// Catches runtime errors anywhere below it in the tree and shows a real
// message instead of a blank page. This is a direct response to the
// blank-page incidents earlier in dev (those were a vite base-path
// misconfiguration, not a runtime error, but the failure mode looked
// identical to the user: white screen, no clue why) — this at least
// converts "silent blank page" into "visible error + reload option" for
// any future crash, wherever it comes from.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, info) {
    console.error('ProteinVault crashed:', error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="crash-screen">
          <div className="crash-card">
            <div className="crash-title">Something went wrong.</div>
            <p className="crash-body">
              The page hit an error and couldn't render. This has been logged to the console —
              reloading usually fixes it.
            </p>
            <button className="btn crash-reload" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
