import { rng, tornRectPath, useTornMask } from '../../lib/torn'
// Printed-paper look of the approved mockup: bands torn off by hand (uneven
// edge with a light fibre rim), grain over the page, photos printed in two
// inks with a rough edge. All of it is SVG made once at load; no images.

const W = 1440
const H = 30

/** Path of a torn edge across [0, W]; the paper is below the line. */
function tornPath(seed: number, lift = 0): string {
  const r = rng(seed)
  const pts: [number, number][] = []
  let x = 0
  // two long, lazy waves plus short sharp teeth: that is what hand-torn paper does
  const a1 = r() * Math.PI * 2
  const a2 = r() * Math.PI * 2
  while (x <= W) {
    const wave = Math.sin(x / 210 + a1) * 5 + Math.sin(x / 67 + a2) * 2.5
    const tooth = (r() - 0.5) * 6
    const y = Math.max(1, Math.min(H - 2, 15 + wave + tooth - lift))
    pts.push([x, y])
    x += 6 + r() * 10
  }
  const all: [number, number][] = [[0, H], ...pts, [W, 15], [W, H]]
  return 'M' + all.map(([a, b]) => `${a.toFixed(0)},${b.toFixed(1)}`).join(' L') + ' Z'
}

interface TornProps {
  /** Tailwind text colour of the band the edge belongs to, e.g. "text-brand-red" */
  color: string
  /** where the edge sits: at the band's top (tearing upwards) or bottom */
  side?: 'top' | 'bottom'
  seed?: number
  /** light fibre rim along the tear (on dark bands it reads as torn paper) */
  rim?: boolean
}

/**
 * The torn edge of a coloured band. Put it inside a `relative` band; it hangs
 * outside the band by its own height and covers the band next to it.
 */
// The torn shape as a CSS mask, stretched to the edge's box like the SVG was.
const maskOf = (d: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${W} ${H}' preserveAspectRatio='none'><path d='${d}'/></svg>`,
  )}")`

/**
 * A sheet torn on all four sides, as one piece, cut to the box's real size
 * (no stretching, so the teeth are the same as on the bands). Put it as the
 * first child of a `relative` box with `absolute` and a negative inset: the
 * tear takes the outer `m` px.
 */
export function TornSheet({
  color,
  seed = 1,
  m = 16,
  className = '',
}: {
  color: string
  seed?: number
  m?: number
  className?: string
}) {
  const { ref, w, h, mask } = useTornMask(seed, m)
  return (
    <div ref={ref} aria-hidden="true" className={`pointer-events-none ${color} ${className}`}>
      {mask && (
        <>
          <svg width={w} height={h} className="absolute inset-0 block">
            <path d={tornRectPath(w, h, seed, m, 2.2)} fill="#fbf7ec" opacity=".9" />
          </svg>
          <div
            className="torn-paper absolute inset-0"
            style={{
              backgroundColor: 'currentColor',
              maskImage: mask,
              WebkitMaskImage: mask,
              maskRepeat: 'no-repeat',
              WebkitMaskRepeat: 'no-repeat',
            }}
          />
        </>
      )}
    </div>
  )
}

export function Torn({ color, side = 'top', seed = 1, rim = true }: TornProps) {
  // The paper itself is a div in the band's colour with the band's own grain
  // (.torn-paper shares it in index.css), cut to the tear by a mask: a flat
  // SVG fill next to the grainy band read as a sticker.
  const mask = maskOf(tornPath(seed))
  return (
    <div
      aria-hidden="true"
      className={[
        'pointer-events-none absolute left-0 z-[2] block h-[22px] w-full md:h-[30px]',
        side === 'top' ? 'bottom-[calc(100%-1px)]' : 'top-[calc(100%-1px)] rotate-180',
        color,
      ].join(' ')}
    >
      {rim && (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 block h-full w-full"
        >
          <path d={tornPath(seed, 2.2)} fill="#fbf7ec" opacity=".9" />
        </svg>
      )}
      <div
        className="torn-paper absolute inset-0"
        style={{
          backgroundColor: 'currentColor',
          maskImage: mask,
          WebkitMaskImage: mask,
          maskSize: '100% 100%',
          WebkitMaskSize: '100% 100%',
          maskRepeat: 'no-repeat',
          WebkitMaskRepeat: 'no-repeat',
        }}
      />
      {/* the base where the paper joins its band, solid: on a 3x phone screen
          the cream rim showed as a thin line along the bottom (WebKit draws the
          rim's edge pixel, not the mask's), so this strip runs a little past
          the paper into its band, which is the same colour */}
      <div className="torn-paper absolute inset-x-0 -bottom-[3px] h-[7px] bg-current" />
    </div>
  )
}

// The menu's bottom edge, as in the mockup: almost straight (the menu is a
// strip cut along a ruler and then torn), a cream fibre rim of changing
// thickness, and one flap on the left where a sliver of the tear lifted away.
const HW = 1440
const HH = 20
const HB = 7 // where the edge runs; above it the SVG overlaps the menu itself

function headerEdge(seed: number) {
  const r = rng(seed)
  const top: [number, number][] = []
  const bottom: [number, number][] = []
  const a = r() * Math.PI * 2
  for (let x = 0; x <= HW; x += 4 + r() * 6) {
    const e = HB + Math.sin(x / 390 + a) * 0.9 + (r() - 0.5) * 0.9
    // rim 1.5-5 px, with the odd deeper bite where fibres pulled out
    let t = 3.3 + Math.sin(x / 140 + a * 2) * 1.2 + (r() - 0.5) * 0.8
    if (r() < 0.05) t += 1.5 + r() * 2
    top.push([x, e])
    bottom.push([x, e + Math.max(1.4, t)])
  }
  top.push([HW, HB])
  bottom.push([HW, HB + 2.5])
  const pts = (list: [number, number][]) =>
    list.map(([x, y]) => `${x.toFixed(0)},${y.toFixed(1)}`).join(' L')
  const black = `M0,0 L${HW},0 L${pts([...top].reverse())} Z`
  const rim = `M${pts(top)} L${pts([...bottom].reverse())} Z`
  // the flap: a thin cream sliver just above the edge, tapering at both ends
  const f0 = 300 + r() * 60
  const f1 = f0 + 170 + r() * 60
  const up: [number, number][] = []
  const down: [number, number][] = []
  for (let x = f0; x <= f1; x += 6) {
    const k = Math.sin(((x - f0) / (f1 - f0)) * Math.PI) // 0 at the ends, 1 in the middle
    const y = HB - 0.6 - k * 4.4
    up.push([x, y - k * 2])
    down.push([x, y + k * 0.6])
  }
  const flap = `M${pts(up)} L${pts([...down].reverse())} Z`
  return { black, rim, flap }
}

/** The torn bottom edge of the menu bar. Put it inside the `relative` header. */
export function HeaderEdge({
  seed = 97,
  color = 'text-[#121212]',
}: {
  seed?: number
  color?: string
}) {
  const { black, rim, flap } = headerEdge(seed)
  return (
    <svg
      viewBox={`0 0 ${HW} ${HH}`}
      preserveAspectRatio="none"
      aria-hidden="true"
      className={`pointer-events-none absolute top-[calc(100%-7px)] left-0 z-[2] block h-5 w-full ${color}`}
    >
      <path d={black} fill="currentColor" />
      <path d={rim} fill="#efe7d6" />
      {/* squeezed to a phone width the flap turns into a bump, so phones go without it */}
      <path d={flap} fill="#efe7d6" className="max-md:hidden" />
    </svg>
  )
}

// Fine dark specks, as on uncoated paper. One tile, repeated.
const GRAIN_SVG = `<svg xmlns='http://www.w3.org/2000/svg' width='220' height='220'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.85' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0.1  0 0 0 0 0.08  0 0 0 0 0.05  -2.4 0 0 0 1.35'/></filter><rect width='100%' height='100%' filter='url(%23n)'/></svg>`
export const GRAIN_URL = `url("data:image/svg+xml,${GRAIN_SVG.replace(/</g, '%3C').replace(/>/g, '%3E').replace(/"/g, "'")}")`

/** Paper grain over a whole area: put it last inside a `relative` block. */
export function Grain({ opacity = 0.35 }: { opacity?: number }) {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 z-[1]"
      style={{ backgroundImage: GRAIN_URL, opacity }}
    />
  )
}

const FADE_TO = { left: 'to right', top: 'to bottom', bottom: 'to top' } as const

/**
 * A photo fading into the black band it lies on, in the band's own grainy
 * ink: a plain gradient left the photo's black and the band's grain meeting
 * in a visible line. Put it over the photo; size and place it by className.
 */
export function InkFade({
  side,
  className = '',
}: {
  side: keyof typeof FADE_TO
  className?: string
}) {
  const mask = `linear-gradient(${FADE_TO[side]}, #000 15%, transparent)`
  return (
    <div
      aria-hidden="true"
      className={`bg-ink pointer-events-none absolute ${className}`}
      style={{ maskImage: mask, WebkitMaskImage: mask }}
    />
  )
}
