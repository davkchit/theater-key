import { useEffect, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { animate, useInView, useReducedMotion } from 'motion/react'
import { directionByType } from '../../data/directions'
import coursesContent from '../../content/courses.json'
import type { Course } from '../../types/content'
import { mediaUrl } from '../../lib/mediaUrl'
import { Modal } from '../ui/Modal'
import { FestivalSignupForm } from '../about/FestivalSignupForm'
import { EventCards } from './EventCards'
import { usePersonModal } from '../team/usePersonModal'
import { Reveal } from '../ui/Reveal'
import { SwallowIcon } from '../ui/SwallowIcon'
import { BTN, Ink, MoreLink, Portrait, RoughFrame, SectionHead, WRAP } from './parts'
import { Torn } from './paper'
import { upcomingCards, shortDate, galleryPhoto, showPath } from './homeData'
import { POSTER_ASPECT, PosterArt } from './ShowPoster'
import { shows } from '../../data/shows'
import boyFence from '../../../assets/el-boy-fence.svg'
import starSvg from '../../../assets/el-star.svg'
import { CITY, VENUE } from '../../data/contacts'
import { homePeople } from '../../data/people'
import { productions } from '../../data/productions'

const courses = coursesContent.items as Course[]

/* ─────────────── festival strip ─────────────── */

export function FestivalStrip() {
  const festival = directionByType('festival')
  const [open, setOpen] = useState(false)
  const [sent, setSent] = useState(false)
  const [shakeKey, setShakeKey] = useState(0)
  if (!festival?.open) return null

  return (
    <section className="bg-brand-red text-paper relative">
      <Torn color="text-brand-red" seed={11} />
      <div
        className={`${WRAP} relative flex flex-col gap-4 py-9 sm:flex-row sm:items-center sm:gap-8 md:py-12`}
      >
        <div>
          <p className="font-heading text-[24px] leading-[1.05] font-bold uppercase sm:text-[28px] lg:text-[34px]">
            Приём заявок на фестиваль «Действующие лица» открыт
          </p>
          {festival.schedule && (
            <p className="mt-2 text-[17px] opacity-90 md:text-[19px]">{festival.schedule}</p>
          )}
        </div>
        <button
          onClick={() => setOpen(true)}
          className={`${BTN} bg-paper text-ink self-start px-9 py-4.5 text-[17px] sm:ml-auto sm:self-auto`}
        >
          Подать заявку
        </button>
        <img
          src={starSvg}
          alt=""
          aria-hidden="true"
          className="hidden h-20 w-20 flex-shrink-0 lg:block"
        />
      </div>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        shakeKey={shakeKey}
        labelledBy="festival-signup-title"
      >
        <button
          onClick={() => setOpen(false)}
          aria-label="Закрыть"
          className="border-ink absolute top-4.5 right-4.5 h-9.5 w-9.5 rounded-lg border-2 text-base transition-transform duration-150 active:scale-90"
        >
          ✕
        </button>
        {sent ? (
          <div className="bg-brand-blue/8 text-brand-blue rounded-[10px] p-4.5 text-[14px] leading-[1.5] font-semibold">
            ✳ Спасибо! Заявка отправлена, мы свяжемся с вами.
          </div>
        ) : (
          <FestivalSignupForm
            onSuccess={() => setSent(true)}
            onInvalid={() => setShakeKey((k) => k + 1)}
          />
        )}
      </Modal>
    </section>
  )
}

/* ─────────────── nearest shows ─────────────── */

export function UpcomingShows() {
  if (!upcomingCards.length) return null
  return (
    <section className="bg-paper relative">
      <Torn color="text-paper" seed={23} />
      <div className={`${WRAP} pt-16 pb-20 md:pt-24 md:pb-28`}>
        <SectionHead title="Ближайшие спектакли" to="/afisha" link="Вся афиша" />
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pb-2 sm:grid sm:grid-cols-2 sm:gap-x-0 sm:gap-y-10 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {upcomingCards.map((h, n) => {
            return (
              <Reveal
                key={h.item.title}
                index={n}
                className="sm:border-ink/15 flex w-[78vw] max-w-[340px] flex-shrink-0 snap-start flex-col sm:w-auto sm:max-w-none sm:border-l sm:px-5 sm:pb-2 sm:odd:border-l-0 lg:[&:nth-child(3)]:border-l"
              >
                <Link to={showPath(h.item.title)} className="block">
                  <PosterArt
                    photo={h.photo}
                    poster={h.show?.poster}
                    tint={h.show?.tint}
                    n={h.show ? shows.indexOf(h.show) : n}
                    alt={h.photo || h.show?.poster ? `«${h.item.title}»` : ''}
                    className={POSTER_ASPECT}
                  />
                </Link>
                <h3 className="font-heading mt-5 min-h-[2.04em] max-w-[14ch] text-[28px] leading-[1.02] font-bold uppercase xl:text-[32px]">
                  <Link to={showPath(h.item.title)} className="hover:underline">
                    {h.item.title}
                  </Link>
                </h3>
                {/* date and button sit on one line across the row, whatever the titles do */}
                <div className="mt-auto flex min-h-[32px] items-center justify-between gap-2 pt-3 text-[16px] font-medium uppercase">
                  <span>{shortDate(h.item)}</span>
                  {h.item.age && (
                    <span className="bg-brand-red font-heading text-paper rounded-[4px] px-2 py-1 text-[15px] font-semibold">
                      {h.item.age}
                    </span>
                  )}
                </div>
                {h.ticketUrl ? (
                  <a
                    href={h.ticketUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`${BTN} bg-ink text-paper mt-4 py-4 text-[16px]`}
                  >
                    Купить
                  </a>
                ) : (
                  <Link
                    to={showPath(h.item.title)}
                    className={`${BTN} bg-ink text-paper mt-4 py-4 text-[16px]`}
                  >
                    Подробнее
                  </Link>
                )}
              </Reveal>
            )
          })}
        </div>
        <div className="mt-6 sm:hidden">
          <MoreLink to="/afisha">Вся афиша</MoreLink>
        </div>
      </div>
    </section>
  )
}

/* ─────────────── courses ─────────────── */

export function CoursesBand() {
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section className="bg-brand-yellow relative">
      <Torn color="text-brand-yellow" seed={37} />
      <div
        className={`${WRAP} grid gap-10 py-16 md:grid-cols-[1fr_1fr] md:items-center md:gap-16 md:py-24`}
      >
        <Reveal>
          <RoughFrame>
            <img
              src={galleryPhoto('lager-1')}
              alt="Ученики театра на сцене"
              loading="lazy"
              className="aspect-[5/4] w-full object-cover"
            />
          </RoughFrame>
        </Reveal>
        <Reveal index={1} className="relative">
          <div className="flex items-start justify-between gap-4">
            <h2 className="font-heading max-w-[16ch] text-[clamp(38px,4.4vw,68px)] leading-[.92] font-bold uppercase">
              Курсы для детей и взрослых
            </h2>
            <img
              src={boyFence}
              alt=""
              aria-hidden="true"
              className="-mt-4 hidden h-32 w-40 flex-shrink-0 object-contain sm:block"
            />
          </div>
          {/* a tap opens a group: what it is, when, how much; one open at a time */}
          <ul className="divide-ink/60 border-ink/60 mt-7 divide-y border-b">
            {courses.map((c) => {
              const isOpen = open === c.key
              return (
                <li key={c.key}>
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpen(isOpen ? null : c.key)}
                    className="group flex w-full items-center justify-between gap-4 py-3.5 text-left"
                  >
                    <span>
                      <span className="font-heading block text-[24px] leading-tight font-bold uppercase group-hover:underline">
                        {c.name}
                      </span>
                      <span className="text-[16px]">
                        {c.ageRange}, {c.price.replace(' / мес', '/мес')}
                      </span>
                    </span>
                    <span
                      aria-hidden="true"
                      className={`font-heading text-[30px] leading-none transition-transform duration-300 ${isOpen ? 'rotate-45' : ''}`}
                    >
                      +
                    </span>
                  </button>
                  <div
                    className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
                  >
                    <div className="overflow-hidden">
                      <div className="pb-5 text-[16px] leading-[1.55]">
                        <p>{c.desc}</p>
                        {c.schedule && (
                          <p className="mt-2 font-semibold">
                            {c.schedule.replace(/\s*·\s*/g, ', ')}
                          </p>
                        )}
                        {c.start && <p className="mt-1 opacity-80">{c.start}</p>}
                        <Link
                          to="/kursy"
                          tabIndex={isOpen ? 0 : -1}
                          className="mt-3 inline-block font-semibold underline underline-offset-4"
                        >
                          Подробнее о группе →
                        </Link>
                      </div>
                    </div>
                  </div>
                </li>
              )
            })}
          </ul>
          <Link to="/kursy" className={`${BTN} bg-ink text-paper mt-7 w-full py-4.5 text-[16px]`}>
            Записаться на курс
          </Link>
        </Reveal>
      </div>
    </section>
  )
}

/* ─────────────── numbers, over the building ─────────────── */

const BUILDING = mediaUrl('/uploads/building/nur.jpg')

const NUMBERS: { value?: number; prefix?: string; text?: string; note: string }[] = [
  { value: 2003, note: 'год основания' },
  // from «Все постановки» on the about page, so a new show counts itself
  {
    value: productions.length,
    note:
      [2, 3, 4].includes(productions.length % 10) &&
      ![12, 13, 14].includes(productions.length % 100)
        ? 'постановки'
        : 'постановок',
  },
  { value: 5, note: 'стран гастролей' },
  { value: 2004, prefix: 'с ', note: 'свой фестиваль' },
  { text: 'Народный театр', note: 'звание с 2005 года' },
]

/** Counts up from 0 the first time it scrolls into view. */
function CountUp({ to }: { to: number }) {
  const ref = useRef<HTMLSpanElement>(null)
  const inView = useInView(ref, { once: true, amount: 0.6 })
  const reduce = useReducedMotion()
  useEffect(() => {
    const el = ref.current
    if (!el || !inView || reduce) return
    const controls = animate(0, to, {
      duration: to > 100 ? 1.8 : 1.2,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => {
        el.textContent = String(Math.round(v))
      },
    })
    return () => controls.stop()
  }, [inView, reduce, to])
  // the final number is in the markup, so it is right without scripts and for screen readers
  return <span ref={ref}>{to}</span>
}

export function NumbersBand() {
  return (
    <section className="bg-ink text-paper relative isolate">
      <Torn color="text-ink" seed={41} />
      <img
        src={BUILDING}
        alt=""
        loading="lazy"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_60%] opacity-55 grayscale-[.3]"
      />
      <div className="from-ink/85 via-ink/50 to-ink/95 absolute inset-0 -z-10 bg-gradient-to-b" />
      <div
        className={`${WRAP} relative z-[2] flex min-h-[640px] flex-col justify-between py-16 md:min-h-[min(92svh,860px)] md:py-24`}
      >
        <div className="relative">
          <Ink src={starSvg} light className="top-0 right-0 h-20 w-20 md:h-36 md:w-36" />
          <h2 className="font-heading text-[clamp(44px,8vw,120px)] leading-[.88] font-bold uppercase">
            Театр
            <br />в цифрах
          </h2>
          <p className="mt-5 max-w-md text-[16px] opacity-85 md:text-[18px]">
            {VENUE}, {CITY}. Здесь «Ключ» живёт, репетирует и играет.
          </p>
        </div>
        <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 md:flex md:justify-between md:gap-0">
          {NUMBERS.map((n) => (
            <div
              key={n.note}
              className="md:border-paper/40 md:border-l md:pl-[clamp(20px,2.4vw,44px)] md:first:border-l-0 md:first:pl-0 md:[&+&]:ml-[clamp(20px,2.4vw,44px)]"
            >
              <dt
                className={`font-heading font-bold uppercase ${n.text ? 'text-[32px] leading-[.95] md:text-[clamp(30px,2.8vw,50px)]' : 'text-[60px] leading-none whitespace-nowrap md:text-[clamp(52px,5.6vw,104px)]'}`}
              >
                {n.prefix && <span className="text-[.55em]">{n.prefix}</span>}
                {n.value !== undefined ? <CountUp to={n.value} /> : n.text}
              </dt>
              <dd className="mt-3 text-[14px] tracking-[.04em] uppercase opacity-85 md:text-[15px] md:whitespace-nowrap">
                {n.note}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

/* ─────────────── people ─────────────── */

// Who is shown and their crops come from the admin's team list (src/data/people.ts).
const PEOPLE = homePeople

export function PeopleSection() {
  // /#/?p=duo shows the yellow two-tone version, to compare with colour
  const [params] = useSearchParams()
  const duo = params.get('p') === 'duo'
  const [lead, ...rest] = PEOPLE
  // a tap on anyone opens their story, as on «Команда»
  const person = usePersonModal()
  return (
    <section className="bg-paper relative">
      <Torn color="text-paper" seed={53} />
      <div className={`${WRAP} pt-16 pb-16 md:pt-24`}>
        <SectionHead title="Люди театра" to="/komanda" link="Вся команда" />
        <div className="grid grid-cols-2 gap-x-5 gap-y-10 md:grid-cols-[1.45fr_1fr_1fr_1fr] md:gap-x-8">
          {lead && (
            <Reveal className="col-span-2 md:col-span-1">
              <button
                type="button"
                onClick={() => person.open(lead.name, lead.block)}
                aria-label={`${lead.name}: подробнее`}
                className="group block w-full text-left"
              >
                <Portrait
                  src={lead.src}
                  alt={lead.name}
                  focus={lead.focus}
                  zoom={lead.zoom}
                  block={lead.block}
                  duo={duo}
                  className="aspect-[1/1]"
                />
                <h3 className="font-heading mt-6 text-[26px] leading-tight font-bold uppercase underline-offset-4 group-hover:underline xl:text-[30px]">
                  {lead.name}
                </h3>
                <p className="text-ink/80 mt-1 text-[16px]">{lead.role}</p>
              </button>
            </Reveal>
          )}
          {rest.map((p, n) => (
            <Reveal
              key={p.name}
              index={n + 1}
              className={`md:pt-10 ${n === 2 ? 'col-span-2 mx-auto w-[calc(50%-10px)] md:col-span-1 md:mx-0 md:w-auto' : ''}`}
            >
              <button
                type="button"
                onClick={() => person.open(p.name, p.block)}
                aria-label={`${p.name}: подробнее`}
                className="group block w-full text-left"
              >
                <Portrait
                  src={p.src}
                  alt={p.name}
                  focus={p.focus}
                  zoom={p.zoom}
                  block={p.block}
                  duo={duo}
                  className="aspect-[5/6]"
                />
                <h3 className="font-heading mt-6 text-[21px] leading-tight font-bold uppercase underline-offset-4 group-hover:underline xl:text-[24px]">
                  {p.name}
                </h3>
                <p className="text-ink/80 mt-1 text-[15px]">{p.role}</p>
              </button>
            </Reveal>
          ))}
        </div>
        <div className="mt-8 sm:hidden">
          <MoreLink to="/komanda">Вся команда</MoreLink>
        </div>
      </div>
      {person.modal}
    </section>
  )
}

/* ─────────────── not only shows ─────────────── */

export function MoreThanShows() {
  return (
    <section className="bg-paper relative">
      <div className={`${WRAP} pb-12`}>
        <div className="border-ink/15 border-t pt-16 md:pt-24">
          <SectionHead title="Не только спектакли" />
          {/* every event from «Направления», like «Курсы» and «О театре» */}
          <EventCards />
        </div>
        <div className="relative h-14">
          <SwallowIcon className="text-ink pointer-events-none absolute bottom-0 left-0 h-16 -rotate-12 md:h-20" />
        </div>
      </div>
    </section>
  )
}

/* ─────────────── black torn strip between sections ─────────────── */

export function InkStrip() {
  return (
    <div aria-hidden="true" className="bg-ink relative my-8 h-12 md:h-16">
      <Torn color="text-ink" seed={61} />
      <Torn color="text-ink" side="bottom" seed={67} />
    </div>
  )
}
