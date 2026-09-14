import { useCallback, useEffect, useRef, useState, type PointerEvent, type KeyboardEvent } from 'react'
import { clamp } from '../../lib/layout'

/**
 * `'band'` is the bar that separates two panes. `'corner'` is a small grip for
 * a box that grows in place, which the caller pins inside a `position:
 * relative` ancestor.
 */
export type SplitHandleAppearance = 'band' | 'corner'

export interface SplitHandleProps {
  /**
   * `'x'` for a vertical bar that splits left from right, `'y'` for a
   * horizontal bar. Determines the cursor, grip direction and drag axis.
   */
  axis: 'x' | 'y'
  /**
   * Which footprint to render. Both drag identically and share the keyboard
   * and reset behaviour; only the styling and what the element occupies differ.
   */
  appearance?: SplitHandleAppearance
  /** Current split position, in the same absolute unit as `min`/`max`. */
  value: number
  min: number
  max: number
  /** Keyboard increment, in the same unit as `value`. */
  step: number
  /** Spoken name for screen readers, e.g. "Editor height". */
  label: string
  /**
   * Maps a pointer position to a new value, given the raw `clientX`/`clientY`.
   *
   * Deriving the value from the pointer's absolute position rather than
   * accumulating deltas keeps the split locked to the cursor: a dropped frame
   * costs nothing, whereas summing deltas would leave it permanently short.
   */
  fromPointer: (clientPos: number) => number
  onChange: (next: number) => void
  onReset: () => void
}

/**
 * A draggable pane splitter. Untyped about units -- the caller supplies the
 * value, bounds and pointer mapping -- so the same component drives both the
 * sidebar width and the editor/response split.
 */
export function SplitHandle({
  axis,
  appearance = 'band',
  value,
  min,
  max,
  step,
  label,
  fromPointer,
  onChange,
  onReset
}: SplitHandleProps): JSX.Element {
  const [dragging, setDragging] = useState(false)
  const frame = useRef<number | null>(null)
  const pending = useRef<number | null>(null)

  const apply = useCallback(
    (next: number) => {
      onChange(clamp(next, min, max))
    },
    [onChange, min, max]
  )

  /** Coalesces pointer moves to at most one update per frame. */
  const flush = useCallback(() => {
    frame.current = null
    if (pending.current === null) return
    apply(fromPointer(pending.current))
  }, [apply, fromPointer])

  const handlePointerDown = (event: PointerEvent<HTMLDivElement>): void => {
    // Without this the drag starts a text selection instead of a resize.
    event.preventDefault()
    pending.current = null
    // Capture keeps events coming even when the pointer outruns the 7px band,
    // including across the response preview's <iframe>, which would otherwise
    // swallow them and strand the drag.
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }

  const handlePointerMove = (event: PointerEvent<HTMLDivElement>): void => {
    if (!dragging) return
    /*
     * A release that lands outside the window never reaches this element, so
     * `dragging` would stay set: the body-wide cursor would stick and, worse,
     * every later hover would resize the pane with no button held. The missing
     * release is detectable here instead, which makes the drag self-heal.
     */
    if (event.buttons === 0) {
      endDrag(event)
      return
    }
    pending.current = axis === 'x' ? event.clientX : event.clientY
    if (frame.current !== null) return
    frame.current = requestAnimationFrame(flush)
  }

  const endDrag = (event: PointerEvent<HTMLDivElement>): void => {
    if (frame.current !== null) {
      cancelAnimationFrame(frame.current)
      frame.current = null
    }
    // Apply whatever the last frame had not yet committed.
    if (pending.current !== null) {
      apply(fromPointer(pending.current))
      pending.current = null
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setDragging(false)
  }

  /*
   * Pointer capture routes the events to the handle, but the cursor and text
   * selection still follow the rest of the document, so both are suppressed
   * globally for the duration of the drag and restored afterwards.
   */
  useEffect(() => {
    if (!dragging) return
    const { body } = document
    const previousCursor = body.style.cursor
    const previousSelect = body.style.userSelect
    body.style.cursor = axis === 'x' ? 'col-resize' : 'row-resize'
    body.style.userSelect = 'none'
    return () => {
      body.style.cursor = previousCursor
      body.style.userSelect = previousSelect
    }
  }, [dragging, axis])

  useEffect(
    () => () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    },
    []
  )

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    const grow = axis === 'x' ? 'ArrowRight' : 'ArrowDown'
    const shrink = axis === 'x' ? 'ArrowLeft' : 'ArrowUp'

    if (event.key === grow) {
      event.preventDefault()
      apply(value + step)
    } else if (event.key === shrink) {
      event.preventDefault()
      apply(value - step)
    } else if (event.key === 'Home') {
      event.preventDefault()
      apply(min)
    } else if (event.key === 'End') {
      event.preventDefault()
      apply(max)
    }
  }

  /*
   * The axis class shapes a *band* -- its thickness, its gradient and which way
   * its hatch runs. A corner grip overrides every one of those, so it drops the
   * class rather than out-specifying it, which would leave the band's `:hover`
   * rules free to repaint the corner hatch.
   */
  const className = [
    'aero-resize-handle',
    appearance === 'corner' ? 'aero-resize-handle--corner' : `aero-resize-handle--${axis === 'x' ? 'h' : 'v'}`,
    dragging ? 'aero-resize-handle--dragging' : ''
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      className={className}
      role="separator"
      tabIndex={0}
      aria-label={label}
      /*
       * The ARIA axis is the opposite of the drag axis: a bar that moves
       * vertically separates a left pane from a right one, so it is a
       * "vertical" separator. Swapping these misreports the control.
       */
      aria-orientation={axis === 'x' ? 'vertical' : 'horizontal'}
      aria-valuenow={Math.round(value)}
      aria-valuemin={Math.round(min)}
      aria-valuemax={Math.round(max)}
      title="Drag to resize · double-click to reset"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      /*
       * Fires however capture ends, including when the element goes away
       * mid-drag, so the state cannot outlive the gesture.
       */
      onLostPointerCapture={endDrag}
      onDoubleClick={onReset}
      onKeyDown={handleKeyDown}
    />
  )
}
