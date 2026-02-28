import { useState } from 'react'
import Sidebar from '../components/Sidebar'
import ChatWindow from '../components/ChatWindow'
import EmptyChat from '../components/EmptyChat'
import './HomePage.css'

/**
 * Página Principal: Estructura el layout con el Sidebar y el área de chat.
 */
export default function HomePage() {
  // Estado para la conversación seleccionada actualmente.
  const [selectedConv, setSelectedConv] = useState(null)

  return (
    <div className="home-layout">
      {/* Sidebar lateral: permite buscar amigos y seleccionar chats. */}
      <Sidebar
        selectedConvId={selectedConv?.id}
        onSelectConv={setSelectedConv}
      />

      {/* 
          Área de contenido: 
          Si hay una conversación seleccionada, muestra la ventana de chat.
          Si no, muestra un estado vacío informativo.
      */}
      {selectedConv ? (
        <ChatWindow key={selectedConv.id} conversation={selectedConv} />
      ) : (
        <EmptyChat />
      )}
    </div>
  )
}
