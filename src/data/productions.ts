import productionsContent from '../content/productions.json'

export interface Production {
  year: string
  title: string
  // where it comes from: «по повести А. Линдгрен», «пьеса Я. Пулинович»
  note?: string
}

// Full staging history since 2003, from the theatre's own «о нас» document.
// Content lives in src/content/productions.json (Decap CMS-managed) -- see
// public/admin/config.yml for the collection definition.
export const productions: Production[] = productionsContent.items
