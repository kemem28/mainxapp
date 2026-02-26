import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import './Register.css';

function Register() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validar que el username no tenga espacios
    if (username.includes(' ')) {
      setError('El nombre de usuario no puede tener espacios');
      setLoading(false);
      return;
    }

    try {
      // Verificar si el username ya existe
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('username')
        .eq('username', username.toLowerCase())
        .single();

      if (existingUser) {
        setError('Ese nombre de usuario ya está en uso');
        setLoading(false);
        return;
      }

      // Registrar usuario en Supabase Auth
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            display_name: displayName || username,
          },
        },
      });

      if (error) {
        setError(error.message);
      } else {
        navigate('/chat');
      }
    } catch (err) {
      setError('Ocurrió un error al registrarse');
    }

    setLoading(false);
  };

  return (
    <div className="register-container">
      <div className="register-card">
        <h1>ChatApp</h1>
        <p className="register-subtitle">Crea tu cuenta</p>

        {error && <div className="error-message">{error}</div>}

        <form onSubmit={handleRegister}>
          <div className="input-group">
            <label>Nombre de usuario</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="mi_usuario"
              required
            />
            <small className="input-hint">Sin espacios. Se usará para que te encuentren.</small>
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
            <label>Correo electrónico</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
              required
            />
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 6 caracteres"
              minLength={6}
              required
            />
          </div>

          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? 'Creando cuenta...' : 'Registrarse'}
          </button>
        </form>

        <p className="register-footer">
          ¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;
