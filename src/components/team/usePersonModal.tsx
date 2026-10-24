import { useState } from 'react'
import { showsOf, teamMembers, type TeamEntry } from '../../data/people'
import { PersonModal } from './PersonModal'

/**
 * The person's story from «Команда», for anywhere a person is shown: the
 * homepage's «Люди театра», the teachers on «Курсы». `open` takes the name as
 * it stands in the team list; `modal` goes once into the page.
 */
export function usePersonModal() {
  const [person, setPerson] = useState<{ m: TeamEntry; block: string } | null>(null)
  const open = (name: string, block: string) => {
    const m = teamMembers.find((x) => x.name === name)
    // a paper block would vanish behind the photo on the paper sheet
    if (m) setPerson({ m, block: block === 'bg-paper' ? 'bg-ink' : block })
  }
  const modal = (
    <PersonModal
      person={person?.m ?? null}
      block={person?.block ?? 'bg-brand-red'}
      shows={person ? showsOf(person.m) : []}
      onClose={() => setPerson(null)}
    />
  )
  return { open, modal }
}
