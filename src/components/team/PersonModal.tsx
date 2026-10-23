import { useRef } from 'react'
import { toBody } from '../../lib/toBody'
import { AnimatePresence, motion } from 'motion/react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { useLockBodyScroll } from '../../hooks/useLockBodyScroll'
import { mediaUrl } from '../../lib/mediaUrl'
import { frameOf, type TeamEntry } from '../../data/people'
import { Portrait } from '../home2/parts'
import { TornSheet } from '../home2/paper'
import { SPRING } from '../home2/motion'

// A person from «Команда» in a sheet of paper over the page: photo on the
// left, name and story on the right. Everything in it comes from the admin's
// team list; empty fields simply leave their lines out.

export interface PersonModalProps {
  person: TeamEntry | null
  /** Tailwind bg class of the block behind the photo, as on the card clicked */
  block: string
  /** the shows the person plays in, from «В ролях» of each show */
  shows: string[]
  onClose: () => void
}

export function PersonModal({ person, block, shows, onClose }: PersonModalProps) {
  const open = person !== null
  const cardRef = useRef<HTMLDivElement>(null)
  useEscapeKey(open, onClose)
  useFocusTrap(cardRef, open)
  useLockBodyScroll(open)
  // one fact per line in the admin; a leading dash typed out of habit is dropped
  const bioLines = (person?.bio ?? '')
    .split('\n')
    .map((p) => p.replace(/^\s*[-–—•]\s*/, '').trim())
    .filter(Boolean)

  return toBody(
    <AnimatePresence>
      {person && (
        <motion.div
          className="bg-ink/70 fixed inset-0 z-80 flex items-center justify-center p-3 md:p-8"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.22 }}
          onClick={onClose}
        >
          <motion.div
            ref={cardRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="person-name"
            className="relative max-h-[86dvh] w-full max-w-[1080px] md:max-h-[88vh]"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.98 }}
            transition={SPRING}
            onClick={(e) => e.stopPropagation()}
          >
            {/* the sheet itself: torn outline and shadow on the paper only,
                so the text and the photo on it stay crisp */}
            <TornSheet
              color="text-paper"
              seed={211}
              m={14}
              className="absolute inset-0 drop-shadow-[0_4px_4px_rgba(0,0,0,.35)]"
            />

            <button
              type="button"
              onClick={onClose}
              aria-label="Закрыть"
              className="text-ink hover:text-brand-red focus-visible:outline-ink absolute top-4 right-4 z-10 flex h-11 w-11 items-center justify-center transition-colors outline-none focus-visible:outline-2 md:top-6 md:right-7"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <path d="M5 5l14 14M19 5L5 19" strokeLinecap="round" />
              </svg>
            </button>

            <div className="no-scrollbar relative max-h-[86dvh] overflow-y-auto px-6 pt-14 pb-10 md:max-h-[88vh] md:px-14 md:pt-16 md:pb-14">
              <div className="grid gap-8 md:grid-cols-[0.85fr_1.15fr] md:items-center md:gap-14">
                {person.photo ? (
                  <Portrait
                    src={mediaUrl(person.photo)}
                    alt={person.name}
                    focus={frameOf(person)[0]}
                    zoom={frameOf(person)[1]}
                    block={block}
                    className="mx-auto aspect-[4/5] w-[58%] max-w-[260px] md:w-full md:max-w-none"
                  />
                ) : (
                  <div className="bg-ink/10 aspect-[4/5] w-full" />
                )}

                <div>
                  <div className="font-heading text-brand-red text-[14px] font-semibold tracking-[.06em] uppercase md:text-[17px]">
                    {person.lead ? 'Художественный руководитель' : person.role}
                  </div>
                  <h2
                    id="person-name"
                    className="font-heading mt-2 text-[clamp(40px,6vw,76px)] leading-[.92] font-bold uppercase"
                  >
                    {person.name}
                  </h2>
                  {person.quote?.trim() && (
                    <p className="font-script text-brand-red mt-4 text-[24px] leading-[1.2] md:text-[30px]">
                      {person.quote.trim()}
                    </p>
                  )}
                  {person.lead && (
                    <p className="mt-5 text-[17px] leading-[1.55] md:text-[19px]">{person.role}</p>
                  )}
                  {bioLines.length > 1 ? (
                    // a few facts, one per line in the admin: a list
                    <ul className="text-ink/85 mt-5 space-y-2.5 text-[16px] leading-[1.5] md:text-[17px]">
                      {bioLines.map((p, i) => (
                        <li key={i} className="border-ink/15 border-t pt-2.5">
                          {p}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    bioLines.length === 1 && (
                      <p className="text-ink/85 mt-5 text-[16px] leading-[1.65] md:text-[17px]">
                        {bioLines[0]}
                      </p>
                    )
                  )}
                  {shows.length > 0 && (
                    <p className="border-ink/20 mt-7 border-t pt-5 text-[15px] leading-[1.6] md:text-[16px]">
                      <span className="font-semibold">Спектакли: </span>
                      {shows.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>,
  )
}
