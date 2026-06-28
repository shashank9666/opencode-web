# OpenCode Web

OpenCode Web is a web-based code editing experience where an AI coding agent operates alongside you directly in the browser. Built with [SolidJS](https://www.solidjs.com/) and [Monaco Editor](https://microsoft.github.io/monaco-editor/), it connects to an OpenCode backend to run agent sessions efficiently.

## Features
- **Browser-based IDE**: Full-fledged coding environment accessible via your web browser.
- **Desktop Application**: Fully packaged Electron application for Windows, macOS, and Linux.
- **AI Integration**: Built-in AI coding agent that understands your codebase and helps you write, refactor, and debug code.
- **Modern Stack**: Powered by SolidJS for high performance and reactivity.

## Running Locally

### Prerequisites
- [Bun](https://bun.sh/) installed on your machine.

### Setup

1. **Install dependencies** (from the repository root):
   ```bash
   bun install
   ```

2. **Start the backend server** (runs on port `4098`):
   ```bash
   bun run dev:backend
   ```

3. **Start the frontend dev server** (runs on port `4444`):
   ```bash
   bun run dev:web
   ```

4. **Access the application**: Open `http://localhost:4444` in your browser.

## Building the Desktop App (Electron)

You can build a packaged desktop application for your local system. The build process will compile the frontend UI, compile the native backend binary for your platform, and bundle everything into an Electron app.

1. **Build a portable/unpacked folder (fastest for testing)**:
   ```bash
   bun run build:electron:pack
   ```
   > The portable app will be generated in `packages/electron/release/win-unpacked/` (or `mac-unpacked`, `linux-unpacked`). You can run the executable directly from this folder to test.

2. **Build a full installer**:
   ```bash
   bun run build:electron
   ```
   > The installer (`.exe`, `.dmg`, or `.AppImage`) will be generated in the `packages/electron/release/` directory.

## Building for Web Production

To build the standalone web application for a production environment:

```bash
bun --cwd packages/app build
```
The output will be generated in the `packages/app/dist` directory, which can be deployed to any static file hosting service.

## Contributing
Please refer to the [CONTRIBUTING.md](./CONTRIBUTING.md) guidelines if you wish to contribute to the project.
