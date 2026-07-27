import { useMemo } from 'react'
import { paginate } from '../utils/pagination'
import useCatalogStore from '../store/catalogStore'

/**
 * Clé d'un produit pour les sauts de page.
 *
 * La colonne choisie fait office d'identifiant ; à défaut, la première du
 * fichier — c'est presque toujours la référence. Un saut attaché à cette clé
 * suit son produit au lieu de rester sur un numéro de page.
 */
export function breakKey(row, breakKeyColumn, columns) {
  const colonne = breakKeyColumn ?? columns?.[0]
  if (!colonne) return null
  const valeur = row?.[colonne]
  return valeur == null || valeur === '' ? null : String(valeur)
}

/**
 * Enrobage mémoïsé de `paginate` — la logique elle-même vit dans
 * utils/pagination.
 */
export function usePagination(rawData, grid, groupColumn) {
  const pageBreaks = useCatalogStore((s) => s.pageBreaks)
  const breakKeyColumn = useCatalogStore((s) => s.breakKeyColumn)
  const columns = useCatalogStore((s) => s.columns)

  return useMemo(() => {
    const coupures = new Set(pageBreaks ?? [])
    return paginate(rawData, grid, groupColumn, {
      breakBefore: coupures.size === 0
        ? undefined
        : (row) => coupures.has(breakKey(row, breakKeyColumn, columns)),
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rawData, grid.columns, grid.rows, groupColumn, pageBreaks, breakKeyColumn, columns])
}
