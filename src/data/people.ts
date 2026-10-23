import teamContent from '../content/team.json'
import showsContent from '../content/shows.json'
import { mediaUrl } from '../lib/mediaUrl'

// The people on the homepage and in «Педагоги» on the courses page, picked in
// the admin's team list by giving someone a caption for that place. Their
// order is the list's order; each portrait keeps its own crop.

export interface TeamEntry {
  name: string
  role: string
  photo: string
  lead?: boolean
  /** where the face is: "x% y%" */
  focus?: string
  zoom?: number
  homeCaption?: string
  teacherCaption?: string
  /** the person's motto, shown in their card under the name */
  quote?: string
  /** a few lines about the person, shown when their card is opened */
  bio?: string
  /** shows typed in by hand, on top of those where they are in «В ролях» */
  shows?: string[]
}

export const teamMembers = (teamContent.members as TeamEntry[]).filter((m) => m.name)

/** The shows a person plays in: from each show's cast, plus any typed by hand. */
export function showsOf(m: TeamEntry): string[] {
  const name = m.name.trim().toLowerCase()
  const fromCast = (showsContent.shows as { title: string; cast?: { name?: string }[] }[])
    .filter((s) => (s.cast || []).some((c) => c.name?.trim().toLowerCase() === name))
    .map((s) => s.title)
  const byHand = (m.shows || []).map((s) => String(s).trim()).filter(Boolean)
  return [...new Set([...fromCast, ...byHand])]
}

/** a portrait's crop; someone added without one gets a sensible default */
export const frameOf = (m: TeamEntry): [string, number] => [
  m.focus?.trim() || '50% 30%',
  Number(m.zoom) > 0 ? Number(m.zoom) : 1,
]

const BLOCKS = ['bg-brand-red', 'bg-brand-yellow', 'bg-brand-blue', 'bg-ink']

export interface Portraited {
  name: string
  role: string
  src: string
  focus: string
  zoom: number
  block: string
}

function portraits(pick: (m: TeamEntry) => string | undefined): Portraited[] {
  return teamMembers
    .filter((m) => pick(m)?.trim())
    .map((m, i) => {
      const [focus, zoom] = frameOf(m)
      return {
        name: m.name,
        role: pick(m)!.trim(),
        src: mediaUrl(m.photo),
        focus,
        zoom,
        block: BLOCKS[i % BLOCKS.length] as string,
      }
    })
}

/** the homepage has room for four: one large, three small */
export const homePeople = portraits((m) => m.homeCaption).slice(0, 4)
export const teachers = portraits((m) => m.teacherCaption)
