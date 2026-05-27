<p align="center">
  <img src="src/assets/image/logo.png" alt="WebDeck Logo" width="120" />
  <h1 align="center">WebDeck</h1>
  <p align="center">A modern HTML presentation editor</p>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Tauri-2.0-blue?logo=tauri" alt="Tauri" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Vite-6-646CFF?logo=vite" alt="Vite" />
</p>

## Features

- **Visual Slide Editor** — Drag-and-drop editing with real-time preview
- **Rich Element Support** — Text, images, shapes, formulas (KaTeX), and more
- **Animation System** — Entrance, emphasis, and exit animations with timeline control
- **Presentation Mode** — Full-screen presentation with drawing tools (pen, highlighter, eraser, laser pointer)
- **Formula Editing** — LaTeX formula editing with live preview and preset templates
- **Multi-language** — Chinese and English interface
- **Cross-platform** — Windows, macOS, and Linux support powered by Tauri

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript |
| Build | Vite 6 |
| Desktop | Tauri 2 |
| State | Zustand |
| Icons | Lucide React |
| Formula | KaTeX |
| i18n | Custom solution |

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [Rust](https://www.rust-lang.org/tools/install) (for Tauri)
- Platform-specific dependencies for [Tauri](https://v2.tauri.app/start/prerequisites/)

### Install Dependencies

```bash
npm install
```

### Development

```bash
npm run tauri dev
```

### Build

```bash
npm run tauri build
```

Build artifacts will be located in `src-tauri/target/release/bundle/`.

## Project Structure

```
4YWebDeck/
├── src/                    # Frontend source
│   ├── components/         # React components
│   ├── i18n/               # Internationalization
│   ├── store/              # Zustand state management
│   ├── utils/              # Utilities (file I/O, etc.)
│   └── types.ts            # TypeScript type definitions
├── src-tauri/              # Tauri (Rust) backend
│   ├── icons/              # App icons for all platforms
│   ├── src/                # Rust source
│   └── tauri.conf.json     # Tauri configuration
├── package.json
└── vite.config.ts
```

## License

MIT
