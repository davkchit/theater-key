import type { Show } from '../types/content'
import showsContent from '../content/shows.json'
import { mediaUrl } from '../lib/mediaUrl'

// Content lives in src/content/shows.json (Decap CMS-managed) so the theatre
// can add/remove/edit repertoire entries without touching code -- see
// public/admin/config.yml for the collection definition.
export const shows: Show[] = (showsContent.shows as Show[]).map((s) => ({
  ...s,
  photo: mediaUrl(s.photo),
  poster: s.poster ? mediaUrl(s.poster) : undefined,
  photos: (s.photos ?? [])
    .map((p) => mediaUrl(typeof p === 'string' ? p : ((p as { photo?: string }).photo ?? '')))
    .filter(Boolean),
  cast: (s.cast ?? []).map((c) => ({ ...c, photo: c.photo ? mediaUrl(c.photo) : '' })),
}))

// Address of a show's own page: «Никаких последствий» -> nikakih-posledstviy
const TR: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'e',
  ж: 'zh',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'h',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'sch',
  ъ: '',
  ы: 'y',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
}
export function showSlug(title: string): string {
  return [...title.toLowerCase()]
    .map((c) => TR[c] ?? c)
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

export const showBySlug = (slug: string): Show | undefined =>
  shows.find((s) => showSlug(s.title) === slug)
