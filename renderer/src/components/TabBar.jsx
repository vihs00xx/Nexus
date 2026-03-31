import React, { useRef, useEffect } from 'react'

export default function TabBar({ tabs, activeTabId, onSelectTab, onCloseTab, onNewTab }) {
  const tabsRef = useRef(null)

  useEffect(() => {
    const activeEl = tabsRef.current?.querySelector('.tabbar__tab--active')
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' })
    }
  }, [activeTabId])

  const getHostname = (url) => {
    if (!url) return ''
    try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
  }

  const getFaviconUrl = (url) => {
    const hostname = getHostname(url)
    if (!hostname) return null
    return `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
  }

  return (
    <div className="tabbar" ref={tabsRef}>
      {tabs.map((tab) => {
        const hostname = getHostname(tab.url)
        const favicon = getFaviconUrl(tab.url)
        const isActive = tab.id === activeTabId

        return (
          <button
            key={tab.id}
            className={`tabbar__tab ${isActive ? 'tabbar__tab--active' : ''}`}
            onClick={() => onSelectTab(tab.id)}
            title={tab.url || 'New Tab'}
          >
            {favicon ? (
              <img
                className="tabbar__tab-favicon"
                src={favicon}
                alt=""
                width={14}
                height={14}
                onError={(e) => { e.target.style.display = 'none' }}
              />
            ) : (
              <span className="tabbar__tab-dot" />
            )}
            <span className="tabbar__tab-title">
              {tab.title || hostname || 'New Tab'}
            </span>
            {tabs.length > 1 && (
              <span
                className="tabbar__tab-close"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(tab.id)
                }}
                title="Close tab"
              >
                ✕
              </span>
            )}
          </button>
        )
      })}
      <button className="tabbar__new" onClick={onNewTab} title="New Tab">
        +
      </button>
    </div>
  )
}
