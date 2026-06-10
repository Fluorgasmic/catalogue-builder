import { useState, useEffect } from 'react'
import { BookOpen, Lock, Loader2, LogOut } from 'lucide-react'
import { firebaseConfig, authEnabled } from '../../firebaseConfig'

// Firebase n'est initialisé que si la config est renseignée — sinon l'app
// reste en accès libre et le SDK n'est même pas chargé.
let authPromise = null
function getFirebaseAuth() {
  if (!authPromise) {
    authPromise = Promise.all([
      import('firebase/app'),
      import('firebase/auth'),
    ]).then(([{ initializeApp }, authMod]) => {
      const app = initializeApp(firebaseConfig)
      return { auth: authMod.getAuth(app), mod: authMod }
    })
  }
  return authPromise
}

/**
 * Porte d'authentification : affiche l'écran de connexion tant que
 * l'utilisateur n'a pas de session Firebase valide.
 * La session persiste dans le navigateur (reconnexion automatique).
 */
export default function AuthGate({ children }) {
  const [status, setStatus] = useState(authEnabled ? 'loading' : 'open')
  // 'loading' | 'signedOut' | 'open'
  const [userEmail, setUserEmail] = useState(null)

  useEffect(() => {
    if (!authEnabled) return
    let unsub = () => {}
    getFirebaseAuth().then(({ auth, mod }) => {
      unsub = mod.onAuthStateChanged(auth, (user) => {
        setUserEmail(user?.email ?? null)
        setStatus(user ? 'open' : 'signedOut')
      })
    })
    return () => unsub()
  }, [])

  if (status === 'open') {
    return (
      <>
        {children}
        {authEnabled && userEmail && <LogoutBadge email={userEmail} />}
      </>
    )
  }

  if (status === 'loading') {
    return (
      <div className="flex items-center justify-center h-screen bg-surface-1">
        <Loader2 size={28} className="text-accent animate-spin" />
      </div>
    )
  }

  return <LoginScreen />
}

// ─── Écran de connexion ──────────────────────────────────────────────────────

function LoginScreen() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const { auth, mod } = await getFirebaseAuth()
      await mod.signInWithEmailAndPassword(auth, email.trim(), password)
      // onAuthStateChanged dans AuthGate fait basculer l'affichage
    } catch (err) {
      setError(messageFor(err))
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center justify-center h-screen bg-surface-1">
      <div className="w-full max-w-sm mx-4">
        <div className="bg-surface-2 border border-surface-5 rounded-2xl shadow-2xl p-8">

          {/* Logo */}
          <div className="flex flex-col items-center gap-3 mb-8">
            <div className="w-12 h-12 bg-accent rounded-xl flex items-center justify-center">
              <BookOpen size={22} className="text-white" />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-white tracking-wide">CATALOGUE BUILDER</p>
              <p className="text-xs text-gray-500 mt-1">Accès réservé — connectez-vous</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="label mb-1.5 block">Adresse e-mail</label>
              <input
                type="email"
                autoComplete="username"
                required
                className="w-full bg-surface-3 border border-surface-5 rounded-lg px-3 py-2.5 text-sm text-gray-200
                           outline-none focus:border-accent transition-colors"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
              />
            </div>

            <div>
              <label className="label mb-1.5 block">Mot de passe</label>
              <input
                type="password"
                autoComplete="current-password"
                required
                className="w-full bg-surface-3 border border-surface-5 rounded-lg px-3 py-2.5 text-sm text-gray-200
                           outline-none focus:border-accent transition-colors"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-red-400 text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="btn-primary justify-center gap-2 py-2.5 mt-1"
            >
              {busy ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
              Se connecter
            </button>
          </form>
        </div>

        <p className="text-[11px] text-gray-600 text-center mt-4">
          Pas de compte ? Contactez l'administrateur du catalogue.
        </p>
      </div>
    </div>
  )
}

// ─── Badge de session + déconnexion (coin bas-droit) ────────────────────────

function LogoutBadge({ email }) {
  const handleLogout = async () => {
    const { auth, mod } = await getFirebaseAuth()
    await mod.signOut(auth)
  }

  return (
    <div className="fixed bottom-3 right-3 z-40 flex items-center gap-2 bg-surface-2/90 backdrop-blur
                    border border-surface-5 rounded-full pl-3 pr-1.5 py-1.5 shadow-lg">
      <span className="text-[11px] text-gray-500 max-w-[180px] truncate">{email}</span>
      <button
        className="btn-icon !p-1.5"
        onClick={handleLogout}
        title="Se déconnecter"
      >
        <LogOut size={12} />
      </button>
    </div>
  )
}

// ─── Messages d'erreur en français ───────────────────────────────────────────

function messageFor(err) {
  switch (err?.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      return 'E-mail ou mot de passe incorrect.'
    case 'auth/invalid-email':
      return 'Adresse e-mail invalide.'
    case 'auth/user-disabled':
      return 'Ce compte a été désactivé par l\'administrateur.'
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.'
    case 'auth/network-request-failed':
      return 'Connexion impossible. Vérifiez votre accès internet.'
    default:
      return 'Échec de la connexion. Réessayez.'
  }
}
