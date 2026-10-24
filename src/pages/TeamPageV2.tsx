import { useState } from 'react'
import { Link } from 'react-router-dom'
import { awards } from '../data/awards'
import { mediaUrl } from '../lib/mediaUrl'
import { PrintFilters, BTN, H2, Portrait, SectionHead, WRAP } from '../components/home2/parts'
import { Torn } from '../components/home2/paper'
import { Reveal } from '../components/ui/Reveal'
import { SwallowIcon } from '../components/ui/SwallowIcon'
import { frameOf, showsOf, teamMembers, type TeamEntry } from '../data/people'
import { PersonModal } from '../components/team/PersonModal'

// «Команда»: the artistic director first, then the people who run the theatre
// and teach, then the actors on a black band. Everyone from the admin's team
// list; live-colour portraits on a brand-colour block, like on the homepage.

const BLOCKS = ['bg-brand-red', 'bg-brand-yellow', 'bg-brand-blue', 'bg-ink']
// on the black band a black block would vanish
const BLOCKS_DARK = ['bg-brand-red', 'bg-brand-yellow', 'bg-brand-blue', 'bg-paper']

type Member = TeamEntry
const members = teamMembers
const lead = members.find((m) => m.lead)
const isActor = (m: Member) => /^акт(ёр|ер|риса)/i.test(m.role.trim())
const staff = members.filter((m) => m !== lead && !isActor(m))
const actors = members.filter((m) => m !== lead && isActor(m))

function Person({
  m,
  i,
  dark = false,
  big = false,
  onOpen,
}: {
  m: Member
  i: number
  dark?: boolean
  big?: boolean
  onOpen: (m: Member, block: string) => void
}) {
  const [focus, zoom] = frameOf(m)
  const blocks = dark ? BLOCKS_DARK : BLOCKS
  const block = blocks[i % 4] as string
  return (
    <Reveal index={i % 4}>
      <button
        type="button"
        onClick={() => onOpen(m, block)}
        aria-label={`${m.name}: подробнее`}
        className="group block w-full cursor-pointer text-left"
      >
        {m.photo ? (
          <Portrait
            src={mediaUrl(m.photo)}
            alt={m.name}
            focus={focus}
            zoom={zoom}
            block={block}
            className="aspect-[4/5] transition-transform duration-300 ease-out group-hover:-translate-y-1"
          />
        ) : (
          <div className={`aspect-[4/5] ${dark ? 'bg-paper/10' : 'bg-ink/10'}`} />
        )}
        <h3
          className={`font-heading mt-6 leading-tight font-bold uppercase underline-offset-4 group-hover:underline ${big ? 'text-[24px] xl:text-[28px]' : 'text-[20px] xl:text-[24px]'}`}
        >
          {m.name}
        </h3>
        <p
          className={`mt-1 text-[14px] leading-snug md:text-[15px] ${dark ? 'text-paper/75' : 'text-ink/75'}`}
        >
          {m.role}
        </p>
      </button>
    </Reveal>
  )
}

export default function TeamPageV2() {
  const [open, setOpen] = useState<{ m: Member; block: string } | null>(null)
  // a paper block would vanish behind the photo on the paper sheet
  const openPerson = (m: Member, block: string) =>
    setOpen({ m, block: block === 'bg-paper' ? 'bg-ink' : block })

  return (
    <div className="bg-paper relative overflow-x-clip">
      <PrintFilters />

      {/* heading */}
      <section className={`${WRAP} relative pt-14 pb-12 md:pt-20 md:pb-16`}>
        <h1 className="font-heading text-[clamp(56px,10vw,140px)] leading-[.88] font-bold uppercase">
          Команда
        </h1>
        <p className="mt-5 max-w-xl text-[17px] leading-[1.55] md:text-[19px]">
          Люди, которые делают «Ключ»: режиссёры, педагоги, актёры и те, кто работает за сценой.
        </p>
        <SwallowIcon className="text-ink absolute top-24 right-12 hidden h-24 -rotate-12 md:block" />
      </section>

      {/* the artistic director */}
      {lead && (
        <section className={`${WRAP} pb-20 md:pb-24`}>
          <div className="grid items-center gap-10 md:grid-cols-[1fr_1.2fr] md:gap-16">
            <Reveal>
              <button
                type="button"
                onClick={() => openPerson(lead, 'bg-brand-red')}
                aria-label={`${lead.name}: подробнее`}
                className="group block w-full cursor-pointer"
              >
                <Portrait
                  src={mediaUrl(lead.photo)}
                  alt={lead.name}
                  focus={frameOf(lead)[0]}
                  zoom={frameOf(lead)[1]}
                  block="bg-brand-red"
                  className="aspect-[4/5] transition-transform duration-300 ease-out group-hover:-translate-y-1 md:aspect-[1/1]"
                />
              </button>
            </Reveal>
            {/* the name and the text open the story too, not only the photo and the link;
                the «Подробнее» button below does the same from the keyboard */}
            <Reveal
              index={1}
              className="group cursor-pointer"
              onClick={() => openPerson(lead, 'bg-brand-red')}
            >
              <div className="font-heading text-brand-red text-[16px] tracking-[.06em] uppercase md:text-[18px]">
                Художественный руководитель
              </div>
              <h2 className={`${H2} mt-3 underline-offset-8 group-hover:underline`}>{lead.name}</h2>
              <p className="mt-5 text-[17px] leading-[1.6] md:text-[19px]">{lead.role}</p>
              <ul className="mt-7 space-y-3">
                {awards
                  .filter((a) => a.startsWith(lead.name))
                  .map((a) => (
                    <li key={a} className="border-ink/20 border-t pt-3 text-[16px] leading-[1.5]">
                      {a.slice(lead.name.length).replace(/^\s*—\s*/, '')}
                    </li>
                  ))}
              </ul>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  openPerson(lead, 'bg-brand-red')
                }}
                className="font-heading border-ink hover:text-brand-red hover:border-brand-red mt-8 inline-flex items-center gap-2 border-b-2 pb-1 text-[16px] font-semibold tracking-[.04em] uppercase transition-colors"
              >
                Подробнее <span aria-hidden="true">→</span>
              </button>
            </Reveal>
          </div>
        </section>
      )}

      {/* the people who run the theatre and teach */}
      {staff.length > 0 && (
        <section className={`${WRAP} pb-24`}>
          <div className="border-ink/15 border-t pt-14 md:pt-20">
            <SectionHead title="Руководство и команда" />
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-4 md:gap-x-8">
              {staff.map((m, i) => (
                <Person key={m.name} m={m} i={i + 1} big onOpen={openPerson} />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* actors */}
      {actors.length > 0 && (
        <section className="bg-ink text-paper relative">
          <Torn color="text-ink" seed={271} />
          <div className={`${WRAP} py-20 md:py-28`}>
            <SectionHead title="Актёры" dark />
            <div className="grid grid-cols-2 gap-x-5 gap-y-12 md:grid-cols-3 md:gap-x-8 lg:grid-cols-4">
              {actors.map((m, i) => (
                <Person key={m.name} m={m} i={i} dark onOpen={openPerson} />
              ))}
            </div>
          </div>
          <Torn color="text-ink" side="bottom" seed={277} />
        </section>
      )}

      {/* want to join */}
      <section className="bg-brand-yellow relative mt-8">
        <Torn color="text-brand-yellow" seed={281} />
        <div
          className={`${WRAP} flex flex-col gap-6 py-16 md:flex-row md:items-center md:justify-between md:py-20`}
        >
          <div>
            <h2 className={H2}>Хотите на сцену?</h2>
            <p className="mt-4 max-w-lg text-[17px] md:text-[19px]">
              Многие актёры «Ключа» начинали с наших курсов. Приходите, для детей и взрослых.
            </p>
          </div>
          <Link
            to="/kursy"
            className={`${BTN} bg-ink text-paper self-start px-9 py-4.5 text-[17px] md:self-auto`}
          >
            Записаться на курс
          </Link>
        </div>
      </section>

      <PersonModal
        person={open?.m ?? null}
        block={open?.block ?? 'bg-brand-red'}
        shows={open ? showsOf(open.m) : []}
        onClose={() => setOpen(null)}
      />
    </div>
  )
}
