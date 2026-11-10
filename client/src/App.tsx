import { useEffect } from 'react';
import { Router } from './components/layout/Router';
import { socketService } from './services/socketService';
import { useLobbyStore } from './stores/lobbyStore';
import { loadLobbySession } from './utils';
import { ToastContainer } from 'react-toastify';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  // Reclaim our lobby seat after a page refresh, and again whenever the socket reconnects
  useEffect(() => {
    const unsubscribe = socketService.on('connected', () => {
      if (loadLobbySession()) {
        useLobbyStore.getState().rejoinLobby();
      }
    });
    if (loadLobbySession()) {
      useLobbyStore.getState().rejoinLobby();
    }
    return unsubscribe;
  }, []);

  return (
    <>
      <Router />
      <ToastContainer
        position="bottom-center"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
      />
    </>
  );
}

export default App;