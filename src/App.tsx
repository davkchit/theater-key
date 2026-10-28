import { PageTransition } from './components/layout/PageTransition'
import { Mascot } from './components/mascot/Mascot'
import { HeaderV2 } from './components/home2/HeaderV2'
import { FooterV2 } from './components/home2/FooterV2'
import { ReviewInvite } from './components/reviews/Review'
import { TicketOverlay } from './components/tickets/TicketOverlay'
import { RouteMeta } from './seo/RouteMeta'

function App() {
  return (
    <div className="font-body text-ink min-h-screen" style={{ backgroundColor: 'var(--color-paper)' }}>
      <RouteMeta />
      <HeaderV2 />
      <PageTransition />
      <FooterV2 />
      <Mascot />
      <ReviewInvite />
      <TicketOverlay />
    </div>
  )
}

export default App
