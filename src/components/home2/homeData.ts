import type { AfishaItem, Show } from '../../types/content'
import { upcomingAfisha } from '../../data/afisha'
import { shows } from '../../data/shows'
import { mediaUrl } from '../../lib/mediaUrl'
import settings from '../../content/settings.json'
import home from '../../content/home.json'
import { showSlug } from '../../data/shows'

// What the new homepage shows, derived from the same admin-edited files as the
// rest of the site: nothing on it is typed twice.

export const TICKETS_URL: string =
  (settings as { ticketsWidgetUrl?: string }).ticketsWidgetUrl ?? ''

export interface HomeShow {
  item: AfishaItem
  show?: Show
  /** '' when the show has no photo yet */
  photo: string
  ticketUrl: string
  /** first screen only: which point of the photo to keep in frame */
  focus?: string
}

const WD_SHORT: Record<string, string> = {
  воскресенье: 'вс',
  понедельник: 'пн',
  вторник: 'вт',
  среда: 'ср',
  четверг: 'чт',
  пятница: 'пт',
  суббота: 'сб',
}

/** "27 сен · вс · 18:00" */
export function shortDate(item: AfishaItem): string {
  return `${Number(item.day)} ${item.mon.slice(0, 3)} · ${WD_SHORT[item.wd] ?? item.wd} · ${item.time}`
}

/** "27 сентября, 18:00" */
export function longDate(item: AfishaItem): string {
  return `${Number(item.day)} ${item.mon}, ${item.time}`
}

const byTitle = (title: string) => shows.find((s) => s.title.toLowerCase() === title.toLowerCase())

// one card per show: the nearest date of each, in date order
const nearestPerShow: HomeShow[] = []
for (const item of upcomingAfisha) {
  if (nearestPerShow.some((h) => h.item.title === item.title)) continue
  const show = byTitle(item.title)
  nearestPerShow.push({
    item,
    show,
    photo: show?.photo ?? '',
    ticketUrl: item.ticketUrl || show?.ticketUrl || TICKETS_URL,
  })
}

// First screen: the shows the theatre picked in the admin ("Главная страница")
// with a photo made for it, in date order, only while they are on the schedule.
// A show without such a photo stays off the first screen: an audience shot or
// a small snapshot stretched to the whole screen looks worse than nothing.
interface HeroPick {
  show: string
  photo: string
  focus?: string
}
const heroPicks = (home as { hero?: HeroPick[] }).hero ?? []
export const heroShows: HomeShow[] = nearestPerShow
  .map((h): HomeShow | null => {
    const pick = heroPicks.find(
      (p) => p.show.trim().toLowerCase() === h.item.title.toLowerCase() && p.photo,
    )
    return pick ? { ...h, photo: mediaUrl(pick.photo), focus: pick.focus || '60% 40%' } : null
  })
  .filter((h): h is HomeShow => h !== null)
  .slice(0, 4)

/** "Ближайшие спектакли": four different shows, photo or not. */
export const upcomingCards: HomeShow[] = nearestPerShow.slice(0, 4)

/** A photo from public/uploads/gallery by its file name («lager-1»). Straight
 *  from the folder, not from the admin's «Галерея» list: that list is the
 *  gallery's own, and taking a photo out of it must not empty the first screen
 *  of «Курсы» or the festival. */
export function galleryPhoto(name: string): string {
  return mediaUrl('/uploads/gallery/' + name + '.jpg')
}

/** A show's own page in the new design. */
export const showPath = (title: string) => `/spektakl/${showSlug(title)}`
