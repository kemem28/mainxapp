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

```bash
npm install
npm start
```

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
