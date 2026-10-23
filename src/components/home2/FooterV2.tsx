import { Link } from 'react-router-dom'
import { socials } from '../../data/socials'
import { SocialIcon } from '../ui/SocialIcon'
import { Torn } from './paper'
import logoWordmark from '../../../assets/logo-wordmark.png'

// Footer of the approved mockup: wordmark, two short columns of links, round
// white buttons of the theatre's socials and phone, the legal line.

const COLS = [
  [
    { label: 'Афиша', to: '/afisha' },
    { label: 'Спектакли', to: '/repertuar' },
    { label: 'Курсы', to: '/kursy' },
    { label: 'Политика конфиденциальности', to: '/politika' },
  ],
  [
    { label: 'Команда', to: '/komanda' },
    { label: 'Галерея', to: '/galereya' },
    { label: 'О театре', to: '/o-teatre' },
    { label: 'Контакты', to: '/kontakty' },
  ],
]

export function FooterV2() {
  return (
    <footer className="bg-ink text-paper relative">
      <Torn color="text-ink" seed={89} />
      <div className="mx-auto grid max-w-[1760px] gap-10 px-4 pt-16 pb-10 sm:px-6.5 md:grid-cols-[1.4fr_1fr_1fr_auto] md:items-start md:pt-20 lg:px-12">
        <div>
          <img src={logoWordmark} alt="Театр Ключ" className="h-18 w-auto md:h-22" />
          <p className="text-paper/85 mt-5 max-w-60 text-[15px] leading-snug">
            Молодёжный театр в Набережных Челнах
          </p>
        </div>
        {COLS.map((col, i) => (
          <nav
            key={i}
            className="flex flex-col gap-4"
            aria-label={i === 0 ? 'Разделы' : 'О театре'}
          >
            {col.map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="hover:text-brand-yellow text-[17px] transition-colors"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        ))}
        <div className="flex max-w-[232px] flex-wrap gap-4">
          {socials.map((s) => (
            <SocialIcon
              key={s.key}
              social={s}
              className="bg-paper text-ink flex h-14 w-14 items-center justify-center rounded-full transition-transform duration-200 hover:-translate-y-0.5 [&_svg]:h-6 [&_svg]:w-6"
            />
          ))}
        </div>
      </div>
      <div className="border-paper/15 text-paper/70 mx-auto flex max-w-[1760px] flex-col gap-1.5 border-t px-4 py-6 text-[13px] sm:px-6.5 lg:px-12">
        <span>© {new Date().getFullYear()} АНО «Молодёжный театр „Ключ“»</span>
      </div>
    </footer>
  )
}
