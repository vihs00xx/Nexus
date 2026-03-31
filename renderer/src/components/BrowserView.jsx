import React, { useState, useRef, useEffect, useCallback } from 'react'

const QUICK_LINKS = [
  { label: 'Google', icon: '🔍', url: 'https://www.google.com' },
  { label: 'YouTube', icon: '▶', url: 'https://www.youtube.com' },
  { label: 'GitHub', icon: '⬡', url: 'https://github.com' },
  { label: 'Wikipedia', icon: '📖', url: 'https://www.wikipedia.org' },
  { label: 'Reddit', icon: '⊕', url: 'https://www.reddit.com' },
  { label: 'Hacker News', icon: '⬢', url: 'https://news.ycombinator.com' },
  { label: 'Stack Overflow', icon: '⊡', url: 'https://stackoverflow.com' },
  { label: 'Twitter / X', icon: '𝕏', url: 'https://x.com' },
]

function ensureProtocol(url) {
  if (!url) return ''
  url = url.trim()
  if (!/^https?:\/\//i.test(url)) {
    if (url.includes('.')) return 'https://' + url
    return `https://www.google.com/search?q=${encodeURIComponent(url)}`
  }
  return url
}

function getSecure(url) {
  try { return new URL(url).protocol === 'https:' } catch { return false }
}

function getHostname(url) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
}

export default function BrowserView({
  activeTab,
  onNavigate,
  onTitleChange,
  onUrlChange,
  onNewTab,
  onGoHome,
}) {
  const [urlInput, setUrlInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [canGoBack, setCanGoBack] = useState(false)
  const [canGoForward, setCanGoForward] = useState(false)
  const webviewRef = useRef(null)
  const isElectron = !!window.electronAPI?.isElectron

  const currentUrl = activeTab?.url || ''
  const isSecure = getSecure(currentUrl)
  const hostname = getHostname(currentUrl)

  useEffect(() => {
    setUrlInput(currentUrl)
  }, [currentUrl, activeTab?.id])

  useEffect(() => {
    const wv = webviewRef.current
    if (!wv || !activeTab?.url) return

    const handleStartLoading = () => setIsLoading(true)
    const handleStopLoading = () => {
      setIsLoading(false)
      setCanGoBack(wv.canGoBack())
      setCanGoForward(wv.canGoForward())
    }
    const handleTitleUpdate = (e) => {
      if (e.title && activeTab) onTitleChange(activeTab.id, e.title)
    }
    const handleNavigation = (e) => {
      if (e.url && activeTab) {
        setUrlInput(e.url)
        onUrlChange(activeTab.id, e.url)
      }
    }
    const handleNewWindow = (e) => {
      if (e.url) onNavigate(e.url)
    }

    wv.addEventListener('did-start-loading', handleStartLoading)
    wv.addEventListener('did-stop-loading', handleStopLoading)
    wv.addEventListener('page-title-updated', handleTitleUpdate)
    wv.addEventListener('did-navigate', handleNavigation)
    wv.addEventListener('did-navigate-in-page', handleNavigation)
    wv.addEventListener('new-window', handleNewWindow)

    return () => {
      wv.removeEventListener('did-start-loading', handleStartLoading)
      wv.removeEventListener('did-stop-loading', handleStopLoading)
      wv.removeEventListener('page-title-updated', handleTitleUpdate)
      wv.removeEventListener('did-navigate', handleNavigation)
      wv.removeEventListener('did-navigate-in-page', handleNavigation)
      wv.removeEventListener('new-window', handleNewWindow)
    }
  }, [activeTab?.id, activeTab?.url])

  const handleUrlSubmit = useCallback((e) => {
    e.preventDefault()
    const url = ensureProtocol(urlInput)
    if (url) onNavigate(url)
  }, [urlInput, onNavigate])

  const goBack = () => webviewRef.current?.goBack()
  const goForward = () => webviewRef.current?.goForward()
  const reload = () => {
    if (isLoading) webviewRef.current?.stop()
    else webviewRef.current?.reload()
  }

  const showWelcome = !activeTab?.url

  return (
    <div className="browser">
      {/* Floating Nav Bar */}
      <div className="navbar">
        <button className={`navbar__btn ${!canGoBack ? 'navbar__btn--disabled' : ''}`} onClick={goBack} title="Back">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button className={`navbar__btn ${!canGoForward ? 'navbar__btn--disabled' : ''}`} onClick={goForward} title="Forward">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M6 3L11 8l-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>
        <button className={`navbar__btn ${showWelcome ? 'navbar__btn--disabled' : ''}`} onClick={reload} title={isLoading ? 'Stop' : 'Reload'}>
          {isLoading ? (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M3 3l8 8M11 3l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M11.5 7A4.5 4.5 0 1 1 4 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><path d="M4 1v3h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
          )}
        </button>
        <button className="navbar__btn" onClick={onGoHome} title="Home">
          <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><path d="M7.5 1.5l-6 5v6.5h4.5V9.5h3v3.5h4.5V6.5l-6-5z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>
        </button>

        {/* Floating URL pill */}
        <form onSubmit={handleUrlSubmit} className="navbar__url">
          <span className="navbar__url-icon">
            {currentUrl ? (
              isSecure ? (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="2" y="5.5" width="8" height="5.5" rx="1" stroke="currentColor" strokeWidth="1.2"/><path d="M4 5.5V4a2 2 0 1 1 4 0v1.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="6" r="4.5" stroke="currentColor" strokeWidth="1.2"/></svg>
              )
            ) : (
              <svg width="13" height="13" viewBox="0 0 13 13" fill="none"><circle cx="5.5" cy="5.5" r="4" stroke="currentColor" strokeWidth="1.3"/><path d="M9 9l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            )}
          </span>
          <input
            className="navbar__url-input"
            type="text"
            placeholder="Search or enter address"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onFocus={(e) => e.target.select()}
          />
          {hostname && (
            <span className="navbar__url-badge">{hostname}</span>
          )}
        </form>
      </div>

      {/* Loading indicator */}
      {isLoading && <div className="loading-bar" />}

      {/* Content */}
      {showWelcome ? (
        <div className="welcome">
          <div className="welcome__hero">
            <div className="welcome__icon">⊛</div>
            <h1 className="welcome__title">Non-Linear Browser</h1>
            <p className="welcome__subtitle">
              Every page becomes a node. Every link becomes a connection.
            </p>
          </div>

          <form onSubmit={handleUrlSubmit} className="welcome__search">
            <span className="welcome__search-icon">
              <svg width="15" height="15" viewBox="0 0 15 15" fill="none"><circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.3"/><path d="M10 10l3.5 3.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
            </span>
            <input
              className="welcome__search-input"
              type="text"
              placeholder="Search the web or enter a URL"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              autoFocus
            />
          </form>

          <div className="welcome__grid">
            {QUICK_LINKS.map((link) => (
              <button
                key={link.url}
                className="welcome__card"
                onClick={() => onNavigate(link.url)}
              >
                <span className="welcome__card-icon">{link.icon}</span>
                <span className="welcome__card-name">{link.label}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="browser__viewport">
          {isElectron ? (
            <webview
              ref={webviewRef}
              src={activeTab.url}
              style={{ width: '100%', height: '100%' }}
              allowpopups="true"
            />
          ) : (
            <iframe
              src={activeTab.url}
              style={{ width: '100%', height: '100%', border: 'none' }}
              sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-modals"
              referrerPolicy="no-referrer"
              title={activeTab.title || 'Browser'}
            />
          )}
        </div>
      )}
    </div>
  )
}
