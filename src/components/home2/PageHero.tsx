import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { WRAP } from './parts'
import { InkFade, Torn } from './paper'

// The first screen of an inner page, built like the homepage's: a live photo
// across the right of the screen that melts into black on its left, the title
// on the dark side. On a phone the photo fills the screen and darkens towards
// the text at the bottom.

// A photo narrower than this (a phone frame from a messenger) turned to mush
// stretched over two thirds of a wide screen: it gets the right half only.
const SHARP_WIDTH = 1300

export function PageHero({
  photo,
  focus = '50% 35%',
  imgStyle,
  alt = '',
  seed = 201,
  children,
}: {
  photo: string
  /** object-position of the photo, "x% y%" */
  focus?: string
  /** extra style for the photo, e.g. a zoom on the people on a half-empty stage */
  imgStyle?: CSSProperties
  alt?: string
  /** seed of the torn bottom edge */
  seed?: number
  children: ReactNode
}) {
  const img = useRef<HTMLImageElement>(null)
  const [small, setSmall] = useState(false)
  const measure = () => {
    const el = img.current
    if (el && el.naturalWidth) setSmall(el.naturalWidth < SHARP_WIDTH)
  }
  // a cached photo can be loaded before React attaches onLoad
  useEffect(measure, [photo])

  return (
    <section className="bg-ink text-paper relative isolate">
      {/* On a phone and a tablet the photo is a block of its own at the top and
          the text follows under it, so a long title never lands on a face; on
          a computer the photo stands on the right and melts into black. */}
      <div className="relative overflow-hidden md:h-[min(76svh,760px)] md:min-h-[560px]">
        <div
          className={`relative h-[50svh] min-h-[280px] overflow-hidden md:absolute md:inset-y-0 md:right-0 md:h-auto md:min-h-0 ${small ? 'md:left-[46%]' : 'md:left-[32%]'}`}
        >
          <img
            ref={img}
            src={photo}
            alt={alt}
            onLoad={measure}
            className="h-full w-full object-cover"
            style={{ objectPosition: focus, ...imgStyle }}
          />
          {/* the photo's lower part melts into the black the text stands on */}
          <InkFade side="bottom" className="inset-x-0 bottom-0 h-1/2 md:hidden" />
        </div>
        <InkFade
          side="left"
          className={`inset-y-0 hidden md:block ${small ? 'left-[46%] w-[30%]' : 'left-[32%] w-[42%]'}`}
        />
        <InkFade side="top" className="inset-x-0 top-0 h-20 md:h-28" />
        {/* the photo melts into the band's own grainy black before the torn
            edge, so no straight line shows where it ends */}
        <InkFade side="bottom" className="inset-x-0 bottom-0 hidden h-56 md:block" />
        <div
          className={`${WRAP} relative z-[3] -mt-14 pb-16 md:mt-0 md:flex md:h-full md:flex-col md:justify-center md:pb-10`}
        >
          {/* the text keeps to the black side: a long title («Лаборатория «ЛСД»»)
              wraps instead of running over the faces on a square screen */}
          <div className="md:max-w-[44vw]">{children}</div>
        </div>
      </div>
      <Torn color="text-ink" side="bottom" seed={seed} />
    </section>
  )
}
