import { Component } from 'react'
import { STRINGS } from '../LangContext.jsx'
import Icon from './Icon.jsx'
import styles from './ErrorBoundary.module.css'

const LANG_KEY = 'stockranges_lang'

// Reads language straight from localStorage and the static STRINGS map,
// bypassing useLang()/LangProvider entirely — deliberately, since the
// whole point of an error boundary is to still work if something above
// it (up to and including the language context itself) is broken.
function strings() {
  const lang = localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'th'
  return STRINGS[lang]
}

// Catches a render/lifecycle crash anywhere in its subtree and shows a
// fallback instead of leaving it blank — React error boundaries only work
// as class components, no hook equivalent exists. Used two ways: once at
// the very top (main.jsx) so a crash anywhere doesn't blank the whole
// page, and once per watchlist/wallet card (`compact`) so a crash caused
// by one bad ticker's data doesn't take down every other card with it.
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
    this.retry = this.retry.bind(this)
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', this.props.label || '', error, info.componentStack)
  }

  retry() {
    this.setState({ error: null })
  }

  render() {
    if (!this.state.error) return this.props.children
    const s = strings()

    if (this.props.compact) {
      return (
        <div className={styles.card} data-error="true">
          <Icon name="alertTriangle" size={14} />
          <span>{s.errorBoundaryCardMessage}</span>
          <button type="button" className={styles.retryBtn} onClick={this.retry}>{s.retry}</button>
        </div>
      )
    }
    return (
      <div className={styles.page}>
        <Icon name="alertTriangle" size={36} className={styles.pageIcon} />
        <h2 className={styles.pageTitle}>{s.errorBoundaryTitle}</h2>
        <p className={styles.pageBody}>{s.errorBoundaryBody}</p>
        <button type="button" className={styles.reloadBtn} onClick={() => window.location.reload()}>{s.reloadPage}</button>
      </div>
    )
  }
}
