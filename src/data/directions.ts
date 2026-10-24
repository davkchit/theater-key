import type { Direction, DirectionPage } from '../types/content'
import content from '../content/directions.json'
import { mediaUrl } from '../lib/mediaUrl'

// Decap stores a list with a single field as plain strings; older edits may be objects
const str = (v: unknown, key: string) =>
  typeof v === 'string' ? v : String((v as Record<string, unknown>)?.[key] ?? '')

const TONES: DirectionPage['tone'][] = ['red', 'yellow', 'blue', 'ink']

function pageOf(raw: unknown): DirectionPage | undefined {
  if (!raw || typeof raw !== 'object') return undefined
  const p = raw as Record<string, unknown>
  const list = (k: string) => (Array.isArray(p[k]) ? (p[k] as unknown[]) : [])
  return {
    kicker: p.kicker ? String(p.kicker) : undefined,
    intro: String(p.intro ?? '')
      .split(/\n\s*\n|\n/)
      .map((s) => s.trim())
      .filter(Boolean),
    facts: list('facts') as DirectionPage['facts'],
    steps: (list('steps') as DirectionPage['steps']).filter((s) => s?.title),
    program: (list('program') as { day: string; items?: unknown[] }[]).map((d) => ({
      day: d.day,
      items: (d.items ?? []).map((v) => str(v, 'item')).filter(Boolean),
    })),
    faq: (list('faq') as DirectionPage['faq']).filter((f) => f?.q),
    photo: p.photo ? mediaUrl(String(p.photo)) : undefined,
    posters: list('posters')
      .map((v) => str(v, 'poster'))
      .filter(Boolean)
      .map(mediaUrl),
    photos: list('photos')
      .map((v) => str(v, 'photo'))
      .filter(Boolean)
      .map(mediaUrl),
    tone: TONES.includes(p.tone as DirectionPage['tone'])
      ? (p.tone as DirectionPage['tone'])
      : 'red',
  }
}

const all = (content.items as (Partial<Direction> & { page?: unknown })[]).map((d): Direction => ({
  id: String(d.id ?? ''),
  type: d.type ?? 'other',
  title: String(d.title ?? ''),
  desc: d.desc,
  age: d.age,
  schedule: d.schedule,
  prices: d.prices ?? [],
  showFrom: d.showFrom,
  showTo: d.showTo,
  open: d.open !== false,
  askPhone: d.askPhone !== false,
  fields: d.fields ?? [],
  slug: d.slug
    ? String(d.slug)
        .trim()
        .replace(/^\/+|\/+$/g, '') || undefined
    : undefined,
  page: pageOf(d.page),
}))

// today in Moscow, so a winter quest appears on the right morning wherever
// the visitor is
function todayMsk(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Moscow',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

/** Directions to show today: seasonal ones (quests, carnival nights) come and
 *  go by their dates without anyone touching the admin. */
export function visibleDirections(): Direction[] {
  const today = todayMsk()
  return all.filter(
    (d) =>
      d.id && d.title && (!d.showFrom || d.showFrom <= today) && (!d.showTo || d.showTo >= today),
  )
}

export function directionByType(type: Direction['type']): Direction | undefined {
  return visibleDirections().find((d) => d.type === type)
}

/** An event's page by its address. The page stays all year; only signing up
 *  follows "Приём заявок" and the dates. */
export function directionBySlug(slug: string): Direction | undefined {
  return all.find((d) => d.slug === slug && d.page && d.title)
}

/** Whether signing up is possible right now: switched on and within its dates. */
export const canSignUp = (d: Direction) => d.open && visibleDirections().includes(d)

/** "/laboratoriya" for a direction with a page, else undefined */
export const directionPath = (type: Direction['type']): string | undefined => {
  const d = all.find((x) => x.type === type && x.slug && x.page)
  return d ? '/' + d.slug : undefined
}

/** An event's page by its title as it stands in the afisha («Карнавальная ночь»). */
export function directionPathByTitle(title: string): string | undefined {
  const norm = (t: string) => t.toLowerCase().replace(/ё/g, 'е').replace(/[«»"]/g, '').trim()
  const d = all.find((x) => x.slug && x.page && x.title && norm(x.title) === norm(title))
  return d ? '/' + d.slug : undefined
}

export const DIRECTION_TYPE_LABEL: Record<Direction['type'], string> = {
  prep: 'Подготовительная группа',
  festival: 'Фестиваль',
  quest: 'Квест',
  carnival: 'Карнавальная ночь',
  lab: 'Лаборатория',
  camp: 'Лагерь',
  newsletter: 'Рассылка',
  other: 'Событие',
}

/** Events with a page of their own (/lager, /kvest…); the pages stay all year. */
export const directionPages = (): Direction[] => all.filter((d) => d.slug && d.page && d.title)

// Every event the theatre runs besides shows and courses, for «Ещё можно
// записаться» on «Курсы» and «Не только спектакли» (components/home2/EventCards.tsx).
const SKIP: Direction['type'][] = ['newsletter']

/** the events in display order: the festival, for whole companies, last */
export function eventList(): Direction[] {
  const list = visibleDirections().filter((d) => !SKIP.includes(d.type))
  return [
    ...list.filter((d) => d.type !== 'festival'),
    ...list.filter((d) => d.type === 'festival'),
  ]
}
