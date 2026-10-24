import { useEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { toBody } from '../../lib/toBody'
import { OPEN_CHAT_EVENT } from '../../lib/openChat'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useEscapeKey } from '../../hooks/useEscapeKey'
import { useFocusTrap } from '../../hooks/useFocusTrap'
import { ChatPanel } from './ChatPanel'
import { Puppet } from './Puppet'

// The theatre's cat in the corner of every page. A tap opens a chat with it:
// the same bot as in Telegram (answers, signup, leads), see ChatPanel.

// bottom-edge positions (px from the right edge) the mascot occasionally
// wanders between -- a short walk along the footer strip, never into the
// middle of the page where it could sit on top of real content. These are
// desktop-scale distances; on a narrow phone screen `right: 420` alone would
// push the whole mascot past the left edge, so they get clamped against the
// live viewport width below rather than used as-is.
const BASE_WALK_SPOTS = [24, 200, 420, 90]
// the puppet's own width (w-26 / sm:w-32 = 104-128px) plus a little breathing room
const MASCOT_FOOTPRINT = 150

// What the cat says on its own, once a visit, after the visitor has looked
// around a little: people phone out of habit and do not know the cat can sign
// them up. A different line on the courses page, where that is the point.
const BUBBLE_DELAY_MS = 20000
const BUBBLE_KEY = 'kluch-cat-bubble'
function bubbleText(path: string): string {
  if (path.startsWith('/kursy'))
    return 'Мяу! Подберу группу по возрасту и сам запишу ребёнка, без звонка. Спросите меня!'
  if (path.startsWith('/afisha') || path.startsWith('/spektakl'))
    return 'Мяу! Подскажу, какой спектакль выбрать, и где купить билет. Спросите меня!'
  return 'Мяу! Могу записать вас или ребёнка на курс, квест или лагерь прямо здесь, в любое время.'
}

export function Mascot() {
  // ?chat in the address (the QR code on posters) opens the chat right away
  const [open, setOpen] = useState(
    () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).has('chat'),
  )
  const [hover, setHover] = useState(false)
  const [bubble, setBubble] = useState(false)
  const { pathname } = useLocation()
  const [spotIndex, setSpotIndex] = useState(0)
  const [viewportW, setViewportW] = useState(() =>
    typeof window === 'undefined' ? 1280 : window.innerWidth,
  )
  const panelRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const close = () => setOpen(false)
  useEscapeKey(open, close)
  useFocusTrap(panelRef, open)

  // the bubble: once a visit, never over an open chat, gone after a while
  useEffect(() => {
    if (open) return
    let seen = false
    try {
      seen = sessionStorage.getItem(BUBBLE_KEY) === '1'
    } catch {
      /* storage blocked: then it may show again, no harm */
    }
    if (seen) return
    const show = setTimeout(() => {
      setBubble(true)
      try {
        sessionStorage.setItem(BUBBLE_KEY, '1')
      } catch {
        /* see above */
      }
    }, BUBBLE_DELAY_MS)
    return () => clearTimeout(show)
  }, [open])
  useEffect(() => {
    if (!bubble) return
    const hide = setTimeout(() => setBubble(false), 14000)
    return () => clearTimeout(hide)
  }, [bubble])

  // «напишите коту» buttons elsewhere on the page
  useEffect(() => {
    const onOpen = () => setOpen(true)
    window.addEventListener(OPEN_CHAT_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_CHAT_EVENT, onOpen)
  }, [])

  useEffect(() => {
    const onResize = () => setViewportW(window.innerWidth)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  // occasional short walk along the bottom edge -- most of the time it just
  // idles in place (see the CSS kl-float bob on the inner wrapper below);
  // it stays put while the chat is open, next to its window
  useEffect(() => {
    if (prefersReducedMotion || open) return
    const id = setInterval(
      () =>
        setSpotIndex(
          (i) =>
            (i + 1 + Math.floor(Math.random() * (BASE_WALK_SPOTS.length - 1))) %
            BASE_WALK_SPOTS.length,
        ),
      25000,
    )
    return () => clearInterval(id)
  }, [prefersReducedMotion, open])

  const maxRight = Math.max(24, viewportW - MASCOT_FOOTPRINT)
  const walkSpots = viewportW < 640 ? [24] : BASE_WALK_SPOTS.map((s) => Math.min(s, maxRight))
  const right = open ? 24 : walkSpots[spotIndex % walkSpots.length]

  return toBody(
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-label="Чат с котом театра"
            // phones: the whole screen, like a messenger; larger screens: a
            // window in the corner above the cat
            className="sm:border-ink fixed inset-0 z-70 sm:inset-auto sm:right-6 sm:bottom-30 sm:h-[min(620px,calc(100dvh-9rem))] sm:w-[390px] sm:overflow-hidden sm:rounded-[16px] sm:border-2 sm:shadow-[0_18px_44px_rgba(0,0,0,.35)] lg:h-[min(740px,calc(100dvh-14.5rem))] lg:w-[460px]"
            initial={{ opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0, duration: prefersReducedMotion ? 0 : 0.3 }}
          >
            <ChatPanel onClose={close} />
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        // the puppet peeks up from the bottom edge of the screen
        className={['fixed bottom-0 z-60', open ? 'max-sm:hidden' : ''].join(' ')}
        initial={false}
        animate={{ right }}
        transition={{ duration: 3.5, ease: [0.4, 0, 0.2, 1] }}
      >
        <AnimatePresence>
          {bubble && !open && (
            <motion.div
              className="absolute right-2 bottom-[calc(100%-6px)] w-[min(250px,calc(100vw-40px))]"
              initial={{ opacity: 0, y: 8, scale: 0.94 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 6, scale: 0.96 }}
              transition={{ type: 'spring', bounce: 0.2, duration: prefersReducedMotion ? 0 : 0.4 }}
              style={{ transformOrigin: '85% 100%' }}
            >
              <button
                type="button"
                onClick={() => setOpen(true)}
                className="border-ink bg-paper text-ink block w-full rounded-[14px] rounded-br-[4px] border-2 py-2.5 pr-8 pl-3.5 text-left text-[14px] leading-[1.4] shadow-[3px_3px_0_#1a1a1a]"
              >
                {bubbleText(pathname)}
              </button>
              <button
                type="button"
                aria-label="Скрыть подсказку"
                onClick={() => setBubble(false)}
                className="text-ink/60 hover:text-ink absolute top-1 right-1.5 flex h-7 w-7 items-center justify-center text-[15px]"
              >
                ✕
              </button>
            </motion.div>
          )}
        </AnimatePresence>
        <button
          onClick={() => setOpen((v) => !v)}
          onPointerEnter={(e) => e.pointerType === 'mouse' && setHover(true)}
          onPointerLeave={() => setHover(false)}
          aria-label={open ? 'Закрыть чат с котом' : 'Открыть чат с котом театра'}
          aria-expanded={open}
          className="block w-26 origin-bottom drop-shadow-[0_-4px_14px_rgba(0,0,0,.18)] transition-transform duration-200 ease-out active:scale-[.96] active:duration-100 sm:w-32"
        >
          {/* peeks out, sways, blinks; waves when you point at it */}
          <Puppet hover={hover} />
        </button>
      </motion.div>
    </>,
  )
}
