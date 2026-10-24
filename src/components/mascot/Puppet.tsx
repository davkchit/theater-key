import { useEffect, useRef, useState, type CSSProperties } from 'react'
import { motion, useAnimationControls, useReducedMotion } from 'motion/react'
import headImg from '../../../assets/puppet/head.webp'
import blinkImg from '../../../assets/puppet/head-blink.webp'
import bodyImg from '../../../assets/puppet/body.webp'
import pawImg from '../../../assets/puppet/paw-wave.webp'
import tailImg from '../../../assets/puppet/tail.webp'

// The theatre's cat as a glove puppet peeking up from the bottom edge of the
// screen (the booth curtain it stood behind covered the page too much), assembled from
// separate parts so it can move like one: the whole puppet sways a little as
// if on a hand, the head tilts, the tail swings, it blinks now and then and
// waves when you point at it (and sometimes on its own). With reduced motion
// it just stands there.

// Part positions in the 1254-px space of the original picture: left, top, width.
const STAGE_H = 1290 // the curtain hangs a bit below the original frame
const at = (left: number, top: number, width: number): CSSProperties => ({
  position: 'absolute',
  left: `${(left / 1254) * 100}%`,
  top: `${(top / STAGE_H) * 100}%`,
  width: `${(width / 1254) * 100}%`,
})

const SLOW = { duration: 5, repeat: Infinity, repeatType: 'mirror', ease: 'easeInOut' } as const

export function Puppet({ hover = false }: { hover?: boolean }) {
  const reduce = useReducedMotion()
  const paw = useAnimationControls()
  const [blink, setBlink] = useState(false)
  const waving = useRef(false)

  const wave = async () => {
    if (reduce || waving.current) return
    waving.current = true
    await paw.start({
      rotate: [0, -16, 6, -14, 4, 0],
      transition: { duration: 1.3, ease: 'easeInOut' },
    })
    waving.current = false
  }

  // blinks every few seconds, at uneven intervals like a living thing
  useEffect(() => {
    if (reduce) return
    let t: ReturnType<typeof setTimeout>
    const next = () => {
      t = setTimeout(
        () => {
          setBlink(true)
          t = setTimeout(() => {
            setBlink(false)
            next()
          }, 150)
        },
        2500 + Math.random() * 4000,
      )
    }
    next()
    return () => clearTimeout(t)
  }, [reduce])

  // says hello after peeking out, then waves once in a while
  useEffect(() => {
    if (reduce) return
    let t = setTimeout(function loop() {
      void wave()
      t = setTimeout(loop, 12000 + Math.random() * 10000)
    }, 1600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduce])

  useEffect(() => {
    if (hover) void wave()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hover])

  return (
    // the lower fifth, where the curtain hung, stays below the screen edge:
    // the edge itself hides the hand inside the puppet
    <div className="relative w-full translate-y-[20%]" style={{ aspectRatio: `1254 / ${STAGE_H}` }}>
      {/* peeks out from below the edge, then sways as if on a hand */}
      <motion.div
        className="absolute inset-0"
        style={{ transformOrigin: '50% 100%' }}
        initial={reduce ? false : { y: '55%' }}
        animate={{ y: hover ? '-3%' : '0%' }}
        transition={{ type: 'spring', bounce: 0.25, duration: 0.9, delay: 0.4 }}
      >
        <motion.div
          className="absolute inset-0"
          style={{ transformOrigin: '50% 95%' }}
          animate={reduce ? undefined : { rotate: [-1.6, 1.6] }}
          transition={SLOW}
        >
          <motion.img
            src={tailImg}
            alt=""
            draggable={false}
            style={{ ...at(810, 690, 350), transformOrigin: '6% 80%' }}
            animate={reduce ? undefined : { rotate: [-7, 9] }}
            transition={{ ...SLOW, duration: 1.9 }}
          />
          <img src={bodyImg} alt="" draggable={false} style={at(315, 505, 590)} />
          <img
            src={pawImg}
            alt=""
            draggable={false}
            style={{ ...at(660, 620, 300), transform: 'rotate(12deg) scaleX(-1)' }}
          />
          <motion.div
            style={{ ...at(340, 5, 650), transformOrigin: '52% 92%' }}
            animate={reduce ? undefined : { rotate: hover ? 6 : [-3, 3] }}
            transition={
              hover ? { type: 'spring', bounce: 0, duration: 0.4 } : { ...SLOW, duration: 3.7 }
            }
          >
            <img src={headImg} alt="" draggable={false} className="block w-full" />
            <img
              src={blinkImg}
              alt=""
              draggable={false}
              className="absolute inset-0 block w-full"
              style={{ opacity: blink ? 1 : 0 }}
            />
          </motion.div>
          <motion.img
            src={pawImg}
            alt=""
            draggable={false}
            style={{ ...at(150, 420, 370), transformOrigin: '80% 88%' }}
            animate={paw}
          />
        </motion.div>
      </motion.div>
    </div>
  )
}
