import type { PaneLayout } from '@shared/types'

/* ==========================================================================
   Work area layout limits
   --------------------------------------------------------------------------
   Shared by the resize handles, the layout controls and the Settings modal so
   every entry point clamps to identical bounds.
   ========================================================================== */

export const SIDEBAR_MIN_W = 200
export const SIDEBAR_MAX_W = 560

/** Thickness of a `.aero-resize-handle` band, which eats into the extent. */
export const HANDLE_SIZE = 7

/*
 * Size of the square `.aero-resize-handle--corner` grip; must match its width
 * in `aero.css`. Callers need it because that grip is pinned *inside* the box
 * it resizes, so the pointer holds it by the middle rather than by the edge it
 * moves -- see the correction in `BodyPanel`'s `fromPointer`.
 */
export const CORNER_GRIP_SIZE = 18

/*
 * The px floors differ per axis on purpose. Vertically the editor only holds a
 * tab strip and a row or two of fields, so ~120px is usable. Horizontally the
 * same pane has to fit the `.app-kv` tables, whose tracks already sum to ~360px
 * -- narrower than that and every key/value table starts side-scrolling.
 */
export const EDITOR_MIN_H = 120
export const EDITOR_MIN_W = 380
export const RESPONSE_MIN_H = 140
export const RESPONSE_MIN_W = 220

/*
 * The body editor is a textarea rather than a pane, so it has no entry in
 * `paneLimits`. Its ceiling is not a constant either -- the tab measures the
 * space it has left and clamps to that, because the grip rides the well's
 * bottom-right corner: without the clamp the well could grow past the tab
 * entirely and take the grip below the fold, where only a scroll reaches it.
 */
export const BODY_EDITOR_MIN_H = 120

/** Keyboard step for the resize handles, in px. */
export const RESIZE_STEP = 16

export function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min
  return Math.min(max, Math.max(min, value))
}

/** Px floors for the leading (editor) and trailing (response) pane. */
export function paneLimits(layout: PaneLayout): { leading: number; trailing: number } {
  return layout === 'sideBySide'
    ? { leading: EDITOR_MIN_W, trailing: RESPONSE_MIN_W }
    : { leading: EDITOR_MIN_H, trailing: RESPONSE_MIN_H }
}

/**
 * Converts the two px floors into ratio bounds for the splitter. Both are
 * needed: the pane being grown must stay usable, and so must the one being
 * squashed.
 *
 * The handle's own thickness is deducted before the trailing floor is applied,
 * because the panes only ever get the space the handle leaves. Forgetting it
 * lets the response end up `HANDLE_SIZE` px short of its floor at the extreme.
 *
 * The outer 0.45/0.55 caps keep the range well-formed when the extent is
 * smaller than both floors plus the handle, which is reachable: a 1000px window
 * with the sidebar at `SIDEBAR_MAX_W` leaves a 433px work area, well under the
 * 607px side-by-side wants. In that case the caps narrow the band towards the
 * middle rather than letting `min` cross `max`, so the px floors become
 * best-effort -- the panes stay in proportion and nothing inverts or collapses
 * to nothing. Honouring the floors exactly would mean shrinking the sidebar to
 * match, which would fight the width the user explicitly dragged to.
 */
export function ratioLimits(
  extent: number,
  leadingMin: number,
  trailingMin: number
): { min: number; max: number } {
  if (extent <= 0) return { min: 0.15, max: 0.85 }
  return {
    min: Math.min(0.45, leadingMin / extent),
    max: Math.max(0.55, (extent - HANDLE_SIZE - trailingMin) / extent)
  }
}
