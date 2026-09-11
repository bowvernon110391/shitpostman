import { useEffect, useRef, useState } from 'react'
import { Check, Copy } from 'lucide-react'

interface CopyButtonProps {
  value: string
  label?: string
  className?: string
  size?: number
}

/** Copies `value` to the clipboard and flashes a tick on success. */
export function CopyButton({ value, label, className = '', size = 13 }: CopyButtonProps): JSX.Element {
  const [copied, setCopied] = useState(false)
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current)
    },
    []
  )

  const copy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(value)
    } catch {
      // Clipboard can be unavailable; fall back to a hidden textarea.
      const area = document.createElement('textarea')
      area.value = value
      area.style.position = 'fixed'
      area.style.opacity = '0'
      document.body.appendChild(area)
      area.select()
      document.execCommand('copy')
      document.body.removeChild(area)
    }

    setCopied(true)
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => setCopied(false), 1400)
  }

  return (
    <button
      type="button"
      className={`aero-button aero-button--ghost aero-button--sm ${className}`.trim()}
      onClick={() => void copy()}
      title={label ? `Copy ${label}` : 'Copy'}
    >
      {copied ? <Check size={size} /> : <Copy size={size} />}
      {label ? <span>{copied ? 'Copied' : label}</span> : null}
    </button>
  )
}
