import React, { useState, useCallback } from 'react'

export default function SidePanel({ isOpen, panelType, onClose, children, title }) {
  const [width, setWidth] = useState(320)

  const handleResizeStart = useCallback((e) => {
    e.preventDefault()
    const startX = e.clientX
    const startWidth = width

    const onMouseMove = (moveEvent) => {
      const delta = moveEvent.clientX - startX
      const newWidth = Math.max(220, Math.min(600, startWidth + delta))
      setWidth(newWidth)
    }

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove)
      document.removeEventListener('mouseup', onMouseUp)
    }

    document.addEventListener('mousemove', onMouseMove)
    document.addEventListener('mouseup', onMouseUp)
  }, [width])

  return (
    <div
      className={`sidepanel ${isOpen ? 'sidepanel--open' : ''}`}
      style={isOpen ? { width } : undefined}
    >
      <div className="sidepanel__header">
        <span className="sidepanel__title">{title}</span>
        <button className="sidepanel__close" onClick={onClose} title="Close panel">
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1l-8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
      <div className="sidepanel__body">
        {children}
      </div>
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            right: -3,
            top: 0,
            width: 6,
            height: '100%',
            cursor: 'col-resize',
            zIndex: 20,
          }}
          onMouseDown={handleResizeStart}
        />
      )}
    </div>
  )
}
