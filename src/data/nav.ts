import type { NavItem } from '../types/content'

// The site's sections (menu, mobile menu).
export const navItems: NavItem[] = [
  { key: 'afisha', label: 'Афиша', to: '/afisha' },
  { key: 'shows', label: 'Спектакли', to: '/repertuar' },
  { key: 'join', label: 'Курсы', to: '/kursy' },
  { key: 'team', label: 'Команда', to: '/komanda' },
  { key: 'gallery', label: 'Галерея', to: '/galereya' },
  { key: 'about', label: 'О театре', to: '/o-teatre' },
  { key: 'contacts', label: 'Контакты', to: '/kontakty' },
]

