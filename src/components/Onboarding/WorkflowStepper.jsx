import { useState, useEffect } from 'react'
import { Database, Layers, LayoutGrid, BookOpen, Eye, X } from 'lucide-react'
import useCatalogStore from '../../store/catalogStore'

const STEPS = [
  { id: 'import',   icon: Database,   label: 'Données',    desc: 'Importez votre fichier Excel ou CSV' },
  { id: 'grid',     icon: LayoutGrid, label: 'Grille',     desc: 'Définissez le layout des vignettes' },
  { id: 'vignette', icon: Layers,     label: 'Vignette',   desc: 'Construisez le contenu de la vignette' },
  { id: 'header',   icon: BookOpen,   label: 'En-tête',    desc: 'Ajoutez un en-tête et/ou pied de page' },
  { id: 'preview',  icon: Eye,        label: 'Aperçu',     desc: 'Visualisez et exportez votre catalogue' },
]

function computeCurrentStep(rawData, header) {
  if (!rawData.length) return 0
  if (!rawData.length) return 0
  return 0
}

export default function WorkflowStepper() {
  const { activeTab, rawData, grid, vignetteBlocks, header, setActiveTab } = useCatalogStore()
  const [dismissed, setDismissed] = useState(false)
  const [showWelcome, setShowWelcome] = useState(false)

  // Derive current step
  let currentStep = 0
  if (rawData.length > 0) {
    if (grid) {
      if (vignetteBlocks?.length > 0) {
        currentStep = header?.enabled ? 4 : 3 // need header?
      } else {
        currentStep = 2
      }
    } else {
      currentStep = 1
    }
  }

  const goToStep = (idx) => setActiveTab(STEPS[idx].id)

  // Show welcome on first load if never seen
  useEffect(() => {
    const seen = localStorage.getItem('cb-onboarding-seen')
    if (!seen) {
      setShowWelcome(true)
    }
  }, [])

  const dismissWelcome = () => {
    localStorage.setItem('cb-onboarding-seen', '1')
    setShowWelcome(false)
  }

  // ─── Welcome overlay ──────────────────────────────────────────────────────

  if (showWelcome) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fadeIn px-4">
        <div className="bg-surface-2 border border-surface-5 rounded-2xl p-8 max-w-md w-full shadow-2xl">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center">
                <BookOpen size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Bienvenue sur Catalogue Builder</h2>
                <p className="text-xs text-gray-500">Découvrez le workflow en 4 étapes</p>
              </div>
            </div>
            <button className="btn-icon text-gray-500 hover:text-gray-300" onClick={dismissWelcome}>
              <X size={18} />
            </button>
          </div>

          <p className="text-sm text-gray-400 mb-6">
            Créez votre catalogue produit en quelques minutes. Voici comment procéder :
          </p>

          <div className="flex flex-col gap-2.5 mb-8">
            {STEPS.map((step, i) => {
              const Icon = step.icon
              const isCurrent = i === currentStep
              return (
                <button key={step.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-surface-5 hover:border-accent/50 hover:bg-surface-3 transition-colors text-left"
                  onClick={() => { goToStep(i); dismissWelcome() }}>
                  <span className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold ${
                    isCurrent ? 'bg-accent text-white' : 'bg-surface-4 text-gray-600'
                  }`}>{i + 1}</span>
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <Icon size={16} className="text-gray-400 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{step.label}</p>
                      <p className="text-[10px] text-gray-600 truncate">{step.desc}</p>
                    </div>
                  </div>
                  {isCurrent && <span className="text-[10px] text-accent shrink-0">— en cours</span>}
                </button>
              )
            })}
          </div>

          <div className="flex gap-2">
            <button className="btn-ghost flex-1 justify-center text-xs" onClick={dismissWelcome}>
              Explorer librement
            </button>
            <button className="btn-primary flex-1 justify-center text-xs"
              onClick={() => { goToStep(0); dismissWelcome() }}>
              Commencer
            </button>
          </div>
        </div>
      </div>
    )
  }

  // ─── Compact stepper (sidebar) ────────────────────────────────────────────

  if (dismissed) return null

  const done = currentStep > 0

  return (
    <div className="px-3 py-2.5 border-t border-surface-4 space-y-2">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-semibold text-gray-700 uppercase tracking-wider">Workflow</span>
        <button className="text-[10px] text-gray-700 hover:text-gray-400 transition-colors"
          onClick={() => { setDismissed(true); localStorage.setItem('cb-stepper-dismissed', '1') }}>
          Masquer
        </button>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-1 mb-2">
        {STEPS.map((_, i) => (
          <button key={i} onClick={() => goToStep(i)}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= currentStep ? 'bg-accent' : 'bg-surface-5 hover:bg-surface-6'
            }`} />
        ))}
      </div>

      {/* Steps list */}
      <div className="flex flex-col gap-0.5">
        {STEPS.map((step, i) => {
          const isCurrent = i === currentStep
          const isDone = i < currentStep
          const Icon = step.icon
          return (
            <button key={step.id}
              onClick={() => goToStep(i)}
              className={`flex items-center gap-2 px-2 py-1.5 rounded-lg text-left transition-colors ${
                isCurrent
                  ? 'bg-accent/15 text-accent'
                  : isDone
                    ? 'text-gray-400 hover:bg-surface-3'
                    : 'text-gray-600 hover:text-gray-400 hover:bg-surface-3'
              }`}>
              <Icon size={13} />
              <span className="text-xs truncate flex-1">{step.label}</span>
              {isCurrent && (
                <span className="text-[9px] text-accent/70 shrink-0">— en cours</span>
              )}
              {isDone && (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" className="text-accent shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </button>
          )
        })}
      </div>

      {/* Information badge */}
      <div className="mt-2 px-2.5 py-2 bg-accent/10 border border-accent/20 rounded-xl">
        <p className="text-[10px] text-accent leading-relaxed">
          <strong>Étape {currentStep + 1}/5</strong> — {STEPS[currentStep]?.desc}
        </p>
      </div>
    </div>
  )
}
