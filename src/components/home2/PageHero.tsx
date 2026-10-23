import type { CSSProperties, ReactNode } from 'react'
import { WRAP } from './parts'
import { InkFade, Torn } from './paper'

// The first screen of an inner page, built like the homepage's: a live photo
// across the right of the screen that melts into black on its left, the title
// on the dark side. On a phone the photo fills the screen and darkens towards
// the text at the bottom.

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
  return (
    <section className="bg-ink text-paper relative isolate">
      <div className="relative min-h-[560px] overflow-hidden md:h-[min(76svh,760px)]">
        <div className="absolute inset-x-0 top-0 h-[64%] overflow-hidden md:inset-y-0 md:right-0 md:left-[32%] md:h-auto">
          <img
            src={photo}
            alt={alt}
            className="h-full w-full object-cover"
            style={{ objectPosition: focus, ...imgStyle }}
          />
        </div>
        {/* on a phone the photo sits on top and melts into the black under the text */}
        <div className="from-ink via-ink/60 to-ink/20 absolute inset-x-0 top-0 h-[64%] bg-gradient-to-t md:hidden" />
        <InkFade side="left" className="inset-y-0 left-[32%] hidden w-[42%] md:block" />
        <InkFade side="top" className="inset-x-0 top-0 h-20 md:h-28" />
        <div className="from-ink/80 absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t to-transparent" />
        <div
          className={`${WRAP} relative z-[3] flex h-full min-h-[560px] flex-col justify-end pt-40 pb-16 md:justify-center md:pt-0 md:pb-10`}
        >
          {children}
        </div>
      </div>
      <Torn color="text-ink" side="bottom" seed={seed} />
    </section>
  )
}
