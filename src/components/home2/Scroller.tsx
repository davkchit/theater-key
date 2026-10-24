import { useEffect, useRef, useState, type ReactNode } from 'react'

// A row of cards that scrolls sideways once there are more than fit: by
// finger or trackpad, and with two arrows on a computer. No scroll-behavior:
// smooth on the row itself: with scroll snapping it stopped iPhones from
// swiping it at all (the arrows ask for a smooth scroll on their own). While everything
// fits, it is a plain row and the arrows do not show.

export function Scroller({
  children,
  dark = false,
  label,
  className = '',
}: {
  children: ReactNode
  /** arrows for a black band */
  dark?: boolean
  /** what the row holds, for screen readers */
  label: string
  className?: string
}) {
  const row = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: true })

  useEffect(() => {
    const el = row.current
    if (!el) return
    const update = () =>
      setEdge({
        start: el.scrollLeft <= 2,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2,
      })
    update()
    el.addEventListener('scroll', update, { passive: true })
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => {
      el.removeEventListener('scroll', update)
      ro.disconnect()
    }
  }, [])

  // one card's width per press
  const step = (dir: 1 | -1) => {
    const el = row.current
    if (!el) return
    const card = el.firstElementChild as HTMLElement | null
    el.scrollBy({ left: dir * ((card?.offsetWidth ?? 300) + 20), behavior: 'smooth' })
  }

  const fits = edge.start && edge.end
  const arrow = `flex h-11 w-11 items-center justify-center rounded-full border-2 text-[20px] transition-opacity disabled:opacity-25 ${
    dark ? 'border-paper/70 text-paper' : 'border-ink text-ink'
  }`

  return (
    <div className={className}>
      <div
        ref={row}
        role="region"
        aria-label={label}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-2 sm:-mx-6.5 sm:scroll-px-6.5 sm:px-6.5 lg:mx-0 lg:scroll-px-0 lg:px-0"
      >
        {children}
      </div>
      {!fits && (
        <div className="mt-6 hidden justify-end gap-3 md:flex">
          <button
            type="button"
            aria-label="Назад"
            className={arrow}
            disabled={edge.start}
            onClick={() => step(-1)}
          >
            ←
          </button>
          <button
            type="button"
            aria-label="Дальше"
            className={arrow}
            disabled={edge.end}
            onClick={() => step(1)}
          >
            →
          </button>
        </div>
      )}
    </div>
  )
}
