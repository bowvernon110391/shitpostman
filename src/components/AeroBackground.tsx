import { useMemo, type CSSProperties } from 'react'

interface Bubble {
  id: number
  size: number
  left: number
  duration: number
  delay: number
  drift: number
  opacity: number
}

/*
 * Kept deliberately low. Each bubble is a composited layer, and the window
 * already pays for two large backdrop-filter blurs, so this is a cheap way to
 * hold the frame rate. Fewer, slower bubbles also read as ambience rather than
 * as a screensaver.
 */
const BUBBLE_COUNT = 11

/**
 * The animated Frutiger Aero wallpaper layer: translucent bubbles of varying
 * size drifting upward behind the glass panels.
 *
 * Tuned to sit just inside peripheral vision. They travel slowly enough that
 * they will not pull the eye away from a response body, and the opacity band is
 * tight so no single bubble becomes a focal point.
 */
export function AeroBackground(): JSX.Element {
  const bubbles = useMemo<Bubble[]>(() => {
    return Array.from({ length: BUBBLE_COUNT }, (_, index) => {
      const size = 14 + Math.random() * 76
      return {
        id: index,
        size,
        left: Math.random() * 98,
        // Long, uneven cycles. The wide negative delay spreads them across the
        // full travel distance on first paint, so the layer never starts empty
        // and never pulses in unison.
        duration: 50 + Math.random() * 60,
        delay: -Math.random() * 120,
        drift: (Math.random() - 0.5) * 90,
        /*
         * The single most important number in this file. Because the bubbles
         * only show *through* the glass panels, and each panel composites at
         * roughly 0.8-0.85 alpha, only a fifth of this value reaches the screen
         * — so it has to start high to leave anything visible at all. Measured
         * on the rendered pane, a band of 0.32-0.66 moves the backdrop by only
         * ~4% luminance, which is the intended "felt, not seen" level.
         */
        opacity: 0.32 + Math.random() * 0.34
      }
    })
  }, [])

  return (
    <div className="aero-bubbles" aria-hidden="true">
      {bubbles.map((bubble) => {
        const style = {
          width: `${bubble.size}px`,
          height: `${bubble.size}px`,
          left: `${bubble.left}%`,
          animationDuration: `${bubble.duration}s`,
          animationDelay: `${bubble.delay}s`,
          '--bubble-drift': `${bubble.drift}px`,
          '--bubble-opacity': `${bubble.opacity}`
        } as CSSProperties

        return (
          <span
            key={bubble.id}
            className={`aero-bubble${bubble.size > 56 ? ' aero-bubble--lg' : ''}`}
            style={style}
          />
        )
      })}
    </div>
  )
}
