import { useState } from 'react'
import { directionByType } from '../data/directions'
import { mediaUrl } from '../lib/mediaUrl'
import festivalContent from '../content/festival.json'
import { PrintFilters, BTN, H2, RoughFrame, SectionHead, WRAP } from '../components/home2/parts'
import { Torn } from '../components/home2/paper'
import { PageHero } from '../components/home2/PageHero'
import { galleryPhoto } from '../components/home2/homeData'
import { FestivalSignupForm } from '../components/about/FestivalSignupForm'
import { scrollToId } from '../lib/scrollToId'
import { CITY, PHONE, VENUE, telHref } from '../data/contacts'

// The festival «Действующие лица»: what it is, how to apply, the programme,
// photos, questions and the application form. Text, programme, questions and
// photos come from the admin; an empty block simply is not shown.

// Decap stores a list with a single field as plain strings; older edits may be objects
const str = (v: unknown, key: string) =>
  typeof v === 'string' ? v : String((v as Record<string, unknown>)?.[key] ?? '')

interface Festival {
  intro: string[]
  stats: { big: string; note: string }[]
  program: { day: string; items: string[] }[]
  faq: { q: string; a: string }[]
  photos: string[]
}
const raw = festivalContent as unknown as Record<string, unknown[]>
const fest: Festival = {
  intro: (raw.intro ?? []).map((v) => str(v, 'text')).filter(Boolean),
  stats: (raw.stats ?? []) as Festival['stats'],
  program: ((raw.program ?? []) as { day: string; items?: unknown[] }[]).map((d) => ({
    day: d.day,
    items: (d.items ?? []).map((v) => str(v, 'item')).filter(Boolean),
  })),
  faq: ((raw.faq ?? []) as Festival['faq']).filter((f) => f.q),
  photos: (raw.photos ?? []).map((v) => mediaUrl(str(v, 'photo'))).filter(Boolean),
}

const STEPS = [
  ['Заполните форму', 'Укажите название коллектива, город и контакты.'],
  ['Мы свяжемся', 'Пришлём положение фестиваля и ответим на вопросы.'],
  ['Приезжайте', 'Покажите свой спектакль, встретьтесь с коллегами и зрителями.'],
]

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

const FESTIVAL_LOGO = mediaUrl('/uploads/festival-logo.png')

export default function FestivalPageV2() {
  const festival = directionByType('festival')
  const open = festival?.open !== false
  const [sent, setSent] = useState(false)
  const [, setShake] = useState(0)

  return (
    <div className="bg-paper relative overflow-x-clip">
      <PrintFilters />

      {/* first screen: the award ceremony, the festival's own emblem beside the title */}
      <PageHero
        photo={galleryPhoto('nagrazhdenie-1')}
        alt="Награждение на фестивале «Действующие лица»"
        focus="72% 70%"
        imgStyle={{ transform: 'scale(1.35)', transformOrigin: '72% 70%' }}
        seed={201}
      >
        <div className="font-heading text-[15px] tracking-[.06em] uppercase md:text-[18px]">
          Всероссийский театральный фестиваль
        </div>
        <h1 className="font-heading mt-3 text-[clamp(52px,8vw,120px)] leading-[.95] font-bold uppercase">
          Действующие
          <br />
          лица
        </h1>
        {festival?.schedule && (
          <p className="font-heading mt-6 text-[26px] font-semibold uppercase md:text-[34px]">
            {festival.schedule}
          </p>
        )}
        <p className="mt-2 text-[16px] md:text-[18px]">
          {VENUE}, {CITY}
        </p>
        <div className="mt-8 flex items-center gap-6 md:gap-8">
          {open ? (
            <a
              href="#zayavka"
              onClick={scrollToId('zayavka')}
              className={`${BTN} bg-paper text-ink px-9 py-4.5 text-[17px]`}
            >
              Подать заявку{' '}
              <span aria-hidden="true" className="ml-2">
                →
              </span>
            </a>
          ) : (
            <p className="border-paper inline-block border-2 px-5 py-3 text-[15px] font-semibold">
              Приём заявок закрыт — следите за новостями
            </p>
          )}
          <img
            src={FESTIVAL_LOGO}
            alt="Эмблема фестиваля «Действующие лица»"
            className="h-16 w-16 flex-shrink-0 md:h-24 md:w-24"
          />
        </div>
      </PageHero>

      {/* about */}
      <section className={`${WRAP} pt-20 pb-16 md:pt-24`}>
        <div className="grid gap-12 md:grid-cols-[1fr_auto] md:gap-16">
          <div>
            <h2 className={H2}>О фестивале</h2>
            <div className="mt-7 grid gap-6 text-[17px] leading-[1.6] md:grid-cols-2 md:gap-10">
              {fest.intro.map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </div>
          {fest.stats.length > 0 && (
            <dl className="md:border-ink flex flex-wrap gap-x-10 gap-y-6 md:flex-col md:border-l-2 md:pl-10">
              {fest.stats.map((s) => (
                <div key={s.note}>
                  <dt className="font-heading text-[56px] leading-none font-bold md:text-[72px]">
                    {s.big}
                  </dt>
                  <dd className="mt-1 text-[14px] tracking-[.04em] uppercase">{s.note}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      </section>

      {/* how to apply */}
      <section className={`${WRAP} pb-20`}>
        <div className="border-ink/15 border-t pt-14 md:pt-20">
          <SectionHead title="Как подать заявку" />
          <ol className="flex flex-col gap-10 md:flex-row md:items-start md:gap-6">
            {STEPS.map(([title, text], i) => (
              <li key={title} className="flex flex-1 items-start gap-5 md:gap-6">
                <div className="flex flex-1 gap-5">
                  <span className="bg-ink text-paper font-heading flex h-20 w-20 flex-shrink-0 items-center justify-center text-[54px] leading-none font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-heading text-[22px] leading-tight font-bold uppercase">
                      {title}
                    </h3>
                    <p className="text-ink/80 mt-2 text-[15px] leading-[1.5]">{text}</p>
                  </div>
                </div>
                {i < STEPS.length - 1 && <Arrow />}
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* programme */}
      {fest.program.length > 0 && (
        <section className="bg-ink text-paper relative">
          <Torn color="text-ink" seed={211} />
          <div className={`${WRAP} py-16 md:py-20`}>
            <SectionHead title="Программа" dark />
            <div className="grid gap-8 sm:grid-cols-2 md:gap-0 lg:grid-cols-5">
              {fest.program.map((d) => (
                <div
                  key={d.day}
                  className="lg:border-paper/30 lg:border-l lg:px-6 lg:first:border-l-0 lg:first:pl-0"
                >
                  <div className="font-heading text-[26px] font-bold uppercase">{d.day}</div>
                  <ul className="mt-3 space-y-1.5 text-[15px]">
                    {d.items.map((it) => (
                      <li key={it}>• {it}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
          <Torn color="text-ink" side="bottom" seed={217} />
        </section>
      )}

      {/* photos of past years */}
      {fest.photos.length >= 3 && (
        <section className={`${WRAP} pt-20 pb-16`}>
          <SectionHead title="Фото прошлых лет" />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5 md:items-center">
            {fest.photos.slice(0, 5).map((p, i) => (
              <RoughFrame key={p} className={i % 2 ? 'md:translate-y-4' : ''}>
                <img src={p} alt="" loading="lazy" className="aspect-[3/4] w-full object-cover" />
              </RoughFrame>
            ))}
          </div>
        </section>
      )}

      {/* questions */}
      {fest.faq.length > 0 && (
        <section className={`${WRAP} pt-10 pb-20`}>
          <SectionHead title="Вопросы" />
          <div className="border-ink/25 divide-ink/25 max-w-4xl divide-y border-y">
            {fest.faq.map((f) => (
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

      {/* application form */}
      <section id="zayavka" className="bg-brand-yellow relative scroll-mt-24">
        <Torn color="text-brand-yellow" seed={223} />
        <div
          className={`${WRAP} relative grid gap-10 pt-16 pb-24 md:grid-cols-[1fr_1.15fr] md:items-center md:gap-16 md:pt-20 md:pb-28`}
        >
          <div>
            <h2 className={`${H2} leading-[.95]`}>
              Подать заявку
              <br />
              на участие
            </h2>
            <p className="mt-5 max-w-md text-[17px] md:text-[19px]">
              Заполните форму, и мы свяжемся с вами, пришлём положение фестиваля и ответим на
              вопросы.
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
              <p className="text-[17px] font-semibold">
                Приём заявок сейчас закрыт. Следите за новостями театра, мы объявим следующий
                фестиваль.
              </p>
            ) : sent ? (
              <p className="text-[17px] font-semibold">
                ✳ Спасибо! Заявка отправлена, мы свяжемся с вами.
              </p>
            ) : (
              <FestivalSignupForm
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
