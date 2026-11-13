import { create } from 'zustand'
import { 
  createLobby,
  joinLobby,
  leaveLobby,
  rejoinLobby,
} from '../services/lobbyService'
import { startGame as startGameService } from '../services/gameService'
import { syncLobbyState, realtimeManager } from '../services/realtimeService'
import { socketService } from '../services/socketService'
import { savePlayerData, saveLobbySession, loadLobbySession, clearLobbySession } from '../utils'
import { track, isRematch, getActiveGameId, setActiveGameId } from '../services/analytics'
import type { ServerLobby, ServerPlayer } from '../types/socket-events'

export interface Player {
  id: string
  name: string
  isHost: boolean
  isReady: boolean
  score?: number // Player's total score (updated from server)
  color?: string // Player color for UI display
}

export interface GameLobby {
  id: string
  code: string
  hostId: string
  players: Player[]
  maxPlayers: number
  isPrivate: boolean
  shareLink: string
  gameSettings: {
    roundCount: number
    timePerRound: number
    difficulty: 'easy' | 'medium' | 'hard'
  }
}

interface LobbyState {
  currentLobby: GameLobby | null
  joinCode: string
  playerName: string
  currentPlayerId: string | null
  isJoining: boolean
  isCreating: boolean
  isRejoining: boolean
  error: string | null
  isConnected: boolean // Socket.io connection state
  
  // Actions
  setJoinCode: (code: string) => void
  setPlayerName: (name: string) => void
  createLobby: (playerName: string, isPrivate: boolean) => Promise<void>
  joinLobby: (code: string, playerName: string, method?: 'code' | 'invite_link') => Promise<void>
  leaveLobby: () => Promise<void>
  rejoinLobby: () => Promise<void>
  startGame: () => Promise<void>
  generateShareLink: () => string
  clearError: () => void
  updateLobbyState: (lobby: GameLobby) => void
  getCurrentPlayer: () => Player | null
  isCurrentPlayerHost: () => boolean
  // Internal: Convert server lobby to client lobby format
  updateLobbyFromServer: (serverLobby: ServerLobby) => void
}

/**
 * Convert ServerPlayer to client Player format
 */
function convertServerPlayerToClient(serverPlayer: ServerPlayer): Player {
  return {
    id: serverPlayer.id,
    name: serverPlayer.username,
    isHost: serverPlayer.isHost,
    isReady: serverPlayer.connected, // Connected players are considered ready
    score: serverPlayer.totalScore, // Include score from server
    color: serverPlayer.color, // Preserve color from server
  };
}

/**
 * Convert ServerLobby to client GameLobby format
 */
function convertServerLobbyToClient(serverLobby: ServerLobby): GameLobby {
  const hostId = serverLobby.players.find(p => p.isHost)?.id || ''
  
  return {
    id: serverLobby.id,
    code: serverLobby.code,
    hostId,
    players: serverLobby.players.map(convertServerPlayerToClient),
    maxPlayers: 4, // Fixed per spec
    isPrivate: false, // Not used in Socket.io version
    shareLink: `${window.location.origin}/join/${serverLobby.code}`,
    gameSettings: {
      roundCount: 5,
      timePerRound: 30, // Updated to match spec
      difficulty: 'medium'
    }
  }
}

/**
 * Wait for the socket to connect (gives up after 5 seconds)
 */
async function ensureConnected(): Promise<void> {
  if (socketService.isConnected()) return
  socketService.connect()
  await new Promise<void>((resolve) => {
    const unsubscribe = socketService.on('connected', () => {
      unsubscribe()
      clearTimeout(timeoutId)
      resolve()
    })
    const timeoutId = setTimeout(() => {
      unsubscribe()
      resolve()
    }, 5000)
  })
}

// Single store-level lobby subscription, replaced on every create/join/rejoin
let lobbySubscriptionKey: string | null = null
let rejoinInFlight: Promise<void> | null = null

export const useLobbyStore = create<LobbyState>((set, get) => {
  const enterLobby = (serverLobby: ServerLobby, serverPlayer: ServerPlayer, sessionToken: string) => {
    savePlayerData(serverPlayer.id, serverPlayer.username)
    saveLobbySession(sessionToken)

    set({
      currentLobby: convertServerLobbyToClient(serverLobby),
      currentPlayerId: serverPlayer.id,
      isConnected: socketService.isConnected(),
    })

    if (lobbySubscriptionKey) {
      realtimeManager.unsubscribe(lobbySubscriptionKey)
    }
    lobbySubscriptionKey = syncLobbyState((updatedLobby: ServerLobby) => {
      get().updateLobbyFromServer(updatedLobby)
    })
  }

  return {
    currentLobby: null,
    joinCode: '',
    playerName: '',
    currentPlayerId: null,
    isJoining: false,
    isCreating: false,
    // A saved session means we're about to rejoin (pages wait instead of redirecting home)
    isRejoining: loadLobbySession() !== null,
    error: null,
    isConnected: false,

    setJoinCode: (code: string) => set({ joinCode: code.toUpperCase() }),
    
    setPlayerName: (name: string) => set({ playerName: name }),
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    createLobby: async (playerName: string, _isPrivate: boolean) => {
      set({ isCreating: true, error: null })
      
      try {
        await ensureConnected()
        
        const { lobby: serverLobby, player: serverPlayer, sessionToken } = await createLobby(playerName)
        enterLobby(serverLobby, serverPlayer, sessionToken)
        set({ isCreating: false, playerName: '' })
        track('lobby_created', {})
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to create lobby',
          isCreating: false 
        })
      }
    },
    
    joinLobby: async (code: string, playerName: string, method: 'code' | 'invite_link' = 'code') => {
      set({ isJoining: true, error: null })
      
      try {
        await ensureConnected()
        
        const { lobby: serverLobby, player: serverPlayer, sessionToken } = await joinLobby(code, playerName)
        enterLobby(serverLobby, serverPlayer, sessionToken)
        set({ isJoining: false, joinCode: '', playerName: '' })
        track('lobby_joined', { method })
      } catch (error) {
        set({ 
          error: error instanceof Error ? error.message : 'Failed to join lobby',
          isJoining: false 
        })
      }
    },
    
    leaveLobby: async () => {
      try {
        await leaveLobby()
      } catch (error) {
        console.error('Error leaving lobby', error)
        // Error leaving lobby - silently fail
      }
      
      // Clean up all real-time subscriptions
      realtimeManager.unsubscribeAll()
      lobbySubscriptionKey = null
      clearLobbySession()
      
      set({ 
        isRejoining: false,
        currentLobby: null,
        currentPlayerId: null,
        joinCode: '',
        playerName: '',
        error: null
      })
    },
    
    rejoinLobby: async () => {
      if (rejoinInFlight) return rejoinInFlight

      const sessionToken = loadLobbySession()
      if (!sessionToken) {
        set({ isRejoining: false })
        return
      }

      set({ isRejoining: true })
      rejoinInFlight = (async () => {
        try {
          await ensureConnected()
          const { lobby: serverLobby, player: serverPlayer } = await rejoinLobby(sessionToken)
          enterLobby(serverLobby, serverPlayer, sessionToken)
          // Still mid-game? (after a refresh this page has no game id yet)
          const inGame = serverLobby.gameState !== 'waiting' && serverLobby.gameState !== 'finished'
          if (inGame) setActiveGameId(serverLobby.gameId)
          track('rejoined_after_disconnect', { game_id: inGame ? serverLobby.gameId : null, success: true })
        } catch (error) {
          track('rejoined_after_disconnect', { game_id: getActiveGameId(), success: false })
          // Seat is gone (grace period expired or server restarted)
          clearLobbySession()
          set({
            currentLobby: null,
            currentPlayerId: null,
            error: error instanceof Error ? error.message : 'Failed to rejoin lobby',
          })
        } finally {
          rejoinInFlight = null
          set({ isRejoining: false })
        }
      })()
      return rejoinInFlight
    },
    
    startGame: async () => {
      const { currentLobby } = get()
      if (!currentLobby) {
        set({ error: 'No lobby to start game' })
        return
      }
      
      // Check if current player is host
      if (!get().isCurrentPlayerHost()) {
        set({ error: 'Only the host can start the game' })
        return
      }
      
      try {
        const gameId = await startGameService()
        // Game start will trigger countdownStart event, which will be handled by game components
        track('game_started', { game_id: gameId, player_count: currentLobby.players.length, is_rematch: isRematch(currentLobby.id) })
      } catch (error) {
        set({ error: error instanceof Error ? error.message : 'Failed to start game' })
      }
    },
    
    generateShareLink: () => {
      const { currentLobby } = get()
      return currentLobby?.shareLink || ''
    },
    
    clearError: () => set({ error: null }),
    
    updateLobbyState: (lobby: GameLobby) => {
      set({ currentLobby: lobby });
    },
    getCurrentPlayer: () => {
      const { currentLobby, currentPlayerId } = get()
      if (!currentLobby || !currentPlayerId) return null
      return currentLobby.players.find(p => p.id === currentPlayerId) || null
    },
    isCurrentPlayerHost: () => {
      const { currentLobby, currentPlayerId } = get()
      if (!currentLobby || !currentPlayerId) return false
      const currentPlayer = currentLobby.players.find(p => p.id === currentPlayerId)
      return currentPlayer?.isHost || false
    },
    
    updateLobbyFromServer: (serverLobby: ServerLobby) => {
      const { currentLobby } = get()
      if (currentLobby && serverLobby.id === currentLobby.id) {
        const updatedLobby = convertServerLobbyToClient(serverLobby)
        set({ currentLobby: updatedLobby })
      }
    }
  }
}) 