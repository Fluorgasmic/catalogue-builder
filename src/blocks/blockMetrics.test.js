import { describe, it, expect } from 'vitest'
import {
  LINE_HEIGHT, textMetrics, imageHeight, separatorMetrics, flowBlockHeight,
} from './blockMetrics'

describe('textMetrics', () => {
  it('mesure un bloc de texte à l\'échelle 1', () => {
    const m = textMetrics({ fontSize: 10, maxLines: 1, paddingV: 2, paddingH: 3 }, 1)
    expect(m.fontSize).toBe(10)
    expect(m.textH).toBe(Math.ceil(10 * LINE_HEIGHT)) // 14
    expect(m.blockH).toBe(14 + 4)
  })

  it('applique ses valeurs par défaut sur un bloc nu', () => {
    // Ces défauts doivent rester alignés sur createBlock : un bloc chargé
    // depuis un projet ancien peut ne pas porter toutes les propriétés.
    const m = textMetrics({}, 1)
    expect(m.fontSize).toBe(10)
    expect(m.maxLines).toBe(1)
    expect(m.paddingVpx).toBe(2)
    expect(m.paddingHpx).toBe(3)
  })

  it('grandit proportionnellement au nombre de lignes', () => {
    const une = textMetrics({ fontSize: 10, maxLines: 1, paddingV: 0 }, 1)
    const trois = textMetrics({ fontSize: 10, maxLines: 3, paddingV: 0 }, 1)
    expect(trois.blockH).toBe(une.blockH * 3)
  })

  it('arrondit à l\'entier pour éviter la dérive sous-pixel entre blocs', () => {
    // 7 × 1.4 = 9.799… : sans arrondi, l'écart s'accumule d'un bloc à l'autre
    // et l'estimation finit par diverger du rendu CSS.
    const m = textMetrics({ fontSize: 7, maxLines: 1, paddingV: 0 }, 1)
    expect(Number.isInteger(m.textH)).toBe(true)
    expect(m.textH).toBe(10)
  })

  it('met les paddings à l\'échelle en pixels entiers', () => {
    const m = textMetrics({ fontSize: 10, paddingV: 2.5, paddingH: 3.4 }, 2)
    expect(m.paddingVpx).toBe(5)
    expect(m.paddingHpx).toBe(7) // round(6.8)
  })
})

describe('imageHeight', () => {
  it('exprime la hauteur en pourcentage de la vignette', () => {
    expect(imageHeight({ heightPct: 60 }, 200)).toBe(120)
  })

  it('vaut la moitié de la vignette par défaut', () => {
    expect(imageHeight({}, 200)).toBe(100)
  })

  it('respecte un pourcentage nul', () => {
    // `?? ` et non `||` : 0 % est un réglage valide, pas une absence de valeur.
    expect(imageHeight({ heightPct: 0 }, 200)).toBe(0)
  })

  it('suit la taille de la vignette quand la grille change', () => {
    const block = { heightPct: 50 }
    expect(imageHeight(block, 100)).toBe(50)
    expect(imageHeight(block, 300)).toBe(150)
  })
})

describe('separatorMetrics', () => {
  it('compte le trait plus ses deux marges', () => {
    const m = separatorMetrics({ thickness: 1, marginV: 2 }, 1)
    expect(m.lineH).toBe(1)
    expect(m.marginV).toBe(2)
    expect(m.blockH).toBe(5)
  })

  it('garde un trait visible même à échelle réduite', () => {
    const m = separatorMetrics({ thickness: 0.1, marginV: 0 }, 0.5)
    expect(m.lineH).toBe(0.5)
  })
})

describe('flowBlockHeight', () => {
  it('couvre les types qui occupent le flux vertical', () => {
    expect(flowBlockHeight({ type: 'text', fontSize: 10, paddingV: 2 }, 200, 1)).toBe(18)
    expect(flowBlockHeight({ type: 'static', fontSize: 10, paddingV: 2 }, 200, 1)).toBe(18)
    expect(flowBlockHeight({ type: 'image', heightPct: 50 }, 200, 1)).toBe(100)
    expect(flowBlockHeight({ type: 'separator', thickness: 1, marginV: 2 }, 200, 1)).toBe(5)
  })

  it('ignore les blocs positionnés librement : un badge flotte au-dessus', () => {
    expect(flowBlockHeight({ type: 'badge', widthPct: 20, heightPct: 20 }, 200, 1)).toBe(0)
  })

  it('renvoie 0 pour un type inconnu au lieu de casser la mise en page', () => {
    expect(flowBlockHeight({ type: 'qrcode' }, 200, 1)).toBe(0)
  })
})
