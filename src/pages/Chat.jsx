import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import FriendList from '../components/FriendList';
import FriendRequests from '../components/FriendRequests';
import MessageArea from '../components/MessageArea';
import Profile from './Profile';
import './Chat.css';

function Chat() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [refreshFriends, setRefreshFriends] = useState(0);
  const [loading, setLoading] = useState(true);

  // Verificar sesión del usuario
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (!session) {
        navigate('/login');
        return;
      }

      setUser(session.user);

      // Cargar perfil
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .single();

      setProfile(profileData);
      setLoading(false);
    };

    checkSession();

    // Escuchar cambios de autenticación
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Cerrar sesión
  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="chat-loading">
        <p>Cargando...</p>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Barra lateral */}
      <div className="sidebar">
        {/* Cabecera de la barra lateral */}
        <div className="sidebar-header">
          <div className="sidebar-user" onClick={() => setShowProfile(true)}>
            <div className="sidebar-avatar">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" />
              ) : (
                <span>
                  {(profile?.display_name || profile?.username || '?')[0].toUpperCase()}
                </span>
              )}
            </div>
            <span className="sidebar-username">
              {profile?.display_name || profile?.username}
            </span>
          </div>
          <div className="sidebar-actions">
            <button
              className="btn-icon"
              onClick={() => setShowFriendRequests(true)}
              title="Agregar amigos"
            >
              👥
            </button>
            <button
              className="btn-icon"
              onClick={handleLogout}
              title="Cerrar sesión"
            >
              🚪
            </button>
          </div>
        </div>

        {/* Lista de amigos */}
        <FriendList
          user={user}
          selectedFriend={selectedFriend}
          onSelectFriend={setSelectedFriend}
          refreshTrigger={refreshFriends}
        />
      </div>

      {/* Área de mensajes */}
      <MessageArea user={user} friend={selectedFriend} />

      {/* Modales */}
      {showFriendRequests && (
        <FriendRequests
          user={user}
          onClose={() => setShowFriendRequests(false)}
          onFriendAdded={() => setRefreshFriends((prev) => prev + 1)}
        />
      )}

      {showProfile && (
        <Profile user={user} onClose={() => setShowProfile(false)} />
      )}
    </div>
  );
}

export default Chat;
