/**
 * Barrel des sources d'images : enregistre tous les providers disponibles.
 * Importer ce module une fois au démarrage (dans main.jsx) suffit à peupler
 * le registre. Ajouter un nouveau fournisseur = 1 import + 1 register ici.
 */

import { register } from './registry'
import localFolder from './providers/localFolder'
import httpBase from './providers/httpBase'

register(localFolder)
register(httpBase)

// Providers cloud OAuth (Groupe B) — à décommenter une fois les client IDs configurés :
// import googleDrive from './providers/googleDrive'
// import oneDrive from './providers/oneDrive'
// register(googleDrive)
// register(oneDrive)

export * from './registry'
