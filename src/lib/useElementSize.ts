import { useEffect, useState, type RefObject } from 'react'

export interface ElementSize {
  width: number
  height: number
}

/**
 * Tracks an element's content box.
 *
 * Used to turn the pane split's px floors into ratios. The panes themselves are
 * laid out purely in percentages, and a drag never changes the work area's own
 * box, so this only fires on real changes such as a window resize.
 */
export function useElementSize<T extends HTMLElement>(ref: RefObject<T>): ElementSize {
  const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 })

  useEffect(() => {
    const node = ref.current
    if (!node) return

    const observer = new ResizeObserver((entries) => {
      const box = entries[0]?.contentRect
      if (!box) return
      // Preserve the previous object when nothing moved so the drag path does
      // not re-render on every observer callback.
      setSize((current) =>
        current.width === box.width && current.height === box.height
          ? current
          : { width: box.width, height: box.height }
      )
    })

    observer.observe(node)
    return () => observer.disconnect()
  }, [ref])

  return size
}
