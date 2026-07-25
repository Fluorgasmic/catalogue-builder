import { describe, it, expect } from 'vitest'
import { TEMPLATES, buildTemplate } from './templates'
import { createBlock, BLOCK_TYPES } from './blockTypes'
import { textMetrics } from './blockMetrics'

const columns = ['Reference', 'Designation', 'Prix']

describe('createBlock', () => {
  it('couvre tous les types proposés dans le panneau', () => {
    for (const { type } of BLOCK_TYPES) {
      const block = createBlock(type, columns)
      expect(block.type).toBe(type)
      expect(block.id).toBeTruthy()
    }
  })

  it('donne un identifiant distinct à chaque bloc', () => {
    const ids = Array.from({ length: 50 }, () => createBlock('text', columns).id)
    expect(new Set(ids).size).toBe(50)
  })

  it('place les badges en absolu, tout le reste dans le flux', () => {
    expect(createBlock('badge', columns).position).toBe('absolute')
    for (const type of ['text', 'image', 'static', 'separator']) {
      expect(createBlock(type, columns).position).toBe('flow')
    }
  })

  it('ne mappe aucune colonne sur un bloc texte neuf', () => {
    // L'association est explicite : un bloc ajouté à la main reste vide tant
    // que l'utilisateur n'a pas choisi sa colonne.
    expect(createBlock('text', columns).columns).toEqual([])
  })

  it('supporte un fichier sans colonnes sans planter', () => {
    expect(createBlock('badge', []).conditionColumn).toBeNull()
    expect(() => createBlock('text')).not.toThrow()
  })

  it('partage ses valeurs par défaut avec blockMetrics', () => {
    // Les deux modules décrivent le même bloc : si l'un change de défaut sans
    // l'autre, un bloc issu d'un projet ancien se mesure autrement qu'il ne
    // se dessine. Ce test casse le jour où ils divergent.
    const block = createBlock('text', columns)
    const parDefaut = textMetrics({}, 1)
    const explicite = textMetrics(block, 1)
    expect(explicite.fontSize).toBe(parDefaut.fontSize)
    expect(explicite.maxLines).toBe(parDefaut.maxLines)
    expect(explicite.paddingVpx).toBe(parDefaut.paddingVpx)
    expect(explicite.paddingHpx).toBe(parDefaut.paddingHpx)
  })
})

describe('templates', () => {
  it('renvoie null sur un identifiant inconnu plutôt que d\'effacer les blocs', () => {
    expect(buildTemplate('inexistant', columns)).toBeNull()
  })

  it('produit des blocs aux identifiants uniques, y compris entre templates', () => {
    const ids = TEMPLATES.flatMap(t => t.build(columns)).map(b => b.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('applique bien le style du template par-dessus les défauts du type', () => {
    // Régression : les défauts du type étaient étalés après les surcharges et
    // annulaient tout le style, rendant les quatre templates identiques.
    const moderne = buildTemplate('modern', columns)
    const titre = moderne[0]
    expect(titre.fontSize).toBe(11)              // et non le défaut 10
    expect(titre.color).toBe('#ffffff')          // et non le défaut #111111
    expect(titre.bgColor).toBe('#7C5CFC')        // et non le défaut null
    expect(titre.align).toBe('center')           // et non le défaut left
  })

  it('donne aux quatre templates des rendus réellement distincts', () => {
    const empreintes = TEMPLATES.map(t =>
      JSON.stringify(t.build(columns).map(({ id, ...b }) => b)),
    )
    expect(new Set(empreintes).size).toBe(TEMPLATES.length)
  })

  it('pré-mappe les premières colonnes pour que la vignette ne soit jamais vide', () => {
    for (const tpl of TEMPLATES) {
      const textes = tpl.build(columns).filter(b => b.type === 'text')
      expect(textes.length).toBeGreaterThan(0)
      for (const t of textes) expect(t.columns.length).toBeGreaterThan(0)
    }
  })

  it('reste applicable sur un fichier à une seule colonne', () => {
    for (const tpl of TEMPLATES) {
      const blocs = tpl.build(['Reference'])
      // Le deuxième bloc texte n'a pas de colonne à prendre : il reste vide
      // plutôt que de réutiliser la première ou de faire planter l'application.
      expect(() => JSON.stringify(blocs)).not.toThrow()
      for (const b of blocs.filter(b => b.type === 'text')) {
        expect(Array.isArray(b.columns)).toBe(true)
      }
    }
  })
})
