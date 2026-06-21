import { readFileSync, existsSync } from "fs"
import { join } from "path"
import { sentryVitePlugin } from "@sentry/vite-plugin"
import { defineConfig } from "vite"
import desktopPlugin from "./vite"

const sentry =
  process.env.SENTRY_AUTH_TOKEN && process.env.SENTRY_ORG && process.env.SENTRY_PROJECT
    ? sentryVitePlugin({
        authToken: process.env.SENTRY_AUTH_TOKEN,
        org: process.env.SENTRY_ORG,
        project: process.env.SENTRY_PROJECT,
        telemetry: false,
        release: {
          name: process.env.SENTRY_RELEASE ?? process.env.VITE_SENTRY_RELEASE,
        },
        sourcemaps: {
          assets: "./dist/**",
          filesToDeleteAfterUpload: "./dist/**/*.map",
        },
      })
    : false

function debugCjsFixPlugin(): any {
  const proxyId = "\0debug-proxy"
  return {
    name: "debug-cjs-fix",
    enforce: "pre",
    resolveId(id: string) {
      if (id === "debug") return proxyId
      return null
    },
    load(id: string) {
      if (id === proxyId) {
        return {
          code: `
function debug() {}
debug.formatArgs = function() {};
debug.save = function() {};
debug.load = function() { return []; };
debug.useColors = function() { return false; };
debug.storage = typeof localStorage !== 'undefined' ? localStorage : {};
debug.destroy = function() {};
debug.colors = [6, 2, 3, 4, 5, 1];
debug.createDebug = function(ns) { var d = function() {}; d.namespace = ns; d.log = function(){}; d.extend = function(){return d;}; d.enabled = false; return d; };
debug.log = typeof console !== 'undefined' ? (console.debug || console.log || function() {}) : function() {};
debug.init = function() {};
debug.enable = function() {};
debug.disable = function() {};
debug.enabled = function() { return false; };
debug.humanize = function() { return 0; };
debug.names = [];
debug.skips = [];
debug.selectColor = function() { return 0; };
export default debug;\n`,
        }
      }
      return null
    },
  }
}

function extendCjsFixPlugin(): any {
  const proxyId = "\0extend-proxy"
  let extendCode: string | null = null
  return {
    name: "extend-cjs-fix",
    enforce: "pre",
    resolveId(id: string) {
      if (id === "extend") return proxyId
      return null
    },
    load(id: string) {
      if (id === proxyId) {
        if (!extendCode) {
          const paths = [
            join(process.cwd(), "node_modules", ".bun", "extend@3.0.2", "node_modules", "extend", "index.js"),
            join(process.cwd(), "node_modules", "extend", "index.js"),
            join(process.cwd(), "../../node_modules", ".bun", "extend@3.0.2", "node_modules", "extend", "index.js"),
            join(process.cwd(), "../../node_modules", "extend", "index.js"),
            join(process.cwd(), "../../node_modules", ".bun", "extend@3.0.3", "node_modules", "extend", "index.js"),
          ]
          for (const p of paths) {
            if (existsSync(p)) {
              extendCode = readFileSync(p, "utf-8")
              break
            }
          }
          if (!extendCode) throw new Error("Could not find extend module")
          extendCode = extendCode.replace("module.exports = function extend", "function extend") + "\n\nexport default extend"
        }
        return { code: extendCode }
      }
      return null
    },
  }
}

export default defineConfig({
  plugins: [desktopPlugin, sentry, debugCjsFixPlugin(), extendCjsFixPlugin()] as any,
  optimizeDeps: {
    include: ["debug"],
  },
  esbuild: {
    jsx: "automatic",
  },
  server: {
    host: "0.0.0.0",
    allowedHosts: true,
    port: 3000,
  },
  build: {
    target: "esnext",
    sourcemap: true,
  },
})
