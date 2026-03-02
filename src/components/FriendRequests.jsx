import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import './FriendRequests.css';

function FriendRequests({ user, onClose, onFriendAdded }) {
  const [searchUsername, setSearchUsername] = useState('');
  const [pendingRequests, setPendingRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [searchResult, setSearchResult] = useState(null);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  // Cargar solicitudes pendientes
  const loadRequests = useCallback(async () => {
    // Solicitudes recibidas (pendientes)
    const { data: received } = await supabase
      .from('friend_requests')
      .select('*, from_user_profile:profiles!friend_requests_from_user_fkey(*)')
      .eq('to_user', user.id)
      .eq('status', 'pending');

    // Solicitudes enviadas
    const { data: sent } = await supabase
      .from('friend_requests')
      .select('*, to_user_profile:profiles!friend_requests_to_user_fkey(*)')
      .eq('from_user', user.id)
      .eq('status', 'pending');

    setPendingRequests(received || []);
    setSentRequests(sent || []);
  }, [user.id]);

  useEffect(() => {
    loadRequests();
  }, [loadRequests]);

  // Buscar usuario por username
  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchResult(null);
    setMessage('');

    if (!searchUsername.trim()) return;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('username', searchUsername.toLowerCase().trim())
      .single();

    if (error || !data) {
      setMessage('No se encontró ese usuario');
      return;
    }

    if (data.id === user.id) {
      setMessage('No puedes enviarte una solicitud a ti mismo');
      return;
    }

    setSearchResult(data);
  };

  // Enviar solicitud de amistad
  const handleSendRequest = async (toUserId) => {
    setLoading(true);
    setMessage('');

    // Verificar si ya existe una solicitud o amistad
    const { data: existing } = await supabase
      .from('friend_requests')
      .select('*')
      .or(`and(from_user.eq.${user.id},to_user.eq.${toUserId}),and(from_user.eq.${toUserId},to_user.eq.${user.id})`);

    if (existing && existing.length > 0) {
      const req = existing[0];
      if (req.status === 'accepted') {
        setMessage('Ya son amigos');
      } else if (req.status === 'pending') {
        setMessage('Ya existe una solicitud pendiente');
      } else {
        // Si fue rechazada antes, crear una nueva
        const { error } = await supabase
          .from('friend_requests')
          .insert({ from_user: user.id, to_user: toUserId });

        if (error) {
          setMessage('Error al enviar la solicitud');
        } else {
          setMessage('Solicitud enviada');
          setSearchResult(null);
          setSearchUsername('');
          loadRequests();
        }
      }
      setLoading(false);
      return;
    }

    const { error } = await supabase
      .from('friend_requests')
      .insert({ from_user: user.id, to_user: toUserId });

    if (error) {
      setMessage('Error al enviar la solicitud');
    } else {
      setMessage('Solicitud enviada');
      setSearchResult(null);
      setSearchUsername('');
      loadRequests();
    }

    setLoading(false);
  };

  // Aceptar solicitud
  const handleAccept = async (requestId) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'accepted' })
      .eq('id', requestId);

    if (!error) {
      loadRequests();
      if (onFriendAdded) onFriendAdded();
    }
  };

  // Rechazar solicitud
  const handleReject = async (requestId) => {
    const { error } = await supabase
      .from('friend_requests')
      .update({ status: 'rejected' })
      .eq('id', requestId);

    if (!error) {
      loadRequests();
    }
  };

  return (
    <div className="friend-requests-overlay">
      <div className="friend-requests-card">
        <div className="fr-header">
          <h2>Amigos</h2>
          <button className="btn-close" onClick={onClose}>✕</button>
        </div>

        {/* Buscar usuarios */}
        <div className="fr-section">
          <h3>Buscar usuario</h3>
          <form onSubmit={handleSearch} className="fr-search-form">
            <input
              type="text"
              value={searchUsername}
              onChange={(e) => setSearchUsername(e.target.value)}
              placeholder="Nombre de usuario..."
            />
            <button type="submit" className="btn-search">Buscar</button>
          </form>

          {message && <p className="fr-message">{message}</p>}

          {searchResult && (
            <div className="fr-search-result">
              <div className="fr-user-info">
                <div className="fr-avatar-small">
                  {searchResult.avatar_url ? (
                    <img src={searchResult.avatar_url} alt="" />
                  ) : (
                    <span>{(searchResult.display_name || searchResult.username)[0].toUpperCase()}</span>
                  )}
                </div>
                <div>
                  <p className="fr-display-name">{searchResult.display_name || searchResult.username}</p>
                  <p className="fr-username">@{searchResult.username}</p>
                </div>
              </div>
              <button
                className="btn-add-friend"
                onClick={() => handleSendRequest(searchResult.id)}
                disabled={loading}
              >
                Agregar
              </button>
            </div>
          )}
        </div>

        {/* Solicitudes recibidas */}
        <div className="fr-section">
          <h3>Solicitudes recibidas ({pendingRequests.length})</h3>
          {pendingRequests.length === 0 ? (
            <p className="fr-empty">No hay solicitudes pendientes</p>
          ) : (
            pendingRequests.map((req) => (
              <div key={req.id} className="fr-request-item">
                <div className="fr-user-info">
                  <div className="fr-avatar-small">
                    <span>
                      {(req.from_user_profile?.display_name || req.from_user_profile?.username || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="fr-display-name">
                      {req.from_user_profile?.display_name || req.from_user_profile?.username}
                    </p>
                    <p className="fr-username">@{req.from_user_profile?.username}</p>
                  </div>
                </div>
                <div className="fr-actions">
                  <button className="btn-accept" onClick={() => handleAccept(req.id)}>
                    Aceptar
                  </button>
                  <button className="btn-reject" onClick={() => handleReject(req.id)}>
                    Rechazar
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Solicitudes enviadas */}
        <div className="fr-section">
          <h3>Solicitudes enviadas ({sentRequests.length})</h3>
          {sentRequests.length === 0 ? (
            <p className="fr-empty">No has enviado solicitudes</p>
          ) : (
            sentRequests.map((req) => (
              <div key={req.id} className="fr-request-item">
                <div className="fr-user-info">
                  <div className="fr-avatar-small">
                    <span>
                      {(req.to_user_profile?.display_name || req.to_user_profile?.username || '?')[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="fr-display-name">
                      {req.to_user_profile?.display_name || req.to_user_profile?.username}
                    </p>
                    <p className="fr-username">@{req.to_user_profile?.username}</p>
                  </div>
                </div>
                <span className="fr-pending-badge">Pendiente</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default FriendRequests;
