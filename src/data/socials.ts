import type { Social } from '../types/content'
import settings from '../content/settings.json'
import { PHONE, telHref } from './contacts'

export interface SocialLink {
  key: Social
  label: string
  href: string
  /** SVG path `d` attribute, 24x24 viewBox */
  path?: string
  /** a word instead of a drawn icon */
  text?: string
  /** the path has holes (rings): fill-rule evenodd */
  evenodd?: boolean
}

// The links come from «Настройки сайта» in the admin. An empty VK or Telegram
// hides its icon rather than shipping a dead "#" link; Max and Instagram stay
// as a greyed button without a link until the theatre fills them in.
const links = settings as Partial<Record<string, string>>

const all: (SocialLink & { stub?: boolean })[] = [
  {
    key: 'VK',
    label: 'ВКонтакте',
    href: links.vk ?? '',
    path: 'M13.2 18.3c-6 0-9.9-4.3-10-11.3h3c.1 5.2 2.5 7.4 4.3 7.9V7h2.9v4.4c1.8-.2 3.7-2.3 4.3-4.4h2.9c-.5 2.6-2.5 4.6-3.9 5.4 1.4.7 3.7 2.5 4.6 5.9h-3.2c-.7-2.2-2.4-3.9-4.7-4.2v4.2z',
  },
  {
    key: 'TG',
    label: 'Telegram',
    href: links.telegram ?? '',
    path: 'M21.9 4.3 18.7 19.4c-.2 1-.9 1.3-1.7.8l-4.6-3.4-2.2 2.1c-.3.3-.5.5-1 .5l.3-4.7 8.6-7.8c.4-.3-.1-.5-.6-.2L6.9 13 2.4 11.6c-1-.3-1-1 .2-1.4l17-6.6c.8-.3 1.5.2 1.3 1.3z',
  },
  { key: 'MAX', label: 'Max', href: links.max ?? '', text: 'MAX', stub: true },
  {
    key: 'IG',
    label: 'Instagram',
    href: links.instagram ?? '',
    evenodd: true,
    stub: true,
    path: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zM7 4a3 3 0 0 0-3 3v10a3 3 0 0 0 3 3h10a3 3 0 0 0 3-3V7a3 3 0 0 0-3-3zm5 3a5 5 0 1 1 0 10 5 5 0 0 1 0-10zm0 2a3 3 0 1 0 0 6 3 3 0 0 0 0-6zm5.5-3.7a1.2 1.2 0 1 1 0 2.4 1.2 1.2 0 0 1 0-2.4z',
  },
  {
    key: 'PHONE',
    label: `Позвонить: ${PHONE}`,
    href: PHONE ? telHref(PHONE) : '',
    path: 'M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1A17 17 0 0 1 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1z',
  },
]

/** the buttons in the footer and on «Контакты» */
export const socials: SocialLink[] = all.filter((l) => l.href || l.stub)

/** real profile links only: for schema.org's sameAs */
export const profileLinks: string[] = all.map((l) => l.href).filter((h) => /^https?:\/\//.test(h))

/** the theatre's VK group, '' when not set */
export const VK_URL = links.vk ?? ''
