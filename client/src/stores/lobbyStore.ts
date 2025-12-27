import { create } from 'zustand'
import { 
  createLobby,
  joinLobby,
  leaveLobby,
} from '../services/lobbyService'
import { startGame as startGameService } from '../services/gameService'
import { syncLobbyState, realtimeManager } from '../services/realtimeService'
import { socketService } from '../services/socketService'
import { savePlayerData } from '../utils'
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
  error: string | null
  isConnected: boolean // Socket.io connection state
  
  // Actions
  setJoinCode: (code: string) => void
  setPlayerName: (name: string) => void
  createLobby: (playerName: string, isPrivate: boolean) => Promise<void>
  joinLobby: (code: string, playerName: string) => Promise<void>
  leaveLobby: () => Promise<void>
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

export const useLobbyStore = create<LobbyState>((set, get) => ({
  currentLobby: null,
  joinCode: '',
  playerName: '',
  currentPlayerId: null,
  isJoining: false,
  isCreating: false,
  error: null,
  isConnected: false,

  setJoinCode: (code: string) => set({ joinCode: code.toUpperCase() }),
  
  setPlayerName: (name: string) => set({ playerName: name }),
  
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  createLobby: async (playerName: string, _isPrivate: boolean) => {
    set({ isCreating: true, error: null })
    
    try {
      // Ensure socket is connected
      if (!socketService.isConnected()) {
        socketService.connect()
        // Wait for connection
        await new Promise<void>((resolve) => {
          const unsubscribe = socketService.on('connected', () => {
            unsubscribe()
            resolve()
          })
          // Timeout after 5 seconds
          setTimeout(() => {
            unsubscribe()
            resolve()
          }, 5000)
        })
      }
      
      const { lobby: serverLobby, player: serverPlayer } = await createLobby(playerName)
      
      const newLobby: GameLobby = convertServerLobbyToClient(serverLobby)
      
      // Save player data to localStorage
      savePlayerData(serverPlayer.id, serverPlayer.username);
      
      set({ 
        currentLobby: newLobby, 
        currentPlayerId: serverPlayer.id,
        isCreating: false,
        playerName: '',
        isConnected: socketService.isConnected()
      })
      
      // Set up real-time lobby updates
      syncLobbyState((serverLobby: ServerLobby) => {
        const { currentLobby } = get()
        if (currentLobby && serverLobby.id === currentLobby.id) {
          const updatedLobby = convertServerLobbyToClient(serverLobby)
          set({ currentLobby: updatedLobby })
        }
      })
      
      // Store subscription key for cleanup (we'll handle this in leaveLobby)
      // For now, we'll let it persist until leaveLobby is called
    } catch (error) {
      set({ 
        error: error instanceof Error ? error.message : 'Failed to create lobby',
        isCreating: false 
      })
    }
  },
  
  joinLobby: async (code: string, playerName: string) => {
    set({ isJoining: true, error: null })
    
    try {
      // Ensure socket is connected
      if (!socketService.isConnected()) {
        socketService.connect()
        // Wait for connection
        await new Promise<void>((resolve) => {
          const unsubscribe = socketService.on('connected', () => {
            unsubscribe()
            resolve()
          })
          // Timeout after 5 seconds
          setTimeout(() => {
            unsubscribe()
            resolve()
          }, 5000)
        })
      }
      
      // Set up real-time lobby updates BEFORE joining
      // The server will emit lobbyUpdate to all players when someone joins
      let lobbyReceived = false
      let subscriptionKey: string | null = null
      
      subscriptionKey = syncLobbyState((serverLobby: ServerLobby) => {
        if (serverLobby.code.toUpperCase() === code.toUpperCase()) {
          if (!lobbyReceived) {
            lobbyReceived = true
            const joinedLobby = convertServerLobbyToClient(serverLobby)
            
            // Find the current player in the lobby (by username since we just joined)
            const currentPlayer = serverLobby.players.find(p => p.username === playerName)
            
            if (currentPlayer) {
              // Save player data to localStorage
              savePlayerData(currentPlayer.id, currentPlayer.username)
              
              set({ 
                currentLobby: joinedLobby, 
                currentPlayerId: currentPlayer.id,
                isJoining: false,
                joinCode: '',
                playerName: '',
                isConnected: socketService.isConnected()
              })
            }
          } else {
            // Update lobby state for subsequent updates
            const updatedLobby = convertServerLobbyToClient(serverLobby)
            set({ currentLobby: updatedLobby })
          }
        }
      })
      
      // Join the lobby (server handles finding by code)
      // This will trigger lobbyJoined event, and server will also emit lobbyUpdate
      await joinLobby(code, playerName)
      
      // Wait a moment for lobbyUpdate event to arrive
      // If it doesn't arrive, we'll use the player data we have
      await new Promise<void>((resolve) => {
        const checkInterval = setInterval(() => {
          if (lobbyReceived) {
            clearInterval(checkInterval)
            resolve()
          }
        }, 100)
        
        setTimeout(() => {
          clearInterval(checkInterval)
          resolve()
        }, 2000)
      })
      
      // If we still haven't received the lobby, create a minimal one from the player data
      if (!lobbyReceived && subscriptionKey) {
        // The lobbyUpdate should have arrived, but if not, we'll wait a bit more
        // or the component can handle the missing lobby state
        // Don't fail - the real-time subscription will eventually receive it
      }
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
    
    set({ 
      currentLobby: null,
      currentPlayerId: null,
      joinCode: '',
      playerName: '',
      error: null
    })
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
      await startGameService()
      // Game start will trigger countdownStart event, which will be handled by game components
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
})) 