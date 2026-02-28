<<<<<<< HEAD
# ChatApp - Aplicación de Mensajería

Aplicación web de mensajería en tiempo real construida con React y Supabase.

## Características

- Registro e inicio de sesión de usuarios
- Perfil de usuario (nombre, bio, avatar)
- Solicitudes de amistad por nombre de usuario
- Mensajería en tiempo real
- Envío de archivos livianos (imágenes y documentos hasta 5MB)
- Estado de lectura de mensajes (✓ enviado, ✓✓ leído)

## Tecnologías

- React 19
- CSS puro
- JavaScript
- Supabase (Auth, Database, Storage, Realtime)
- React Router v6

## Configuración

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com](https://supabase.com) y crea una cuenta
2. Crea un nuevo proyecto
3. Copia la **URL** y la **anon key** del proyecto (Settings > API)

### 2. Configurar base de datos

1. En tu proyecto de Supabase, ve a **SQL Editor**
2. Copia y pega todo el contenido de `supabase/schema.sql`
3. Ejecuta el SQL para crear las tablas, políticas y triggers

### 3. Configurar Storage

1. En Supabase, ve a **Storage**
2. Crea un nuevo bucket llamado `chat-files`
3. Marca la opción **Public bucket**
4. Agrega las siguientes políticas:
   - **INSERT**: Permitir a usuarios autenticados subir archivos
   - **SELECT**: Permitir a todos leer archivos

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```
REACT_APP_SUPABASE_URL=https://tu-proyecto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu-anon-key-aqui
```

### 5. Instalar y ejecutar
=======
# 💬 Chattr — App de Mensajería

Aplicación de mensajería en tiempo real construida con React y Supabase.

## ✅ Funcionalidades
- Registro e inicio de sesión
- Solicitudes de amistad por nombre de usuario
- Mensajería en tiempo real
- Envío de archivos (hasta 5MB)
- Estado de lectura (✓ / ✓✓)
- Perfil de usuario editable

---

## 🚀 Configuración paso a paso

### 1. Configurar Supabase

1. Ve a [supabase.com](https://supabase.com) y abre tu proyecto
2. Ve al **SQL Editor**
3. Pega y ejecuta el contenido de `supabase-setup.sql`
4. Ve a **Storage** > crea un bucket llamado `chat-files` y márcalo como **Public**

### 2. Obtener credenciales

En Supabase: **Settings > API**
- Copia la **Project URL**
- Copia la **anon/public key**

### 3. Configurar el proyecto

```bash
# Entra a la carpeta
cd chat-app

# Copia el archivo de entorno
cp .env.example .env
```

Abre `.env` y reemplaza los valores:
```
REACT_APP_SUPABASE_URL=https://tu-proyecto.supabase.co
REACT_APP_SUPABASE_ANON_KEY=tu-anon-key
```

### 4. Instalar y ejecutar
>>>>>>> c1fbf904 (Primer commit - proyecto chat-app)

```bash
npm install
npm start
```

<<<<<<< HEAD
La app se abrirá en `http://localhost:3000`

## Estructura del Proyecto

```
src/
  supabaseClient.js          # Configuración de Supabase
  App.js                     # Rutas principales
  App.css                    # Estilos globales
  index.js                   # Punto de entrada
  pages/
    Login.js / Login.css     # Página de inicio de sesión
    Register.js / Register.css # Página de registro
    Chat.js / Chat.css       # Página principal del chat
    Profile.js / Profile.css # Modal de perfil de usuario
  components/
    FriendList.js / .css     # Lista de amigos (sidebar)
    FriendRequests.js / .css # Panel de solicitudes de amistad
    MessageArea.js / .css    # Área de mensajes y envío
supabase/
  schema.sql                 # SQL para crear las tablas
```
=======
La app abrirá en [http://localhost:3000](http://localhost:3000) 🎉

---

## 📁 Estructura del proyecto

```
src/
├── components/
│   ├── Sidebar.js       # Panel lateral (chats, amigos, perfil)
│   ├── ChatWindow.js    # Ventana de mensajes
│   ├── EmptyChat.js     # Pantalla cuando no hay chat seleccionado
│   └── ProtectedRoute.js
├── context/
│   └── AuthContext.js   # Estado de autenticación global
├── pages/
│   ├── AuthPage.js      # Login / Registro
│   └── HomePage.js      # Layout principal
├── styles/
│   └── globals.css      # Variables y estilos globales
└── utils/
    └── supabaseClient.js
```

---

## ⚠️ Notas importantes

- El registro envía un email de confirmación. En desarrollo puedes desactivar esto en Supabase: **Authentication > Providers > Email > Confirm email: OFF**
- El bucket `chat-files` debe ser público para que las imágenes se vean en el chat
>>>>>>> c1fbf904 (Primer commit - proyecto chat-app)
