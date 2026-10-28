// The site's pages. The browser gets them through ./router; the build also
// renders each one to its own HTML file (scripts/prerender.mjs), so search
// engines and link previews see the text without running the script.
import { Navigate, type RouteObject } from 'react-router-dom'
import { FromNovaya } from './pages/FromNovaya'
import App from './App'
import HomePageV2 from './pages/HomePageV2'
import RepertoirePageV2 from './pages/RepertoirePageV2'
import ShowPageV2 from './pages/ShowPageV2'
import CoursesPageV2 from './pages/CoursesPageV2'
import NotFoundPageV2 from './pages/NotFoundPageV2'
import FestivalPageV2 from './pages/FestivalPageV2'
import EventPageV2 from './pages/EventPageV2'
import AboutPageV2 from './pages/AboutPageV2'
import TeamPageV2 from './pages/TeamPageV2'
import AfishaPageV2 from './pages/AfishaPageV2'
import GalleryPageV2 from './pages/GalleryPageV2'
import ContactsPageV2 from './pages/ContactsPageV2'
import PrivacyPageV2 from './pages/PrivacyPageV2'

export const routes: RouteObject[] = [
  {
    path: '/',
    element: <App />,
    children: [
      // the site
      { index: true, element: <HomePageV2 /> },
      { path: 'afisha', element: <AfishaPageV2 /> },
      { path: 'repertuar', element: <RepertoirePageV2 /> },
      { path: 'spektakl/:slug', element: <ShowPageV2 /> },
      { path: 'kursy', element: <CoursesPageV2 /> },
      // the old design had a page per course group; its links land on the courses
      { path: 'kursy/:groupKey', element: <Navigate to="/kursy" replace /> },
      { path: 'festival', element: <FestivalPageV2 /> },
      { path: 'o-teatre', element: <AboutPageV2 /> },
      { path: 'komanda', element: <TeamPageV2 /> },
      { path: 'galereya', element: <GalleryPageV2 /> },
      { path: 'kontakty', element: <ContactsPageV2 /> },
      { path: 'politika', element: <PrivacyPageV2 /> },
      // links shared while the new design was being approved
      { path: 'novaya/*', element: <FromNovaya /> },

      // the previous design lived at /staryi; its links land on the home page
      { path: 'staryi/*', element: <Navigate to="/" replace /> },

      // seasonal events: /laboratoriya, /lager, /kvest…; any other single word is a 404 there
      { path: ':slug', element: <EventPageV2 /> },
      { path: '*', element: <NotFoundPageV2 /> },
    ],
  },
]
