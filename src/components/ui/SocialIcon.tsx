import type { SocialLink } from '../../data/socials'

interface SocialIconProps {
  social: SocialLink
  className?: string
}

export function SocialIcon({ social, className }: SocialIconProps) {
  const icon = social.text ? (
    <span
      aria-hidden="true"
      className="font-heading text-[13px] leading-none font-bold tracking-[.02em]"
    >
      {social.text}
    </span>
  ) : (
    <svg
      viewBox={social.viewBox ?? '0 0 24 24'}
      width="20"
      height="20"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={social.path} fillRule={social.evenodd ? 'evenodd' : undefined} />
    </svg>
  )
  // no link yet: the button is there, but greyed and not clickable
  if (!social.href) {
    return (
      <span
        role="img"
        aria-label={`${social.label}: скоро`}
        title="Скоро"
        className={`${className ?? ''} opacity-45`}
      >
        {icon}
      </span>
    )
  }
  const external = /^https?:/.test(social.href)
  return (
    <a
      href={social.href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      aria-label={social.label}
      className={className}
    >
      {icon}
    </a>
  )
}
