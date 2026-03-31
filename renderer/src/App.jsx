import React, { useState, useCallback, useMemo } from 'react'
import Sidebar from './components/Sidebar'
import TabBar from './components/TabBar'
import SidePanel from './components/SidePanel'
import GraphView from './components/GraphView'
import BrowserView from './components/BrowserView'

let tabCounter = 0
function createTab(url = '', title = 'New Tab') {
  tabCounter++
  return {
    id: `tab-${tabCounter}`,
    url,
    title,
    timestamp: Date.now(),
  }
}

let nodeCounter = 0
function createGraphNodeId() {
  nodeCounter++
  return `node-${Date.now()}-${nodeCounter}`
}

function ensureProtocol(url) {
  if (!url) return ''
  url = url.trim()
  if (!/^https?:\/\//i.test(url)) {
    if (url.includes('.')) return 'https://' + url
    return `https://www.google.com/search?q=${encodeURIComponent(url)}`
  }
  return url
}

const INITIAL_TAB = createTab()

export default function App() {
  // Tab management
  const [tabs, setTabs] = useState([INITIAL_TAB])
  const [activeTabId, setActiveTabId] = useState(INITIAL_TAB.id)

  // Graph state (across all tabs)
  const [graphNodes, setGraphNodes] = useState([
    { id: INITIAL_TAB.id, url: '', title: 'Start', timestamp: Date.now() },
  ])
  const [graphEdges, setGraphEdges] = useState([])

  // Track which graph node the current tab is "at" (for edge creation on navigation)
  const [tabNodeMap, setTabNodeMap] = useState({ [INITIAL_TAB.id]: INITIAL_TAB.id })

  // UI state
  const [sidePanel, setSidePanel] = useState(null)
  const [isMaximized, setIsMaximized] = useState(false)

  React.useEffect(() => {
    window.electronAPI?.onWindowStateChanged?.((maximized) => {
      setIsMaximized(maximized)
    })
  }, [])

  const activeTab = useMemo(
    () => tabs.find((t) => t.id === activeTabId) || tabs[0],
    [tabs, activeTabId]
  )

  // ─── Tab Operations ──────────────────────────────────
  const addTab = useCallback((url = '', title = 'New Tab') => {
    const newTab = createTab(url, title)
    setTabs((prev) => [...prev, newTab])
    setActiveTabId(newTab.id)

    // Add as root node in graph
    const nodeId = createGraphNodeId()
    setGraphNodes((prev) => [
      ...prev,
      { id: nodeId, url, title: title || 'New Tab', timestamp: Date.now() },
    ])
    setTabNodeMap((prev) => ({ ...prev, [newTab.id]: nodeId }))

    return newTab.id
  }, [])

  const selectTab = useCallback((tabId) => {
    setActiveTabId(tabId)
  }, [])

  const closeTab = useCallback((tabId) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex((t) => t.id === tabId)
      const next = prev.filter((t) => t.id !== tabId)
      if (tabId === activeTabId) {
        const newActive = next[Math.min(idx, next.length - 1)]
        setActiveTabId(newActive.id)
      }
      return next
    })
  }, [activeTabId])

  // ─── Navigation ──────────────────────────────────────
  const navigate = useCallback((url) => {
    const fullUrl = ensureProtocol(url)
    if (!fullUrl) return

    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, url: fullUrl, title: fullUrl } : t
      )
    )

    // Create a graph node and edge from current position
    const nodeId = createGraphNodeId()
    const parentNodeId = tabNodeMap[activeTabId] || activeTabId
    setGraphNodes((prev) => [
      ...prev,
      { id: nodeId, url: fullUrl, title: fullUrl, timestamp: Date.now() },
    ])
    setGraphEdges((prev) => [
      ...prev,
      { id: `edge-${parentNodeId}-${nodeId}`, source: parentNodeId, target: nodeId },
    ])
    // Update the tab's current position in the graph
    setTabNodeMap((prev) => ({ ...prev, [activeTabId]: nodeId }))
  }, [activeTabId, tabNodeMap])

  const updateTabTitle = useCallback((tabId, title) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, title } : t))
    )
    // Update the corresponding graph node
    setGraphNodes((prev) => {
      const nodeId = tabNodeMap[tabId]
      if (!nodeId) return prev
      return prev.map((n) => (n.id === nodeId ? { ...n, title } : n))
    })
  }, [tabNodeMap])

  const updateTabUrl = useCallback((tabId, url) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === tabId ? { ...t, url } : t))
    )
  }, [])

  const goHome = useCallback(() => {
    setTabs((prev) =>
      prev.map((t) =>
        t.id === activeTabId ? { ...t, url: '', title: 'New Tab' } : t
      )
    )
  }, [activeTabId])

  // ─── Graph Node Click → Navigate to Website ─────────
  const selectGraphNode = useCallback((nodeId) => {
    const node = graphNodes.find((n) => n.id === nodeId)
    if (!node) return

    if (node.url) {
      // Navigate the current tab to this URL
      setTabs((prev) =>
        prev.map((t) =>
          t.id === activeTabId ? { ...t, url: node.url, title: node.title } : t
        )
      )
      // Update the tab's graph position to this node
      setTabNodeMap((prev) => ({ ...prev, [activeTabId]: nodeId }))
    }
  }, [graphNodes, activeTabId])

  // ─── Manual Graph Operations ─────────────────────────
  const addGraphNode = useCallback((url = '', title = '') => {
    const fullUrl = url ? ensureProtocol(url) : ''
    const nodeId = createGraphNodeId()
    const hostname = fullUrl ? (() => {
      try { return new URL(fullUrl).hostname.replace('www.', '') } catch { return fullUrl }
    })() : ''

    setGraphNodes((prev) => [
      ...prev,
      {
        id: nodeId,
        url: fullUrl,
        title: title || hostname || 'Untitled',
        timestamp: Date.now(),
      },
    ])
    return nodeId
  }, [])

  const addGraphEdge = useCallback((sourceId, targetId) => {
    // Don't add duplicate edges
    const exists = graphEdges.some(
      (e) => (e.source === sourceId && e.target === targetId) ||
             (e.source === targetId && e.target === sourceId)
    )
    if (exists || sourceId === targetId) return

    setGraphEdges((prev) => [
      ...prev,
      { id: `edge-${sourceId}-${targetId}`, source: sourceId, target: targetId },
    ])
  }, [graphEdges])

  const removeGraphNode = useCallback((nodeId) => {
    setGraphNodes((prev) => prev.filter((n) => n.id !== nodeId))
    setGraphEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId))
  }, [])

  // ─── Side Panel Content ──────────────────────────────
  const renderSidePanelContent = () => {
    if (sidePanel === 'graph') {
      return (
        <GraphView
          nodes={graphNodes}
          edges={graphEdges}
          activeNodeId={tabNodeMap[activeTabId] || activeTabId}
          onSelectNode={selectGraphNode}
          onAddNode={addGraphNode}
          onAddEdge={addGraphEdge}
          onRemoveNode={removeGraphNode}
        />
      )
    }
    if (sidePanel === 'tabs') {
      return (
        <div className="vertical-tabs">
          {tabs.map((tab) => {
            const hostname = tab.url ? (() => {
              try { return new URL(tab.url).hostname.replace('www.', '') } catch { return '' }
            })() : ''
            const favicon = hostname
              ? `https://www.google.com/s2/favicons?domain=${hostname}&sz=32`
              : null

            return (
              <button
                key={tab.id}
                className={`vertical-tab ${tab.id === activeTabId ? 'vertical-tab--active' : ''}`}
                onClick={() => selectTab(tab.id)}
              >
                <span className="vertical-tab__favicon">
                  {favicon ? (
                    <img src={favicon} alt="" width={16} height={16}
                      onError={(e) => { e.target.style.display = 'none' }} />
                  ) : (
                    <span>◉</span>
                  )}
                </span>
                <div className="vertical-tab__info">
                  <span className="vertical-tab__title">
                    {tab.title || 'New Tab'}
                  </span>
                  {hostname && (
                    <span className="vertical-tab__url">{hostname}</span>
                  )}
                </div>
                {tabs.length > 1 && (
                  <span
                    className="vertical-tab__close"
                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id) }}
                  >✕</span>
                )}
              </button>
            )
          })}
          <button className="vertical-tab vertical-tab--new" onClick={() => addTab()}>
            <span>+</span>
            <span>New Tab</span>
          </button>
        </div>
      )
    }
    return null
  }

  const sidePanelTitle = sidePanel === 'graph'
    ? `Graph · ${graphNodes.length} nodes`
    : sidePanel === 'tabs'
    ? `Tabs · ${tabs.length}`
    : ''

  return (
    <div className="app">
      {/* Title Bar */}
      <div className="titlebar">
        <div className="titlebar__drag" />
        <div className="titlebar__brand">
          <span className="titlebar__logo">⊛</span>
          <span className="titlebar__name">Non-Linear</span>
        </div>
        <div className="titlebar__spacer" />
        <div className="titlebar__controls">
          <button className="titlebar__btn" onClick={() => window.electronAPI?.minimize()} title="Minimize">
            <svg width="10" height="1" viewBox="0 0 10 1"><rect width="10" height="1" fill="currentColor"/></svg>
          </button>
          <button className="titlebar__btn" onClick={() => window.electronAPI?.maximize()} title={isMaximized ? 'Restore' : 'Maximize'}>
            {isMaximized ? (
              <svg width="10" height="10" viewBox="0 0 10 10"><path d="M2 3h5v5H2V3z" stroke="currentColor" fill="none" strokeWidth="1"/><path d="M3 3V1h5v5H7" stroke="currentColor" fill="none" strokeWidth="1"/></svg>
            ) : (
              <svg width="10" height="10" viewBox="0 0 10 10"><rect x="1" y="1" width="8" height="8" stroke="currentColor" fill="none" strokeWidth="1.2"/></svg>
            )}
          </button>
          <button className="titlebar__btn titlebar__btn--close" onClick={() => window.electronAPI?.close()} title="Close">
            <svg width="10" height="10" viewBox="0 0 10 10"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <TabBar
        tabs={tabs}
        activeTabId={activeTabId}
        onSelectTab={selectTab}
        onCloseTab={closeTab}
        onNewTab={() => addTab()}
      />

      {/* Main Content Area */}
      <div className="main">
        {/* Sidebar */}
        <Sidebar
          activePanel={sidePanel}
          onPanelChange={setSidePanel}
          onNewTab={() => addTab()}
        />

        {/* Side Panel */}
        <SidePanel
          isOpen={!!sidePanel}
          panelType={sidePanel}
          onClose={() => setSidePanel(null)}
          title={sidePanelTitle}
        >
          {renderSidePanelContent()}
        </SidePanel>

        {/* Browser */}
        <BrowserView
          activeTab={activeTab}
          onNavigate={navigate}
          onTitleChange={updateTabTitle}
          onUrlChange={updateTabUrl}
          onNewTab={() => addTab()}
          onGoHome={goHome}
        />
      </div>

      {/* Status Bar */}
      <div className="statusbar">
        <div className="statusbar__left">
          <span className="statusbar__dot" />
          <span>{activeTab?.url ? getHostname(activeTab.url) || 'Loading...' : 'Ready'}</span>
        </div>
        <div className="statusbar__right">
          <span>{tabs.length} tab{tabs.length !== 1 ? 's' : ''}</span>
          <span>·</span>
          <span>{graphNodes.length} nodes</span>
          <span>·</span>
          <span>{graphEdges.length} edges</span>
        </div>
      </div>
    </div>
  )
}

function getHostname(url) {
  try { return new URL(url).hostname.replace('www.', '') } catch { return '' }
}
