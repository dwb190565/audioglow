# AudioGlow 🎵✨

A stunning WebGL music visualizer with multiple reactive backgrounds and real-time audio analysis.

## Features

- **Multiple Visual Backgrounds**: 22 different reactive visual backgrounds including:
  - Harmonic Oscillator
  - ASCII Art
  - Glitch Effects
  - Waterfall Visualization
  - Cellular Automata
  - Thermal Mapping
  - Vortex Patterns
  - And many more!

- **Audio Features**:
  - Real-time audio analysis
  - Microphone input support
  - Playlist management
  - Drag & drop file upload
  - Volume control
  - Playback controls (play, pause, next, previous)
  - Loop modes (single track, playlist)

- **Modern UI**:
  - Dark theme with phosphor glow effects
  - Responsive design
  - Smooth animations
  - Intuitive controls

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom shadcn/ui components
- **Audio**: Web Audio API
- **Graphics**: WebGL (via Three.js patterns)

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/audioglow.git
cd audioglow
```

2. Install dependencies:
```bash
npm install
# or
yarn install
```

3. Run the development server:
```bash
npm run dev
# or
yarn dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Basic Controls

- **Upload Music**: Drag and drop audio files onto the interface
- **Play/Pause**: Use the play button or spacebar
- **Volume**: Adjust with the volume slider
- **Backgrounds**: Switch between different visual modes using the background selector
- **Microphone**: Toggle microphone input for real-time audio visualization

### Playlist Features

- **Add Files**: Drag multiple audio files to create a playlist
- **Navigation**: Use previous/next buttons to navigate tracks
- **Loop Modes**: 
  - Single track loop
  - Playlist loop
  - Shuffle mode

### Visual Backgrounds

The app includes 22 different reactive backgrounds:

1. **Harmonic Oscillator** - Smooth wave patterns
2. **ASCII Art** - Text-based visualization
3. **Glitch** - Digital distortion effects
4. **Waterfall** - Cascading frequency display
5. **Shard Field** - Geometric particle system
6. **Cellular Automata** - Rule-based patterns
7. **Thermal** - Heat map visualization
8. **Vortex** - Spiral particle effects
9. **Portal** - Dimensional gateway effects
10. **Glyph Rain** - Falling symbol animation
11. **Caustics** - Light refraction patterns
12. **Root System** - Organic branching
13. **Text EQ** - Typographic equalizer
14. **Character Fluid** - Liquid text animation
15. **LCD Bleed** - Retro display effects
16. **Marquee** - Scrolling text effects
17. **Telegraphic Pulse** - Morse code patterns
18. **Punch Card** - Vintage computing aesthetic
19. **Old Monitor** - CRT-style effects
20. **Sonogram** - Frequency spectrum display
21. **Retro Grid** - Classic game grid
22. **Typewriter** - Mechanical text effects

## Building for Production

```bash
npm run build
npm start
```

## Deployment

This project can be deployed to various platforms:

### Vercel (Recommended)
```bash
npm install -g vercel
vercel
```

### Netlify
```bash
npm run build
# Deploy the 'out' directory
```

### Docker
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Web Audio API for real-time audio processing
- Three.js community for WebGL inspiration
- Tailwind CSS for the beautiful design system
- Next.js team for the amazing framework

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

Made with ❤️ and lots of 🎵 