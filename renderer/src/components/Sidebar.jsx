import React from 'react'

const SIDEBAR_ITEMS = [
  { id: 'tabs', label: 'Tabs', icon: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/><rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.3"/></svg>
  )},
  { id: 'graph', label: 'Graph', icon: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="5" cy="13" r="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="13" cy="5" r="2" stroke="currentColor" strokeWidth="1.3"/><circle cx="13" cy="14" r="1.5" stroke="currentColor" strokeWidth="1.3"/><path d="M6.5 11.5L11.5 6.5M7 13h4.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  )},
  { id: 'home', label: 'New Tab', icon: (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.3"/><path d="M9 6v6M6 9h6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
  )},
]

export default function Sidebar({ activePanel, onPanelChange, onNewTab }) {
  const handleClick = (item) => {
    if (item.id === 'home') {
      onNewTab()
    } else {
      onPanelChange(activePanel === item.id ? null : item.id)
    }
  }

  return (
    <div className="sidebar">
      {SIDEBAR_ITEMS.map((item) => (
        <button
          key={item.id}
          className={`sidebar__btn ${activePanel === item.id ? 'sidebar__btn--active' : ''}`}
          onClick={() => handleClick(item)}
          title={item.label}
        >
          {item.icon}
        </button>
      ))}
      <div className="sidebar__spacer" />
      <button className="sidebar__btn" title="Settings">
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" strokeWidth="1.3"/><path d="M9 2v2M9 14v2M2 9h2M14 9h2M4.2 4.2l1.4 1.4M12.4 12.4l1.4 1.4M4.2 13.8l1.4-1.4M12.4 5.6l1.4-1.4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
      </button>
    </div>
  )
}
