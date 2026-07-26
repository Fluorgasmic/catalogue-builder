/**
 * Transforme une vignette en liste de primitives de dessin.
 *
 * C'est la « description unique » de la mise en page : ni CSS ni PDF, juste
 * ce qu'il y a à dessiner et où. Le rendu PDF la consomme aujourd'hui ;
 * l'éditeur de pages la consommera pour manipuler une page comme de la donnée
 * plutôt que comme du CSS calculé au vol.
 *
 * UNITÉS — deux échelles coexistent, et il faut savoir laquelle on manipule :
 *   · les POSITIONS des blocs (x, y) sont en millimètres depuis le format v3 ;
 *   · les TAILLES typographiques (fontSize, paddings, épaisseurs) restent en
 *     pixels CSS à 96 dpi, l'unité naturelle d'une feuille de style.
 *   · les primitives produites sont en MILLIMÈTRES, origine en haut à gauche
 *     de la vignette — l'unité de l'impression.
 * Le calcul interne se fait en pixels et la conversion en sortie, en un seul
 * endroit ; les positions en millimètres sont donc converties à l'entrée.
 */

import { textMetrics, imageHeight, separatorMetrics, flowBlockHeight, LINE_HEIGHT } from '../blocks/blockMetrics'
import { layoutText } from './textLayout'
import { pxToMm, mmToPx } from './measureText'

/** Marge de sécurité avant de renoncer à poser un bloc, en px — cf. BlockVignette. */
const SAFETY_PX = 4

/** Contenu affiché d'un bloc, colonnes liées et préfixe/suffixe compris. */
export function blockContent(block, row) {
  const brut = block.type === 'static'
    ? (block.staticText ?? '')
    : (block.columns ?? [])
        .map((c) => String(row?.[c] ?? (row ? '' : `{${c}}`)))
        .join(block.separator ?? ' ')

  if (!brut) return ''
  return `${block.prefix ?? ''}${brut}${block.suffix ?? ''}`
}

/**
 * @param {object} p
 * @param {object[]} p.blocks         blocs de la vignette
 * @param {object} p.row              ligne de données (null = aperçu sans données)
 * @param {number} p.widthMm          largeur de la vignette
 * @param {number} p.heightMm         hauteur de la vignette
 * @param {(style) => (t: string) => number} p.measurerFor  fabrique de mesureur
 * @param {(block) => string|null} [p.resolveImage]  URL/source d'une image de bloc
 * @returns {object[]} primitives, en mm, origine en haut à gauche
 */
export function layoutVignette({ blocks = [], row, widthMm, heightMm, measurerFor, resolveImage }) {
  const wPx = widthMm / pxToMm(1)
  const hPx = heightMm / pxToMm(1)

  const visibles = blocks.filter((b) => b.visible !== false)
  const flux = visibles.filter((b) => b.position !== 'absolute')
  const libres = visibles.filter((b) => b.position === 'absolute')

  const primitives = []

  // ── Blocs du flux : empilés verticalement, ceux qui débordent sont écartés ──
  let yPx = 0
  for (const block of flux) {
    const bh = flowBlockHeight(block, hPx, 1)
    if (yPx + bh > hPx - SAFETY_PX) break
    primitives.push(...primitivesDuBloc(block, row, yPx, wPx, hPx, { measurerFor, resolveImage }))
    yPx += bh
  }

  // ── Blocs libres : posés à leurs coordonnées propres, par-dessus le flux ──
  // Ces coordonnées sont en millimètres (format v3) alors que le calcul
  // interne travaille en pixels : on les convertit à l'entrée.
  for (const block of libres) {
    primitives.push(...primitivesDuBloc(block, row, mmToPx(block.y ?? 0), wPx, hPx, {
      measurerFor, resolveImage, xPx: mmToPx(block.x ?? 0),
    }))
  }

  return primitives.map(enMillimetres)
}

/**
 * Blocs posés librement dans une zone, chacun avec ses propres coordonnées et
 * sa propre largeur — c'est le mode des en-têtes et pieds de page, déjà en
 * millimètres. Même vocabulaire de blocs que la vignette, autre disposition.
 *
 * @param {object[]} p.blocks   blocs portant x, y, w, h en millimètres
 * @param {number} p.widthMm    largeur par défaut d'un bloc sans `w`
 */
export function layoutFreeBlocks({ blocks = [], row, widthMm, heightMm, measurerFor, resolveImage }) {
  const hPx = mmToPx(heightMm)
  const primitives = []

  for (const block of blocks) {
    if (block.visible === false) continue
    const largeurPx = block.w != null ? mmToPx(block.w) : mmToPx(widthMm)
    primitives.push(...primitivesDuBloc(block, row, mmToPx(block.y ?? 0), largeurPx, hPx, {
      measurerFor, resolveImage, xPx: mmToPx(block.x ?? 0),
    }))
  }

  return primitives.map(enMillimetres)
}

function primitivesDuBloc(block, row, yPx, wPx, hPx, { measurerFor, resolveImage, xPx = 0 }) {
  switch (block.type) {
    case 'text':
    case 'static':
      return primitivesTexte(block, row, yPx, xPx, wPx, measurerFor)
    case 'image':
      return primitivesImage(block, yPx, xPx, wPx, hPx, resolveImage)
    case 'separator':
      return primitivesSeparateur(block, yPx, xPx, wPx)
    case 'badge':
      return primitivesBadge(block, row, yPx, xPx, wPx, hPx, resolveImage)
    default:
      return []
  }
}

function primitivesTexte(block, row, yPx, xPx, wPx, measurerFor) {
  const contenu = blockContent(block, row)
  if (!contenu) return []

  const m = textMetrics(block, 1)
  const style = {
    fontSize: m.fontSize,
    fontFamily: block.fontFamily ?? 'inherit',
    fontWeight: block.fontWeight ?? 400,
    italic: Boolean(block.italic),
  }

  const largeurTexte = wPx - m.paddingHpx * 2
  const { lines } = layoutText(contenu, {
    maxWidth: largeurTexte,
    maxLines: m.maxLines,
    measure: measurerFor(style),
  })
  if (lines.length === 0) return []

  const out = []

  // Fond du bloc, dessiné avant le texte
  const fond = block.bgColor && block.bgColor !== 'transparent' ? block.bgColor : null
  if (fond) {
    out.push({
      kind: 'rect', xPx, yPx, wPx, hPx: m.blockH,
      fill: fond, radiusPx: block.bgBorderRadius ?? 0,
    })
  }

  // Position verticale : le rendu centre une ligne unique dans la hauteur du
  // bloc (via line-height), et cale les blocs multi-lignes en haut.
  const hauteurLigne = m.fontSize * LINE_HEIGHT
  const hauteurTexte = hauteurLigne * lines.length
  const vAlign = block.vAlign ?? 'top'
  let yTexte = yPx + m.paddingVpx
  if (m.maxLines === 1 && vAlign === 'center') {
    yTexte = yPx + (m.blockH - hauteurLigne) / 2
  } else if (vAlign === 'center') {
    yTexte = yPx + (m.blockH - hauteurTexte) / 2
  } else if (vAlign === 'bottom') {
    yTexte = yPx + m.blockH - m.paddingVpx - hauteurTexte
  }

  lines.forEach((texte, i) => {
    out.push({
      kind: 'text',
      xPx: xPx + m.paddingHpx,
      yPx: yTexte + i * hauteurLigne,
      wPx: largeurTexte,
      lineHeightPx: hauteurLigne,
      text: texte,
      sizePx: m.fontSize,
      color: block.color ?? '#111111',
      align: block.align ?? 'left',
      font: style,
    })
  })

  return out
}

function primitivesImage(block, yPx, xPx, wPx, hPx, resolveImage) {
  const src = resolveImage?.(block) ?? null
  if (!src) return []
  return [{
    kind: 'image', xPx, yPx, wPx,
    hPx: imageHeight(block, hPx),
    src,
    fit: block.fit ?? 'contain',
  }]
}

function primitivesSeparateur(block, yPx, xPx, wPx) {
  const { marginV, lineH } = separatorMetrics(block, 1)
  return [{
    kind: 'rect',
    xPx, yPx: yPx + marginV, wPx, hPx: lineH,
    fill: block.color ?? '#e5e7eb',
    radiusPx: 0,
  }]
}

/** Un badge ne s'affiche que si sa condition est vérifiée — comme à l'écran. */
function primitivesBadge(block, row, yPx, xPx, wPx, hPx, resolveImage) {
  const src = resolveImage?.(block) ?? null
  if (!src || !block.conditionColumn) return []

  const valeur = String(row?.[block.conditionColumn] ?? '')
  const attendu = block.conditionValue ?? ''
  const match =
    block.conditionOperator === '==' ? valeur === attendu :
    block.conditionOperator === '!=' ? valeur !== attendu :
    block.conditionOperator === 'contains' ? valeur.includes(attendu) :
    block.conditionOperator === 'notempty' ? valeur.trim() !== '' : false
  if (!match) return []

  return [{
    kind: 'image', xPx, yPx,
    wPx: ((block.widthPct ?? 15) / 100) * wPx,
    hPx: ((block.heightPct ?? 15) / 100) * hPx,
    src,
    fit: 'contain',
  }]
}

/** Conversion finale : le modèle travaille en px CSS, l'impression en mm. */
function enMillimetres(p) {
  const out = { ...p }
  for (const [cle, valeur] of Object.entries(p)) {
    if (cle.endsWith('Px') && typeof valeur === 'number') {
      out[cle.slice(0, -2)] = pxToMm(valeur)
      delete out[cle]
    }
  }
  return out
}
