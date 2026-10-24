import { socials } from '../data/socials'
import { PrintFilters, WRAP } from '../components/home2/parts'
import { FindUs } from '../components/home2/Contact'
import { SocialIcon } from '../components/ui/SocialIcon'
import { EMAIL, HOURS, PHONE, PHONE2, telHref } from '../data/contacts'

// «Контакты»: the three ways to reach the theatre side by side — call, write,
// follow — then the map with the address and the routes.

const CARD = 'border-ink flex min-w-0 flex-col border-2 p-6 md:p-7'
const KICKER = 'text-ink/65 text-[14px] tracking-[.05em] uppercase'

export default function ContactsPageV2() {
  return (
    <div className="bg-paper relative overflow-x-clip">
      <PrintFilters />
      <section className={`${WRAP} pt-14 pb-4 md:pt-20`}>
        <h1 className="font-heading text-[clamp(56px,10vw,140px)] leading-[.9] font-bold uppercase">
          Контакты
        </h1>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          <div className={`${CARD} bg-ink text-paper`}>
            <div className={`${KICKER} text-paper/70`}>Позвонить</div>
            <div className="mt-3 flex flex-col gap-1">
              {[PHONE, PHONE2].filter(Boolean).map((p) => (
                <a
                  key={p}
                  href={telHref(p)}
                  className="font-heading hover:text-brand-yellow text-[28px] leading-tight font-bold whitespace-nowrap md:text-[30px]"
                >
                  {p}
                </a>
              ))}
            </div>
            <p className="text-paper/80 mt-auto pt-4 text-[15px]">{HOURS}</p>
          </div>
          <div className={CARD}>
            <div className={KICKER}>Написать</div>
            <a
              href={'mailto:' + EMAIL}
              className="mt-3 block text-[20px] font-medium break-all hover:underline md:text-[22px]"
            >
              {EMAIL}
            </a>
            <p className="text-ink/75 mt-auto pt-4 text-[15px]">
              или спросите кота театра в углу страницы — он ответит сразу
            </p>
          </div>
          {socials.length > 0 && (
            <div className={CARD}>
              <div className={KICKER}>Мы в соцсетях</div>
              <div className="mt-3 flex flex-wrap gap-3">
                {socials.map((s) => (
                  <SocialIcon
                    key={s.key}
                    social={s}
                    className="bg-ink text-paper flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-200 hover:-translate-y-0.5 active:scale-95 [&_svg]:h-6 [&_svg]:w-6"
                  />
                ))}
              </div>
              <p className="text-ink/75 mt-auto pt-4 text-[15px]">
                Афиша, премьеры и открытие записи — первыми там
              </p>
            </div>
          )}
        </div>
      </section>
      <FindUs torn={false} contacts={false} />
    </div>
  )
}
