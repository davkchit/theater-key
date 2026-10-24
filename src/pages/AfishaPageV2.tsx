import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AfishaItem } from '../types/content'
import { upcomingAfisha } from '../data/afisha'
import { shows } from '../data/shows'
import { PrintFilters, BTN, RoughFrame, WRAP } from '../components/home2/parts'
import { Torn } from '../components/home2/paper'
import { TICKETS_URL, heroShows, longDate, showPath } from '../components/home2/homeData'
import { PosterArt } from '../components/home2/ShowPoster'
import { SwallowIcon } from '../components/ui/SwallowIcon'
import starSvg from '../../assets/el-star.svg'
import { PHONE, PLACE, TICKETS_WHERE, telHref } from '../data/contacts'
import { ReviewBand } from '../components/reviews/Review'
import { directionPathByTitle } from '../data/directions'

// «Афиша» from the approved mockup, in two versions the visitor can switch
// between: «тёмный зал» (the schedule on a black band, like an auditorium
// with the lights down) and «программка» (a printed playbill on paper).
// Only dates still to come are listed; the choice is remembered.

type Theme = 'dark' | 'light'
const THEME_KEY = 'kluch-afisha-theme'

const NOMINATIVE: Record<string, string> = {
  января: 'Январь',
  февраля: 'Февраль',
  марта: 'Март',
  апреля: 'Апрель',
  мая: 'Май',
  июня: 'Июнь',
  июля: 'Июль',
  августа: 'Август',
  сентября: 'Сентябрь',
  октября: 'Октябрь',
  ноября: 'Ноябрь',
  декабря: 'Декабрь',
}
const WD: Record<string, string> = {
  воскресенье: 'вс',
  понедельник: 'пн',
  вторник: 'вт',
  среда: 'ср',
  четверг: 'чт',
  пятница: 'пт',
  суббота: 'сб',
}

const byTitle = (t: string) => shows.find((s) => s.title.toLowerCase() === t.toLowerCase())
const months = [...new Set(upcomingAfisha.map((i) => i.mon))]
// The first show of the month on screen; its first-screen photo from the
// admin when it has one, else its own photo, else a drawn poster.
function featuredOf(item?: AfishaItem) {
  if (!item) return null
  const show = byTitle(item.title)
  const heroPick = heroShows.find((h) => h.item.title.toLowerCase() === item.title.toLowerCase())
  return {
    item,
    show,
    photo: heroPick?.photo || show?.photo || '',
    focus: heroPick?.focus,
    ticketUrl: item.ticketUrl || show?.ticketUrl || TICKETS_URL,
  }
}
// "ноября" → "в ноябре"
const inMonth = (mon: string) => 'в ' + mon.replace(/[ая]$/, 'е')

// A theatre season runs September to August: "2026 / 2027" until next summer.
function season(now = new Date()) {
  const from = now.getMonth() >= 8 ? now.getFullYear() : now.getFullYear() - 1
  return `${from} / ${from + 1}`
}

function readTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

function ThemeSwitch({ theme, onChange }: { theme: Theme; onChange: (t: Theme) => void }) {
  const options: [Theme, string][] = [
    ['dark', 'Тёмная'],
    ['light', 'Светлая'],
  ]
  return (
    <div className="border-ink inline-flex border-2 p-1" role="group" aria-label="Оформление афиши">
      {options.map(([t, label]) => (
        <button
          key={t}
          onClick={() => onChange(t)}
          aria-pressed={theme === t}
          className={`font-heading px-4 py-1.5 text-[14px] font-semibold tracking-[.04em] uppercase transition-colors active:scale-[.97] ${
            theme === t ? 'bg-ink text-paper' : 'text-ink hover:bg-ink/10'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function AgeRing({ age, dark }: { age?: string; dark: boolean }) {
  if (!age) return <span className="block w-11" />
  return (
    <span
      className={`font-heading flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full border-[1.5px] text-[13px] font-semibold ${
        dark ? 'border-paper/80' : 'border-ink'
      }`}
    >
      {age}
    </span>
  )
}

function Row({ item, dark }: { item: AfishaItem; dark: boolean }) {
  const show = byTitle(item.title)
  const ticket = item.ticketUrl || show?.ticketUrl || TICKETS_URL
  // a show's page, or an event's own page (a carnival night sold on Bileton)
  const to = show ? showPath(show.title) : (directionPathByTitle(item.title) ?? null)
  return (
    <li
      className={`grid grid-cols-[auto_1fr_auto] items-center gap-x-4 gap-y-2 py-5 sm:grid-cols-[88px_auto_1fr_auto_auto] sm:gap-x-6 md:gap-x-8 ${
        dark ? 'border-paper/25 border-b' : 'border-ink/30 border-b'
      }`}
    >
      <div className="w-16 sm:w-auto">
        <div className="font-heading text-[48px] leading-none font-bold md:text-[56px]">
          {Number(item.day)}
        </div>
        <div className="mt-1 text-[12px] tracking-[.06em] uppercase">
          {item.mon.slice(0, 3)} · {WD[item.wd] ?? item.wd}
        </div>
      </div>
      <div
        className={`font-heading hidden text-[20px] font-semibold sm:block sm:pl-6 ${
          dark ? 'border-paper/40 border-l' : 'border-brand-red border-l-4'
        }`}
      >
        {item.time}
      </div>
      <div className="min-w-0">
        <h3 className="font-heading text-[24px] leading-[1.05] font-bold uppercase md:text-[32px]">
          {to ? (
            <Link to={to} className="hover:underline">
              {item.title}
            </Link>
          ) : (
            item.title
          )}
        </h3>
        <div
          className={`mt-1 flex flex-wrap gap-x-3 text-[14px] ${dark ? 'text-paper/65' : 'text-ink/60'}`}
        >
          <span className="font-heading text-[16px] font-semibold sm:hidden">{item.time}</span>
          {show?.genre && <span>{show.genre}</span>}
          {item.hall && <span>{item.hall}</span>}
        </div>
      </div>
      <div className="hidden sm:block">
        <AgeRing age={item.age} dark={dark} />
      </div>
      {ticket ? (
        <a
          href={ticket}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BTN} px-6 py-3 text-[14px] ${
            dark
              ? 'border-paper text-paper hover:bg-paper hover:text-ink border-2'
              : 'bg-ink text-paper'
          }`}
        >
          Купить
        </a>
      ) : (
        <span />
      )}
    </li>
  )
}

// The stage photo sells the live show; the printed poster stands in only
// for a show that has no photo of its own yet.
const posterOnly = (f: NonNullable<ReturnType<typeof featuredOf>>) =>
  f.show?.poster && (!f.photo || f.photo === f.show.poster) ? f.show.poster : undefined

function Featured({ item, first, dark }: { item?: AfishaItem; first: boolean; dark: boolean }) {
  const featured = featuredOf(item)
  if (!featured) return null
  const poster = posterOnly(featured)
  return (
    <div className="grid items-center gap-8 md:grid-cols-[1.1fr_1fr] md:gap-12">
      {poster ? (
        <Link
          to={showPath(featured.item.title)}
          className="mx-auto block w-[min(100%,380px)] -rotate-1 shadow-[0_20px_50px_rgba(0,0,0,.35)] transition-transform hover:rotate-0"
        >
          <img src={poster} alt={`Афиша спектакля «${featured.item.title}»`} className="w-full" />
        </Link>
      ) : (
        <RoughFrame>
          {featured.photo ? (
            <img
              src={featured.photo}
              alt={`«${featured.item.title}»`}
              className="aspect-[16/10] w-full object-cover"
              style={{ objectPosition: featured.focus ?? '60% 40%' }}
            />
          ) : (
            <PosterArt
              photo=""
              n={Math.max(
                0,
                shows.findIndex((x) => x.title === featured.item.title),
              )}
              className="aspect-[16/10]"
            />
          )}
        </RoughFrame>
      )}
      <div className="relative">
        {dark && (
          <img
            src={starSvg}
            alt=""
            aria-hidden="true"
            className="absolute -top-4 right-0 hidden h-20 w-20 invert md:block"
          />
        )}
        <span className="bg-brand-red text-paper font-heading inline-block px-3 py-1 text-[13px] font-semibold tracking-[.06em] uppercase">
          {first ? 'Ближайший спектакль' : `Первый ${inMonth(featured.item.mon)}`}
        </span>
        <h2 className="font-heading mt-4 text-[clamp(44px,6vw,84px)] leading-[.95] font-bold uppercase">
          {featured.item.title}
        </h2>
        <p className="mt-3 text-[18px] md:text-[20px]">{longDate(featured.item)}</p>
        <div className="mt-6 flex flex-wrap items-center gap-x-7 gap-y-3">
          {featured.ticketUrl && (
            <a
              href={featured.ticketUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${BTN} bg-brand-red text-paper px-8 py-4 text-[16px]`}
            >
              Купить билет
            </a>
          )}
          <Link
            to={showPath(featured.item.title)}
            className="group inline-flex items-center gap-2.5 text-[16px] font-medium"
          >
            <span className="border-b border-current pb-0.5">О спектакле</span>
            <span aria-hidden="true" className="transition-transform group-hover:translate-x-1">
              →
            </span>
          </Link>
        </div>
      </div>
    </div>
  )
}

function Months({
  month,
  setMonth,
  dark,
}: {
  month: string
  setMonth: (m: string) => void
  dark: boolean
}) {
  const active = dark ? 'bg-brand-yellow text-ink' : 'bg-ink text-paper'
  const idle = dark ? 'text-paper/70 hover:text-paper' : 'text-ink/55 hover:text-ink'
  return (
    <div className="flex flex-wrap gap-2" role="tablist" aria-label="Месяцы">
      {months.map((m) => (
        <button
          key={m}
          role="tab"
          aria-selected={m === month}
          onClick={() => setMonth(m)}
          className={`font-heading px-4 py-2 text-[16px] font-semibold tracking-[.04em] uppercase transition-colors active:scale-[.97] md:text-[18px] ${
            m === month ? active : idle
          }`}
        >
          {NOMINATIVE[m] ?? m}
        </button>
      ))}
    </div>
  )
}

export default function AfishaPageV2() {
  const [theme, setThemeState] = useState<Theme>(readTheme)
  const [month, setMonth] = useState(months[0] ?? '')
  const items = upcomingAfisha.filter((i) => i.mon === month)
  const dark = theme === 'dark'

  const [fading, setFading] = useState(false)
  const setTheme = (t: Theme) => {
    if (t === theme || fading) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) setThemeState(t)
    else {
      setFading(true)
      setTimeout(() => setThemeState(t), 200)
      setTimeout(() => setFading(false), 550)
    }
    try {
      localStorage.setItem(THEME_KEY, t)
    } catch {
      /* private mode: the choice just is not remembered */
    }
  }

  const schedule = months.length ? (
    <>
      <Months month={month} setMonth={setMonth} dark={dark} />
      <div className="mt-10">
        <Featured item={items[0]} first={month === months[0]} dark={dark} />
      </div>
      <ul className={`mt-12 border-t ${dark ? 'border-paper/25' : 'border-ink/30'}`}>
        {items.map((item) => (
          <Row key={item.day + item.mon + item.time + item.title} item={item} dark={dark} />
        ))}
      </ul>
    </>
  ) : (
    <p className="text-[18px]">Новый сезон скоро появится в афише. Следите за новостями театра.</p>
  )

  return (
    <div className="bg-paper relative overflow-x-clip">
      <PrintFilters />

      <section className={`${WRAP} relative pt-14 pb-10 md:pt-20`}>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h1 className="font-heading text-[clamp(56px,10vw,140px)] leading-[.9] font-bold uppercase">
              Афиша
            </h1>
            <p className="mt-4 text-[17px] md:text-[19px]">
              Сезон {season()} · {PLACE}
            </p>
          </div>
          <ThemeSwitch theme={theme} onChange={setTheme} />
        </div>
      </section>

      {/* The dark look comes down over the paper like a curtain and goes back
          up; the list itself dips out for a moment and comes back in the new
          colours. Same spacing in both looks, so nothing on the page jumps. */}
      <section className="relative">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 -top-[30px] bottom-0 transition-[clip-path] duration-[650ms] ease-[cubic-bezier(.65,0,.35,1)] motion-reduce:transition-none"
          style={{ clipPath: dark ? 'inset(0 0 0 0)' : 'inset(0 0 100% 0)' }}
        >
          <div className="bg-ink absolute inset-x-0 top-[30px] bottom-0">
            <Torn color="text-ink" seed={301} />
          </div>
        </div>
        <div
          className={`${WRAP} relative py-14 transition-opacity duration-200 md:py-16 ${dark ? 'text-paper' : 'text-ink'} ${fading ? 'opacity-0' : 'opacity-100'}`}
        >
          {schedule}
        </div>
      </section>

      <ReviewBand red />

      <section className="bg-brand-yellow relative">
        <Torn color="text-brand-yellow" seed={291} />
        <div
          className={`${WRAP} flex flex-col gap-3 py-8 md:flex-row md:items-center md:justify-between md:py-10`}
        >
          <p className="text-[16px] md:text-[18px]">
            Даты и составы могут меняться. Билеты — {TICKETS_WHERE}.
          </p>
          <div className="flex items-center gap-6">
            <a
              href={telHref(PHONE)}
              className="font-heading text-[26px] leading-tight font-bold whitespace-nowrap hover:underline"
            >
              {PHONE}
            </a>
            <SwallowIcon className="text-ink h-10 -rotate-6" />
          </div>
        </div>
      </section>
    </div>
  )
}
