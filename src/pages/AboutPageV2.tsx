import { Link } from 'react-router-dom'
import { awards } from '../data/awards'
import { productions } from '../data/productions'
import { mediaUrl } from '../lib/mediaUrl'
import {
  PrintFilters,
  BTN,
  Ink,
  MoreLink,
  Portrait,
  SectionHead,
  WRAP,
} from '../components/home2/parts'
import { Torn } from '../components/home2/paper'
import { PageHero } from '../components/home2/PageHero'
import { galleryPhoto, showPath } from '../components/home2/homeData'
import { shows } from '../data/shows'
import { Reveal } from '../components/ui/Reveal'
import starSvg from '../../assets/el-star.svg'
import { directionPath } from '../data/directions'

// «О театре»: who we are, the history year by year, the numbers over the
// building, what else the theatre does, awards and every production.

const HISTORY: [string, string][] = [
  [
    '2003',
    'Компания молодых неформалов начинает театральную студию при Центре детского творчества «Огниво»',
  ],
  ['2004', 'Первый Всероссийский театральный фестиваль «Действующие лица»'],
  ['2005', 'Звание «Народный театр» от Министерства культуры Республики Татарстан'],
  ['2008', 'Студия при Набережночелнинском педагогическом институте'],
  ['2012', 'Первая лаборатория «ЛСД» — Лаборатория современной драматургии'],
  ['2018', 'Театр становится АНО и переезжает в молодёжный центр «НУР»'],
  ['2020', 'Открываются студия для детей и подростков и курсы для взрослых'],
  ['2022', 'Первый летний театральный лагерь «Солнечная пыль»'],
]

const TOURS = 'Сербия, Литва, Латвия, Беларусь, Армения'

// from the theatre's «о нас» document
const GRADUATES: [string, string][] = [
  ['Роман Гуськов', 'Киноактёр'],
  ['Игорь Василевский', 'Ведущий актёр драматического театра Удмуртии'],
  ['Никита Кобелев', 'Художественный руководитель Александринского театра в Санкт-Петербурге'],
]

const inRepertoire = new Set(shows.map((s) => s.title))

const DIRECTIONS = [
  {
    title: 'Фестиваль «Действующие лица»',
    note: 'Всероссийский, с 2004 года. К нам приезжают театральные коллективы со всей России: показы, мастерские, обсуждения.',
    photo: 'nagrazhdenie-1',
    block: 'bg-brand-red',
    to: '/festival',
  },
  {
    title: 'Лаборатория «ЛСД»',
    note: 'Молодые режиссёры вместе с актёрами «Ключа» за три дня готовят эскизы спектаклей и показывают их зрителям.',
    photo: 'spektakl-1',
    block: 'bg-brand-yellow',
    to: directionPath('lab'),
  },
  {
    title: 'Лагерь «Солнечная пыль»',
    note: 'Каждое лето: занятия с педагогами, игры, экскурсии в другие театры и итоговая постановка для родителей.',
    photo: 'lager-1',
    block: 'bg-brand-blue',
    to: directionPath('camp'),
  },
]

export default function AboutPageV2() {
  const years = new Date().getFullYear() - 2003
  // 21 год, 23 года, 25 лет
  const plural = (n: number, one: string, few: string, many: string) => {
    const t = n % 100
    const u = n % 10
    if (t >= 11 && t <= 14) return many
    return u === 1 ? one : u >= 2 && u <= 4 ? few : many
  }

  return (
    <div className="bg-paper relative overflow-x-clip">
      <PrintFilters />

      {/* first screen */}
      <PageHero
        photo={galleryPhoto('posledstviy-5')}
        focus="62% 30%"
        alt="Актёры театра «Ключ» на сцене"
        seed={113}
      >
        <div className="font-heading text-[15px] tracking-[.08em] uppercase md:text-[17px]">
          О театре
        </div>
        <h1 className="font-heading mt-3 text-[clamp(56px,9vw,132px)] leading-[.9] font-bold uppercase">
          Театр
          <br />
          свободы
        </h1>
        <p className="font-heading text-brand-yellow mt-6 max-w-md text-[24px] leading-[1.15] font-semibold uppercase md:text-[28px]">
          Нам нравится жить по правилам, которые мы сами придумываем.
        </p>
        <p className="mt-6 max-w-lg text-[17px] leading-[1.6] md:text-[18px]">
          Молодёжный театр «Ключ» в Набережных Челнах с 2003 года. Театр для каждого свой. Для нас
          он — территория полёта и жизни без границ.
        </p>
      </PageHero>

      {/* quote */}
      {/* on paper: the first screen above is already black */}
      <section className="relative">
        <div className={`${WRAP} relative py-16 md:py-24`}>
          <Ink src={starSvg} className="top-10 right-10 hidden h-24 w-24 md:block" />
          <blockquote className="max-w-5xl">
            <p className="font-heading text-[clamp(30px,4.6vw,64px)] leading-[1.05] font-medium uppercase">
              «Необходимо создавать места, где можно остановить время и там ждать отставшую душу»
            </p>
            <footer className="text-ink/75 mt-6 text-[16px] md:text-[18px]">
              Тонино Гуэрра — это о нашем театре
            </footer>
          </blockquote>
        </div>
      </section>

      {/* history */}
      <section className={`${WRAP} pt-20 pb-16 md:pt-28`}>
        <SectionHead title="История" />
        <ol className="relative grid grid-cols-2 gap-x-5 gap-y-8 md:gap-x-8 md:gap-y-10 lg:grid-cols-4">
          {HISTORY.map(([year, text], i) => (
            <Reveal key={year} index={i % 4} className="border-ink border-t-2 pt-4">
              <div className="font-heading text-[40px] leading-none font-bold md:text-[64px]">
                {year}
              </div>
              <p className="mt-3 text-[14px] leading-[1.45] md:text-[16px] md:leading-[1.5]">
                {text}
              </p>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* numbers over the building */}
      <section className="bg-ink text-paper relative isolate">
        <Torn color="text-ink" seed={251} />
        <img
          src={mediaUrl('/uploads/building/nur.jpg')}
          alt=""
          loading="lazy"
          className="absolute inset-0 -z-10 h-full w-full object-cover object-[50%_60%] opacity-45"
        />
        <div className="from-ink/85 via-ink/50 to-ink/90 absolute inset-0 -z-10 bg-gradient-to-b" />
        <div className={`${WRAP} relative z-[2] py-20 md:py-28`}>
          <SectionHead title="Театр в цифрах" dark />
          <dl className="grid grid-cols-2 gap-x-6 gap-y-10 md:grid-cols-4">
            {[
              [
                String(productions.length),
                plural(productions.length, 'постановка', 'постановки', 'постановок'),
              ],
              ['5', 'стран гастролей'],
              [`${years}`, `${plural(years, 'год', 'года', 'лет')} театру`],
              ['с 2004', 'свой фестиваль'],
            ].map(([big, note]) => (
              <div key={note}>
                <dt className="font-heading text-[56px] leading-none font-bold whitespace-nowrap md:text-[88px]">
                  {big}
                </dt>
                <dd className="mt-3 text-[14px] tracking-[.04em] uppercase opacity-85">{note}</dd>
              </div>
            ))}
          </dl>
          <p className="text-paper/80 mt-10 text-[16px]">Гастроли: {TOURS}</p>
        </div>
        <Torn color="text-ink" side="bottom" seed={257} />
      </section>

      {/* what else we do */}
      <section className={`${WRAP} pt-20 pb-16 md:pt-28`}>
        <SectionHead title="Не только спектакли" />
        <div className="grid gap-14 md:grid-cols-3 md:gap-10 xl:gap-14">
          {DIRECTIONS.map((d, i) => (
            <Reveal key={d.title} index={i}>
              <Portrait
                src={galleryPhoto(d.photo)}
                alt={d.title}
                block={d.block}
                focus="50% 45%"
                className="aspect-[4/3]"
              />
              <h3 className="font-heading mt-7 text-[28px] leading-[1.02] font-bold uppercase xl:text-[32px]">
                {d.title}
              </h3>
              <p className="text-ink/80 mt-3 text-[16px] leading-[1.55]">{d.note}</p>
              {d.to && (
                <MoreLink to={d.to} className="mt-5">
                  Подробнее
                </MoreLink>
              )}
            </Reveal>
          ))}
        </div>
      </section>

      {/* graduates and joint projects */}
      <section className={`${WRAP} pb-16`}>
        <div className="border-ink/15 border-t pt-14 md:pt-20">
          <SectionHead title="Наши выпускники" />
          <p className="max-w-3xl text-[17px] leading-[1.6] md:text-[18px]">
            Многие выпускники «Ключа» потом получили профессиональное театральное образование и
            сейчас работают актёрами и режиссёрами.
          </p>
          <ul className="mt-10 grid gap-x-10 gap-y-8 md:grid-cols-3">
            {GRADUATES.map(([name, role]) => (
              <li key={name} className="border-ink border-t-2 pt-4">
                <div className="font-heading text-[28px] leading-[1.05] font-bold uppercase md:text-[32px]">
                  {name}
                </div>
                <p className="text-ink/80 mt-3 text-[16px] leading-[1.5]">{role}</p>
              </li>
            ))}
          </ul>
          <p className="text-ink/80 mt-12 max-w-3xl text-[16px] leading-[1.6] md:text-[17px]">
            Команда театра делала совместные проекты с камерным оркестром Игоря Лермана, с КАМАЗом и
            другими, а на гастролях представляла Республику Татарстан.
          </p>
        </div>
      </section>

      {/* awards */}
      <section className={`${WRAP} pb-16`}>
        <div className="border-ink/15 border-t pt-14 md:pt-20">
          <SectionHead title="Награды и регалии" />
          <ul className="grid gap-x-12 gap-y-5 md:grid-cols-2">
            {awards.map((a) => (
              <li key={a} className="flex items-start gap-4 text-[17px] leading-[1.5]">
                <img
                  src={starSvg}
                  alt=""
                  aria-hidden="true"
                  className="mt-0.5 h-6 w-6 flex-shrink-0"
                />
                {a}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* every production, like the back page of a playbill */}
      <section className={`${WRAP} pb-24`}>
        <div className="border-ink/15 border-t pt-14 md:pt-20">
          <SectionHead title="Все постановки" />
          <ul className="columns-1 gap-x-12 sm:columns-2 lg:columns-3">
            {productions.map((p) => (
              <li
                key={p.year + p.title}
                className="mb-5 flex break-inside-avoid items-baseline gap-4 text-[16px] leading-[1.4]"
              >
                <span className="font-heading text-brand-red w-12 flex-shrink-0 text-[15px] font-semibold">
                  {p.year}
                </span>
                <span>
                  {/* still on stage: the title leads to the show's page */}
                  {inRepertoire.has(p.title) ? (
                    <Link
                      to={showPath(p.title)}
                      className="decoration-brand-red underline decoration-2 underline-offset-4"
                    >
                      «{p.title}»
                    </Link>
                  ) : (
                    <>«{p.title}»</>
                  )}
                  {p.note && (
                    <span className="text-ink/65 mt-1 block text-[14px] leading-[1.4]">
                      {/* «М. Цветаевой» never splits after the initial */}
                      {p.note.replace(/([А-ЯЁA-Z]\.) /g, '$1 ')}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-12 flex flex-wrap gap-4">
            <Link to="/repertuar" className={`${BTN} bg-ink text-paper`}>
              Что идёт сейчас
            </Link>
            <Link to="/komanda" className={`${BTN} border-ink border-2`}>
              Команда театра
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
