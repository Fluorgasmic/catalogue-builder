/**
 * ImageSourceProvider — contrat commun à toutes les sources d'images.
 *
 * Principe : Catalogue Builder ne copie JAMAIS les images. Chaque provider
 * ne fait que RÉFÉRENCER les images là où elles vivent (dossier local, cloud
 * du client, NAS, serveur web…) et les résoudre en URL affichable à la volée.
 *
 * Ajouter un nouveau fournisseur (Synology, OVH, S3, Dropbox…) =
 * écrire un seul fichier respectant ce contrat, puis l'enregistrer dans
 * `src/imageSources/index.js`. Aucun autre code à toucher.
 *
 * @typedef {Object} ImageSourceConnection
 *   État vivant d'une connexion (handle de dossier, token OAuth en session,
 *   mapping filename→id, cache de blob URLs…). Vit en mémoire, jamais persisté
 *   tel quel dans Firestore.
 *
 * @typedef {Object} ImageSourceProvider
 * @property {string}  id            Identifiant unique ('local', 'http', 'gdrive'…)
 * @property {string}  label         Nom affiché à l'utilisateur
 * @property {string}  icon          Nom d'icône lucide-react
 * @property {string}  [help]        Texte d'aide affiché sous l'UI de connexion
 * @property {boolean} needsAuth     true si une authentification OAuth est requise
 * @property {boolean} persistable   true si la connexion peut être restaurée sans
 *                                   re-sélection manuelle complète
 * @property {() => boolean} isSupported  Le provider fonctionne-t-il dans ce navigateur ?
 *
 * @property {(config?: object) => Promise<ImageSourceConnection>} connect
 *   Ouvre le picker / l'OAuth et retourne une connexion vivante.
 *
 * @property {(serialized: object) => Promise<{ connection: ImageSourceConnection|null, needsUserAction: boolean }>} restore
 *   Tente de reconnecter depuis une config persistée. `needsUserAction=true`
 *   si un clic utilisateur est requis (ex. re-grant de permission de dossier).
 *
 * @property {(conn: ImageSourceConnection, filename: string, extension?: string) => Promise<string|null>} resolveUrl
 *   Résout un nom de fichier en URL affichable (blob:, https:, data:). null si absent.
 *
 * @property {(conn: ImageSourceConnection, filename: string, extension?: string) => string|null} resolveUrlSync
 *   Variante synchrone pour les chemins de rendu (retourne le cache ou null,
 *   et déclenche un chargement async en arrière-plan). Optionnelle.
 *
 * @property {(conn: ImageSourceConnection) => object} serialize
 *   Config à stocker dans Firestore. NE DOIT JAMAIS contenir de token/secret.
 *
 * @property {(conn: ImageSourceConnection) => number} count
 *   Nombre d'images détectées dans la source (0 si inconnu).
 *
 * @property {(conn: ImageSourceConnection) => void} disconnect
 *   Libère les ressources (révoque les blob URLs, oublie le token…).
 */

export {}
