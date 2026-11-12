import React from 'react';
import { LocationOn } from '@mui/icons-material';
import staticMap from '../../assets/static_map.webp';

/**
 * Shared layout for the home, join and lobby pages: dimmed map background,
 * app title, and the page's card centered in the space below the title.
 * Spacing is tighter on phones.
 */
export const PageShell: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    className="min-h-dvh w-full flex flex-col bg-cover bg-center bg-no-repeat relative"
    style={{ backgroundImage: `url(${staticMap})` }}
  >
    {/* Dark overlay - needed for text visibility */}
    <div className="absolute inset-0 bg-black/75"></div>

    <header className="relative z-10 px-4 pt-6 pb-4 sm:px-8 sm:pt-8 sm:pb-6 text-center">
      <div className="flex items-center justify-center gap-2 sm:gap-3">
        <LocationOn sx={{ fontSize: { xs: 32, sm: 48 }, color: '#FF0000' }} />
        <h1 className="text-white text-2xl sm:text-3xl font-bold tracking-wide">
          NYC GeoGuesser
        </h1>
      </div>
    </header>

    {/* Fills the space below the header so the card is vertically centered on every screen size */}
    <main className="relative z-10 flex-1 flex justify-center items-center px-4 sm:px-8 pb-6">
      {children}
    </main>
  </div>
);
