import settings from '../content/settings.json'
import { shows, showSlug } from '../data/shows'
import { courses } from '../data/courses'
import { upcomingAfisha } from '../data/afisha'
import { directionPages } from '../data/directions'
import { ADDRESS, CITY, EMAIL, HOURS, PHONE, PHONE2, VENUE } from '../data/contacts'
import { profileLinks } from '../data/socials'

// What search engines and link previews read about each page: the title, the
// description under it in the results, the picture for a shared link, and a
// machine-readable card of the theatre and its shows (schema.org). The browser
// sets the same title and description on each page (RouteMeta); the build
// writes them into every page's own HTML (scripts/prerender.mjs), along with
// sitemap.xml and robots.txt.

const s = settings as Partial<Record<string, string>>

/** "https://kluchtheatre.ru", from «Настройки сайта»; '' while the site has no domain of its own */
export const SITE_URL = (s.siteUrl ?? '').trim().replace(/\/+$/, '')

/** Yandex Metrica counter, digits only; '' = no counter */
export const METRIKA_ID = /^\d+$/.test((s.metrikaId ?? '').trim()) ? (s.metrikaId ?? '').trim() : ''

export interface PageMeta {
  path: string
  title: string
  description: string
  /** root-relative picture for a shared link */
  image?: string
  jsonLd?: object[]
}

const NAME = 'Театр «Ключ»'
const WHERE = `${CITY}`
const DEFAULT_IMAGE = '/uploads/hero/simon.jpg'

/** "https://site" + "/x"; root-relative stays as is while there is no domain */
export const abs = (p: string) => (/^https?:/.test(p) ? p : SITE_URL + p)

// "Симон" -> one or two sentences of its synopsis, cut on a word under ~160 characters
function clip(text: string, max = 160): string {
  const t = text.replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max)
  const dot = cut.lastIndexOf('. ')
  return dot > 80 ? cut.slice(0, dot + 1) : cut.slice(0, cut.lastIndexOf(' ')) + '…'
}

// the theatre as one card: name, address, point on the map, phones, hours, groups
const [lat, lon] = (s.mapPoint ?? '').split(',').map((x) => Number(x.trim()))
const sameAs = [...profileLinks, s.reviewYandex, s.review2gis]
  .filter((u): u is string => !!u)
  .map((u) => u.replace(/\/(tab\/)?reviews\/?$/, '/'))

const theatre = {
  '@type': 'PerformingArtsTheater',
  '@id': abs('/#theatre'),
  name: 'Молодёжный театр «Ключ»',
  alternateName: ['Театр Ключ', 'Ключ'],
  url: abs('/'),
  logo: abs('/icon-512.png'),
  image: abs(DEFAULT_IMAGE),
  description: `Молодёжный театр в ${CITY === 'Набережные Челны' ? 'Набережных Челнах' : CITY}: спектакли, актёрские курсы для детей и взрослых, фестиваль «Действующие лица».`,
  foundingDate: '2003',
  telephone: [PHONE, PHONE2].filter(Boolean),
  email: EMAIL || undefined,
  address: {
    '@type': 'PostalAddress',
    streetAddress: [ADDRESS.split(',').slice(1).join(',').trim(), VENUE].filter(Boolean).join(', '),
    addressLocality: CITY,
    addressRegion: 'Республика Татарстан',
    addressCountry: 'RU',
  },
  geo:
    Number.isFinite(lat) && Number.isFinite(lon)
      ? { '@type': 'GeoCoordinates', latitude: lat, longitude: lon }
      : undefined,
  openingHours: /пн.?пт/i.test(HOURS)
    ? 'Mo-Fr ' + (HOURS.match(/\d{1,2}:\d{2}.\d{1,2}:\d{2}/)?.[0].replace(/[^\d:]/, '-') ?? '')
    : undefined,
  sameAs: sameAs.length ? sameAs : undefined,
}
const place = {
  '@type': 'PerformingArtsTheater',
  '@id': abs('/#theatre'),
  name: theatre.name,
  address: theatre.address,
}

/** one dated show in the afisha as a TheaterEvent */
function event(a: (typeof upcomingAfisha)[number] & { date?: string }) {
  const show = shows.find((x) => x.title.toLowerCase() === a.title.toLowerCase())
  const date = (a as { date?: string }).date
  if (!date) return null
  return {
    '@type': 'TheaterEvent',
    name: show ? `Спектакль «${show.title}»` : a.title,
    startDate: `${date}T${a.time || '18:00'}:00+03:00`,
    eventStatus: 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    location: place,
    organizer: { '@id': abs('/#theatre') },
    image: show?.photo ? abs(show.photo) : undefined,
    description: show ? clip(show.synopsis || show.based) : undefined,
    typicalAgeRange: a.age ? a.age.replace('+', '-') : undefined,
    url: show ? abs('/spektakl/' + showSlug(show.title)) : abs('/afisha'),
    offers:
      a.ticketUrl || show?.ticketUrl
        ? {
            '@type': 'Offer',
            url: a.ticketUrl || show?.ticketUrl,
            availability: 'https://schema.org/InStock',
          }
        : undefined,
  }
}
const events = (list: typeof upcomingAfisha) =>
  list.map(event).filter((e): e is NonNullable<ReturnType<typeof event>> => !!e)

const crumbs = (...items: [string, string][]) => ({
  '@type': 'BreadcrumbList',
  itemListElement: [['Главная', '/'] as [string, string], ...items].map(([name, path], i) => ({
    '@type': 'ListItem',
    position: i + 1,
    name,
    item: abs(path),
  })),
})

const showTitles = shows
  .map((x) => `«${x.title}»`)
  .slice(0, 4)
  .join(', ')
const courseAges = courses.map((c) => c.ageRange).filter(Boolean)

/** every page worth finding, with what the results should say about it */
export function seoPages(): PageMeta[] {
  const pages: PageMeta[] = [
    {
      path: '/',
      title: `${NAME} — молодёжный театр в Набережных Челнах: афиша и билеты`,
      description: `Молодёжный театр «Ключ» в ${WHERE === 'Набережные Челны' ? 'Набережных Челнах' : WHERE} с 2003 года. Спектакли ${showTitles}, актёрские курсы для детей и взрослых, фестиваль «Действующие лица».`,
      jsonLd: [theatre, { '@type': 'WebSite', name: NAME, url: abs('/'), inLanguage: 'ru' }],
    },
    {
      path: '/afisha',
      title: `Афиша театра «Ключ» — спектакли в Набережных Челнах, купить билет`,
      description: `Ближайшие спектакли молодёжного театра «Ключ»: даты, время, возраст. ${VENUE}. Билеты онлайн и в кассе театра.`,
      jsonLd: [...events(upcomingAfisha), crumbs(['Афиша', '/afisha'])],
    },
    {
      path: '/repertuar',
      title: `Спектакли театра «Ключ» — репертуар, Набережные Челны`,
      description: `Репертуар молодёжного театра «Ключ»: ${showTitles} и другие спектакли для детей и взрослых. Описания, фото, ближайшие даты.`,
      jsonLd: [crumbs(['Спектакли', '/repertuar'])],
    },
    {
      path: '/kursy',
      title: `Актёрские курсы и театральная студия для детей и взрослых — театр «Ключ», Набережные Челны`,
      description: `Занятия актёрским мастерством в театре «Ключ»: ${courses.map((c) => c.name.toLowerCase()).join(', ')}${courseAges.length ? ` (${courseAges[0]} и старше)` : ''}. Речь, пластика, выход на сцену. Запись онлайн.`,
      jsonLd: [crumbs(['Курсы', '/kursy'])],
    },
    {
      path: '/festival',
      title: `Фестиваль «Действующие лица» — всероссийский театральный фестиваль в Набережных Челнах`,
      description: `«Действующие лица» — всероссийский театральный фестиваль, который театр «Ключ» проводит в Набережных Челнах с 2004 года. Показы, мастерские, приём заявок от коллективов.`,
      jsonLd: [crumbs(['Фестиваль', '/festival'])],
    },
    {
      path: '/o-teatre',
      title: `О театре «Ключ» — история молодёжного театра в Набережных Челнах`,
      description: `Молодёжный театр «Ключ» с 2003 года: от студии при ЦДТ «Огниво» до частного театра. Постановки, награды, фестиваль.`,
      jsonLd: [crumbs(['О театре', '/o-teatre'])],
    },
    {
      path: '/komanda',
      title: `Команда театра «Ключ» — режиссёры, педагоги, актёры`,
      description: `Люди, которые делают молодёжный театр «Ключ» в Набережных Челнах: руководство, режиссёры, педагоги и актёры.`,
      jsonLd: [crumbs(['Команда', '/komanda'])],
    },
    {
      path: '/galereya',
      title: `Фото театра «Ключ» — спектакли, репетиции, фестиваль`,
      description: `Фотографии молодёжного театра «Ключ»: сцены из спектаклей, репетиции, фестиваль «Действующие лица», летний лагерь.`,
      jsonLd: [crumbs(['Галерея', '/galereya'])],
    },
    {
      path: '/kontakty',
      title: `Контакты театра «Ключ» — адрес, телефон, как добраться`,
      description: `${NAME}: ${ADDRESS}, ${VENUE}. Телефон ${PHONE}${HOURS ? `, ${HOURS}` : ''}. Карта и маршрут.`,
      jsonLd: [theatre, crumbs(['Контакты', '/kontakty'])],
    },
    {
      path: '/politika',
      title: `Политика обработки персональных данных — театр «Ключ»`,
      description: `Как театр «Ключ» обрабатывает и защищает персональные данные посетителей сайта.`,
    },
  ]

  for (const show of shows) {
    const path = '/spektakl/' + showSlug(show.title)
    const dates = upcomingAfisha.filter((a) => a.title.toLowerCase() === show.title.toLowerCase())
    pages.push({
      path,
      title: `«${show.title}»${show.age ? ` ${show.age}` : ''} — спектакль театра «Ключ», Набережные Челны`,
      description: clip(
        [
          show.genre && show.genre.charAt(0).toUpperCase() + show.genre.slice(1),
          show.based,
          show.synopsis,
        ]
          .filter(Boolean)
          .join('. ')
          .replace(/\.\./g, '.'),
      ),
      image: show.photo || undefined,
      jsonLd: [...events(dates), crumbs(['Спектакли', '/repertuar'], [`«${show.title}»`, path])],
    })
  }

  for (const d of directionPages()) {
    if (!d.slug || !d.page) continue
    const path = '/' + d.slug
    pages.push({
      path,
      title: `${d.title} — театр «Ключ», Набережные Челны`,
      description: clip(d.page.intro.join(' ') || d.desc || d.title),
      image: d.page.photo,
      jsonLd: [crumbs([d.title, path])],
    })
  }

  // the whole address everywhere: the media helper adds the base folder, the domain comes here
  return pages.map((p) => ({ ...p, jsonLd: p.jsonLd?.map(clean) }))
}

// JSON-LD without the empty fields
function clean<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T
}

let cached: PageMeta[] | undefined

/** the page's own meta, or the homepage's for an address that is not in the list */
export function metaFor(path: string): PageMeta {
  const p = path.replace(/\/+$/, '') || '/'
  const all = (cached ??= seoPages())
  return (
    all.find((m) => m.path === p) ?? {
      ...all[0]!,
      path: p,
      title: 'Страница не найдена — театр «Ключ»',
      jsonLd: undefined,
    }
  )
}

export const imageOf = (m: PageMeta) => abs(m.image || DEFAULT_IMAGE)
