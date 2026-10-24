import { SwallowIcon } from '../ui/SwallowIcon'
import { BTN, H2, SectionHead, WRAP } from './parts'
import { Torn } from './paper'
import { VkFollow } from './VkFollow'
import { VK_URL } from '../../data/socials'
import {
  ADDRESS,
  MAP_EMBED,
  MAP_ROUTES,
  EMAIL,
  HOURS,
  PHONE,
  PHONE2,
  PLACE,
  telHref,
} from '../../data/contacts'
import yandexIcon from '../../../assets/icon-yandex-maps.svg'
import gisIcon from '../../../assets/icon-2gis.png'

/* ─────────────── keep in touch: the theatre's VK ─────────────── */

// Not an email newsletter: nobody at the theatre would write one every month.
// The theatre posts its afisha, premieres and open sign-ups on VK anyway.
// No VK link in «Настройки сайта» means no band.
export function NewsletterBand() {
  if (!VK_URL) return null
  return (
    <section className="bg-brand-yellow relative">
      <Torn color="text-brand-yellow" seed={71} />
      <div
        className={`${WRAP} relative flex flex-col gap-8 py-14 md:flex-row md:items-end md:justify-between md:py-20`}
      >
        <SwallowIcon className="text-ink pointer-events-none absolute top-8 right-4 h-16 -rotate-6 md:top-12 md:right-10 md:h-24" />
        <div className="pr-20">
          <h2 className={H2}>Держите в курсе</h2>
          <p className="mt-3 max-w-xl text-[18px] md:text-[20px]">
            Афиша, премьеры и открытие записи на курсы, лагерь и квесты — первыми в нашей группе
            ВКонтакте.
          </p>
        </div>
        <VkFollow />
      </div>
    </section>
  )
}

/* ─────────────── how to find us ─────────────── */

function MapFrame({ className = '' }: { className?: string }) {
  if (!MAP_EMBED) return null
  return (
    <div
      className={`bg-ink/5 border-ink relative overflow-hidden rounded-xl border-2 ${className}`}
    >
      <iframe
        src={MAP_EMBED}
        title="Театр «Ключ» на карте"
        loading="lazy"
        className="absolute inset-0 h-full w-full border-0"
      />
    </div>
  )
}

const ROUTE_ICON = { yandex: yandexIcon, '2gis': gisIcon }

/** "Как добраться" in Yandex Maps and 2GIS, each with its own icon */
export function RouteButtons() {
  if (!MAP_ROUTES.length) return null
  return (
    <div className="flex flex-wrap gap-3">
      {MAP_ROUTES.map((r) => (
        <a
          key={r.key}
          href={r.href}
          target="_blank"
          rel="noopener noreferrer"
          className={`${BTN} border-ink bg-paper hover:bg-ink/5 gap-3 border-2 px-5 py-3 text-[15px]`}
        >
          <img src={ROUTE_ICON[r.key]} alt="" aria-hidden="true" className="h-6 w-6 rounded-md" />
          {r.label}
        </a>
      ))}
    </div>
  )
}

/**
 * The map with the address and the ways to get there. `contacts`: phones,
 * hours and email beside it — the homepage has no other place for them; the
 * contacts page shows them above. `torn`: a torn top edge, for when a band of
 * another colour is above.
 */
export function FindUs({ torn = true, contacts = true }: { torn?: boolean; contacts?: boolean }) {
  return (
    <section className="bg-paper relative">
      {torn && <Torn color="text-paper" seed={79} />}
      <div className={`${WRAP} pt-16 pb-24 md:pt-24 md:pb-28`}>
        <SectionHead title="Как нас найти" />
        <div className="grid gap-10 md:grid-cols-[1.4fr_1fr] md:gap-12">
          <MapFrame className="aspect-[4/5] sm:aspect-[4/3] md:aspect-auto md:min-h-[460px]" />

          <div className="flex flex-col">
            <div className="text-ink/65 text-[14px] tracking-[.05em] uppercase">Адрес</div>
            <p className="font-heading mt-2 text-[26px] leading-tight font-bold uppercase md:text-[30px]">
              {ADDRESS}
            </p>
            <p className="mt-2 text-[17px]">{PLACE}</p>

            <div className="text-ink/65 mt-8 text-[14px] tracking-[.05em] uppercase">
              Как добраться
            </div>
            <div className="mt-3">
              <RouteButtons />
            </div>

            {contacts && (
              <>
                <div className="border-ink/30 mt-10 border-t" />
                <div className="mt-8 flex flex-col gap-1">
                  {[PHONE, PHONE2].filter(Boolean).map((p) => (
                    <a
                      key={p}
                      href={telHref(p)}
                      className="font-heading hover:text-brand-red text-[30px] leading-tight font-bold tracking-[.01em] md:text-[34px]"
                    >
                      {p}
                    </a>
                  ))}
                </div>
                <p className="mt-3 text-[16px]">{HOURS}</p>
                <a
                  href={'mailto:' + EMAIL}
                  className="mt-2 inline-block self-start text-[16px] underline-offset-4 hover:underline"
                >
                  {EMAIL}
                </a>
              </>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}
