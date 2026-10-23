import { useState, type CSSProperties } from 'react'
import { useParams } from 'react-router-dom'
import type { Direction, DirectionPage } from '../types/content'
import { canSignUp, directionBySlug } from '../data/directions'
import { upcomingAfisha } from '../data/afisha'
import {
  PrintFilters,
  BTN,
  H2,
  Ink,
  RoughFrame,
  SectionHead,
  WRAP,
} from '../components/home2/parts'
import { Torn } from '../components/home2/paper'
import { PageHero } from '../components/home2/PageHero'
import { PosterArt } from '../components/home2/ShowPoster'
import { longDate } from '../components/home2/homeData'
import { DirectionForm } from '../components/directions/DirectionForm'
import { Reveal } from '../components/ui/Reveal'
import { scrollToId } from '../lib/scrollToId'
import { CITY, PHONE, VENUE, telHref } from '../data/contacts'
import NotFoundPageV2 from './NotFoundPageV2'
import starSvg from '../../assets/el-star.svg'
import { VkFollow } from '../components/home2/VkFollow'
import { VK_URL } from '../data/socials'

// A seasonal event's page — the lab, the camp, the quest, the carnival night —
// built like the festival's from what the admin holds under «Направления»:
// text, facts, programme, questions, photos. Signing up follows that
// direction's «Приём заявок»: switched off, the page stays as a page about the
// event and the form gives way to "запись пока закрыта".

const TONE: Record<
  DirectionPage['tone'],
  { band: string; torn: string; btn: string; heroBtn: string; light: boolean; poster: number }
> = {
  red: {
    band: 'bg-brand-red text-paper',
    torn: 'text-brand-red',
    btn: 'bg-paper text-ink',
    heroBtn: 'bg-brand-red text-paper',
    light: true,
    poster: 0,
  },
  yellow: {
    band: 'bg-brand-yellow text-ink',
    torn: 'text-brand-yellow',
    btn: 'bg-ink text-paper',
    heroBtn: 'bg-brand-yellow text-ink',
    light: false,
    poster: 1,
  },
  blue: {
    band: 'bg-brand-blue text-paper',
    torn: 'text-brand-blue',
    btn: 'bg-paper text-ink',
    heroBtn: 'bg-brand-blue text-paper',
    light: true,
    poster: 2,
  },
  ink: {
    band: 'bg-ink text-paper',
    torn: 'text-ink',
    btn: 'bg-brand-yellow text-ink',
    heroBtn: 'bg-brand-yellow text-ink',
    light: true,
    poster: 3,
  },
}

// The title is huge, and a name in «…» does not break (the typograph glues
// «Солнечная пыль» into one piece), so its size follows the longest piece:
// «КВЕСТ» stays big, «СОЛНЕЧНАЯ ПЫЛЬ» shrinks to fit its column.
function titleSize(title: string): CSSProperties {
  const pieces = title.toUpperCase().match(/«[^»]{1,28}»|\S+/g) ?? [title]
  const longest = Math.max(...pieces.map((p) => p.length))
  const em = longest * 0.58 // Oswald bold capitals are about this wide
  return {
    '--title-m': `min(13vw, ${(92 / em).toFixed(2)}vw)`,
    '--title-d': `min(6.2vw, 100px, ${(40 / em).toFixed(2)}vw)`,
  } as CSSProperties
}

function Arrow() {
  return (
    <svg
      viewBox="0 0 48 24"
      className="text-ink hidden h-5 w-12 flex-shrink-0 md:block"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M2 12h42M34 4l10 8-10 8" />
    </svg>
  )
}

function EventPage({ d, page }: { d: Direction; page: DirectionPage }) {
  const [sent, setSent] = useState(false)
  const [, setShake] = useState(0)
  const open = canSignUp(d)
  const tone = TONE[page.tone]
  // the event's own dates from the afisha, e.g. the carnival night on 18 December
  const dates = upcomingAfisha.filter((a) => a.title.toLowerCase() === d.title.toLowerCase())
  const when = d.schedule || (dates[0] ? longDate(dates[0]) : '')

  const intro = (btn: string) => (
    <div>
      {page.kicker && (
        <div className="font-heading text-[15px] tracking-[.06em] uppercase md:text-[18px]">
          {page.kicker}
        </div>
      )}
      <h1
        className="font-heading mt-3 text-(length:--title-m) leading-[.95] font-bold uppercase md:text-(length:--title-d)"
        style={titleSize(d.title)}
      >
        {d.title}
      </h1>
      {when && (
        <p className="font-heading mt-6 text-[24px] font-semibold uppercase md:text-[32px]">
          {when}
        </p>
      )}
      <p className="mt-2 text-[16px] md:text-[18px]">
        {VENUE}, {CITY}
      </p>
      {open ? (
        <a
          href="#zapis"
          onClick={scrollToId('zapis')}
          className={`${BTN} ${btn} mt-8 px-9 py-4.5 text-[17px]`}
        >
          Записаться{' '}
          <span aria-hidden="true" className="ml-2">
            →
          </span>
        </a>
      ) : (
        <p className="mt-8 text-[16px] font-semibold md:text-[17px]">
          Запись пока закрыта
          {VK_URL && (
            <>
              {' — '}
              <a
                href="#zapis"
                onClick={scrollToId('zapis')}
                className="underline underline-offset-4"
              >
                узнать об открытии первыми
              </a>
            </>
          )}
        </p>
      )}
    </div>
  )

  return (
    <div className="bg-paper relative overflow-x-clip">
      <PrintFilters />

      {/* first screen: the event's photo across the screen, as on the homepage;
          without a photo, a band in the event's colour with its poster art */}
      {page.photo ? (
        <PageHero photo={page.photo} alt={d.title} seed={401}>
          {intro(tone.heroBtn)}
        </PageHero>
      ) : (
        <section className={`${tone.band} relative isolate`}>
          <div
            className={`${WRAP} relative z-[2] grid items-center gap-10 py-14 md:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)] md:gap-14 md:py-20`}
          >
            {intro(tone.btn)}
            <Reveal className="relative">
              <RoughFrame>
                <PosterArt photo="" n={tone.poster} className="aspect-[16/10]" />
              </RoughFrame>
              <Ink
                src={starSvg}
                light={tone.light}
                className="-bottom-24 -left-20 hidden h-20 w-20 -rotate-12 md:block"
              />
            </Reveal>
          </div>
          <Torn color={tone.torn} side="bottom" seed={401} />
        </section>
      )}

      {/* about */}
      {(page.intro.length > 0 || page.facts.length > 0 || page.posters.length > 0) && (
        <section className={`${WRAP} pt-20 pb-16 md:pt-24`}>
          <div className="grid gap-12 md:grid-cols-[1fr_auto] md:gap-16">
            <div>
              <h2 className={H2}>Подробнее</h2>
              <div className="mt-7 grid gap-6 text-[17px] leading-[1.6] md:grid-cols-2 md:gap-10">
                {page.intro.map((p, i) => (
                  <p key={i}>{p}</p>
                ))}
              </div>
            </div>
            {(page.facts.length > 0 || page.posters.length > 0) && (
              <div className="md:border-ink md:max-w-[340px] md:border-l-2 md:pl-10">
                {page.facts.length > 0 && (
                  <dl className="flex flex-wrap gap-x-10 gap-y-6 md:flex-col">
                    {page.facts.map((s) => (
                      <div key={s.note}>
                        <dt className="font-heading text-[56px] leading-none font-bold md:text-[72px]">
                          {s.big}
                        </dt>
                        <dd className="mt-1 text-[14px] tracking-[.04em] uppercase">{s.note}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                {/* the printed posters, whole; a tap opens one full size */}
                {page.posters.length > 0 && (
                  <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-1">
                    {page.posters.map((p) => (
                      <a
                        key={p}
                        href={p}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Афиша крупно"
                        className="block transition-transform hover:-translate-y-1"
                      >
                        <img
                          src={p}
                          alt={`Афиша: ${d.title}`}
                          loading="lazy"
                          className="w-full shadow-[0_10px_30px_rgba(0,0,0,.25)]"
                        />
                      </a>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* dates from the afisha */}
      {dates.length > 0 && (
        <section className={`${WRAP} pb-16`}>
          <div className="border-ink/15 border-t pt-12 md:pt-16">
            <SectionHead title="Даты" to="/afisha" link="Вся афиша" />
            <ul className="divide-ink/20 border-ink/20 divide-y border-y">
              {dates.map((a) => (
                <li key={a.day + a.mon + a.time} className="flex items-baseline gap-6 py-4">
                  <span className="font-heading text-[26px] font-bold uppercase md:text-[30px]">
                    {longDate(a)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* how to sign up */}
      {open && page.steps.length > 0 && (
        <section className={`${WRAP} pb-20`}>
          <div className="border-ink/15 border-t pt-14 md:pt-20">
            <SectionHead title="Как записаться" />
            <ol className="flex flex-col gap-10 md:flex-row md:items-start md:gap-6">
              {page.steps.map((s, i) => (
                <li key={s.title} className="flex flex-1 items-start gap-5 md:gap-6">
                  <div className="flex flex-1 gap-5">
                    <span className="bg-ink text-paper font-heading flex h-20 w-20 flex-shrink-0 items-center justify-center text-[54px] leading-none font-bold">
                      {i + 1}
                    </span>
                    <div>
                      <h3 className="font-heading text-[22px] leading-tight font-bold uppercase">
                        {s.title}
                      </h3>
                      {s.text && (
                        <p className="text-ink/80 mt-2 text-[15px] leading-[1.5]">{s.text}</p>
                      )}
                    </div>
                  </div>
                  {i < page.steps.length - 1 && <Arrow />}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {/* programme */}
      {page.program.length > 0 && (
        <section className="bg-ink text-paper relative">
          <Torn color="text-ink" seed={411} />
          <div className={`${WRAP} py-16 md:py-20`}>
            <SectionHead title="Программа" dark />
            <div className="grid gap-8 sm:grid-cols-2 md:gap-0 lg:grid-cols-5">
              {page.program.map((day) => (
                <div
                  key={day.day}
                  className="lg:border-paper/30 lg:border-l lg:px-6 lg:first:border-l-0 lg:first:pl-0"
                >
                  <div className="font-heading text-[26px] font-bold uppercase">{day.day}</div>
                  <ul className="mt-3 space-y-1.5 text-[15px]">
                    {day.items.map((it) => (
                      <li key={it}>• {it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <Torn color="text-ink" side="bottom" seed={417} />
        </section>
      )}

      {/* photos */}
      {page.photos.length >= 3 && (
        <section className={`${WRAP} pt-20 pb-16`}>
          <SectionHead title="Фото" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:items-center lg:grid-cols-5">
            {page.photos.slice(0, 5).map((p, i) => (
              <RoughFrame key={p} className={i % 2 ? 'md:translate-y-4' : ''}>
                <img src={p} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover" />
              </RoughFrame>
            ))}
          </div>
        </section>
      )}

      {/* questions */}
      {page.faq.length > 0 && (
        <section className={`${WRAP} pt-10 pb-20`}>
          <SectionHead title="Вопросы" />
          <div className="border-ink/25 divide-ink/25 max-w-4xl divide-y border-y">
            {page.faq.map((f) => (
              <details key={f.q} className="group">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[18px] font-medium [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <span
                    aria-hidden="true"
                    className="text-[26px] leading-none transition-transform duration-200 group-open:rotate-45"
                  >
                    +
                  </span>
                </summary>
                <p className="text-ink/80 pb-5 text-[16px] leading-[1.6] whitespace-pre-line">
                  {f.a}
                </p>
              </details>
            ))}
          </div>
        </section>
      )}

      {/* signing up */}
      <section id="zapis" className="bg-brand-yellow relative mt-8 scroll-mt-24">
        <Torn color="text-brand-yellow" seed={423} />
        <div
          className={`${WRAP} relative grid gap-10 pt-16 pb-24 md:grid-cols-[1fr_1.15fr] md:items-center md:gap-16 md:pt-20 md:pb-28`}
        >
          <div>
            <h2 className={`${H2} leading-[.95]`}>{open ? 'Записаться' : 'Узнать первыми'}</h2>
            <p className="mt-5 max-w-md text-[17px] md:text-[19px]">
              {open
                ? 'Оставьте заявку, и мы перезвоним: расскажем о датах, цене и условиях.'
                : 'Когда откроется запись, театр сразу напишет об этом в группе ВКонтакте. Подпишитесь, чтобы не пропустить. А вопросы — по телефону.'}
            </p>
            <a
              href={telHref(PHONE)}
              className="font-heading mt-8 block text-[30px] leading-tight font-bold hover:underline md:text-[34px]"
            >
              {PHONE}
            </a>
          </div>
          <div className="border-ink bg-paper relative border-2 p-5 shadow-[6px_6px_0_#1a1a1a] md:p-7">
            {!open ? (
              <div className="flex flex-col items-start gap-5">
                <p className="text-[17px] font-semibold">
                  Запись пока закрыта. Об открытии театр объявит во ВКонтакте, а на любой вопрос уже
                  сейчас ответит кот в углу страницы.
                </p>
                <VkFollow />
              </div>
            ) : sent ? (
              <p className="text-[17px] font-semibold">
                ✳ Спасибо! Заявка отправлена, мы свяжемся с вами.
              </p>
            ) : (
              <DirectionForm
                direction={d}
                onSuccess={() => setSent(true)}
                onInvalid={() => setShake((k) => k + 1)}
              />
            )}
          </div>
        </div>
      </section>
    </div>
  )
}

/** /laboratoriya, /kvest…: an event page, or the 404 for any other address. */
export default function EventPageV2() {
  const { slug = '' } = useParams()
  const d = directionBySlug(slug)
  if (!d?.page) return <NotFoundPageV2 />
  return <EventPage key={slug} d={d} page={d.page} />
}
