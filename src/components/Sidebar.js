import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { formatDistanceToNow } from 'date-fns'
import { es } from 'date-fns/locale'
import './Sidebar.css'

/**
 * AvatarEl: Componente auxiliar para mostrar la imagen de perfil
 * o una inicial si el usuario no tiene avatar definido.
 */
function AvatarEl({ profile, size = 40 }) {
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
 * Sidebar: Componente lateral que gestiona chats, amigos y perfil.
 */
export default function Sidebar({ selectedConvId, onSelectConv }) {
  const { user, profile, signOut } = useAuth()
  const [tab, setTab] = useState('chats') // Pestaña activa: 'chats' | 'friends' | 'profile'
  const [conversations, setConversations] = useState([]) // Lista de chats activos
  const [pendingRequests, setPendingRequests] = useState([]) // Solicitudes de amistad recibidas
  const [searchUsername, setSearchUsername] = useState('') // Texto de búsqueda de usuario
  const [searchResult, setSearchResult] = useState(null)   // Usuario encontrado en búsqueda
  const [searchError, setSearchError] = useState('')       // Errores de búsqueda
  const [unreadMap, setUnreadMap] = useState({})           // (Opcional) Mapa de mensajes no leídos

  useEffect(() => {
    fetchConversations()
    fetchPendingRequests()

    // --- SUSCRIPCIONES EN TIEMPO REAL CON SUPABASE ---

    // Escucha cambios en 'messages' para actualizar la vista previa del último mensaje en el sidebar.
    const msgSub = supabase
      .channel('sidebar-messages')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, () => {
        fetchConversations()
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'messages' }, () => {
        fetchConversations()
      })
      .subscribe()

    // Escucha cambios en 'friend_requests' para actualizar las notificaciones de solicitudes.
    const reqSub = supabase
      .channel('sidebar-requests')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friend_requests' }, () => {
        fetchPendingRequests()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(msgSub)
      supabase.removeChannel(reqSub)
    }
  }, [user.id])

  /**
   * Obtiene la lista de conversaciones donde participa el usuario,
   * incluyendo el último mensaje y el conteo de no leídos.
   */
  async function fetchConversations() {
    const { data } = await supabase
      .from('conversations')
      .select(`
        id, created_at,
        user1:profiles!conversations_user1_id_fkey(id, username, display_name, avatar_url),
        user2:profiles!conversations_user2_id_fkey(id, username, display_name, avatar_url)
      `)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('created_at', { ascending: false })

    if (!data) return

    // Enriquecer cada conversación con su último mensaje y mensajes sin leer.
    const enriched = await Promise.all(data.map(async (conv) => {
      // Obtener el mensaje más reciente de esta conversación.
      const { data: msgs } = await supabase
        .from('messages')
        .select('content, file_name, message_type, is_read, sender_id, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)

      // Contar cuántos mensajes no ha leído el usuario actual en este chat.
      const { count } = await supabase
        .from('messages')
        .select('id', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .eq('is_read', false)
        .neq('sender_id', user.id)

      const other = conv.user1.id === user.id ? conv.user2 : conv.user1
      return { ...conv, other, lastMessage: msgs?.[0] || null, unreadCount: count || 0 }
    }))

    // Ordenar los chats para que los que tienen actividad más reciente aparezcan arriba.
    enriched.sort((a, b) => {
      const aTime = a.lastMessage?.created_at || a.created_at
      const bTime = b.lastMessage?.created_at || b.created_at
      return new Date(bTime) - new Date(aTime)
    })

    setConversations(enriched)
  }

  /**
   * Obtiene las solicitudes de amistad pendientes enviadas al usuario.
   */
  async function fetchPendingRequests() {
    const { data } = await supabase
      .from('friend_requests')
      .select(`*, sender:profiles!friend_requests_sender_id_fkey(id, username, display_name, avatar_url)`)
      .eq('receiver_id', user.id)
      .eq('status', 'pending')
    setPendingRequests(data || [])
  }

  /**
   * Busca un usuario por su @username exacto en la base de datos.
   */
  async function searchUser() {
    if (!searchUsername.trim()) return
    setSearchResult(null)
    setSearchError('')
    const username = searchUsername.toLowerCase().replace('@', '')

    if (username === profile?.username) {
      setSearchError('No puedes enviarte una solicitud a ti mismo')
      return
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', username)
      .single()

    if (!data) { setSearchError('Usuario no encontrado'); return }

    // Verificar si ya existe un vínculo (amistad o solicitud previa).
    const { data: existing } = await supabase
      .from('friend_requests')
      .select('status')
      .or(`and(sender_id.eq.${user.id},receiver_id.eq.${data.id}),and(sender_id.eq.${data.id},receiver_id.eq.${user.id})`)
      .single()

    setSearchResult({ ...data, existingRequest: existing })
  }

  /**
   * Envía una solicitud de amistad al usuario buscado.
   */
  async function sendFriendRequest(receiverId) {
    const { error } = await supabase
      .from('friend_requests')
      .insert({ sender_id: user.id, receiver_id: receiverId })
    if (!error) {
      setSearchResult(prev => ({ ...prev, existingRequest: { status: 'pending' } }))
    }
  }

  /**
   * Responde (Acepta/Rechaza) a una solicitud de amistad.
   */
  async function respondRequest(requestId, senderId, status) {
    await supabase
      .from('friend_requests')
      .update({ status })
      .eq('id', requestId)

    if (status === 'accepted') {
      // Si se acepta, se crea automáticamente la fila en la tabla 'conversations' para habilitar el chat.
      const user1 = user.id < senderId ? user.id : senderId
      const user2 = user.id < senderId ? senderId : user.id
      await supabase.from('conversations').upsert({ user1_id: user1, user2_id: user2 })
      fetchConversations()
    }
    fetchPendingRequests()
  }

  /**
   * Genera el texto de vista previa para el último mensaje enviado.
   */
  function getLastMessageText(msg) {
    if (!msg) return 'Sin mensajes aún'
    if (msg.message_type === 'file') return `📎 ${msg.file_name}`
    return msg.content
  }

  return (
    <div className="sidebar">
      {/* Cabecera del Sidebar con botón de logout */}
      <div className="sidebar-header">
        <span className="sidebar-title">Chattr</span>
        <button className="icon-btn" onClick={signOut} title="Cerrar sesión">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
          </svg>
        </button>
      </div>

      {/* Tabs de navegación interna */}
      <div className="sidebar-tabs">
        <button className={`tab ${tab === 'chats' ? 'active' : ''}`} onClick={() => setTab('chats')}>
          Chats
        </button>
        <button className={`tab ${tab === 'friends' ? 'active' : ''}`} onClick={() => setTab('friends')}>
          Amigos
          {pendingRequests.length > 0 && <span className="badge">{pendingRequests.length}</span>}
        </button>
        <button className={`tab ${tab === 'profile' ? 'active' : ''}`} onClick={() => setTab('profile')}>
          Perfil
        </button>
      </div>

      {/* CONTENIDO DE LA PESTAÑA CHATS */}
      {tab === 'chats' && (
        <div className="sidebar-content">
          {conversations.length === 0 ? (
            <div className="empty-state">
              <p>Aún no tienes conversaciones</p>
              <small>Añade amigos para comenzar</small>
            </div>
          ) : (
            conversations.map(conv => (
              <div
                key={conv.id}
                className={`conv-item ${selectedConvId === conv.id ? 'active' : ''}`}
                onClick={() => onSelectConv(conv)}
              >
                <AvatarEl profile={conv.other} size={44} />
                <div className="conv-info">
                  <div className="conv-top">
                    <span className="conv-name">{conv.other.display_name || conv.other.username}</span>
                    {conv.lastMessage && (
                      <span className="conv-time">
                        {formatDistanceToNow(new Date(conv.lastMessage.created_at), { locale: es, addSuffix: false })}
                      </span>
                    )}
                  </div>
                  <div className="conv-bottom">
                    <span className="conv-last">{getLastMessageText(conv.lastMessage)}</span>
                    {conv.unreadCount > 0 && <span className="badge">{conv.unreadCount}</span>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* CONTENIDO DE LA PESTAÑA AMIGOS (Búsqueda y Solicitudes) */}
      {tab === 'friends' && (
        <div className="sidebar-content">
          <div className="search-user">
            <div className="search-row">
              <input
                placeholder="Buscar por @usuario"
                value={searchUsername}
                onChange={e => setSearchUsername(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && searchUser()}
              />
              <button className="btn btn-primary" onClick={searchUser}>Buscar</button>
            </div>

            {searchError && <p className="search-error">{searchError}</p>}

            {searchResult && (
              <div className="search-result">
                <AvatarEl profile={searchResult} size={36} />
                <div>
                  <p className="result-name">{searchResult.display_name}</p>
                  <p className="result-username">@{searchResult.username}</p>
                </div>
                {searchResult.existingRequest ? (
                  <span className="request-status">
                    {searchResult.existingRequest.status === 'pending' ? '⏳ Pendiente' : '✓ Amigos'}
                  </span>
                ) : (
                  <button className="btn btn-primary" style={{ padding: '6px 14px', fontSize: 13 }}
                    onClick={() => sendFriendRequest(searchResult.id)}>
                    Agregar
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Listado de solicitudes que el usuario ha recibido */}
          {pendingRequests.length > 0 && (
            <div className="requests-section">
              <p className="section-label">Solicitudes recibidas</p>
              {pendingRequests.map(req => (
                <div key={req.id} className="request-item">
                  <AvatarEl profile={req.sender} size={38} />
                  <div className="request-info">
                    <p className="result-name">{req.sender.display_name}</p>
                    <p className="result-username">@{req.sender.username}</p>
                  </div>
                  <div className="request-actions">
                    <button className="btn btn-primary" style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={() => respondRequest(req.id, req.sender.id, 'accepted')}>✓</button>
                    <button className="btn btn-ghost" style={{ padding: '5px 12px', fontSize: 12 }}
                      onClick={() => respondRequest(req.id, req.sender.id, 'rejected')}>✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CONTENIDO DE LA PESTAÑA PERFIL */}
      {tab === 'profile' && profile && (
        <ProfileTab profile={profile} />
      )}
    </div>
  )
}

/**
 * Componente interno para gestionar la edición de perfil.
 */
function ProfileTab({ profile }) {
  const { updateProfile } = useAuth()
  const [form, setForm] = useState({
    display_name: profile.display_name || '',
    bio: profile.bio || ''
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  /**
   * Guarda los cambios del perfil en Supabase.
   */
  async function handleSave() {
    setSaving(true)
    await updateProfile(form)
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000) // Feedback visual temporal
  }

  return (
    <div className="sidebar-content profile-tab">
      <div className="profile-avatar-section">
        <div className="avatar-placeholder" style={{ width: 72, height: 72, fontSize: 28 }}>
          {(profile.display_name || profile.username || '?')[0].toUpperCase()}
        </div>
        <p className="profile-username">@{profile.username}</p>
      </div>

      <div className="profile-form">
        <div className="form-group">
          <label>Nombre para mostrar</label>
          <input
            value={form.display_name}
            onChange={e => setForm(p => ({ ...p, display_name: e.target.value }))}
          />
        </div>
        <div className="form-group">
          <label>Bio</label>
          <textarea
            rows={3}
            placeholder="Cuéntanos algo sobre ti..."
            value={form.bio}
            onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
            style={{ resize: 'none' }}
          />
        </div>
        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
          {saved ? '✓ Guardado' : saving ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </div>
    </div>
  )
}
