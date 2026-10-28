import type { BrandColorKey } from '../theme/tokens'

export interface NavItem {
  key: string
  label: string
  to: string
}

export interface AfishaItem {
  day: string
  mon: string
  wd: string
  title: string
  /** Russian age marking (18+, 16+...). Optional: the theatre's season plan
   *  lists several shows without one yet, and inventing a legal age marking
   *  is worse than showing none until they confirm it. */
  age?: string
  hall?: string
  time: string
  /** row background: 'paper' -> cream neutral card, else the brand color */
  band: 'paper' | 'red' | 'blue'
  /** this very date on the ticket site; else the show's link, else the shop */
  ticketUrl?: string
}

export interface Show {
  title: string
  /** see AfishaItem.age -- optional for the same reason */
  age?: string
  /** e.g. 'весёлые похороны', 'мистическая комедия' */
  genre?: string
  based: string
  dir?: string
  dur?: string
  /** full synopsis; the card falls back to the short 'based' line when missing */
  synopsis?: string
  /** empty string renders a branded placeholder tile instead of a broken image */
  photo: string
  /** page on Билетон / Яндекс Афиша for this show. Optional on purpose: until
   *  the theatre pastes one in, the bot and the site say where tickets are sold
   *  instead of linking to a guess. */
  ticketUrl?: string
  /** a two-colour print over the photo, picked in the admin; empty = live colour */
  tint?: 'red' | 'yellow' | 'blue' | 'ink' | ''
  bg: BrandColorKey
  /** "1 300 ₽, группам от 15 человек — 1 200 ₽"; empty = not shown */
  price?: string
  /** the printed A1 poster, shown whole on the show's page */
  poster?: string
  /** stage photos for the show's own page; empty = the block is hidden */
  photos?: string[]
  /** who plays; empty = the block is hidden */
  cast?: { name: string; role?: string; photo?: string }[]
}

export interface Course {
  key: string
  name: string
  ageRange: string
  bg: BrandColorKey
  icon: string
  desc: string
  /** "пн и ср, 18:00–19:00 · с сентября по июнь"; empty = not shown */
  schedule?: string
  price: string
  start: string
  isChild: boolean
}

export type GallerySpan = 'wide' | 'normal'

export interface GalleryImage {
  src: string
  span: GallerySpan
}

export type Social = 'VK' | 'TG' | 'YT' | 'MAX' | 'IG' | 'PHONE'

/** One question of a direction's signup form, set in the admin. */
export interface DirectionField {
  label: string
  kind: 'text' | 'number' | 'email' | 'choice'
  ask?: string
  options?: string[]
}

/** Anything people can sign up for besides the courses: a preparatory group,
 *  the festival, a quest, a carnival night, the newsletter. Lives in
 *  src/content/directions.json (Decap CMS); the bot reads the same file, so a
 *  direction added in the admin can be booked on the site and in the chat. */
/** A seasonal event's own page (/laboratoriya, /kvest…), filled in the admin. */
export interface DirectionPage {
  /** small line above the title, e.g. «Лаборатория современной драматургии» */
  kicker?: string
  /** paragraphs */
  intro: string[]
  facts: { big: string; note: string }[]
  steps: { title: string; text: string }[]
  program: { day: string; items: string[] }[]
  faq: { q: string; a: string }[]
  photo?: string
  /** printed posters, shown whole beside the description */
  posters: string[]
  photos: string[]
  tone: 'red' | 'yellow' | 'blue' | 'ink'
}

export interface Direction {
  id: string
  type: 'prep' | 'festival' | 'quest' | 'carnival' | 'lab' | 'camp' | 'newsletter' | 'other'
  title: string
  desc?: string
  age?: string
  schedule?: string
  prices?: { name: string; price: string }[]
  /** YYYY-MM-DD; outside these dates the direction is not shown at all */
  showFrom?: string
  showTo?: string
  open: boolean
  askPhone: boolean
  fields: DirectionField[]
  /** the page's address without slashes; no slug, no page */
  slug?: string
  page?: DirectionPage
}
