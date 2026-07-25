/**
 * Types de blocs de vignette et leurs valeurs par défaut — source unique.
 *
 * Volontairement sans React ni store : ce module décrit le modèle de données,
 * pas son affichage. Il reste ainsi importable depuis n'importe où et testable
 * sans navigateur. La géométrie associée vit dans blockMetrics.
 */
import { Type, Image, AlignLeft, Tag, Minus } from 'lucide-react'
import { nanoid } from '../components/VignetteBuilder/nanoid'

/** Les types proposés dans le panneau « Ajouter un bloc », dans l'ordre affiché. */
export const BLOCK_TYPES = [
  { type: 'text',      icon: Type,      label: 'Texte lié',           color: '#7C5CFC' },
  { type: 'image',     icon: Image,     label: 'Image produit',       color: '#3b82f6' },
  { type: 'static',    icon: AlignLeft, label: 'Texte statique',      color: '#10b981' },
  { type: 'badge',     icon: Tag,       label: 'Badge conditionnel',  color: '#f59e0b' },
  { type: 'separator', icon: Minus,     label: 'Séparateur',          color: '#6b7280' },
]

/**
 * Crée un bloc neuf du type demandé.
 *
 * C'est le seul endroit où sont écrites les valeurs par défaut d'un bloc :
 * les templates partent d'ici et se contentent de surcharger, et blockMetrics
 * reprend les mêmes défauts pour les blocs incomplets (projets anciens).
 */
export function createBlock(type, columns = []) {
  const base = {
    id: nanoid(),
    type,
    position: 'flow',
    x: 0, y: 0,
    width: null, height: null,
    visible: true,
  }
  switch (type) {
    case 'text':
      // Aucune colonne au départ — l'utilisateur les associe explicitement
      return { ...base, columns: [], separator: ' ', prefix: '', suffix: '', fontSize: 10, fontWeight: 400, fontFamily: 'inherit', color: '#111111', align: 'left', vAlign: 'top', italic: false, paddingH: 3, paddingV: 2, maxLines: 1, bgColor: null, bgBorderRadius: 0, widthMode: 'full' }
    case 'image':
      // heightPct : % de la hauteur de vignette — s'adapte à n'importe quelle grille
      return { ...base, imageColumn: null, extension: null, fit: 'contain', heightPct: 50 }
    case 'static':
      return { ...base, staticText: 'Texte libre', fontSize: 9, fontWeight: 400, fontFamily: 'inherit', color: '#666666', align: 'left', vAlign: 'top', italic: false, paddingH: 3, paddingV: 1, maxLines: 1, bgColor: null, bgBorderRadius: 0, widthMode: 'full' }
    case 'badge':
      // Les badges sont positionnés librement par défaut, au-dessus de la vignette
      return { ...base, position: 'absolute', x: 2, y: 2, badgeSrc: null, conditionColumn: columns[0] ?? null, conditionOperator: '==', conditionValue: '', widthPct: 15, heightPct: 15 }
    case 'separator':
      return { ...base, thickness: 0.5, color: '#e5e7eb', marginV: 2, separatorWidth: '100%' }
    default:
      return base
  }
}
