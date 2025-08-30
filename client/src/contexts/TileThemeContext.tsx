import { createContext, useContext, useState, ReactNode } from 'react';
import { TileInfo } from '@shared/schema';
import jokerImageUpdated from '@assets/Screenshot 2025-08-29 at 4.55.46 PM_1756511824739.png';

export type TileTheme = 'ORIGINAL' | 'UPDATED';

export interface TileThemeConfig {
  id: TileTheme;
  name: string;
  description: string;
  renderJoker: (className?: string) => ReactNode;
  renderFlower: (className?: string) => ReactNode;
  renderDot: (value: number, className?: string) => ReactNode;
  renderBam: (value: number, className?: string) => ReactNode;
  renderCrak: (value: number, className?: string) => ReactNode;
  renderWind: (value: string, className?: string) => ReactNode;
  renderDragon: (value: string, className?: string) => ReactNode;
}

export const TILE_THEMES: Record<TileTheme, TileThemeConfig> = {
  ORIGINAL: {
    id: 'ORIGINAL',
    name: 'Original',
    description: 'Classic text-based tiles',
    renderJoker: (className) => <span className={`text-purple-600 font-bold ${className}`}>🃏</span>,
    renderFlower: (className) => <span className={`text-pink-500 ${className}`}>🌸</span>,
    renderDot: (value, className) => <span className={`text-blue-600 font-bold ${className}`}>{value}●</span>,
    renderBam: (value, className) => <span className={`text-green-600 font-bold ${className}`}>{value}🎋</span>,
    renderCrak: (value, className) => <span className={`text-red-600 font-bold ${className}`}>{value}万</span>,
    renderWind: (value, className) => {
      const windDisplay = {
        'N': '北', 'E': '東', 'S': '南', 'W': '西'
      }[value] || value;
      return <span className={`text-slate-700 font-bold ${className}`}>{windDisplay}</span>;
    },
    renderDragon: (value, className) => {
      const dragonDisplay = {
        'R': '中', 'G': '發', 'W': '白'
      }[value] || value;
      const dragonColor = {
        'R': 'text-red-600', 'G': 'text-green-600', 'W': 'text-slate-500'
      }[value] || 'text-slate-600';
      return <span className={`font-bold ${dragonColor} ${className}`}>{dragonDisplay}</span>;
    }
  },
  UPDATED: {
    id: 'UPDATED',
    name: 'Updated',
    description: 'Modern design with custom joker image',
    renderJoker: (className) => (
      <img 
        src={jokerImageUpdated} 
        alt="Joker" 
        className={`w-full h-full object-cover rounded ${className}`}
        style={{ maxWidth: '100%', maxHeight: '100%' }}
      />
    ),
    renderFlower: (className) => <span className={`text-pink-500 ${className}`}>🌸</span>,
    renderDot: (value, className) => <span className={`text-blue-600 font-bold ${className}`}>{value}●</span>,
    renderBam: (value, className) => <span className={`text-green-600 font-bold ${className}`}>{value}🎋</span>,
    renderCrak: (value, className) => <span className={`text-red-600 font-bold ${className}`}>{value}万</span>,
    renderWind: (value, className) => {
      const windDisplay = {
        'N': '北', 'E': '東', 'S': '南', 'W': '西'
      }[value] || value;
      return <span className={`text-slate-700 font-bold ${className}`}>{windDisplay}</span>;
    },
    renderDragon: (value, className) => {
      const dragonDisplay = {
        'R': '中', 'G': '發', 'W': '白'
      }[value] || value;
      const dragonColor = {
        'R': 'text-red-600', 'G': 'text-green-600', 'W': 'text-slate-500'
      }[value] || 'text-slate-600';
      return <span className={`font-bold ${dragonColor} ${className}`}>{dragonDisplay}</span>;
    }
  }
};

interface TileThemeContextType {
  currentTheme: TileTheme;
  setTheme: (theme: TileTheme) => void;
  getThemeConfig: () => TileThemeConfig;
  getAllThemes: () => TileThemeConfig[];
}

const TileThemeContext = createContext<TileThemeContextType | undefined>(undefined);

export function TileThemeProvider({ children }: { children: ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<TileTheme>('ORIGINAL');

  const setTheme = (theme: TileTheme) => {
    setCurrentTheme(theme);
    // Store preference in localStorage
    localStorage.setItem('mahjong-tile-theme', theme);
  };

  const getThemeConfig = () => TILE_THEMES[currentTheme];
  
  const getAllThemes = () => Object.values(TILE_THEMES);

  // Load saved theme on mount
  useState(() => {
    const savedTheme = localStorage.getItem('mahjong-tile-theme') as TileTheme;
    if (savedTheme && TILE_THEMES[savedTheme]) {
      setCurrentTheme(savedTheme);
    }
  });

  const value = {
    currentTheme,
    setTheme,
    getThemeConfig,
    getAllThemes
  };

  return (
    <TileThemeContext.Provider value={value}>
      {children}
    </TileThemeContext.Provider>
  );
}

export function useTileTheme() {
  const context = useContext(TileThemeContext);
  if (context === undefined) {
    throw new Error('useTileTheme must be used within a TileThemeProvider');
  }
  return context;
}