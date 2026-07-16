import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'
import './registerPwaUpdate.js'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null } }
  static getDerivedStateFromError(error) { return { error } }
  componentDidCatch(error, info) { console.error('MaJon error boundary:', error, info) }
  render() {
    if (this.state.error) {
      return (
        <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'100dvh', padding:24, textAlign:'center', fontFamily:'system-ui,sans-serif' }}>
          <div style={{ fontSize:40, marginBottom:12 }}>😵</div>
          <h2 style={{ fontSize:18, fontWeight:600, marginBottom:8 }}>Something went wrong</h2>
          <p style={{ fontSize:14, opacity:0.6, marginBottom:24 }}>{String(this.state.error?.message || this.state.error)}</p>
          <button onClick={() => window.location.reload()} style={{ padding:'10px 24px', borderRadius:999, border:'none', background:'#1a1916', color:'#fff', fontSize:14, cursor:'pointer' }}>Reload</button>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>,
)
