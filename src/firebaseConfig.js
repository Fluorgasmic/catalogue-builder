/**
 * Configuration Firebase — authentification de l'application.
 *
 * ⚠️ Tant que `apiKey` est vide, l'authentification est DÉSACTIVÉE et
 * l'application est accessible librement (mode actuel).
 *
 * Pour activer la protection par compte utilisateur :
 *   1. https://console.firebase.google.com → « Ajouter un projet » (gratuit)
 *   2. Dans le projet : Création > Authentication > Commencer
 *      → onglet « Sign-in method » → activer « Adresse e-mail/Mot de passe »
 *   3. Paramètres du projet (roue dentée) > Général > « Vos applications »
 *      → ajouter une application Web (icône </>) → copier le bloc firebaseConfig
 *      et coller les valeurs ci-dessous
 *   4. Authentication > Settings > Domaines autorisés
 *      → ajouter : fluorgasmic.github.io
 *   5. Authentication > Users > « Ajouter un utilisateur »
 *      → créer un compte (e-mail + mot de passe) pour chaque personne
 *
 * Gestion des accès (toi = super admin, propriétaire du projet Firebase) :
 *   - Ajouter un accès    : Authentication > Users > Ajouter un utilisateur
 *   - Retirer un accès    : menu ⋮ de l'utilisateur > Désactiver le compte
 *                           (ou Supprimer le compte)
 *   - Réinitialiser un mot de passe : menu ⋮ > Réinitialiser le mot de passe
 *
 * Ces clés ne sont PAS secrètes : elles identifient le projet côté client,
 * la sécurité repose sur les comptes créés dans la console.
 */
export const firebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  appId: '',
}

/** Authentification activée seulement si la config est renseignée. */
export const authEnabled = Boolean(firebaseConfig.apiKey)
