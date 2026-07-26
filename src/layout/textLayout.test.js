import { describe, it, expect } from 'vitest'
import { layoutText, ELLIPSIS } from './textLayout'

// Mesure déterministe : 1 unité par caractère. Permet de raisonner sur les
// largeurs en comptant les lettres, sans dépendre d'une vraie police.
const measure = (t) => t.length
const layout = (texte, maxWidth, maxLines = 1) => layoutText(texte, { maxWidth, maxLines, measure })

describe('layoutText — ligne unique', () => {
  it('laisse le texte intact quand il tient', () => {
    expect(layout('Chaise', 10)).toEqual({ lines: ['Chaise'], truncated: false })
  })

  it('tronque avec une ellipsis quand il déborde', () => {
    const r = layout('Chaise en chêne massif', 10)
    expect(r.truncated).toBe(true)
    expect(r.lines).toHaveLength(1)
    expect(r.lines[0].endsWith(ELLIPSIS)).toBe(true)
    expect(measure(r.lines[0])).toBeLessThanOrEqual(10)
  })

  it('ne revient jamais à la ligne, même sur un texte long', () => {
    expect(layout('un deux trois quatre cinq', 8).lines).toHaveLength(1)
  })

  it('ne coupe pas au milieu d\'un espace de fin', () => {
    const r = layout('Chaise en chêne', 10)
    expect(r.lines[0]).not.toMatch(/ …$/)
  })
})

describe('layoutText — plusieurs lignes', () => {
  it('répartit les mots sur les lignes disponibles', () => {
    const r = layout('un deux trois', 9, 2)
    expect(r.lines).toEqual(['un deux', 'trois'])
    expect(r.truncated).toBe(false)
  })

  it('s\'arrête au nombre de lignes autorisé et signale la coupe', () => {
    const r = layout('un deux trois quatre cinq six', 9, 2)
    expect(r.lines).toHaveLength(2)
    expect(r.truncated).toBe(true)
  })

  it('coupe net, sans ellipsis — comme le fait `overflow: hidden`', () => {
    // Un bloc multi-lignes ne porte pas `text-overflow: ellipsis` : le
    // navigateur clippe sans rien ajouter. Une ellipsis ici ferait apparaître
    // dans le PDF des points de suspension absents de l'aperçu.
    const r = layout('un deux trois quatre cinq six', 9, 2)
    expect(r.lines.join(' ')).not.toContain(ELLIPSIS)
  })

  it('n\'ajoute pas d\'ellipsis quand tout tient pile', () => {
    const r = layout('un deux', 9, 2)
    expect(r.truncated).toBe(false)
    expect(r.lines.join('')).not.toContain(ELLIPSIS)
  })

  it('respecte la largeur sur chaque ligne', () => {
    const r = layout('alpha bravo charlie delta echo', 12, 3)
    for (const ligne of r.lines) expect(measure(ligne)).toBeLessThanOrEqual(12)
  })
})

describe('layoutText — mots plus longs que la ligne', () => {
  it('coupe un mot interminable au lieu de déborder', () => {
    // Référence produit sans espaces : le navigateur casse le mot
    // (word-break: break-word), on fait pareil.
    const r = layout('REF00112233445566778899', 8, 3)
    expect(r.lines.length).toBeGreaterThan(1)
    for (const ligne of r.lines) expect(measure(ligne)).toBeLessThanOrEqual(8)
  })

  it('reconstitue le mot coupé sans perdre de caractères', () => {
    const r = layout('ABCDEFGHIJKL', 4, 3)
    expect(r.lines.join('')).toBe('ABCDEFGHIJKL')
    expect(r.truncated).toBe(false)
  })

  it('signale la coupe quand les lignes manquent', () => {
    const r = layout('ABCDEFGHIJKLMNOPQRSTUVWXYZ', 4, 2)
    expect(r.lines).toHaveLength(2)
    expect(r.truncated).toBe(true)
  })
})

describe('layoutText — marquage de la coupe', () => {
  const avec = (t, w, n) => layoutText(t, { maxWidth: w, maxLines: n, measure, ellipsis: true })
  const sans = (t, w, n) => layoutText(t, { maxWidth: w, maxLines: n, measure, ellipsis: false })

  it('reproduit par défaut le comportement CSS réel selon le nombre de lignes', () => {
    // 1 ligne → text-overflow: ellipsis → « … »
    expect(layout('Chaise en chêne', 8).lines[0]).toContain(ELLIPSIS)
    // n lignes → overflow: hidden seul → coupe nette
    expect(layout('un deux trois quatre', 6, 2).lines.join(' ')).not.toContain(ELLIPSIS)
  })

  it('ajoute l\'ellipsis en multi-lignes quand on la demande', () => {
    const r = avec('un deux trois quatre cinq', 9, 2)
    expect(r.lines[1].endsWith(ELLIPSIS)).toBe(true)
  })

  it('la retire sur une ligne quand on ne la veut pas', () => {
    const r = sans('Chaise en chêne massif', 10)
    expect(r.lines[0]).not.toContain(ELLIPSIS)
    expect(r.truncated).toBe(true)
    expect(measure(r.lines[0])).toBeLessThanOrEqual(10)
  })

  it('respecte la largeur dans les deux modes', () => {
    for (const r of [avec('alpha bravo charlie delta', 11, 2), sans('alpha bravo charlie delta', 11, 2)]) {
      for (const ligne of r.lines) expect(measure(ligne)).toBeLessThanOrEqual(11)
    }
  })
})

describe('layoutText — cas limites', () => {
  it('rend zéro ligne sur un contenu vide', () => {
    expect(layout('', 10)).toEqual({ lines: [], truncated: false })
    expect(layout(null, 10)).toEqual({ lines: [], truncated: false })
    expect(layout(undefined, 10)).toEqual({ lines: [], truncated: false })
  })

  it('rend zéro ligne quand la largeur est nulle ou négative', () => {
    expect(layout('Chaise', 0)).toEqual({ lines: [], truncated: true })
    expect(layout('Chaise', -5)).toEqual({ lines: [], truncated: true })
  })

  it('n\'affiche rien plutôt qu\'une ellipsis qui déborde', () => {
    // Bloc si étroit que même « … » ne tient pas : mieux vaut du vide qu'un
    // glyphe qui dépasse de la vignette à l'impression.
    expect(layout('Chaise', 0.5).lines).toEqual([])
  })

  it('normalise les espaces multiples comme le fait le rendu HTML', () => {
    expect(layout('un   deux', 9, 2).lines).toEqual(['un deux'])
  })

  it('accepte un nombre converti en texte', () => {
    expect(layout(149, 10).lines).toEqual(['149'])
  })
})
