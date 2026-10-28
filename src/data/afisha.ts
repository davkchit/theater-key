import type { AfishaItem } from '../types/content'
import afishaContent from '../content/afisha.json'
import { formatRuDate, startOfToday } from '../lib/ruDate'

interface RawAfishaItem {
  date: string
  title: string
  age?: string
  hall?: string
  time: string
  band: 'paper' | 'red' | 'blue'
  ticketUrl?: string
}

const raw = afishaContent.items as RawAfishaItem[]

// Content lives in src/content/afisha.json (Decap CMS-managed) -- see
// public/admin/config.yml for the collection definition. day/mon/wd are
// derived from the stored ISO date, not typed separately -- see ruDate.ts.
// Real dates (not just "first 4 rows") mean this is never accidentally a
// preview of shows that already happened -- e.g. the homepage in December no
// longer shows September's schedule just because those rows come first in
// the file.
const today = startOfToday()
export const upcomingAfisha: AfishaItem[] = raw
  .filter((i) => new Date(i.date + 'T00:00:00') >= today)
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((i) => ({ ...i, ...formatRuDate(i.date) }))
