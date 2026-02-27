import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { HiXMark, HiCamera } from 'react-icons/hi2';
import './Profile.css';

function Profile({ user, onClose }) {
  const [displayName, setDisplayName] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const loadProfile = async () => {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data) {
        setDisplayName(data.display_name || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
        setUsername(data.username || '');
      }
    };

    loadProfile();
  }, [user.id]);

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        bio: bio,
        avatar_url: avatarUrl,
      })
      .eq('id', user.id);

    if (error) {
      setMessage('Error al guardar los cambios');
    } else {
      setMessage('Perfil actualizado correctamente');
    }

    setLoading(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setMessage('La imagen no puede ser mayor a 2MB');
      return;
    }

    setLoading(true);
    const fileExt = file.name.split('.').pop();
    const fileName = `${user.id}/avatar.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('chat-files')
      .upload(fileName, file, { upsert: true });

    if (uploadError) {
      setMessage('Error al subir la imagen');
      setLoading(false);
      return;
    }

    const { data } = supabase.storage
      .from('chat-files')
      .getPublicUrl(fileName);

    setAvatarUrl(data.publicUrl);

    await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl })
      .eq('id', user.id);

    setMessage('Avatar actualizado');
    setLoading(false);
  };

  return (
    <div className="profile-overlay">
      <div className="profile-card">
        <div className="profile-header">
          <h2>Mi Perfil</h2>
          <button className="btn-close" onClick={onClose}>
            <HiXMark size={20} />
          </button>
        </div>

        <div className="profile-avatar-section">
          <div className="profile-avatar">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" />
            ) : (
              <div className="avatar-placeholder">
                {displayName ? displayName[0].toUpperCase() : '?'}
              </div>
            )}
          </div>
          <label className="btn-upload">
            <HiCamera size={14} />
            Cambiar foto
            <input
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              hidden
            />
          </label>
        </div>

        {message && (
          <div className={message.includes('Error') ? 'error-message' : 'success-message'}>
            {message}
          </div>
        )}

        <form onSubmit={handleSave}>
          <div className="input-group">
            <label>Nombre de usuario</label>
            <input type="text" value={username} disabled />
            <small className="input-hint">No se puede cambiar</small>
          </div>

          <div className="input-group">
            <label>Nombre para mostrar</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre"
            />
          </div>

          <div className="input-group">
            <label>Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Escribe algo sobre ti..."
              rows={3}
              maxLength={200}
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Profile;
