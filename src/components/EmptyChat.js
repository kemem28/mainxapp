import './EmptyChat.css'

export default function EmptyChat() {
  return (
    <div className="empty-chat">
      <div className="empty-chat-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        </svg>
      </div>
      <h2>Selecciona una conversación</h2>
      <p>Elige un chat de la barra lateral o busca a alguien nuevo en "Amigos"</p>
    </div>
  )
}
