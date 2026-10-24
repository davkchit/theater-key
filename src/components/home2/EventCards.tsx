import { Link } from 'react-router-dom'
import type { Direction } from '../../types/content'
import { eventList } from '../../data/directions'
import { galleryPhoto } from './homeData'
import { BTN, Portrait } from './parts'
import { Scroller } from './Scroller'

// Every event the theatre runs besides shows and courses, from one list: the
// admin's «Направления». «Курсы» and «О театре» both show it, so an event
// added there appears in both places, and nobody finds out about the lab
// only from its own page. More than fit in a row: the row scrolls.

const pathOf = (d: Direction) =>
  d.type === 'festival' ? '/festival' : d.slug && d.page ? '/' + d.slug : ''
const photoOf = (d: Direction) =>
  d.page?.photo ?? (d.type === 'festival' ? galleryPhoto('nagrazhdenie-1') : '')

// a brand colour behind each photo, in turn, like the people on the homepage
const BLOCKS = ['bg-brand-red', 'bg-brand-yellow', 'bg-brand-blue']

const CARD =
  'w-[82%] flex-shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] xl:w-[calc(25%-15px)]'

export function EventCards({
  dark = false,
  onSignUp,
}: {
  /** on a black band (Курсы) */
  dark?: boolean
  /** «Записаться» opens the form on the page; without it the card only leads to the event's page */
  onSignUp?: (d: Direction) => void
}) {
  const list = eventList()
  if (!list.length) return null

  // on paper (homepage, «О театре»): the photo with a colour block behind it,
  // the title and a line about it, as these blocks always looked
  if (!dark) {
    return (
      <Scroller label="Мероприятия театра">
        {list.map((d, i) => {
          const to = pathOf(d)
          return (
            <article key={d.id} className={`group relative ${CARD} pr-3 pb-3 md:pr-3.5 md:pb-3.5`}>
              <Portrait
                src={photoOf(d)}
                alt=""
                block={BLOCKS[i % BLOCKS.length] as string}
                focus="50% 45%"
                className="aspect-[4/3]"
              />
              <h3 className="font-heading mt-7 text-[26px] leading-[1.02] font-bold uppercase xl:text-[30px]">
                {to ? (
                  <Link to={to} className="after:absolute after:inset-0">
                    {d.title}
                  </Link>
                ) : (
                  d.title
                )}
              </h3>
              {d.desc && (
                <p className="text-ink/80 mt-3 line-clamp-3 text-[16px] leading-[1.55]">{d.desc}</p>
              )}
              {to && (
                <span
                  aria-hidden="true"
                  className="mt-5 inline-flex items-center gap-2.5 text-[15px] font-medium"
                >
                  <span className="border-b border-current pb-0.5">Подробнее</span>
                  <span className="transition-transform duration-200 group-hover:translate-x-1">
                    →
                  </span>
                </span>
              )}
            </article>
          )
        })}
      </Scroller>
    )
  }

  return (
    <Scroller dark={dark} label="Мероприятия театра">
      {list.map((d) => {
        const to = pathOf(d)
        const photo = photoOf(d)
        return (
          // the whole card leads to the event's page (the title's link covers it);
          // the buttons sit above that link
          <article
            key={d.id}
            className={`group relative flex flex-col ${CARD} ${
              d.open ? 'bg-paper text-ink' : 'bg-paper/12 text-paper'
            }`}
          >
            {photo && (
              <div className="aspect-[4/3] overflow-hidden">
                <img
                  src={photo}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
                />
              </div>
            )}
            <div className="flex flex-1 flex-col p-6">
              <h3 className="font-heading text-[24px] leading-tight font-bold uppercase md:text-[26px]">
                {to ? (
                  <Link to={to} className="after:absolute after:inset-0">
                    {d.title}
                  </Link>
                ) : (
                  d.title
                )}
              </h3>
              {(d.age || d.schedule) && (
                <div className="mt-2 text-[15px] opacity-90">
                  {[d.age, d.schedule].filter(Boolean).join(' | ')}
                </div>
              )}
              {d.desc && (
                <p className="mt-3 line-clamp-4 flex-1 text-[15px] leading-[1.5] opacity-85">
                  {d.desc}
                </p>
              )}
              <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
                {d.open && d.type === 'festival' ? (
                  <Link
                    to="/festival#zayavka"
                    className={`${BTN} relative z-[1] py-3 ${d.open ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}
                  >
                    Подать заявку
                  </Link>
                ) : d.open && onSignUp ? (
                  <button
                    onClick={() => onSignUp(d)}
                    className={`${BTN} relative z-[1] py-3 ${d.open ? 'bg-ink text-paper' : 'bg-paper text-ink'}`}
                  >
                    Записаться
                  </button>
                ) : !d.open ? (
                  <span className="flex items-center gap-2 text-[14px] font-semibold opacity-80">
                    <svg
                      viewBox="0 0 24 24"
                      className="h-5 w-5"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      aria-hidden="true"
                    >
                      <rect x="5" y="11" width="14" height="10" rx="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                    Приём заявок пока закрыт
                  </span>
                ) : null}
                {to && (
                  <span
                    aria-hidden="true"
                    className="text-[14px] font-semibold underline underline-offset-4"
                  >
                    Подробнее →
                  </span>
                )}
              </div>
            </div>
          </article>
        )
      })}
    </Scroller>
  )
}
