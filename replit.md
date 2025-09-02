# Overview

This is an American Mahjong web application built as a full-stack multiplayer game platform. The application provides authentic American Mahjong gameplay with multiplayer tables, AI bot opponents, comprehensive tutorials, and daily practice puzzles. It follows NMJL-style mechanics without copying copyrighted content, using a data-driven pattern system for game rules.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **React + TypeScript**: Built with modern React patterns using functional components and hooks
- **Vite**: Development server and build tool for fast development experience  
- **Tailwind CSS + shadcn/ui**: Design system using Tailwind for styling and shadcn/ui for consistent components
- **React Router (wouter)**: Lightweight client-side routing for SPA navigation
- **TanStack React Query**: Data fetching, caching, and state management for server communication

## Backend Architecture
- **Express.js**: RESTful API server with middleware for logging, authentication, and error handling
- **Drizzle ORM**: Type-safe database queries with PostgreSQL as the primary database
- **WebSocket Server**: Real-time bidirectional communication for live game updates using native WebSocket
- **Service-oriented architecture**: Modular services for game engine, bot AI, pattern validation, puzzle generation, feature flags, and analytics

## Authentication & Authorization
- **Replit Auth**: OpenID Connect integration for seamless user authentication within Replit environment
- **Session-based auth**: Server-side session management using PostgreSQL session store
- **User profiles**: Comprehensive user preferences including game settings, accessibility options, and analytics consent

## Game Engine Design
- **Server-authoritative gameplay**: All game logic runs on server to prevent cheating
- **Data-driven rule patterns**: JSON-based hand patterns that can be loaded dynamically without code changes
- **Pluggable bot system**: AI opponents with configurable difficulty levels (easy, standard, strong)
- **Real-time synchronization**: WebSocket-based state updates with reconnection handling
- **Audit logging**: Append-only action log for game replay and dispute resolution

## Data Architecture
- **PostgreSQL database**: Relational data with JSONB for flexible game state storage
- **Drizzle schema**: Type-safe database models with automatic migrations
- **Feature flag system**: Runtime configuration for A/B testing and gradual feature rollouts
- **Analytics pipeline**: Event tracking with user privacy controls

# External Dependencies

## Database & Storage
- **Neon Database**: Serverless PostgreSQL database with connection pooling
- **Connect-pg-simple**: PostgreSQL-backed session storage for user authentication

## Authentication
- **Replit Auth**: OpenID Connect provider for user authentication
- **Passport.js**: Authentication middleware with OpenID Connect strategy

## Real-time Communication
- **WebSocket (ws)**: Native WebSocket library for real-time game communication
- **Socket.IO alternative**: Custom WebSocket manager for table-based room management

## UI Components
- **Radix UI**: Accessible component primitives for complex UI interactions
- **Lucide React**: Icon library for consistent iconography
- **Class Variance Authority**: Type-safe styling variants for component design system

## Development Tools
- **TypeScript**: Full-stack type safety with shared schema definitions
- **ESBuild**: Fast bundling for production server builds
- **TSX**: TypeScript execution for development server