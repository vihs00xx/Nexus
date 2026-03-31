import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react'
import {
  forceSimulation,
  forceLink,
  forceManyBody,
  forceCenter,
  forceCollide,
  forceX,
  forceY,
} from 'd3-force'

export default function GraphView({
  nodes: rawNodes,
  edges: rawEdges,
  activeNodeId,
  onSelectNode,
  onAddNode,
  onAddEdge,
  onRemoveNode,
}) {
  const containerRef = useRef(null)
  const canvasRef = useRef(null)
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 })
  const [simNodes, setSimNodes] = useState([])
  const [simLinks, setSimLinks] = useState([])
  const [hoveredNode, setHoveredNode] = useState(null)
  const [transform, setTransform] = useState({ x: 0, y: 0, k: 1 })
  const [dragNode, setDragNode] = useState(null)
  const dragStart = useRef(null)
  const isPanning = useRef(false)
  const panStart = useRef(null)
  const simRef = useRef(null)

  // Edge creation mode
  const [linkMode, setLinkMode] = useState(false)
  const [linkSource, setLinkSource] = useState(null)

  // Delete mode
  const [deleteMode, setDeleteMode] = useState(false)

  // Add node dialog
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [addNodeUrl, setAddNodeUrl] = useState('')
  const addInputRef = useRef(null)

  // Context menu
  const [contextMenu, setContextMenu] = useState(null)

  // Measure container
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      setDimensions({ width, height })
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Focus add input when dialog opens
  useEffect(() => {
    if (showAddDialog && addInputRef.current) {
      setTimeout(() => addInputRef.current?.focus(), 50)
    }
  }, [showAddDialog])

  // Run force simulation
  useEffect(() => {
    if (!dimensions.width || !dimensions.height) return

    const nodes = rawNodes.map((n) => ({
      id: n.id,
      url: n.url,
      title: n.title,
      x: undefined,
      y: undefined,
    }))

    const links = rawEdges.map((e) => ({
      source: e.source,
      target: e.target,
    }))

    // Reuse previous positions
    const prevPositions = {}
    simNodes.forEach((n) => {
      prevPositions[n.id] = { x: n.x, y: n.y, vx: n.vx || 0, vy: n.vy || 0 }
    })
    nodes.forEach((n) => {
      if (prevPositions[n.id]) {
        n.x = prevPositions[n.id].x
        n.y = prevPositions[n.id].y
        n.vx = prevPositions[n.id].vx
        n.vy = prevPositions[n.id].vy
      }
    })

    const sim = forceSimulation(nodes)
      .force('link', forceLink(links).id((d) => d.id).distance(80).strength(0.4))
      .force('charge', forceManyBody().strength(-200).distanceMax(300))
      .force('center', forceCenter(0, 0).strength(0.05))
      .force('collision', forceCollide().radius(30))
      .force('x', forceX(0).strength(0.02))
      .force('y', forceY(0).strength(0.02))
      .alphaDecay(0.02)
      .velocityDecay(0.3)

    simRef.current = sim

    sim.on('tick', () => {
      setSimNodes([...sim.nodes()])
      setSimLinks(links.map((l) => ({
        source: { x: l.source.x, y: l.source.y, id: l.source.id },
        target: { x: l.target.x, y: l.target.y, id: l.target.id },
      })))
    })

    return () => sim.stop()
  }, [rawNodes.length, rawEdges.length, dimensions.width, dimensions.height])

  // Canvas rendering
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const dpr = window.devicePixelRatio || 1

    canvas.width = dimensions.width * dpr
    canvas.height = dimensions.height * dpr
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, dimensions.width, dimensions.height)

    ctx.save()
    ctx.translate(dimensions.width / 2 + transform.x, dimensions.height / 2 + transform.y)
    ctx.scale(transform.k, transform.k)

    // Draw edges
    simLinks.forEach((link) => {
      const isActiveEdge =
        link.source.id === activeNodeId || link.target.id === activeNodeId
      ctx.beginPath()
      ctx.moveTo(link.source.x, link.source.y)
      ctx.lineTo(link.target.x, link.target.y)
      ctx.strokeStyle = isActiveEdge ? 'rgba(88, 166, 255, 0.6)' : 'rgba(48, 54, 61, 0.7)'
      ctx.lineWidth = isActiveEdge ? 2 : 1
      ctx.stroke()
    })

    // Draw link-mode line from source to cursor
    if (linkMode && linkSource) {
      const sourceNode = simNodes.find((n) => n.id === linkSource)
      if (sourceNode && hoveredNode && hoveredNode !== linkSource) {
        const targetNode = simNodes.find((n) => n.id === hoveredNode)
        if (targetNode) {
          ctx.beginPath()
          ctx.moveTo(sourceNode.x, sourceNode.y)
          ctx.lineTo(targetNode.x, targetNode.y)
          ctx.strokeStyle = 'rgba(163, 113, 247, 0.6)'
          ctx.lineWidth = 2
          ctx.setLineDash([4, 4])
          ctx.stroke()
          ctx.setLineDash([])
        }
      }
    }

    // Draw nodes
    simNodes.forEach((node) => {
      const isActive = node.id === activeNodeId
      const isHovered = node.id === hoveredNode
      const isLinkSource = node.id === linkSource
      const hasUrl = !!node.url
      const baseRadius = isActive ? 8 : hasUrl ? 6 : 4
      const radius = isHovered ? baseRadius + 2 : baseRadius

      // Glow for active node
      if (isActive) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius + 10, 0, Math.PI * 2)
        const gradient = ctx.createRadialGradient(
          node.x, node.y, radius,
          node.x, node.y, radius + 10
        )
        gradient.addColorStop(0, 'rgba(88, 166, 255, 0.25)')
        gradient.addColorStop(1, 'rgba(88, 166, 255, 0)')
        ctx.fillStyle = gradient
        ctx.fill()
      }

      // Link source glow
      if (isLinkSource) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, radius + 8, 0, Math.PI * 2)
        const gradient = ctx.createRadialGradient(
          node.x, node.y, radius,
          node.x, node.y, radius + 8
        )
        gradient.addColorStop(0, 'rgba(163, 113, 247, 0.3)')
        gradient.addColorStop(1, 'rgba(163, 113, 247, 0)')
        ctx.fillStyle = gradient
        ctx.fill()
      }

      // Node circle
      ctx.beginPath()
      ctx.arc(node.x, node.y, radius, 0, Math.PI * 2)

      if (isLinkSource) {
        ctx.fillStyle = '#a371f7'
      } else if (isActive) {
        ctx.fillStyle = '#58a6ff'
      } else if (isHovered) {
        ctx.fillStyle = '#8b949e'
      } else if (hasUrl) {
        ctx.fillStyle = '#6e7681'
      } else {
        ctx.fillStyle = '#484f58'
      }
      ctx.fill()

      // Border ring
      if (isActive || isHovered || isLinkSource) {
        ctx.strokeStyle = isLinkSource ? '#a371f7' : isActive ? '#58a6ff' : '#8b949e'
        ctx.lineWidth = 1.5
        ctx.stroke()
      }

      // Label - show for active, hovered, or nodes with URLs
      if (isActive || isHovered) {
        const label = node.title || node.url || 'Untitled'
        const displayLabel = label.length > 35 ? label.slice(0, 35) + '…' : label
        ctx.font = '500 10px Inter, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'bottom'

        const textWidth = ctx.measureText(displayLabel).width
        const padding = 6
        const labelY = node.y - radius - 6

        // Background pill
        ctx.fillStyle = 'rgba(22, 27, 34, 0.92)'
        ctx.beginPath()
        ctx.roundRect(
          node.x - textWidth / 2 - padding,
          labelY - 13,
          textWidth + padding * 2,
          17,
          4
        )
        ctx.fill()

        // Border
        ctx.strokeStyle = 'rgba(48, 54, 61, 0.8)'
        ctx.lineWidth = 0.5
        ctx.stroke()

        ctx.fillStyle = isActive ? '#58a6ff' : '#e6edf3'
        ctx.fillText(displayLabel, node.x, labelY)

        // Show URL hint if different from title
        if (node.url && node.title !== node.url) {
          let hostname = ''
          try { hostname = new URL(node.url).hostname.replace('www.', '') } catch {}
          if (hostname) {
            ctx.font = '400 8px Inter, sans-serif'
            ctx.fillStyle = '#6e7681'
            ctx.fillText(hostname, node.x, labelY + 12)
          }
        }
      }
    })

    ctx.restore()

    // Draw link mode indicator
    if (linkMode) {
      ctx.fillStyle = 'rgba(163, 113, 247, 0.15)'
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)
    }
    // Draw delete mode indicator
    if (deleteMode) {
      ctx.fillStyle = 'rgba(248, 81, 73, 0.08)'
      ctx.fillRect(0, 0, dimensions.width, dimensions.height)
    }
  }, [simNodes, simLinks, dimensions, transform, activeNodeId, hoveredNode, linkMode, linkSource, deleteMode])

  // Hit test
  const hitTest = useCallback((clientX, clientY) => {
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return null
    const mx = (clientX - rect.left - dimensions.width / 2 - transform.x) / transform.k
    const my = (clientY - rect.top - dimensions.height / 2 - transform.y) / transform.k

    for (let i = simNodes.length - 1; i >= 0; i--) {
      const node = simNodes[i]
      const dx = mx - node.x
      const dy = my - node.y
      const r = (node.id === activeNodeId ? 10 : 8) + 2 // slightly larger hit area
      if (dx * dx + dy * dy < r * r) return node
    }
    return null
  }, [simNodes, dimensions, transform, activeNodeId])

  // Mouse handlers
  const handleMouseDown = useCallback((e) => {
    if (e.button === 2) return // right click handled separately
    setContextMenu(null)

    const node = hitTest(e.clientX, e.clientY)

    if (deleteMode) {
      if (node) {
        onRemoveNode(node.id)
      } else {
        setDeleteMode(false)
      }
      return
    }

    if (linkMode) {
      if (node) {
        if (!linkSource) {
          setLinkSource(node.id)
        } else if (node.id !== linkSource) {
          onAddEdge(linkSource, node.id)
          setLinkSource(null)
          setLinkMode(false)
        }
      } else {
        setLinkMode(false)
        setLinkSource(null)
      }
      return
    }

    if (node) {
      setDragNode(node.id)
      dragStart.current = { x: e.clientX, y: e.clientY }
      const simNode = simRef.current?.nodes().find((n) => n.id === node.id)
      if (simNode) {
        simNode.fx = simNode.x
        simNode.fy = simNode.y
      }
      simRef.current?.alphaTarget(0.1).restart()
    } else {
      isPanning.current = true
      panStart.current = { x: e.clientX - transform.x, y: e.clientY - transform.y }
    }
  }, [hitTest, transform, linkMode, linkSource, onAddEdge, deleteMode, onRemoveNode])

  const handleMouseMove = useCallback((e) => {
    if (dragNode) {
      const rect = canvasRef.current?.getBoundingClientRect()
      if (!rect) return
      const mx = (e.clientX - rect.left - dimensions.width / 2 - transform.x) / transform.k
      const my = (e.clientY - rect.top - dimensions.height / 2 - transform.y) / transform.k
      const simNode = simRef.current?.nodes().find((n) => n.id === dragNode)
      if (simNode) {
        simNode.fx = mx
        simNode.fy = my
      }
    } else if (isPanning.current && panStart.current) {
      setTransform((prev) => ({
        ...prev,
        x: e.clientX - panStart.current.x,
        y: e.clientY - panStart.current.y,
      }))
    } else {
      const node = hitTest(e.clientX, e.clientY)
      setHoveredNode(node?.id || null)
      if (canvasRef.current) {
        canvasRef.current.style.cursor = deleteMode
          ? (node ? 'not-allowed' : 'crosshair')
          : linkMode
          ? (node ? 'crosshair' : 'crosshair')
          : (node ? 'pointer' : 'grab')
      }
    }
  }, [dragNode, hitTest, dimensions, transform, linkMode, deleteMode])

  const handleMouseUp = useCallback((e) => {
    if (e.button === 2) return

    if (dragNode) {
      const movedDistance = dragStart.current
        ? Math.hypot(e.clientX - dragStart.current.x, e.clientY - dragStart.current.y)
        : 0

      // Click (not drag) → navigate to that node's page
      if (movedDistance < 5) {
        onSelectNode(dragNode)
      }

      const simNode = simRef.current?.nodes().find((n) => n.id === dragNode)
      if (simNode) {
        simNode.fx = null
        simNode.fy = null
      }
      simRef.current?.alphaTarget(0)
      setDragNode(null)
      dragStart.current = null
    }
    isPanning.current = false
    panStart.current = null
  }, [dragNode, onSelectNode])

  const handleWheel = useCallback((e) => {
    e.preventDefault()
    const scaleFactor = e.deltaY > 0 ? 0.93 : 1.07
    setTransform((prev) => {
      const newK = Math.max(0.1, Math.min(4, prev.k * scaleFactor))
      return { ...prev, k: newK }
    })
  }, [])

  // Context menu
  const handleContextMenu = useCallback((e) => {
    e.preventDefault()
    const node = hitTest(e.clientX, e.clientY)
    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    setContextMenu({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      nodeId: node?.id || null,
      nodeUrl: node?.url || null,
      nodeTitle: node?.title || null,
    })
  }, [hitTest])

  // Add node dialog
  const handleAddNode = useCallback((e) => {
    e.preventDefault()
    if (addNodeUrl.trim()) {
      onAddNode(addNodeUrl.trim())
      setAddNodeUrl('')
      setShowAddDialog(false)
    }
  }, [addNodeUrl, onAddNode])

  const resetView = useCallback(() => {
    setTransform({ x: 0, y: 0, k: 1 })
  }, [])

  return (
    <div className="graph-canvas" ref={containerRef}>
      <canvas
        ref={canvasRef}
        style={{ width: dimensions.width, height: dimensions.height }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={(e) => { handleMouseUp(e); setHoveredNode(null) }}
        onWheel={handleWheel}
        onContextMenu={handleContextMenu}
      />

      {/* Graph toolbar */}
      <div className="graph-toolbar">
        <button
          className="graph-toolbar__btn"
          onClick={() => setShowAddDialog(true)}
          title="Add node (URL or search)"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M7 4.5v5M4.5 7h5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span>Add Node</span>
        </button>
        <button
          className={`graph-toolbar__btn ${linkMode ? 'graph-toolbar__btn--active' : ''}`}
          onClick={() => { setLinkMode(!linkMode); setLinkSource(null) }}
          title={linkMode ? 'Cancel linking' : 'Link two nodes'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="3.5" cy="10.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="10.5" cy="3.5" r="2" stroke="currentColor" strokeWidth="1.2"/>
            <path d="M5 9l4-4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
          </svg>
          <span>{linkMode ? (linkSource ? 'Click target…' : 'Click source…') : 'Link'}</span>
        </button>
        <button
          className={`graph-toolbar__btn ${deleteMode ? 'graph-toolbar__btn--danger' : ''}`}
          onClick={() => { setDeleteMode(!deleteMode); setLinkMode(false); setLinkSource(null) }}
          title={deleteMode ? 'Cancel delete mode' : 'Delete a node'}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 4h8M5.5 4V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1M4.5 4v7a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>{deleteMode ? 'Click node…' : 'Delete'}</span>
        </button>
      </div>

      {/* Zoom controls */}
      <div className="graph-controls">
        <button className="graph-controls__btn" onClick={resetView} title="Reset view">⟲</button>
        <button className="graph-controls__btn" onClick={() => setTransform((p) => ({ ...p, k: Math.min(4, p.k * 1.2) }))} title="Zoom in">+</button>
        <button className="graph-controls__btn" onClick={() => setTransform((p) => ({ ...p, k: Math.max(0.1, p.k * 0.8) }))} title="Zoom out">−</button>
      </div>

      {/* Stats */}
      <div className="graph-stats">
        <span className="graph-stats__item">
          <span className="graph-stats__dot graph-stats__dot--nodes" />
          {rawNodes.length}
        </span>
        <span className="graph-stats__item">
          <span className="graph-stats__dot graph-stats__dot--edges" />
          {rawEdges.length}
        </span>
      </div>

      {/* Add Node Dialog */}
      {showAddDialog && (
        <div className="graph-dialog" onClick={(e) => { if (e.target === e.currentTarget) setShowAddDialog(false) }}>
          <form className="graph-dialog__box" onSubmit={handleAddNode}>
            <div className="graph-dialog__title">Add Node</div>
            <input
              ref={addInputRef}
              className="graph-dialog__input"
              type="text"
              placeholder="Enter URL or search query"
              value={addNodeUrl}
              onChange={(e) => setAddNodeUrl(e.target.value)}
            />
            <div className="graph-dialog__actions">
              <button type="button" className="graph-dialog__btn" onClick={() => setShowAddDialog(false)}>Cancel</button>
              <button type="submit" className="graph-dialog__btn graph-dialog__btn--primary">Add</button>
            </div>
          </form>
        </div>
      )}

      {/* Context Menu */}
      {contextMenu && (
        <div
          className="graph-context"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onMouseLeave={() => setContextMenu(null)}
        >
          {contextMenu.nodeId ? (
            <>
              <div className="graph-context__header">
                {contextMenu.nodeTitle || 'Untitled'}
              </div>
              {contextMenu.nodeUrl && (
                <button className="graph-context__item" onClick={() => {
                  onSelectNode(contextMenu.nodeId)
                  setContextMenu(null)
                }}>
                  🌐 Open in browser
                </button>
              )}
              <button className="graph-context__item" onClick={() => {
                setLinkMode(true)
                setLinkSource(contextMenu.nodeId)
                setContextMenu(null)
              }}>
                🔗 Link from this node
              </button>
              <button className="graph-context__item graph-context__item--danger" onClick={() => {
                onRemoveNode(contextMenu.nodeId)
                setContextMenu(null)
              }}>
                🗑 Remove node
              </button>
            </>
          ) : (
            <>
              <button className="graph-context__item" onClick={() => {
                setShowAddDialog(true)
                setContextMenu(null)
              }}>
                ➕ Add node here
              </button>
              <button className="graph-context__item" onClick={() => {
                setLinkMode(!linkMode)
                setLinkSource(null)
                setContextMenu(null)
              }}>
                🔗 {linkMode ? 'Cancel linking' : 'Link mode'}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
