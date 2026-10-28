// Turns an ISO date (YYYY-MM-DD) into the Russian day/month/weekday strings
// the afisha UI renders. The single ISO date is the only thing anyone edits
// (in the CMS or by hand) -- day-of-week used to be typed separately and
// could silently drift from the actual date. Computing it removes that
// failure mode entirely, and lets code compare/sort real dates instead of
// parsing "12 сентября" as text.
const MONTHS_GENITIVE = [
  'января', 'февраля', 'марта', 'апреля', 'мая', 'июня',
  'июля', 'августа', 'сентября', 'октября', 'ноября', 'декабря',
]

// index matches Date#getDay() -- 0 is Sunday
const WEEKDAYS = ['воскресенье', 'понедельник', 'вторник', 'среда', 'четверг', 'пятница', 'суббота']

export interface RuDateParts {
  day: string
  mon: string
  wd: string
}

export function formatRuDate(iso: string): RuDateParts {
  const d = new Date(iso + 'T00:00:00')
  return {
    day: String(d.getDate()).padStart(2, '0'),
    mon: MONTHS_GENITIVE[d.getMonth()] as string,
    wd: WEEKDAYS[d.getDay()] as string,
  }
}

/** Local midnight today, for "is this date still upcoming" comparisons. */
export function startOfToday(): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}
