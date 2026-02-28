import { useState, useEffect, useRef } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import './ChatWindow.css'

// Límite máximo de tamaño para archivos adjuntos (5MB).
const MAX_FILE_SIZE = 5 * 1024 * 1024

/**
 * AvatarEl: Muestra la foto del contacto o su inicial.
 */
function AvatarEl({ profile, size = 32 }) {
  if (profile?.avatar_url) {
    return <img src={profile.avatar_url} alt="" className="avatar" style={{ width: size, height: size }} />
  }
  const initial = (profile?.display_name || profile?.username || '?')[0].toUpperCase()
  return (
    <div className="avatar-placeholder" style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {initial}
    </div>
  )
}

/**
 * ChatWindow: Componente principal para la interfaz de conversación activa.
 */
export default function ChatWindow({ conversation }) {
  const { user } = useAuth()
  const [messages, setMessages] = useState([]) // Almacena el historial de mensajes
  const [text, setText] = useState('')         // Texto del input de mensaje
  const [sending, setSending] = useState(false) // Estado de envío de texto
  const [uploading, setUploading] = useState(false) // Estado de subida de archivos
  const bottomRef = useRef(null)               // Referencia para scroll automático
  const fileInputRef = useRef(null)            // Referencia al input de archivos oculto

  // Identificar quién es el "otro" usuario en la conversación privada.
  const otherUser = conversation.user1.id === user.id ? conversation.user2 : conversation.user1

  useEffect(() => {
    fetchMessages()

    // --- SUSCRIPCIÓN EN TIEMPO REAL AL CANAL DE ESTA CONVERSACIÓN ---
    const sub = supabase
      .channel(`conv-${conversation.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversation.id}`
      }, async (payload) => {
        const newMsg = payload.new

        // Si el nuevo mensaje es un archivo, generamos una URL firmada para visualizarlo.
        if (newMsg.message_type === 'file' && newMsg.file_url && !newMsg.file_url.startsWith('http')) {
          const { data } = await supabase.storage
            .from('chat-files')
            .createSignedUrl(newMsg.file_url, 3600)
          setMessages(prev => [...prev, { ...newMsg, signed_url: data?.signedUrl || null }])
        } else {
          setMessages(prev => [...prev, newMsg])
        }

        markAsRead()    // Marcar automáticamente como leído al recibirlo si el chat está abierto
        scrollToBottom()
      })
      .subscribe()

    return () => supabase.removeChannel(sub)
  }, [conversation.id])

  useEffect(() => {
    scrollToBottom()
    markAsRead()
  }, [messages.length])

  /**
   * Genera URLs firmadas temporales (1 hora) para mensajes que contienen archivos privados en Storage.
   */
  async function resolveSignedUrls(msgs) {
    return Promise.all(msgs.map(async (msg) => {
      if (msg.message_type !== 'file' || !msg.file_url) return msg
      if (msg.file_url.startsWith('http')) return msg
      const { data } = await supabase.storage
        .from('chat-files')
        .createSignedUrl(msg.file_url, 3600)
      return { ...msg, signed_url: data?.signedUrl || null }
    }))
  }

  /**
   * Carga el historial de mensajes de la base de datos.
   */
  async function fetchMessages() {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversation.id)
      .order('created_at', { ascending: true })
    const resolved = await resolveSignedUrls(data || [])
    setMessages(resolved)
    markAsRead()
    setTimeout(scrollToBottom, 100)
  }

  /**
   * Marca los mensajes recibidos como leídos en la base de datos.
   */
  async function markAsRead() {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversation.id)
      .eq('is_read', false)
      .neq('sender_id', user.id)
  }

  /**
   * Desplaza la vista al final del chat de forma suave.
   */
  function scrollToBottom() {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  /**
   * Envía un mensaje de texto simple.
   */
  async function sendMessage(e) {
    e.preventDefault()
    if (!text.trim() || sending) return
    setSending(true)
    const content = text.trim()
    setText('')

    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content,
      message_type: 'text'
    })
    setSending(false)
  }

  /**
   * Gestiona la subida de archivos al Bucket de Supabase Storage.
   */
  async function handleFileUpload(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > MAX_FILE_SIZE) {
      alert('El archivo no puede superar los 5MB')
      return
    }

    setUploading(true)
    const ext = file.name.split('.').pop()
    const path = `${conversation.id}/${Date.now()}.${ext}` // Ruta única: folder_conv/timestamp.ext

    // 1. Subir archivo físico al Storage.
    const { data, error } = await supabase.storage
      .from('chat-files')
      .upload(path, file)

    if (error) {
      alert('Error al subir el archivo: ' + error.message)
      setUploading(false)
      return
    }

    // 2. Crear el registro del mensaje en la tabla 'messages' apuntando al path del archivo.
    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      content: null,
      file_url: path,           // Guardamos el path relativo en el Bucket
      file_name: file.name,
      file_type: file.type,
      message_type: 'file'
    })

    setUploading(false)
    e.target.value = '' // Reset del input
  }

  /**
   * Verifica si un tipo de archivo es imagen para mostrar vista previa.
   */
  function isImage(fileType) {
    return fileType?.startsWith('image/')
  }

  /**
   * Agrupa los mensajes por fecha para mostrar divisores de días ("15 de Enero").
   */
  function groupMessages(msgs) {
    const groups = []
    let currentDate = null

    msgs.forEach(msg => {
      const msgDate = format(new Date(msg.created_at), 'yyyy-MM-dd')
      if (msgDate !== currentDate) {
        groups.push({ type: 'date', date: msg.created_at })
        currentDate = msgDate
      }
      groups.push({ type: 'message', data: msg })
    })
    return groups
  }

  const grouped = groupMessages(messages)

  return (
    <div className="chat-window">
      {/* Cabecera del chat con info del contacto */}
      <div className="chat-header">
        <AvatarEl profile={otherUser} size={38} />
        <div className="chat-header-info">
          <span className="chat-header-name">{otherUser.display_name || otherUser.username}</span>
          <span className="chat-header-username">@{otherUser.username}</span>
        </div>
      </div>

      {/* ÁREA DE MENSAJES GRUPADOS */}
      <div className="messages-area">
        {grouped.map((item, idx) => {
          // Renderizar divisor de fecha
          if (item.type === 'date') {
            return (
              <div key={`date-${idx}`} className="date-divider">
                <span>{format(new Date(item.date), "d 'de' MMMM, yyyy", { locale: es })}</span>
              </div>
            )
          }

          const msg = item.data
          const isMine = msg.sender_id === user.id
          // Lógica para mostrar avatar solo en el último mensaje de un grupo (estética similar a apps modernas)
          const isLast = idx === grouped.length - 1 ||
            (grouped[idx + 1]?.type === 'message' && grouped[idx + 1]?.data?.sender_id !== msg.sender_id) ||
            grouped[idx + 1]?.type === 'date'

          return (
            <div key={msg.id} className={`message-wrapper ${isMine ? 'mine' : 'theirs'}`}>
              {!isMine && isLast && (
                <AvatarEl profile={otherUser} size={26} />
              )}
              {!isMine && !isLast && <div style={{ width: 26 }} />}

              <div className={`message-bubble ${isMine ? 'mine' : 'theirs'}`}>
                {msg.message_type === 'file' ? (
                  <div className="file-message">
                    {/* Renderizado de adjuntos (imágenes o archivos genéricos) */}
                    {!msg.signed_url ? (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>⏳ Cargando archivo...</span>
                    ) : isImage(msg.file_type) ? (
                      <a href={msg.signed_url} target="_blank" rel="noreferrer">
                        <img src={msg.signed_url} alt={msg.file_name} className="image-preview" />
                      </a>
                    ) : (
                      <a href={msg.signed_url} target="_blank" rel="noreferrer" className="file-link">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
                        </svg>
                        <span>{msg.file_name}</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="message-text">{msg.content}</p>
                )}

                {/* Metadatos: hora y tick de lectura */}
                <div className="message-meta">
                  <span className="message-time">
                    {format(new Date(msg.created_at), 'HH:mm')}
                  </span>
                  {isMine && (
                    <span className={`read-status ${msg.is_read ? 'read' : ''}`}>
                      {msg.is_read ? '✓✓' : '✓'}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )
        })}
        {/* Div para scroll automático */}
        <div ref={bottomRef} />
      </div>

      {/* ÁREA DE INPUT: Texto y Archivos */}
      <form className="chat-input-area" onSubmit={sendMessage}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          style={{ display: 'none' }}
        />
        <button
          type="button"
          className="attach-btn"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          title="Adjuntar archivo"
        >
          {uploading ? (
            <span className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }} />
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          )}
        </button>

        <input
          className="message-input"
          placeholder="Escribe un mensaje..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(e) } }}
        />

        <button type="submit" className="send-btn" disabled={!text.trim() || sending}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  )
}
