import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // Allow ngrok tunnels (for testing on a phone). Hostnames only, no scheme or path;
    // the leading dot matches any subdomain
    allowedHosts: ['.ngrok-free.dev', '.ngrok-free.app'],
    // Forward Socket.io to the game server so a tunnel only has to expose this port.
    // The client connects to the page's own origin when VITE_SOCKET_URL is unset.
    proxy: {
      '/socket.io': {
        target: 'http://localhost:8080',
        ws: true,
      },
    },
  },
})
