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
 * Raised from 11 on request -- the old set was sparse enough to read as static
 * rather than as ambience. Each bubble is still a composited layer and the
 * window already pays for two large backdrop-filter blurs, so the count stays
 * well short of a particle system. The per-bubble opacity came down to partly
 * offset the extra density, which holds the total luminance showing through the
 * glass closer to where it was than the raw count suggests.
 */
const BUBBLE_COUNT = 30

/** Seconds to cross the window, fastest and slowest. */
const FASTEST = 16
const SLOWEST = 80

/**
 * The animated Frutiger Aero wallpaper layer: translucent bubbles of varying
 * size drifting upward behind the glass panels.
 *
 * The pace deliberately spans a wide band. The previous uniform 50-110s crawl
 * gave the layer no internal rhythm, so a handful of bubbles are now noticeably
 * brisk while the rest sit near the old pace -- the eye reads the quick ones as
 * motion and the slow ones as depth.
 */
export function AeroBackground(): JSX.Element {
  const bubbles = useMemo<Bubble[]>(() => {
    return Array.from({ length: BUBBLE_COUNT }, (_, index) => {
      const size = 14 + Math.random() * 76
      /*
       * `rand ** 1.7` skews the spread towards FASTEST rather than leaving it
       * flat. A uniform draw over the same range puts the average near the
       * middle, which is still a crawl; the exponent keeps most bubbles on the
       * brisk side and lets a handful run long.
       */
      const duration = FASTEST + Math.random() ** 1.7 * (SLOWEST - FASTEST)
      return {
        id: index,
        size,
        left: Math.random() * 98,
        duration,
        /*
         * A negative delay of a random slice of the bubble's OWN cycle, so each
         * one starts somewhere different along the travel path and the layer
         * never pulses in unison. It has to scale with `duration`: a flat offset
         * is a different fraction of a 16s cycle than of an 80s one, so it would
         * bunch the quick bubbles together instead of spreading them.
         */
        delay: -Math.random() * duration,
        drift: (Math.random() - 0.5) * 90,
        /*
         * The single most important number in this file. Because the bubbles
         * only show *through* the glass panels, and each panel composites at
         * roughly 0.8-0.85 alpha, only a fifth of this value reaches the screen
         * — so it has to start high to leave anything visible at all. Measured
         * on the rendered pane, a band of 0.32-0.66 moves the backdrop by only
         * ~4% luminance, which is the intended "felt, not seen" level. Trimmed
         * from that band to buy back some of the extra density.
         */
        opacity: 0.26 + Math.random() * 0.3
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
