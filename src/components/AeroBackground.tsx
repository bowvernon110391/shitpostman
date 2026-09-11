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

const BUBBLE_COUNT = 18

/**
 * The animated Frutiger Aero wallpaper layer: translucent bubbles of varying
 * size drifting upward behind the glass panels.
 */
export function AeroBackground(): JSX.Element {
  const bubbles = useMemo<Bubble[]>(() => {
    return Array.from({ length: BUBBLE_COUNT }, (_, index) => {
      const size = 12 + Math.random() * 74
      return {
        id: index,
        size,
        left: Math.random() * 98,
        duration: 26 + Math.random() * 40,
        delay: -Math.random() * 55,
        drift: (Math.random() - 0.5) * 130,
        opacity: 0.24 + Math.random() * 0.5
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
            className={`aero-bubble${bubble.size > 52 ? ' aero-bubble--lg' : ''}`}
            style={style}
          />
        )
      })}
    </div>
  )
}
