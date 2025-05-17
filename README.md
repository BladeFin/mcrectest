# Minecraft Beta 3D

A Three.js-based Minecraft Beta clone with basic block manipulation and terrain generation.

## Features

- First-person controls (WASD + Mouse)
- Block placement and destruction
- Procedurally generated terrain with trees
- Simple inventory system (1-9 keys)
- Basic physics (gravity, jumping)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm run dev
```

3. Open your browser and navigate to `http://localhost:5173`

## Controls

- **WASD**: Move
- **Space**: Jump
- **Mouse**: Look around
- **Left Click**: Break blocks
- **Right Click**: Place blocks
- **1-9**: Select inventory slots

## Development

This project uses:
- Three.js for 3D rendering
- Vite for development and building
- Simplex Noise for terrain generation

## Project Structure

- `src/main.js`: Main game initialization
- `src/player.js`: Player movement and physics
- `src/world.js`: World generation and block management
- `src/input.js`: Input handling and controls 