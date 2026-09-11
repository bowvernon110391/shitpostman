import { useEffect, useRef, type RefObject } from 'react'

/** Wheel deltas are normalised to pixels; `deltaMode` reports the unit they arrived in. */
const LINE_HEIGHT = 16

/** Breathing room so the active tab's rounded edge never sits flush against the clip. */
const EDGE_PADDING = 6

/**
 * Makes a tab strip operable with one hand: a plain vertical wheel scrolls it
 * horizontally, and the active tab is always scrolled back into view.
 *
 * Scrolling sideways normally requires shift to be held — that is a
 * browser-level convention, not something CSS can change, so it has to be done
 * in JavaScript.
 *
 * A React `onWheel` prop cannot be used for this: React registers `wheel` as a
 * passive listener on its root container, which makes `preventDefault()` a
 * silent no-op. A native listener is required.
 *
 * @param activeKey Changes to this value re-check that the active tab is visible.
 */
export function useScrollableTabs<T extends HTMLElement>(activeKey: string): RefObject<T> {
  const ref = useRef<T>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const onWheel = (event: WheelEvent): void => {
      // Pinch-zoom arrives as ctrl+wheel — leave it to the browser.
      if (event.ctrlKey) return

      const max = element.scrollWidth - element.clientWidth
      if (max <= 0) return

      // The browser already translates shift+wheel to horizontal scroll.
      // Handling it here as well would move the strip twice as far.
      if (event.shiftKey) return

      let delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY
      if (event.deltaMode === 1) delta *= LINE_HEIGHT
      else if (event.deltaMode === 2) delta *= element.clientWidth

      // Let the gesture fall through at either end rather than trapping it.
      if (delta < 0 && element.scrollLeft <= 0) return
      if (delta > 0 && element.scrollLeft >= max - 1) return

      event.preventDefault()
      element.scrollLeft += delta
    }

    element.addEventListener('wheel', onWheel, { passive: false })
    return () => element.removeEventListener('wheel', onWheel)
  }, [])

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const active = element.querySelector<HTMLElement>('.aero-tab--active')
    if (!active) return

    // Measured with rects rather than `offsetLeft`: the nearest positioned
    // ancestor here is the sidebar, not the strip, so offsets would be wrong.
    const strip = element.getBoundingClientRect()
    const tab = active.getBoundingClientRect()
    const view = element.scrollLeft
    const left = tab.left - strip.left + view
    const right = left + tab.width

    let target = view
    if (left < view + EDGE_PADDING) target = left - EDGE_PADDING
    else if (right > view + element.clientWidth - EDGE_PADDING) {
      target = right - element.clientWidth + EDGE_PADDING
    }

    target = Math.max(0, Math.min(target, element.scrollWidth - element.clientWidth))
    if (Math.abs(target - view) < 1) return

    element.scrollTo({ left: target, behavior: 'smooth' })
  }, [activeKey])

  return ref
}
