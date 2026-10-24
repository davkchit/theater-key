import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import { useLocation, useNavigationType, useOutlet } from 'react-router-dom'

/** Fades + rises each route's content in on navigation, keyed by pathname. */
export function PageTransition() {
  const location = useLocation()
  const outlet = useOutlet()
  const reduceMotion = useReducedMotion()
  const navType = useNavigationType()

  // The old page fades out first, then the new one comes in: that is the
  // moment to jump to the top, or a link clicked in the footer opens the next
  // page scrolled to its bottom.
  // initial={false}: the first page is already drawn in its HTML file, so it
  // just stays; only moves inside the site fade.
  // The wrapper is a screen tall: between the two pages there is a moment with
  // no page at all, and the black footer jumped up under the menu as a stripe.
  return (
    <div className="min-h-[100svh]">
      <AnimatePresence
        mode="wait"
        initial={false}
        onExitComplete={() => {
          // instant: the page has scroll-behavior: smooth, and a smooth trip up a
          // long page was still going when the next page appeared (and a touch on a
          // phone stopped it halfway, leaving people at the bottom)
          if (navType !== 'POP') window.scrollTo({ top: 0, left: 0, behavior: 'instant' })
        }}
      >
        <motion.div
          key={location.pathname}
          initial={reduceMotion ? { opacity: 1 } : { opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? { opacity: 1 } : { opacity: 0 }}
          transition={{ duration: reduceMotion ? 0.15 : 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          {outlet}
        </motion.div>
      </AnimatePresence>
    </div>
  )
}
