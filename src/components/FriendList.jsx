import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import './FriendList.css';

function FriendList({ user, selectedFriend, onSelectFriend, refreshTrigger }) {
  const [friends, setFriends] = useState([]);
  const [unreadCounts, setUnreadCounts] = useState({});

  // Cargar lista de amigos
  const loadFriends = useCallback(async () => {
    // Buscar amistades aceptadas donde el usuario es from_user o to_user
    const { data: requests } = await supabase
      .from('friend_requests')
      .select('*')
      .eq('status', 'accepted')
      .or(`from_user.eq.${user.id},to_user.eq.${user.id}`);

    if (!requests || requests.length === 0) {
      setFriends([]);
      return;
    }

    // Obtener IDs de los amigos
    const friendIds = requests.map((req) =>
      req.from_user === user.id ? req.to_user : req.from_user
    );

    // Obtener perfiles de los amigos
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .in('id', friendIds);

    setFriends(profiles || []);

    // Obtener conteo de mensajes no leídos por amigo
    const { data: unread } = await supabase
      .from('messages')
      .select('sender_id')
      .eq('receiver_id', user.id)
      .eq('is_read', false);

    if (unread) {
      const counts = {};
      unread.forEach((msg) => {
        counts[msg.sender_id] = (counts[msg.sender_id] || 0) + 1;
      });
      setUnreadCounts(counts);
    }
  }, [user.id]);

  useEffect(() => {
    loadFriends();
  }, [loadFriends, refreshTrigger]);

  // Escuchar nuevos mensajes para actualizar conteos
  useEffect(() => {
    const channel = supabase
      .channel('friend-list-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `receiver_id=eq.${user.id}`,
        },
        () => {
          loadFriends();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user.id, loadFriends]);

  return (
    <div className="friend-list">
      <div className="friend-list-header">
        <h3>Chats</h3>
      </div>

      {friends.length === 0 ? (
        <div className="friend-list-empty">
          <p>No tienes amigos aún.</p>
          <p>Usa el botón de agregar amigos para empezar a chatear.</p>
        </div>
      ) : (
        <div className="friend-list-items">
          {friends.map((friend) => (
            <div
              key={friend.id}
              className={`friend-item ${selectedFriend?.id === friend.id ? 'active' : ''}`}
              onClick={() => onSelectFriend(friend)}
            >
              <div className="friend-avatar">
                {friend.avatar_url ? (
                  <img src={friend.avatar_url} alt="" />
                ) : (
                  <span>{(friend.display_name || friend.username)[0].toUpperCase()}</span>
                )}
              </div>
              <div className="friend-info">
                <p className="friend-name">{friend.display_name || friend.username}</p>
                <p className="friend-username">@{friend.username}</p>
              </div>
              {unreadCounts[friend.id] > 0 && (
                <div className="unread-badge">{unreadCounts[friend.id]}</div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default FriendList;
