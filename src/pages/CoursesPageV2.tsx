import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import type { Course, Direction } from '../types/content'
import { courses } from '../data/courses'
import { visibleDirections } from '../data/directions'
import { submitLead } from '../data/leads'
import {
  PrintFilters,
  BTN,
  H2,
  Ink,
  Portrait,
  SectionHead,
  WRAP,
  type Tone,
} from '../components/home2/parts'
import { Torn } from '../components/home2/paper'
import { PageHero } from '../components/home2/PageHero'
import { galleryPhoto } from '../components/home2/homeData'
import { Modal } from '../components/ui/Modal'
import { Reveal } from '../components/ui/Reveal'
import { scrollToId } from '../lib/scrollToId'
import { mediaUrl } from '../lib/mediaUrl'
import { SwallowIcon } from '../components/ui/SwallowIcon'
import { SignupForm } from '../components/courses/SignupForm'
import { DirectionForm } from '../components/directions/DirectionForm'
import starSvg from '../../assets/el-star.svg'
import { HOURS, PHONE, telHref } from '../data/contacts'
import { teachers } from '../data/people'

// «Курсы»: the four groups, how lessons go, what else one can sign up for,
// the teachers and a short form. Every signup lands where the bot's do.

const GROUP_TONES: Tone[] = ['red', 'paper', 'blue', 'ink']
const TONE_CLASS: Record<string, string> = {
  red: 'bg-brand-red text-paper',
  paper: 'bg-paper text-ink border-2 border-ink',
  blue: 'bg-brand-blue text-paper',
  ink: 'bg-ink text-paper',
}
// Photos from the gallery that fit each group until the theatre sends real
// ones from the lessons; a group without one keeps its ink drawing.
const GROUP_PHOTO: Record<string, string> = {
  malyshi: 'lager-3',
  deti: 'lager-2',
  podrostki: 'spektakl-1',
  vzroslye: 'posledstviy-2',
  'pervye-roli': 'simon-2',
  premiera: 'posledstviy-4',
}
const MORE_TYPES: Direction['type'][] = ['prep', 'quest', 'carnival', 'camp', 'other']

const STEPS = [
  ['Этюды и игры', 'Учимся быть настоящими на сцене, раскрываем себя через игру и импровизацию.'],
  ['Речь и пластика', 'Развиваем голос, дикцию, движение и выразительность в теле.'],
  [
    'Выход на сцену',
    'Применяем навыки на практике: участвуем в постановках и показываем свои работы.',
  ],
]

// picked in the admin's team list (src/data/people.ts)
const TEACHERS = teachers

/* ─────────────── short form at the bottom ─────────────── */

const quickSchema = z.object({
  name: z.string().trim().min(1, 'Укажите имя'),
  phone: z.string().trim().min(6, 'Укажите телефон'),
  group: z.string().min(1, 'Выберите группу'),
  consent: z.literal(true, { message: 'Нужно согласие' }),
  website: z.string().optional(),
})
type QuickValues = z.input<typeof quickSchema>

const field =
  'h-12 w-full rounded-md border-2 border-ink/40 bg-white/60 px-4 text-[16px] outline-none placeholder:text-ink/50 focus:border-ink'
const err = 'mt-1 block text-[13px] font-semibold text-brand-red'

function QuickSignup() {
  const [sent, setSent] = useState(false)
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<QuickValues>({ resolver: zodResolver(quickSchema), defaultValues: { group: '' } })

  const onSubmit = async (v: QuickValues) => {
    const c = courses.find((x) => x.key === v.group)
    try {
      await submitLead('course', {
        Курс: c?.isChild === false ? 'Взрослый' : 'Детский',
        Имя: v.name,
        Телефон: v.phone,
        Группа: c ? `${c.name} (${c.ageRange})` : v.group,
        website: v.website ?? '',
      })
      setSent(true)
    } catch (e) {
      setError('root', { message: (e as Error).message })
    }
  }

  if (sent)
    return (
      <p className="border-ink rounded-md border-2 p-4 text-[16px] font-semibold">
        Заявка принята! Администратор перезвонит и всё расскажет.
      </p>
    )

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="border-ink bg-paper relative grid gap-4 border-2 p-5 shadow-[6px_6px_0_#1a1a1a] sm:grid-cols-2 md:p-7"
    >
      <label className="block">
        <span className="mb-1 block text-[14px] font-medium">Имя</span>
        <input {...register('name')} autoComplete="name" className={field} />
        {errors.name && <span className={err}>{errors.name.message}</span>}
      </label>
      <label className="block">
        <span className="mb-1 block text-[14px] font-medium">Телефон</span>
        <input
          {...register('phone')}
          type="tel"
          autoComplete="tel"
          placeholder="+7"
          className={field}
        />
        {errors.phone && <span className={err}>{errors.phone.message}</span>}
      </label>
      <label className="block sm:col-span-2">
        <span className="mb-1 block text-[14px] font-medium">Группа</span>
        <select {...register('group')} className={`${field} cursor-pointer`}>
          <option value="">Выберите</option>
          {courses.map((c) => (
            <option key={c.key} value={c.key}>
              {c.name}, {c.ageRange}
            </option>
          ))}
        </select>
        {errors.group && <span className={err}>{errors.group.message}</span>}
      </label>
      <label className="flex cursor-pointer items-start gap-2.5 text-[14px] sm:col-span-2">
        <input
          {...register('consent')}
          type="checkbox"
          className="accent-ink mt-0.5 h-5 w-5 flex-shrink-0 cursor-pointer"
        />
        <span>
          Согласен на обработку{' '}
          <Link to="/politika" className="underline underline-offset-2">
            персональных данных
          </Link>
          {errors.consent && (
            <span className="text-brand-red ml-2 font-semibold">{errors.consent.message}</span>
          )}
        </span>
      </label>
      <button
        type="submit"
        disabled={isSubmitting}
        className={`${BTN} bg-brand-red text-paper h-13 text-[16px] disabled:opacity-60 sm:col-span-2`}
      >
        {isSubmitting ? 'Отправляем…' : 'Отправить заявку'}
      </button>
      <input
        {...register('website')}
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
      />
      {errors.root && (
        <p className="text-brand-red text-[14px] font-semibold sm:col-span-2">
          {errors.root.message}
        </p>
      )}
    </form>
  )
}

/* ─────────────── page ─────────────── */

export default function CoursesPageV2() {
  const [course, setCourse] = useState<Course | null>(null)
  const [courseSent, setCourseSent] = useState('')
  const [direction, setDirection] = useState<Direction | null>(null)
  const [dirSent, setDirSent] = useState('')
  const [shake, setShake] = useState(0)
  // the festival comes last: it is for whole companies, and has its own page and form
  const more = [
    ...visibleDirections().filter((d) => MORE_TYPES.includes(d.type)),
    ...visibleDirections().filter((d) => d.type === 'festival'),
  ]

  const closeCourse = () => {
    setCourse(null)
    setCourseSent('')
  }
  const closeDir = () => {
    setDirection(null)
    setDirSent('')
  }

  return (
    <div className="bg-paper relative overflow-x-clip">
      <PrintFilters />

      {/* first screen: pupils on stage, the title on the dark side */}
      <PageHero
        photo={mediaUrl('/uploads/shows/emil/3.jpg')}
        focus="50% 30%"
        alt="Ученики театра на сцене"
        seed={171}
      >
        <h1 className="font-heading text-[clamp(52px,7.4vw,112px)] leading-[.86] font-bold uppercase">
          Записаться
          <br />в театр
        </h1>
        <p className="mt-5 max-w-md text-[18px] md:text-[20px]">
          Актёрские курсы для детей и взрослых. Набор продолжается.
        </p>
        <div className="mt-8">
          <a
            href="#zapis"
            onClick={scrollToId('zapis')}
            className={`${BTN} bg-brand-yellow text-ink px-9 py-4.5 text-[17px]`}
          >
            Записаться
          </a>
        </div>
      </PageHero>

      {/* groups */}
      <section className={`${WRAP} pt-16 pb-16 md:pt-24`}>
        <SectionHead title="Группы" />
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {courses.map((c, i) => {
            const tone = GROUP_TONES[i % 4] as Tone
            const dark = tone !== 'paper'
            return (
              <Reveal
                key={c.key}
                index={i}
                className={`flex flex-col p-5 md:p-6 ${TONE_CLASS[tone]}`}
              >
                {GROUP_PHOTO[c.key] ? (
                  <img
                    src={galleryPhoto(GROUP_PHOTO[c.key] as string)}
                    alt=""
                    loading="lazy"
                    className="aspect-[4/3] w-full object-cover"
                    style={{ objectPosition: '50% 30%' }}
                  />
                ) : (
                  <div className="relative h-36">
                    <Ink src={c.icon} light={dark} className="inset-0 m-auto h-full w-1/2" />
                  </div>
                )}
                <h3 className="font-heading mt-4 text-[34px] leading-none font-bold uppercase">
                  {c.name}
                </h3>
                <div className="mt-2 text-[15px] opacity-90">
                  {c.ageRange} <span className="mx-1.5 opacity-50">|</span>{' '}
                  {c.price.replace(' / мес', '/мес')}
                </div>
                {c.schedule && (
                  <div className="mt-1 text-[14px] font-semibold opacity-90">{c.schedule}</div>
                )}
                <p className="mt-4 flex-1 text-[15px] leading-[1.5] opacity-90">{c.desc}</p>
                <button
                  onClick={() => setCourse(c)}
                  className={`${BTN} mt-6 w-full py-3.5 ${tone === 'ink' ? 'border-paper text-paper border-2' : 'bg-ink text-paper'}`}
                >
                  Записаться
                </button>
              </Reveal>
            )
          })}
        </div>
        <p className="text-ink/65 mt-4 text-[14px]">
          Стоимость детских групп ориентировочная: точную администратор скажет при записи.
        </p>
      </section>

      {/* how lessons go */}
      <section className={`${WRAP} pb-20`}>
        <div className="border-ink/15 border-t pt-14 md:pt-20">
          <SectionHead title="Как проходят занятия" />
          <ol className="grid gap-10 md:grid-cols-3 md:gap-0">
            {STEPS.map(([title, text], i) => (
              <li
                key={title}
                className="md:border-ink/20 flex gap-5 md:border-l md:px-8 md:first:border-l-0 md:first:pl-0"
              >
                <span className="font-heading text-[88px] leading-[.8] font-bold">{i + 1}</span>
                <div>
                  <h3 className="font-heading text-[22px] leading-tight font-bold uppercase">
                    {title}
                  </h3>
                  <p className="text-ink/80 mt-2 text-[15px] leading-[1.5]">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* more directions */}
      {more.length > 0 && (
        <section className="bg-ink text-paper relative">
          <Torn color="text-ink" seed={181} />
          <div className={`${WRAP} relative py-16 md:py-20`}>
            <Ink
              src={starSvg}
              light
              className="top-12 right-4 h-16 w-16 md:right-10 md:h-24 md:w-24"
            />
            {/* "можно записаться" only while something is open: closed events stay as a preview */}
            <SectionHead
              title={more.some((d) => d.open) ? 'Ещё можно записаться' : 'Ещё в театре'}
              dark
            />
            <div
              className={`grid gap-5 md:grid-cols-2 ${more.length === 4 ? 'xl:grid-cols-4' : 'lg:grid-cols-3'}`}
            >
              {more.map((d) => (
                <div
                  key={d.id}
                  className={`flex flex-col p-6 ${d.open ? 'bg-paper text-ink' : 'bg-paper/15 text-paper/70'}`}
                >
                  <div className="font-heading text-[26px] leading-tight font-bold uppercase">
                    {d.title}
                  </div>
                  {(d.age || d.schedule) && (
                    <div className="mt-2 text-[15px]">
                      {[d.age, d.schedule].filter(Boolean).join(' | ')}
                    </div>
                  )}
                  {d.desc && (
                    <p className="mt-3 flex-1 text-[15px] leading-[1.5] opacity-85">{d.desc}</p>
                  )}
                  {(d.prices ?? []).length > 0 && (
                    <div className="mt-3 text-[15px] font-semibold">
                      {(d.prices ?? []).map((p) => `${p.name}: ${p.price}`).join(' · ')}
                    </div>
                  )}
                  {d.open && d.type === 'festival' ? (
                    <Link
                      to="/festival#zayavka"
                      className={`${BTN} bg-ink text-paper mt-5 self-start py-3`}
                    >
                      Подать заявку
                    </Link>
                  ) : d.open ? (
                    <button
                      onClick={() => setDirection(d)}
                      className={`${BTN} bg-ink text-paper mt-5 self-start py-3`}
                    >
                      Записаться
                    </button>
                  ) : (
                    <div className="mt-5 flex items-center gap-2 text-[14px] font-semibold">
                      <svg
                        viewBox="0 0 24 24"
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        aria-hidden="true"
                      >
                        <rect x="5" y="11" width="14" height="10" rx="2" />
                        <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                      </svg>
                      Приём заявок пока закрыт
                    </div>
                  )}
                  {d.type === 'festival' ? (
                    <Link
                      to="/festival"
                      className="mt-4 self-start text-[14px] font-semibold underline underline-offset-4"
                    >
                      Подробнее о фестивале →
                    </Link>
                  ) : (
                    d.slug &&
                    d.page && (
                      <Link
                        to={'/' + d.slug}
                        className="mt-4 self-start text-[14px] font-semibold underline underline-offset-4"
                      >
                        Подробнее о мероприятии →
                      </Link>
                    )
                  )}
                </div>
              ))}
            </div>
          </div>
          <Torn color="text-ink" side="bottom" seed={187} />
        </section>
      )}

      {/* teachers */}
      <section className={`${WRAP} pt-20 pb-24`}>
        <SectionHead title="Педагоги" to="/komanda" link="Вся команда" />
        <div className="grid gap-12 sm:grid-cols-3 sm:gap-8 lg:gap-10">
          {TEACHERS.map((t, i) => (
            <Reveal key={t.name} index={i}>
              <Portrait
                src={t.src}
                alt={t.name}
                focus={t.focus}
                zoom={t.zoom}
                block={t.block}
                className="aspect-[4/5]"
              />
              <div className="font-heading mt-6 text-[24px] leading-tight font-bold uppercase xl:text-[28px]">
                {t.name}
              </div>
              <div className="text-ink/75 mt-1 text-[15px]">{t.role}</div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* short form: heading and phone on the left, the form card on the right */}
      <section id="zapis" className="bg-brand-yellow relative scroll-mt-24">
        <Torn color="text-brand-yellow" seed={191} />
        <div
          className={`${WRAP} relative grid gap-10 pt-16 pb-24 md:grid-cols-[1fr_1.15fr] md:items-center md:gap-16 md:pt-20 md:pb-28`}
        >
          <div>
            <h2 className={H2}>
              Записаться
              <br />
              на курс
            </h2>
            <p className="mt-5 max-w-md text-[17px] md:text-[19px]">
              Оставьте телефон, администратор перезвонит, расскажет про расписание и пригласит на
              первое занятие.
            </p>
            <div className="mt-8 flex items-center gap-5">
              <div>
                <a
                  href={telHref(PHONE)}
                  className="font-heading block text-[30px] leading-tight font-bold whitespace-nowrap hover:underline md:text-[34px]"
                >
                  {PHONE}
                </a>
                <p className="mt-1 text-[14px]">{HOURS}</p>
              </div>
              <SwallowIcon className="text-ink h-14 -rotate-6" />
            </div>
          </div>
          <QuickSignup />
        </div>
      </section>

      <Modal open={!!course} onClose={closeCourse} shakeKey={shake} labelledBy="signup-title">
        <button
          onClick={closeCourse}
          aria-label="Закрыть"
          className="border-ink absolute top-4.5 right-4.5 h-9.5 w-9.5 rounded-lg border-2 text-base active:scale-90"
        >
          ✕
        </button>
        {course &&
          (courseSent ? (
            <div className="bg-brand-blue/8 text-brand-blue rounded-[10px] p-4.5 text-[14px] leading-[1.5] font-semibold">
              ✳ Здравствуйте, {courseSent}! Заявка на «{course.name}» принята, администратор
              перезвонит.
            </div>
          ) : (
            <SignupForm
              course={course}
              onSuccess={setCourseSent}
              onInvalid={() => setShake((k) => k + 1)}
            />
          ))}
      </Modal>

      <Modal
        open={!!direction}
        onClose={closeDir}
        shakeKey={shake}
        labelledBy="direction-signup-title"
      >
        <button
          onClick={closeDir}
          aria-label="Закрыть"
          className="border-ink absolute top-4.5 right-4.5 h-9.5 w-9.5 rounded-lg border-2 text-base active:scale-90"
        >
          ✕
        </button>
        {direction &&
          (dirSent ? (
            <div className="bg-brand-blue/8 text-brand-blue rounded-[10px] p-4.5 text-[14px] leading-[1.5] font-semibold">
              ✳ Здравствуйте, {dirSent}! Заявка «{direction.title}» принята, мы свяжемся с вами.
            </div>
          ) : (
            <DirectionForm
              direction={direction}
              onSuccess={setDirSent}
              onInvalid={() => setShake((k) => k + 1)}
            />
          ))}
      </Modal>
    </div>
  )
}
