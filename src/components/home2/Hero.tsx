import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { Link } from 'react-router-dom'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { heroShows, longDate, galleryPhoto, showPath } from './homeData'
import { BTN, WRAP } from './parts'

import { SPRING } from './motion'
import { InkFade } from './paper'

// First screen: the nearest shows as a slider over a live stage photo across
// the whole screen, as in the mockup; the title lies on the dark side of it. Big title, age, date, one red "Купить билет".
// Slides change every 7 s and stop under the pointer or with reduced motion.

const SLIDE_MS = 7000

export function Hero() {
  const reduce = useReducedMotion()
  const [i, setI] = useState(0)
  const [paused, setPaused] = useState(false)
  const count = heroShows.length

  useEffect(() => {
    if (reduce || paused || count < 2) return
    const t = setTimeout(() => setI((v) => (v + 1) % count), SLIDE_MS)
    return () => clearTimeout(t)
  }, [i, reduce, paused, count])

  const slide = heroShows[i]

  // Swipe on a phone (or drag with the mouse): a clear sideways movement of
  // 50 px changes the slide; an up-down movement is left to scroll the page.
  const swipe = useRef<{ x: number; y: number } | null>(null)
  const onPointerDown = (e: PointerEvent) => {
    swipe.current = { x: e.clientX, y: e.clientY }
  }
  const onPointerUp = (e: PointerEvent) => {
    const s0 = swipe.current
    swipe.current = null
    if (!s0 || count < 2) return
    const dx = e.clientX - s0.x
    const dy = e.clientY - s0.y
    if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.2) return
    setI((v) => (v + (dx < 0 ? 1 : -1) + count) % count)
  }

  return (
    <section
      className="bg-ink text-paper relative isolate"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={() => (swipe.current = null)}
      style={{ touchAction: 'pan-y' }}
      aria-roledescription="карусель"
      aria-label="Ближайшие спектакли"
    >
      <div className="relative h-[calc(100svh-72px)] max-h-[1000px] min-h-[560px] overflow-hidden md:h-[calc(100svh-96px)]">
        {/* on a phone and a tablet the photo takes the top of the screen and the text sits
            under it, so the title never covers the faces */}
        <div className="absolute inset-x-0 top-0 h-[50%] overflow-hidden lg:inset-y-0 lg:left-[38%] lg:h-auto xl:left-[30%]">
          <AnimatePresence initial={false}>
            <motion.img
              key={slide?.photo ?? 'stage'}
              src={slide?.photo ?? galleryPhoto('simon-1')}
              alt=""
              initial={{ opacity: 0, scale: reduce ? 1 : 1.05 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: reduce ? 0.2 : 1.4, ease: [0.16, 1, 0.3, 1] }}
              style={{ objectPosition: slide?.focus ?? '60% 40%' }}
              className="absolute inset-0 h-full w-full object-cover"
            />
          </AnimatePresence>
        </div>
        {/* the text side is black, the actors' side stays alive */}
        <div className="from-ink via-ink/50 to-ink/0 absolute inset-x-0 top-[22%] h-[28%] bg-gradient-to-t lg:hidden" />
        {/* the photo fades into black on its left, so faces never sit under the title */}
        <InkFade
          side="left"
          className="inset-y-0 left-[38%] hidden w-[36%] lg:block xl:left-[30%] xl:w-[40%]"
        />
        <InkFade side="top" className="inset-x-0 top-0 h-24" />
        <div className="from-ink/80 absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t to-transparent" />

        <div
          className={`${WRAP} relative z-[3] flex h-full flex-col justify-end pb-20 lg:justify-center lg:pb-10`}
        >
          {slide ? (
            <>
              {/* the page's heading is the theatre itself: what people search for */}
              <h1 className="text-paper/85 mb-4 text-[13px] font-semibold tracking-[.14em] uppercase md:mb-5 md:text-[15px]">
                Молодёжный театр «Ключ» в Набережных Челнах
              </h1>
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={slide.item.title}
                  initial={{ opacity: 0, y: reduce ? 0 : 22 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: reduce ? 0 : -12 }}
                  transition={reduce ? { duration: 0.15 } : SPRING}
                  aria-live="polite"
                >
                  <div className="relative inline-block">
                    {/* sized by the longest word, so «Последствий» fits whole and «Симон» gets huge */}
                    <h2
                      style={
                        {
                          '--L': Math.max(5, ...slide.item.title.split(/\s+/).map((w) => w.length)),
                        } as CSSProperties
                      }
                      className="font-heading w-min text-[min(170px,calc(84vw/(var(--L)*0.56)))] leading-[.92] font-bold tracking-[-.01em] uppercase lg:text-[min(170px,calc(min(44vw,700px)/(var(--L)*0.52)))]"
                    >
                      {slide.item.title}
                    </h2>
                  </div>
                  {slide.item.age && (
                    <div className="font-heading mt-5 text-[30px] leading-none font-semibold md:text-[40px]">
                      {slide.item.age}
                    </div>
                  )}
                  <div className="mt-3 text-[20px] font-semibold md:text-[26px]">
                    {longDate(slide.item)}
                  </div>
                  <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-4">
                    {slide.ticketUrl && (
                      <a
                        href={slide.ticketUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`${BTN} bg-brand-red text-paper px-9 py-4.5 text-[17px]`}
                      >
                        Купить билет
                      </a>
                    )}
                    <Link
                      to={showPath(slide.item.title)}
                      className="group inline-flex items-center gap-2.5 text-[17px] font-medium"
                    >
                      <span className="border-paper/70 border-b pb-0.5">О спектакле</span>
                      <span
                        aria-hidden="true"
                        className="transition-transform group-hover:translate-x-1"
                      >
                        →
                      </span>
                    </Link>
                  </div>
                </motion.div>
              </AnimatePresence>
            </>
          ) : (
            // off-season: nothing on the schedule yet
            <div>
              <h1 className="font-heading text-[clamp(56px,11vw,150px)] leading-[.85] font-bold uppercase">
                Театр «Ключ»
              </h1>
              <p className="mt-4 max-w-md text-[18px]">
                Молодёжный театр в Набережных Челнах. Новый сезон скоро в афише.
              </p>
              <Link to="/afisha" className={`${BTN} bg-brand-red text-paper mt-6`}>
                Афиша
              </Link>
            </div>
          )}

          {count > 1 && (
            <div className="absolute bottom-10 left-4 flex gap-3 sm:left-6.5 lg:left-12">
              {heroShows.map((h, n) => (
                <button
                  key={h.item.title}
                  onClick={() => setI(n)}
                  aria-label={`Показать «${h.item.title}»`}
                  aria-current={n === i}
                  className={`border-paper h-3 w-3 rounded-full border-2 transition-colors ${n === i ? 'bg-paper' : 'bg-transparent'}`}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
