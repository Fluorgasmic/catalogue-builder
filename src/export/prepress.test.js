import { describe, it, expect } from 'vitest'
import {
  prepressGeometry, cropMarks, registrationMarks, prepressMarks,
  LONGUEUR_TRAIT_MM, ECART_TRAIT_MM, EPAISSEUR_TRAIT_MM,
} from './prepress'

const A4 = { trimW: 210, trimH: 297 }

describe('prepressGeometry', () => {
  it('laisse le support au format fini quand il n\'y a ni fond perdu ni traits', () => {
    const g = prepressGeometry({ ...A4 })
    expect(g.mediaW).toBe(210)
    expect(g.mediaH).toBe(297)
    expect(g.offsetX).toBe(0)
    expect(g.offsetY).toBe(0)
  })

  it('agrandit le support du fond perdu sur les quatre côtés', () => {
    const g = prepressGeometry({ ...A4, bleed: 3 })
    expect(g.mediaW).toBe(216) // 210 + 3 + 3
    expect(g.mediaH).toBe(303)
    expect(g.offsetX).toBe(3)
  })

  it('réserve en plus la place des traits quand on les demande', () => {
    const g = prepressGeometry({ ...A4, bleed: 3, marks: true })
    const marge = 3 + ECART_TRAIT_MM + LONGUEUR_TRAIT_MM
    expect(g.offsetX).toBe(marge)
    expect(g.mediaW).toBe(210 + marge * 2)
  })

  it('centre le format fini dans le support', () => {
    const g = prepressGeometry({ ...A4, bleed: 5, marks: true })
    expect(g.mediaW - g.trimBox.x - g.trimBox.w).toBeCloseTo(g.trimBox.x, 6)
    expect(g.mediaH - g.trimBox.y - g.trimBox.h).toBeCloseTo(g.trimBox.y, 6)
  })

  it('place la boîte de fond perdu autour de la boîte de coupe', () => {
    const g = prepressGeometry({ ...A4, bleed: 3, marks: true })
    expect(g.bleedBox.x).toBeCloseTo(g.trimBox.x - 3, 6)
    expect(g.bleedBox.w).toBeCloseTo(g.trimBox.w + 6, 6)
    expect(g.bleedBox.y).toBeCloseTo(g.trimBox.y - 3, 6)
    expect(g.bleedBox.h).toBeCloseTo(g.trimBox.h + 6, 6)
  })

  it('refuse un fond perdu négatif au lieu de rétrécir la page', () => {
    const g = prepressGeometry({ ...A4, bleed: -5 })
    expect(g.bleed).toBe(0)
    expect(g.mediaW).toBe(210)
  })

  it('reste cohérent sur un format personnalisé', () => {
    const g = prepressGeometry({ trimW: 320, trimH: 240, bleed: 3, marks: true })
    expect(g.trimBox.w).toBe(320)
    expect(g.trimBox.h).toBe(240)
  })
})

describe('cropMarks', () => {
  const geo = prepressGeometry({ ...A4, bleed: 3, marks: true })
  const traits = cropMarks(geo, A4)

  it('pose deux traits par coin', () => {
    expect(traits).toHaveLength(8)
  })

  it('n\'entre jamais dans le fond perdu', () => {
    // C'est la règle qui compte : un trait qui mord sur le fond perdu
    // s'imprime sur la page finie.
    const { trimBox, bleed } = geo
    for (const t of traits) {
      const dansX = t.x + t.w > trimBox.x - bleed && t.x < trimBox.x + trimBox.w + bleed
      const dansY = t.y + t.h > trimBox.y - bleed && t.y < trimBox.y + trimBox.h + bleed
      expect(dansX && dansY).toBe(false)
    }
  })

  it('tient dans le support', () => {
    for (const t of traits) {
      expect(t.x).toBeGreaterThanOrEqual(-0.001)
      expect(t.y).toBeGreaterThanOrEqual(-0.001)
      expect(t.x + t.w).toBeLessThanOrEqual(geo.mediaW + 0.001)
      expect(t.y + t.h).toBeLessThanOrEqual(geo.mediaH + 0.001)
    }
  })

  it('aligne chaque trait sur un bord du format fini', () => {
    const { trimBox: b } = geo
    const bordsX = [b.x, b.x + b.w]
    const bordsY = [b.y, b.y + b.h]
    for (const t of traits) {
      const centreX = t.x + t.w / 2
      const centreY = t.y + t.h / 2
      const surBordX = bordsX.some((v) => Math.abs(centreX - v) < 0.001)
      const surBordY = bordsY.some((v) => Math.abs(centreY - v) < 0.001)
      expect(surBordX || surBordY).toBe(true)
    }
  })

  it('trace en couleur de repérage, pas en noir simple', () => {
    // Du noir simple ne sortirait que sur la plaque noire : le trait serait
    // inutilisable pour caler les autres. La couleur de repérage vaut 100 %
    // de chaque séparation — sans ajouter de plaque.
    for (const t of traits) {
      expect(t.cmyk).toEqual({ c: 1, m: 1, y: 1, k: 1 })
      expect(t.fill).toBeUndefined()
    }
  })

  it('donne aux traits la longueur conventionnelle', () => {
    for (const t of traits) {
      expect(Math.max(t.w, t.h)).toBeCloseTo(LONGUEUR_TRAIT_MM, 6)
      expect(Math.min(t.w, t.h)).toBeCloseTo(EPAISSEUR_TRAIT_MM, 6)
    }
  })
})

describe('registrationMarks', () => {
  const geo = prepressGeometry({ ...A4, bleed: 3, marks: true })
  const reperes = registrationMarks(geo, A4)

  it('pose un repère au centre de chaque bord', () => {
    expect(reperes.filter((m) => m.kind === 'circle')).toHaveLength(4)
  })

  it('centre les repères sur les axes de la page', () => {
    const cercles = reperes.filter((m) => m.kind === 'circle')
    const cx = geo.offsetX + A4.trimW / 2
    const cy = geo.offsetY + A4.trimH / 2
    expect(cercles.filter((c) => Math.abs(c.x - cx) < 0.001)).toHaveLength(2) // haut et bas
    expect(cercles.filter((c) => Math.abs(c.y - cy) < 0.001)).toHaveLength(2) // gauche et droite
  })

  it('trace les repères en couleur de repérage', () => {
    for (const m of reperes) expect(m.cmyk).toEqual({ c: 1, m: 1, y: 1, k: 1 })
  })

  it('reste en dehors du format fini', () => {
    const { trimBox: b } = geo
    for (const c of reperes.filter((m) => m.kind === 'circle')) {
      const dedans = c.x > b.x && c.x < b.x + b.w && c.y > b.y && c.y < b.y + b.h
      expect(dedans).toBe(false)
    }
  })
})

describe('prepressMarks', () => {
  const geo = prepressGeometry({ ...A4, bleed: 3, marks: true })

  it('ne pose rien quand rien n\'est demandé', () => {
    expect(prepressMarks(geo, A4)).toEqual([])
  })

  it('combine traits de coupe et repères à la demande', () => {
    const coupeSeule = prepressMarks(geo, A4, { cropMarks: true })
    const tout = prepressMarks(geo, A4, { cropMarks: true, registration: true })
    expect(coupeSeule).toHaveLength(8)
    expect(tout.length).toBeGreaterThan(coupeSeule.length)
  })
})
