// Any page can open the chat with the theatre's cat (components/mascot/Mascot.tsx
// listens): «не дозвонились? напишите коту» next to the phone numbers.
export const OPEN_CHAT_EVENT = 'kluch:open-chat'

export function openChat() {
  window.dispatchEvent(new Event(OPEN_CHAT_EVENT))
}
