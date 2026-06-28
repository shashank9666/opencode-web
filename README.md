# OpenCode Web

OpenCode Web is a web-based code editing experience where an AI coding agent operates alongside you directly in the browser. Built with [SolidJS](https://www.solidjs.com/) and [Monaco Editor](https://microsoft.github.io/monaco-editor/), it connects to an OpenCode backend to run agent sessions efficiently.

## Features
- **Browser-based IDE**: Full-fledged coding environment accessible via your web browser.
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

2. **Start the backend server** (from `packages/opencode`):
   ```bash
   bun run --conditions=browser ./src/index.ts serve --port 4096
   ```

3. **Start the frontend dev server** (from `packages/app`):
   ```bash
   bun dev -- --port 4444
   ```

4. **Access the application**: Open `http://localhost:4444` in your browser.

## Building for Production

To build the application for a production environment:

```bash
# Build the frontend (from packages/app)
bun run build
```
The output will be generated in the `packages/app/dist` directory, which can be deployed to any static file hosting service.

## Contributing
Please refer to the [CONTRIBUTING.md](./CONTRIBUTING.md) guidelines if you wish to contribute to the project.
