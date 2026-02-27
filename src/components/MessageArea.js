import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { HiPaperClip, HiPaperAirplane, HiXMark, HiDocument, HiCheck } from 'react-icons/hi2';
import { HiChatBubbleLeftRight } from 'react-icons/hi2';
import './MessageArea.css';

function MessageArea({ user, friend }) {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (!friend) return;

    setLoadingMessages(true);
    loadMessages();
    markMessagesAsRead();

    const channel = supabase
      .channel(`chat-${user.id}-${friend.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const msg = payload.new;
          if (
            (msg.sender_id === user.id && msg.receiver_id === friend.id) ||
            (msg.sender_id === friend.id && msg.receiver_id === user.id)
          ) {
            setMessages((prev) => [...prev, msg]);
            if (msg.receiver_id === user.id) {
              markMessageRead(msg.id);
            }
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const updated = payload.new;
          setMessages((prev) =>
            prev.map((msg) => (msg.id === updated.id ? updated : msg))
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [friend?.id]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .or(
        `and(sender_id.eq.${user.id},receiver_id.eq.${friend.id}),and(sender_id.eq.${friend.id},receiver_id.eq.${user.id})`
      )
      .order('created_at', { ascending: true });

    setMessages(data || []);
    setLoadingMessages(false);
  };

  const markMessagesAsRead = async () => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('sender_id', friend.id)
      .eq('receiver_id', user.id)
      .eq('is_read', false);
  };

  const markMessageRead = async (messageId) => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('id', messageId);
  };

  const handleSend = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() && !selectedFile) return;

    setSending(true);

    let fileUrl = null;
    let fileName = null;

    if (selectedFile) {
      if (selectedFile.size > 5 * 1024 * 1024) {
        alert('El archivo no puede ser mayor a 5MB');
        setSending(false);
        return;
      }

      const fileExt = selectedFile.name.split('.').pop();
      const filePath = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('chat-files')
        .upload(filePath, selectedFile);

      if (uploadError) {
        alert('Error al subir el archivo');
        setSending(false);
        return;
      }

      const { data: urlData } = supabase.storage
        .from('chat-files')
        .getPublicUrl(filePath);

      fileUrl = urlData.publicUrl;
      fileName = selectedFile.name;
    }

    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      receiver_id: friend.id,
      content: newMessage.trim(),
      file_url: fileUrl,
      file_name: fileName,
    });

    if (!error) {
      setNewMessage('');
      setSelectedFile(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }

    setSending(false);
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) return 'Hoy';
    if (date.toDateString() === yesterday.toDateString()) return 'Ayer';

    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  };

  const isImage = (fileName) => {
    if (!fileName) return false;
    const ext = fileName.split('.').pop().toLowerCase();
    return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
  };

  if (!friend) {
    return (
      <div className="message-area-empty">
        <div className="empty-state">
          <HiChatBubbleLeftRight className="empty-state-icon" />
          <h2>ChatApp</h2>
          <p>Selecciona un amigo para empezar a chatear</p>
        </div>
      </div>
    );
  }

  let lastDate = '';

  return (
    <div className="message-area">
      {/* Header del chat */}
      <div className="chat-header">
        <div className="chat-header-avatar">
          {friend.avatar_url ? (
            <img src={friend.avatar_url} alt="" />
          ) : (
            <span>{(friend.display_name || friend.username)[0].toUpperCase()}</span>
          )}
        </div>
        <div className="chat-header-info">
          <h3>{friend.display_name || friend.username}</h3>
          <p>@{friend.username}</p>
        </div>
      </div>

      {/* Area de mensajes */}
      {loadingMessages ? (
        <div className="messages-skeleton">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className={`message-skeleton ${i % 2 === 0 ? 'sent' : 'received'}`}>
              <div className={`skeleton message-skeleton-bubble ${i % 3 === 0 ? 'wide' : i % 3 === 1 ? 'narrow' : ''}`} />
            </div>
          ))}
        </div>
      ) : (
        <div className="messages-container">
          {messages.map((msg) => {
            const msgDate = formatDate(msg.created_at);
            let showDateSeparator = false;

            if (msgDate !== lastDate) {
              showDateSeparator = true;
              lastDate = msgDate;
            }

            const isMine = msg.sender_id === user.id;

            return (
              <React.Fragment key={msg.id}>
                {showDateSeparator && (
                  <div className="date-separator">
                    <span>{msgDate}</span>
                  </div>
                )}
                <div className={`message ${isMine ? 'message-sent' : 'message-received'}`}>
                  {/* Archivo adjunto */}
                  {msg.file_url && (
                    <div className="message-file">
                      {isImage(msg.file_name) ? (
                        <img
                          src={msg.file_url}
                          alt={msg.file_name}
                          className="message-image"
                        />
                      ) : (
                        <a
                          href={msg.file_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="file-link"
                        >
                          <span className="file-icon"><HiDocument size={20} /></span>
                          <span className="file-name">{msg.file_name}</span>
                        </a>
                      )}
                    </div>
                  )}

                  {msg.content && <p className="message-text">{msg.content}</p>}

                  <div className="message-meta">
                    <span className="message-time">{formatTime(msg.created_at)}</span>
                    {isMine && (
                      <span className={`read-status ${msg.is_read ? 'read' : ''}`}>
                        {msg.is_read ? (
                          <><HiCheck size={14} /><HiCheck size={14} style={{ marginLeft: -8 }} /></>
                        ) : (
                          <HiCheck size={14} />
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </React.Fragment>
            );
          })}
          <div ref={messagesEndRef} />
        </div>
      )}

      {/* Input de mensaje */}
      <form className="message-input-area" onSubmit={handleSend}>
        {selectedFile && (
          <div className="selected-file-preview">
            <span>{selectedFile.name}</span>
            <button
              type="button"
              onClick={() => {
                setSelectedFile(null);
                if (fileInputRef.current) fileInputRef.current.value = '';
              }}
            >
              <HiXMark size={16} />
            </button>
          </div>
        )}
        <div className="message-input-row">
          <label className="btn-attach">
            <HiPaperClip size={20} />
            <input
              type="file"
              ref={fileInputRef}
              onChange={(e) => setSelectedFile(e.target.files[0])}
              hidden
            />
          </label>
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Escribe un mensaje..."
            className="message-input"
          />
          <button type="submit" className="btn-send" disabled={sending}>
            {sending ? (
              <div className="spinner" style={{ width: 20, height: 20, borderWidth: 2 }} />
            ) : (
              <HiPaperAirplane size={18} />
            )}
          </button>
        </div>
      </form>
    </div>
  );
}

export default MessageArea;
