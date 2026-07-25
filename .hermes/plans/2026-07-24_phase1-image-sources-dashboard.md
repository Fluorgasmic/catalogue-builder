# Phase 1 SAAS — Sources d'images extensibles + Dashboard multi-projets

> **Pour Hermes :** implémenter tâche par tâche. Chaque tâche est bite-sized. Vérifier `npm run build` après chaque groupe.

**Goal :** Permettre au client de brancher SES images là où elles vivent déjà (dossier local OU son propre cloud : Drive, OneDrive, Synology, OVH, S3…) sans upload ni doublon, via une architecture de connecteurs ouverte ; et gérer plusieurs projets via un Dashboard Firestore.

**Architecture :** Un système de « providers de source d'images » : une interface commune (`ImageSourceProvider`) dont chaque fournisseur est une implémentation enregistrée dans un registre. `buildImageUrl()` délègue au provider actif du projet. Les images ne sont JAMAIS copiées côté serveur — seules des **références** (mapping nom→id/chemin + config du provider) sont stockées dans Firestore. Les tokens OAuth restent en session côté client.

**Tech Stack :** React 18 + Vite · Zustand · Firebase (Auth déjà actif, + Firestore) · File System Access API + IndexedDB (idb-keyval) · Google Picker/Drive API · OneDrive File Picker SDK.

**Principe directeur produit :** *« Tes images restent chez toi. »* Zéro coût de stockage côté SAAS → marges hautes, argument commercial fort.

---

## Vue d'ensemble de l'architecture cible

```
src/
  imageSources/
    ImageSourceProvider.js      # interface + JSDoc du contrat
    registry.js                 # enregistrement + lookup des providers
    providers/
      localFolder.js            # File System Access API + IndexedDB (persistance handle)
      googleDrive.js            # Picker + Drive API
      oneDrive.js               # OneDrive File Picker SDK
      httpBase.js               # base URL générique (couvre OVH/Synology/S3 via URL publique/signée)
    index.js                    # barrel: importe et register() tous les providers
  store/
    catalogStore.js             # + champ imageSource: { providerId, config, mapping }
    projectsStore.js            # NOUVEAU: liste projets Firestore (dashboard)
  components/
    DataImport/
      ImageSourcePanel.jsx      # NOUVEAU: sélecteur de provider + UI de connexion
      (LocalImagePanel/ImageServerPanel → absorbés/dépréciés)
    Dashboard/
      Dashboard.jsx             # NOUVEAU: grille de projets
      ProjectCard.jsx           # NOUVEAU
  lib/
    firestore.js                # NOUVEAU: init Firestore + helpers CRUD projets
```

### Le contrat `ImageSourceProvider`

Chaque provider expose la même forme, ce qui rend l'ajout d'un nouveau cloud (Synology, OVH, S3…) trivial :

```js
/**
 * @typedef {Object} ImageSourceProvider
 * @property {string} id                 - identifiant unique ('local', 'gdrive', 'onedrive', 'http')
 * @property {string} label              - nom affiché
 * @property {string} icon               - nom lucide-react
 * @property {boolean} needsAuth         - true si OAuth requis
 * @property {boolean} persistable       - true si la connexion peut être restaurée sans re-picker
 * @property {() => boolean} isSupported - dispo dans ce navigateur ?
 * @property {(config?) => Promise<Connection>} connect  - ouvre picker/OAuth, retourne une connexion vivante
 * @property {(conn, config?) => Promise<void>} restore  - reconnecte depuis une config persistée (silencieux si possible)
 * @property {(conn, filename) => Promise<string|null>} resolveUrl - filename → URL affichable (blob:, https:, data:)
 * @property {(conn) => object} serialize - config à stocker dans Firestore (SANS token/secret)
 * @property {(conn) => void} disconnect  - libère blob URLs / révoque
 */
```

`buildImageUrl(colValue, source)` devient : si HTTP direct → renvoie tel quel ; sinon → `registry.get(source.providerId).resolveUrl(conn, filename)`.

---

## GROUPE A — Refactor vers l'architecture de providers (fondation)

### Task A1 : Créer le contrat + registre
**Objectif :** poser l'interface commune et le registre.
**Files :**
- Create : `src/imageSources/ImageSourceProvider.js` (JSDoc du typedef ci-dessus, pas de logique)
- Create : `src/imageSources/registry.js`

`registry.js` :
```js
const providers = new Map()
export function register(provider) { providers.set(provider.id, provider) }
export function get(id) { return providers.get(id) ?? null }
export function list() { return [...providers.values()] }
export function listSupported() { return list().filter(p => p.isSupported()) }
```
**Verif :** `npm run build` passe (fichiers non encore importés → OK).

### Task A2 : Provider `localFolder` avec persistance IndexedDB
**Objectif :** migrer `localImages.js` vers un provider + persister le handle (reconnexion 1 clic).
**Files :**
- Add dep : `npm i idb-keyval`
- Create : `src/imageSources/providers/localFolder.js`
- Keep : `src/utils/localImages.js` (réutilisé en interne au début, supprimé plus tard)

Points clés :
- `connect()` → `window.showDirectoryPicker()`, scan, `idbKeyVal.set('cb-dir-handle-<projectId>', handle)`.
- `restore(config)` → lit le handle depuis IndexedDB, `await handle.queryPermission({mode:'read'})` ; si `'prompt'` → bouton « Reconnecter » qui appelle `handle.requestPermission()`. **Ne pas** re-naviguer si permission déjà accordée.
- `resolveUrl` = logique existante de `getLocalImageUrl` (blob URLs lazy + cache).
- `serialize()` → `{ folderName, imageCount }` (le handle vit dans IndexedDB, pas dans Firestore).
- `isSupported()` → `'showDirectoryPicker' in window`.

**Piège documenté :** les `FileSystemDirectoryHandle` sont sérialisables dans IndexedDB (structured clone) mais PAS dans localStorage/JSON. D'où IndexedDB.

**Verif :** connecter un dossier, recharger la page → bouton « Reconnecter (1 clic) » restaure sans re-picker.

### Task A3 : Provider `httpBase` (couvre Synology / OVH / S3 / URL publiques)
**Objectif :** un provider générique « base URL » qui absorbe l'ancien `ImageServerPanel` ET tout NAS/cloud exposant des URLs.
**Files :**
- Create : `src/imageSources/providers/httpBase.js`

- `connect(config)` → stocke juste `{ baseUrl }` (ex. `https://mon-nas.synology.me/photos/`, un bucket S3 public, un lien OVH Object Storage…).
- `resolveUrl(conn, filename)` → `baseUrl + filename` (+ extension si absente).
- `needsAuth: false`, `persistable: true` (baseUrl stockable en clair dans Firestore).
- UI : un champ URL + aide « Collez l'URL publique de votre dossier d'images (NAS Synology, OVH Object Storage, S3, serveur web…) ».

**Note :** couvre 80% des cas « autres fournisseurs » sans OAuth. Les cas privés (signed URLs) seront un provider dédié plus tard — YAGNI pour l'instant.

### Task A4 : Câbler le store sur `imageSource`
**Objectif :** remplacer `imageBasePath` par un objet source structuré.
**Files :** Modify `src/store/catalogStore.js`

Ajouter :
```js
imageSource: { providerId: 'local', config: {}, mapping: {} },
setImageSource: (partial) => set(s => ({ imageSource: { ...s.imageSource, ...partial } })),
```
Migration douce : au chargement, si un ancien `imageBasePath` existe → convertir en `{ providerId:'http', config:{ baseUrl } }` ou `{ providerId:'local' }` si `__local__`. Garder `imageExtension`, `imageColumn` tels quels.
Mettre à jour `partialize`, `exportProject`, `importProject`.

### Task A5 : Refactor `buildImageUrl` vers le registre
**Files :** Modify `src/utils/imageUrl.js`
- Signature : `buildImageUrl(colValue, imageSource, extension, connection)`.
- HTTP direct dans la cellule → renvoyé tel quel (inchangé).
- Sinon → `registry.get(imageSource.providerId)?.resolveUrl(connection, fullFilename)`.
- Répercuter dans `blockRenderer.jsx`, `VignettePlaceholder.jsx`, `PageCanvas.jsx` (chercher les appels à `buildImageUrl` / `imageBasePath`).

**Verif :** `npm run build` + aperçu local avec dossier local fonctionne comme avant.

---

## GROUPE B — Connecteurs cloud du client (OAuth, sans upload)

> Chaque connecteur nécessite une **config OAuth** (client ID) à créer côté console fournisseur. À documenter dans un `.env` (jamais commité) + README.

### Task B1 : Provider Google Drive
**Objectif :** le client pointe SES images Drive, l'app les lit à la volée.
**Files :**
- Create : `src/imageSources/providers/googleDrive.js`
- Add : chargement dynamique du script `https://apis.google.com/js/api.js` + `https://accounts.google.com/gsi/client`.
- `.env` : `VITE_GOOGLE_CLIENT_ID`, `VITE_GOOGLE_API_KEY`.

Flow :
- `connect()` → GIS OAuth token (scope `drive.readonly`) → ouvre **Google Picker** (mode dossier) → récupère l'ID du dossier sélectionné.
- Liste les fichiers du dossier via Drive API `files.list` → construit `mapping { filename → fileId }`.
- `resolveUrl(conn, filename)` → `fileId` → `files.get({alt:'media'})` en blob → `URL.createObjectURL`. Cache comme local.
- `serialize()` → `{ folderId, folderName, mapping }` (mapping des IDs OK à stocker ; **token jamais stocké**).
- `restore()` → re-demande un token (popup silencieux si session Google active) puis réutilise `folderId`/`mapping`.

**Piège :** quotas Drive API → cache agressif + `preload` de la page courante uniquement (pattern déjà en place dans `localImages.js`).

### Task B2 : Provider OneDrive
**Files :**
- Create : `src/imageSources/providers/oneDrive.js`
- Script : OneDrive File Picker SDK v8 (`@microsoft/mgt` OU picker JS).
- `.env` : `VITE_MS_CLIENT_ID`.

Flow analogue à Drive : MSAL token (scope `Files.Read`) → File Picker (dossier) → `mapping { filename → driveItemId }` → `resolveUrl` via Graph `/content` en blob. `serialize` = `{ folderId, mapping }`, token en session.

### Task B3 : UI `ImageSourcePanel`
**Objectif :** un seul panneau clair remplaçant `LocalImagePanel` + `ImageServerPanel`.
**Files :**
- Create : `src/components/DataImport/ImageSourcePanel.jsx`
- Modify : `src/components/DataImport/DataImport.jsx` (remplacer les 2 anciens panels par celui-ci)
- Deprecate : `LocalImagePanel.jsx`, `ImageServerPanel.jsx` (à retirer une fois validé)

UI :
- Ligne de « chips » des providers supportés (`registry.listSupported()`), icônes lucide.
- Provider sélectionné → affiche son UI de connexion (bouton picker local / OAuth cloud / champ baseUrl).
- État connecté : nom du dossier + nb d'images trouvées + bouton « Reconnecter » / « Changer de source ».
- Bandeau info : *« Vos images ne sont jamais copiées : Catalogue Builder ne fait que les afficher depuis votre stockage. »*

**Verif :** basculer entre local / http / (drive si config .env) fonctionne, l'aperçu se met à jour.

---

## GROUPE C — Dashboard multi-projets (Firestore)

### Task C1 : Init Firestore + helpers
**Files :**
- Create : `src/lib/firestore.js`
- Réutilise `firebaseConfig` existant ; `getFirestore(app)`.

Helpers :
```js
listProjects(uid)                 // collection users/{uid}/projects, tri par updatedAt
createProject(uid, data)          // renvoie id
loadProject(uid, projectId)
saveProject(uid, projectId, data) // le JSON de exportProject() SANS images
deleteProject(uid, projectId)
```
**Contenu stocké = sortie de `exportProject()` étendue avec `imageSource.serialize()`. Jamais d'images.**

### Task C2 : Security Rules Firestore
**Files :** Create `firestore.rules`
```
match /users/{uid}/projects/{pid} {
  allow read, write: if request.auth != null && request.auth.uid == uid;
}
```
Documenter le déploiement : `firebase deploy --only firestore:rules`.

### Task C3 : `projectsStore` + Dashboard UI
**Files :**
- Create : `src/store/projectsStore.js`
- Create : `src/components/Dashboard/Dashboard.jsx`
- Create : `src/components/Dashboard/ProjectCard.jsx`
- Modify : `src/App.jsx` (nouvel écran racine : Dashboard → ouvre un projet → éditeur actuel)

Dashboard :
- Grille de cartes projets (nom, date maj, nb produits, miniature première page si dispo).
- Bouton « Nouveau projet », actions par carte : ouvrir / dupliquer / supprimer / renommer.
- Auto-save du projet ouvert vers Firestore (debounce 2s) → remplace le save/load JSON manuel (qu'on garde en export/import de secours).

### Task C4 : Auto-save + isolation par uid
**Files :** Modify `catalogStore.js`, `App.jsx`
- Au chargement d'un projet → hydrate le store.
- Sur changement → debounce → `saveProject(uid, currentProjectId, exportProject())`.
- `partialize` localStorage reste comme cache offline, mais Firestore = source de vérité.

**Verif :** créer 2 projets, changer de navigateur (même compte) → les 2 projets réapparaissent.

---

## Fichiers susceptibles de changer

| Fichier | Action |
|---|---|
| `src/imageSources/**` | **Créer** (nouveau module) |
| `src/utils/imageUrl.js` | Refactor vers registry |
| `src/utils/localImages.js` | Absorbé dans provider local puis retiré |
| `src/store/catalogStore.js` | `imageSource`, migration, export/import |
| `src/store/projectsStore.js` | **Créer** |
| `src/lib/firestore.js` | **Créer** |
| `src/components/DataImport/ImageSourcePanel.jsx` | **Créer** |
| `src/components/DataImport/{LocalImagePanel,ImageServerPanel}.jsx` | Déprécier/retirer |
| `src/components/DataImport/DataImport.jsx` | Brancher le nouveau panel |
| `src/components/Dashboard/{Dashboard,ProjectCard}.jsx` | **Créer** |
| `src/App.jsx` | Écran racine Dashboard |
| `firestore.rules` | **Créer** |
| `.env` / `.env.example` | Client IDs OAuth (jamais commité le vrai) |
| `package.json` | + `idb-keyval` |

## Tests / validation
- `npm run build` vert après chaque groupe.
- Manuel : local (avec reconnexion post-refresh), http baseUrl, Drive (si `.env`), OneDrive (si `.env`).
- Manuel : Dashboard multi-projets cross-navigateur même compte.
- Vérifier qu'**aucune image** ni token n'atterrit dans Firestore (inspecter la console Firebase).

## Risques / arbitrages / questions ouvertes
- **OAuth = config externe obligatoire** (Google Cloud Console + Azure AD). Rien à coder ne marche sans les client IDs. → livrer local + httpBase d'abord (zéro config), Drive/OneDrive ensuite.
- **File System Access API = Chrome/Edge only.** Safari/Firefox n'ont pas `showDirectoryPicker`. → pour ces navigateurs, masquer le provider local et pousser httpBase/cloud. À afficher clairement dans l'UI.
- **Quotas API Drive/OneDrive** sur gros catalogues (milliers d'images) → cache + preload page courante uniquement ; ne jamais résoudre tout le catalogue d'un coup.
- **Tokens OAuth en session** → expirent ; prévoir un refresh transparent et un état « reconnexion requise ».
- **Question ouverte :** pour les NAS privés (Synology/OVH avec auth), veut-on un provider OAuth dédié plus tard, ou l'URL signée/publique via `httpBase` suffit pour la Beta ? (reco : httpBase pour la Beta, YAGNI.)
- **Migration des projets `localStorage` existants** vers Firestore au premier login → prévoir un one-shot d'import.

## Ordre d'exécution recommandé
1. Groupe A (fondation, aucune config externe) → livrable utile seul : local reconnectable + httpBase.
2. Groupe C (dashboard Firestore) → valeur SAAS immédiate, pas d'OAuth.
3. Groupe B (Drive puis OneDrive) → quand les client IDs OAuth sont créés.
