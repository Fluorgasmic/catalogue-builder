import { useMemo } from 'react'

/**
 * Compute pagination: distribute rows across pages.
 *
 * Returns an array of "page" objects:
 *   { index, groupKey, groupLabel, rows: [...], isFirstOfGroup, isLastOfGroup }
 */
export function usePagination(rawData, columns, grid, groupColumn) {
  return useMemo(() => {
    if (!rawData || rawData.length === 0) return []

    const perPage = grid.columns * grid.rows

    if (!groupColumn) {
      // ─── No grouping ──────────────────────────────────────────
      const pages = []
      for (let i = 0; i < rawData.length; i += perPage) {
        pages.push({
          index: pages.length,
          groupKey: null,
          groupLabel: null,
          rows: rawData.slice(i, i + perPage),
          isFirstOfGroup: false,
          isLastOfGroup: false,
        })
      }
      return pages
    }

    // ─── Group by column ───────────────────────────────────────
    const groups = []
    let currentGroup = null

    for (const row of rawData) {
      const key = String(row[groupColumn] ?? '')
      if (!currentGroup || currentGroup.key !== key) {
        currentGroup = { key, label: key, rows: [] }
        groups.push(currentGroup)
      }
      currentGroup.rows.push(row)
    }

    // Flatten groups into pages (new group always starts on new page)
    const pages = []
    for (const group of groups) {
      const groupRows = group.rows
      let first = true
      for (let i = 0; i < groupRows.length; i += perPage) {
        const chunk = groupRows.slice(i, i + perPage)
        pages.push({
          index: pages.length,
          groupKey: group.key,
          groupLabel: group.label,
          rows: chunk,
          isFirstOfGroup: first,
          isLastOfGroup: i + perPage >= groupRows.length,
        })
        first = false
      }
    }

    return pages
  }, [rawData, columns, grid.columns, grid.rows, groupColumn])
}
