import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { useTheme } from '../contexts/ThemeContext';
import FriendList from '../components/FriendList';
import FriendRequests from '../components/FriendRequests';
import MessageArea from '../components/MessageArea';
import Profile from './Profile';
import './Chat.css';

function Chat() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [selectedFriend, setSelectedFriend] = useState(null);
  const [showFriendRequests, setShowFriendRequests] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [refreshFriends, setRefreshFriends] = useState(0);
  const [loading, setLoading] = useState(true);
  const [onlineUsers, setOnlineUsers] = useState({});
  const presenceChannelRef = useRef(null);

  // Verificar sesion del usuario
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

    // Escuchar cambios de autenticacion
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT') {
          navigate('/login');
        }
      }
    );

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Presence: rastrear usuarios en linea
  useEffect(() => {
    if (!user) return;

    const channel = supabase.channel('online-users', {
      config: { presence: { key: user.id } },
    });

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = {};
        Object.keys(state).forEach((userId) => {
          online[userId] = true;
        });
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: user.id, online_at: new Date().toISOString() });
        }
      });

    presenceChannelRef.current = channel;

    return () => {
      channel.untrack();
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Cerrar sesion
  const handleLogout = async () => {
    if (presenceChannelRef.current) {
      await presenceChannelRef.current.untrack();
    }
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
              onClick={toggleTheme}
              title={theme === 'light' ? 'Modo oscuro' : 'Modo claro'}
            >
              {theme === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
            </button>
            <button
              className="btn-icon"
              onClick={() => setShowFriendRequests(true)}
              title="Agregar amigos"
            >
              {'\u{1F465}'}
            </button>
            <button
              className="btn-icon"
              onClick={handleLogout}
              title="Cerrar sesion"
            >
              {'\u{1F6AA}'}
            </button>
          </div>
        </div>

        {/* Lista de amigos */}
        <FriendList
          user={user}
          selectedFriend={selectedFriend}
          onSelectFriend={setSelectedFriend}
          refreshTrigger={refreshFriends}
          onlineUsers={onlineUsers}
        />
      </div>

      {/* Area de mensajes */}
      <MessageArea user={user} friend={selectedFriend} onlineUsers={onlineUsers} />

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
