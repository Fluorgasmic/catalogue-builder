#!/usr/bin/env node
/**
 * Catalogue Builder — Image Server
 * Serves local images from a given directory over HTTP.
 *
 * Usage:
 *   node server/index.js --dir /path/to/images --port 3001
 *   node server/index.js --dir /path/to/images          (default port 3001)
 *   node server/index.js                                 (serves current dir)
 */

import express from 'express'
import cors from 'cors'
import path from 'path'
import fs from 'fs'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// ─── Parse CLI args ────────────────────────────────────────────────────────────

const args = process.argv.slice(2)
const getArg = (flag) => {
  const idx = args.indexOf(flag)
  return idx !== -1 ? args[idx + 1] : null
}

const PORT   = parseInt(getArg('--port') ?? '3001', 10)
const DIR    = getArg('--dir') ?? process.cwd()
const SUBDIR = getArg('--subdir') ?? ''          // optional subfolder within dir

const IMAGES_ROOT = path.resolve(DIR, SUBDIR)

// ─── Validate directory ────────────────────────────────────────────────────────

if (!fs.existsSync(IMAGES_ROOT)) {
  console.error(`❌  Dossier introuvable : ${IMAGES_ROOT}`)
  process.exit(1)
}

// ─── Express setup ─────────────────────────────────────────────────────────────

const app = express()

// Allow requests from the Vite dev server (localhost:5173) and any other origin
app.use(cors({ origin: '*' }))

// Headers required so Chrome doesn't block images via ORB (Opaque Response Blocking)
app.use((req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin')
  res.set('Cache-Control', 'no-store')
  next()
})

// ─── Routes ────────────────────────────────────────────────────────────────────

/**
 * GET /ping — lightweight health check used by the app UI.
 */
app.get('/ping', (req, res) => res.json({ ok: true, dir: IMAGES_ROOT }))

/**
 * Serve the entire IMAGES_ROOT as static files.
 * express.static handles all routing internally — no path-to-regexp issues.
 * A custom 404 handler returns JSON instead of HTML for easier debugging.
 */
app.use(express.static(IMAGES_ROOT, { dotfiles: 'ignore' }))

// 404: return a tiny transparent PNG so <img> tags don't trigger ORB errors
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)
app.use((req, res) => {
  // Return JSON for /ping and root, transparent PNG for everything else
  if (req.path === '/' || req.path === '/ping') {
    res.status(404).json({ error: 'Not found' })
  } else {
    res.status(404).set('Content-Type', 'image/png').send(TRANSPARENT_PNG)
  }
})

// ─── Start ─────────────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('')
  console.log('  📦  Catalogue Builder — Image Server')
  console.log(`  📁  Dossier : ${IMAGES_ROOT}`)
  console.log(`  🌐  URL     : http://localhost:${PORT}/`)
  console.log('')
  console.log('  Dans l\'app, saisissez comme chemin de base :')
  console.log(`  → http://localhost:${PORT}/`)
  console.log('')

  // Count image files
  try {
    const count = fs.readdirSync(IMAGES_ROOT)
      .filter(f => /\.(jpe?g|png|webp|gif|svg|avif)$/i.test(f)).length
    console.log(`  ✅  ${count} image(s) détectée(s) dans le dossier`)
  } catch {
    console.log('  ⚠️   Impossible de lister les fichiers')
  }

  console.log('')
  console.log('  Ctrl+C pour arrêter')
  console.log('')
})
