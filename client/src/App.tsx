import { useEffect } from 'react';
import { Router } from './components/layout/Router';
import { socketService } from './services/socketService';
import { useLobbyStore } from './stores/lobbyStore';
import { loadLobbySession } from './utils';
import { ToastContainer } from 'react-toastify';
import { AnalyticsNotice } from './components/ui/AnalyticsNotice';
import { track, getActiveGameId } from './services/analytics';
import 'maplibre-gl/dist/maplibre-gl.css';
import 'react-toastify/dist/ReactToastify.css';

function App() {
  // Record dropped connections while in a lobby or game (sent once the browser is back online)
  useEffect(() => {
    return socketService.on<{ reason: string }>('disconnected', ({ reason }) => {
      // 'io client disconnect' is us closing the socket on purpose
      if (reason !== 'io client disconnect' && useLobbyStore.getState().currentLobby) {
        track('player_disconnected', { game_id: getActiveGameId(), reason });
      }
    });
  }, []);

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
      <AnalyticsNotice />
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