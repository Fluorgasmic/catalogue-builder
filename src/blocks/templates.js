/**
 * Templates de vignette : des compositions de blocs prêtes à l'emploi.
 *
 * Appliquer un template remplace les blocs courants. Chaque template part des
 * défauts de `createBlock` et n'écrit que ce qui le distingue — l'ordre du
 * spread compte, les surcharges doivent venir en dernier.
 */
import { Type, Image, AlignLeft, Tag } from 'lucide-react'
import { createBlock } from './blockTypes'

/** Défauts du type de bloc, puis le style propre au template par-dessus. */
function templateBlock(type, columns, overrides = {}) {
  return { ...createBlock(type, columns), ...overrides }
}

/**
 * Pré-associe les premières colonnes du fichier pour que la vignette ne soit
 * jamais vide à l'application du template ; l'utilisateur les remappe ensuite.
 */
function col(columns, index) {
  return columns[index] ? [columns[index]] : []
}

export const TEMPLATES = [
  { id: 'minimalist', name: 'Minimaliste', desc: 'Texte + séparateur, sobre', icon: Type, color: '#7C5CFC',
    build(columns) {
      return [
        templateBlock('text', columns, { columns: col(columns, 0), fontSize: 9, fontWeight: 500, color: '#111111', maxLines: 1 }),
        templateBlock('separator', columns, { thickness: 0.3, color: '#d1d5db', marginV: 1 }),
        templateBlock('text', columns, { columns: col(columns, 1), fontSize: 8, fontWeight: 300, color: '#6b7280', maxLines: 2 }),
      ]
    }},
  { id: 'product', name: 'Produit', desc: 'Image + colonnes + badge', icon: Image, color: '#3b82f6',
    build(columns) {
      return [
        templateBlock('image', columns, { heightPct: 60, fit: 'contain' }),
        templateBlock('text', columns, { columns: col(columns, 0), fontSize: 9, fontWeight: 600, color: '#111111', maxLines: 1, paddingV: 1 }),
        templateBlock('text', columns, { columns: col(columns, 1), fontSize: 8, fontWeight: 400, color: '#4b5563', maxLines: 1, paddingV: 0.5 }),
        templateBlock('badge', columns, { position: 'absolute', x: 2, y: 2, widthPct: 18, heightPct: 18 }),
      ]
    }},
  { id: 'modern', name: 'Moderne', desc: 'Fond coloré + image + texte', icon: AlignLeft, color: '#10b981',
    build(columns) {
      return [
        templateBlock('text', columns, { columns: col(columns, 0), fontSize: 11, fontWeight: 700, color: '#ffffff', align: 'center', bgColor: '#7C5CFC', bgBorderRadius: 2, widthMode: 'full', paddingV: 3, paddingH: 4, maxLines: 1 }),
        templateBlock('image', columns, { heightPct: 50, fit: 'cover' }),
        templateBlock('static', columns, { staticText: 'Nouveau', fontSize: 7, fontWeight: 600, color: '#7C5CFC', align: 'center', paddingV: 0.5 }),
      ]
    }},
  { id: 'promo', name: 'Promo', desc: 'Badge promo + image + prix', icon: Tag, color: '#ef4444',
    build(columns) {
      return [
        templateBlock('image', columns, { heightPct: 55, fit: 'contain' }),
        templateBlock('badge', columns, { position: 'absolute', x: 2, y: 2, widthPct: 20, heightPct: 20 }),
        templateBlock('text', columns, { columns: col(columns, 0), fontSize: 10, fontWeight: 700, color: '#ef4444', align: 'center', maxLines: 1 }),
        templateBlock('text', columns, { columns: col(columns, 1), fontSize: 8, fontWeight: 400, color: '#9ca3af', align: 'center', maxLines: 1, paddingV: 0.5 }),
      ]
    }},
]

/** Blocs d'un template, ou `null` si l'identifiant est inconnu. */
export function buildTemplate(templateId, columns) {
  const tpl = TEMPLATES.find(t => t.id === templateId)
  return tpl ? tpl.build(columns) : null
}
