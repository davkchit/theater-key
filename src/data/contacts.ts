import settings from '../content/settings.json'

// The theatre's contacts and place from «Настройки сайта» in the admin. The
// bot names the same ones (bot/core/knowledge.mjs), so a change is made in one
// place and shows up everywhere.

const s = settings as Partial<Record<string, string>>

export const PHONE = s.phone ?? ''
export const PHONE2 = s.phone2 ?? ''
export const HOURS = s.hours ?? ''
export const EMAIL = s.email ?? ''
/** "Набережные Челны, Новый город, 1/02" */
export const ADDRESS = s.address ?? ''
/** the first part of the address */
export const CITY = ADDRESS.split(',')[0]?.trim() ?? ''
/** "Молодёжный центр «НУР»" */
export const VENUE = s.venue ?? ''
/** "второй вход", may be empty */
export const ENTRANCE = s.entrance ?? ''
/** "Молодёжный центр «НУР», второй вход" */
export const PLACE = [VENUE, ENTRANCE].filter(Boolean).join(', ')
/** for the privacy policy; inn, ogrn and the officer may be empty */
export const LEGAL = {
  name: s.legalName || 'Автономная некоммерческая организация «Молодёжный театр „Ключ“»',
  inn: s.inn ?? '',
  ogrn: s.ogrn ?? '',
  officer: s.privacyOfficer ?? '',
}
/** continues «Билеты продаются …» */
export const TICKETS_WHERE = s.ticketsWhere ?? ''

/** the theatre's review pages on the maps; an empty one hides its button */
export const REVIEW_LINKS = [
  { key: 'yandex' as const, label: 'Яндекс Карты', href: s.reviewYandex ?? '' },
  { key: '2gis' as const, label: '2ГИС', href: s.review2gis ?? '' },
].filter((l) => l.href)

// The map in «Как нас найти»: Yandex's widget with a red pin on mapPoint.
// Only the pin: with the theatre's card (oid=…) Yandex put ads for other
// businesses under it. Routes: Yandex Maps and 2GIS, each from its own link.
const gis = (s.review2gis ?? '').match(/2gis\.ru\/([a-z_]+)\/firm\/(\d+)/)
const [lat, lon] = (s.mapPoint ?? '').split(',').map((x) => Number(x.trim()))
const point = Number.isFinite(lat) && Number.isFinite(lon)
/** the embeddable map, '' when the point is missing */
export const MAP_EMBED = point
  ? `https://yandex.ru/map-widget/v1/?ll=${lon}%2C${lat}&z=16&pt=${lon}%2C${lat}%2Cpm2rdl`
  : ''
/** "how to get there" in each map app; an empty one is left out */
export const MAP_ROUTES = [
  {
    key: 'yandex' as const,
    label: 'Яндекс Карты',
    href: point ? `https://yandex.ru/maps/?rtext=~${lat}%2C${lon}&rtt=auto` : '',
  },
  {
    key: '2gis' as const,
    label: '2ГИС',
    href: gis ? `https://2gis.ru/${gis[1]}/firm/${gis[2]}` : '',
  },
].filter((r) => r.href)

/** "+7 906 120-22-62" -> "tel:+79061202262" */
export const telHref = (phone: string) => 'tel:' + phone.replace(/[^\d+]/g, '')
