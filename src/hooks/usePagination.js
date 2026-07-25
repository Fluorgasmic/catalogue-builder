import { useMemo } from 'react'
import { paginate } from '../utils/pagination'

/**
 * Enrobage mémoïsé de `paginate` — la logique elle-même vit dans utils/pagination.
 */
export function usePagination(rawData, grid, groupColumn) {
  return useMemo(
    () => paginate(rawData, grid, groupColumn),
    [rawData, grid.columns, grid.rows, groupColumn],
  )
}
