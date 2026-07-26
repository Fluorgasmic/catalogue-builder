import { describe, it, expect } from 'vitest'
import { mmToPt, flipY, baselineY, alignedX, parseColor, fitImage, PT_PER_MM } from './pdfPrimitives'

// Métriques typiques d'une police latine (Helvetica-like).
const METRICS = { ascent: 718, descent: -207, unitsPerEm: 1000 }

describe('conversions', () => {
  it('convertit les millimètres en points', () => {
    expect(mmToPt(25.4)).toBeCloseTo(72, 6)
    expect(mmToPt(210)).toBeCloseTo(595.28, 1) // largeur A4 en points
  })

  it('retourne l\'axe vertical entre écran et PDF', () => {
    // Un objet de 10 mm posé à 20 mm du haut d'une page de 297 mm a son bord
    // inférieur à 297 − 20 − 10 = 267 mm du bas.
    expect(flipY(20, 10, 297)).toBeCloseTo(mmToPt(267), 6)
  })

  it('place en bas de page un objet posé tout en bas', () => {
    expect(flipY(287, 10, 297)).toBeCloseTo(0, 6)
  })
})

describe('baselineY', () => {
  it('descend du demi-interligne puis de l\'ascendante', () => {
    const size = 10
    const lineHeight = 14 // 1.4 × taille, l'interligne du projet
    const contenu = (718 + 207) / 1000 * size      // 9.25
    const demi = (lineHeight - contenu) / 2         // 2.375
    const attenduDepuisHaut = 0 + demi + 0.718 * size
    expect(baselineY(0, lineHeight, size, METRICS, 297))
      .toBeCloseTo(mmToPt(297 - attenduDepuisHaut), 6)
  })

  it('descend d\'autant que la ligne descend dans la page', () => {
    const a = baselineY(0, 14, 10, METRICS, 297)
    const b = baselineY(50, 14, 10, METRICS, 297)
    expect(a - b).toBeCloseTo(mmToPt(50), 6)
  })

  it('reste dans la boîte de ligne', () => {
    // La ligne de base doit tomber entre le haut et le bas de la boîte,
    // sinon le texte déborde visuellement de son bloc.
    const yMm = 30, lineHeight = 14, page = 297
    const base = baselineY(yMm, lineHeight, 10, METRICS, page)
    const haut = mmToPt(page - yMm)
    const bas = mmToPt(page - yMm - lineHeight)
    expect(base).toBeLessThan(haut)
    expect(base).toBeGreaterThan(bas)
  })
})

describe('alignedX', () => {
  it('cale à gauche par défaut', () => {
    expect(alignedX(10, 50, 20, 'left')).toBeCloseTo(mmToPt(10), 6)
    expect(alignedX(10, 50, 20, undefined)).toBeCloseTo(mmToPt(10), 6)
  })

  it('centre et cale à droite', () => {
    expect(alignedX(10, 50, 20, 'center')).toBeCloseTo(mmToPt(25), 6)
    expect(alignedX(10, 50, 20, 'right')).toBeCloseTo(mmToPt(40), 6)
  })

  it('ne recule pas quand le texte est plus large que sa boîte', () => {
    // Débordement : on garde le départ à gauche plutôt que de sortir du bloc
    // par la gauche, comme le fait le rendu à l'écran.
    expect(alignedX(10, 20, 50, 'left')).toBeCloseTo(mmToPt(10), 6)
  })
})

describe('parseColor', () => {
  it('lit les couleurs hexadécimales longues et courtes', () => {
    expect(parseColor('#ffffff')).toEqual({ r: 1, g: 1, b: 1 })
    expect(parseColor('#000000')).toEqual({ r: 0, g: 0, b: 0 })
    expect(parseColor('#fff')).toEqual({ r: 1, g: 1, b: 1 })
  })

  it('lit la couleur d\'accent du projet', () => {
    const c = parseColor('#7C5CFC')
    expect(c.r).toBeCloseTo(124 / 255, 5)
    expect(c.g).toBeCloseTo(92 / 255, 5)
    expect(c.b).toBeCloseTo(252 / 255, 5)
  })

  it('renvoie null sur ce qu\'elle ne sait pas lire', () => {
    for (const v of ['transparent', 'rgb(0,0,0)', '', null, undefined, '#12345']) {
      expect(parseColor(v)).toBeNull()
    }
  })
})

describe('fitImage', () => {
  const boite = { boxW: 100, boxH: 50 }

  it('contient sans déborder et centre le reste', () => {
    // Image carrée dans une boîte deux fois plus large : la hauteur commande.
    const r = fitImage({ ...boite, naturalW: 100, naturalH: 100, fit: 'contain' })
    expect(r.h).toBeCloseTo(50, 6)
    expect(r.w).toBeCloseTo(50, 6)
    expect(r.x).toBeCloseTo(25, 6)
    expect(r.y).toBeCloseTo(0, 6)
  })

  it('remplit la boîte en mode cover, quitte à rogner', () => {
    const r = fitImage({ ...boite, naturalW: 100, naturalH: 100, fit: 'cover' })
    expect(r.w).toBeCloseTo(100, 6)
    expect(r.h).toBeCloseTo(100, 6)
    expect(r.y).toBeCloseTo(-25, 6) // déborde symétriquement
  })

  it('étire en mode fill', () => {
    const r = fitImage({ ...boite, naturalW: 100, naturalH: 100, fit: 'fill' })
    expect(r).toEqual({ x: 0, y: 0, w: 100, h: 50 })
  })

  it('remplit la boîte quand les dimensions naturelles sont inconnues', () => {
    // Une image dont on n'a pas encore lu l'en-tête ne doit pas disparaître.
    expect(fitImage({ ...boite, naturalW: 0, naturalH: 0 })).toEqual({ x: 0, y: 0, w: 100, h: 50 })
  })

  it('gère une image plus haute que large', () => {
    const r = fitImage({ boxW: 50, boxH: 100, naturalW: 50, naturalH: 200, fit: 'contain' })
    expect(r.h).toBeCloseTo(100, 6)
    expect(r.w).toBeCloseTo(25, 6)
    expect(r.x).toBeCloseTo(12.5, 6)
  })
})
