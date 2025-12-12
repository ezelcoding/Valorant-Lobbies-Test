# Valobbies - Valorant Lobby Finder

A modern Vite 5 + React 18 + TypeScript single-page application for discovering and creating Valorant game lobbies.

## Tech Stack

- **Vite 5** - Next-generation frontend build tool
- **React 18** - Modern UI library
- **TypeScript** - Type-safe JavaScript
- **Lucide React** - Icon library for UI components
- **Supabase REST API** - Backend for lobby data management
- **CSS Utilities** - Minimal utility-style classes with glassmorphism support

## Project Structure

```
valobbies/
├── src/
│   ├── main.tsx              # Application entry point
│   ├── App.tsx               # Root component
│   ├── ValorantLobbies.tsx   # Main component with all UI and state
│   └── index.css             # Global styles
├── index.html                # HTML template
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── package.json              # Dependencies and scripts
└── README.md                 # This file
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
Create a `.env.local` file in the project root with your Supabase configuration:
```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

## Development

Start the development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173/`

## Building

Build the application for production:
```bash
npm run build
```

Preview the production build locally:
```bash
npm run preview
```

## Architecture

### Application Flow
The application follows a simple entry hierarchy:
- **main.tsx** - React root initialization
- **App.tsx** - Root component wrapper
- **ValorantLobbies.tsx** - Main component containing all UI and state management

### State Management
The `ValorantLobbies` component manages:
- **Lobby Data** - Fetched from Supabase REST endpoint
- **Creation Form** - Rank range, mode, mic requirement, age restriction, available spots
- **Pagination** - Browse through lobby listings
- **Auto-refresh** - Polls Supabase every 10 seconds
- **Data Cleanup** - Automatically prunes entries older than 5 minutes every 30 seconds
- **UI Feedback** - Cooldown tracking (60s), clipboard copy feedback, time-ago labels

### Supabase Integration

#### Expected Table Structure
Your Supabase project should have a `lobbies` table with the following schema:

```sql
CREATE TABLE lobbies (
  id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
  code TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  rank_min TEXT,
  rank_max TEXT,
  mode TEXT,
  mic_required BOOLEAN,
  age_restriction INTEGER,
  spots_available INTEGER,
  created_by TEXT
);
```

#### REST Endpoint Usage
The application fetches from: `{VITE_SUPABASE_URL}/rest/v1/lobbies`

All requests should include:
- `apikey` query parameter with `VITE_SUPABASE_ANON_KEY`
- `Content-Type: application/json` header
- `Authorization: Bearer {VITE_SUPABASE_ANON_KEY}` header for write operations

### Features

#### Lobby Creation
- Create lobbies with customizable parameters:
  - **Rank Range** - Minimum and maximum player rank
  - **Game Mode** - Unrated, Competitive, Spike Rush, etc.
  - **Microphone** - Toggle mic requirement
  - **Age** - Optional age restriction
  - **Spots** - Number of available player spots (1-5)
- **Code Generation** - Auto-generated 3-letter + 3-number lobby codes
- **Cooldown** - 60-second cooldown between lobby creation
- **Validation** - Client-side validation for form inputs

#### Lobby Browsing
- **Auto-refresh** - Live updates every 10 seconds
- **Gradient Ranks** - Color-coded rank badges (Iron → Radiant)
- **Mic Icons** - Visual indicator for mic requirements
- **Time-ago Labels** - Relative creation timestamps
- **Spot Count** - Display available spots
- **Copy-to-Clipboard** - Quick code sharing
- **Automatic Pruning** - Entries older than 5 minutes automatically removed
- **Pagination** - Browse lobbies across multiple pages

### Styling

The application uses a minimal CSS approach with:
- **Global Styles** - Light gray background, optimized font stack
- **Utility Classes** - Custom utility-style classes in components
- **Glassmorphism** - Baseline drop-shadow and blur effects for modern UI

Available glassmorphism classes:
- `.glass` - Standard glass effect
- `.glass-sm` - Small shadow variant
- `.glass-lg` - Large shadow variant
- `.container` - Max-width centered container

## Performance Considerations

- **Polling Strategy** - 10-second intervals for balanced responsiveness and server load
- **Cleanup Timer** - 30-second intervals for data pruning
- **Time-ago Computation** - Local label recomputation without server calls
- **Pagination** - Reduces DOM complexity for large datasets

## Browser Support

- Chrome/Chromium (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## License

MIT
