import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createAutosaver } from './autosave'

function setup({ save } = {}) {
  const states = []
  let n = 0
  const saver = createAutosaver({
    save: save ?? vi.fn(async () => {}),
    getSnapshot: () => ({ version: ++n }),
    onState: (status, error) => states.push(error ? `${status}:${error.message}` : status),
    debounceMs: 1500,
  })
  return { saver, states }
}

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

describe('createAutosaver', () => {
  it('écrit après le délai', async () => {
    const save = vi.fn(async () => {})
    const { saver } = setup({ save })

    saver.notifyChange()
    expect(save).not.toHaveBeenCalled()

    await vi.advanceTimersByTimeAsync(1500)
    expect(save).toHaveBeenCalledTimes(1)
  })

  it('enregistre la toute première modification', async () => {
    // Régression : le premier changement après l'ouverture d'un projet était
    // ignoré. Un import de projet ne produit qu'un seul changement — il était
    // donc perdu intégralement.
    const save = vi.fn(async () => {})
    const { saver } = setup({ save })

    saver.notifyChange() // la première, et la seule
    await vi.advanceTimersByTimeAsync(1500)

    expect(save).toHaveBeenCalledTimes(1)
    expect(save.mock.calls[0][0]).toEqual({ version: 1 })
  })

  it('regroupe les modifications rapprochées en une seule écriture', async () => {
    const save = vi.fn(async () => {})
    const { saver } = setup({ save })

    saver.notifyChange()
    await vi.advanceTimersByTimeAsync(500)
    saver.notifyChange()
    await vi.advanceTimersByTimeAsync(500)
    saver.notifyChange()
    await vi.advanceTimersByTimeAsync(1500)

    expect(save).toHaveBeenCalledTimes(1)
  })

  it('flush écrit immédiatement au lieu d\'annuler l\'écriture en attente', async () => {
    // Régression : au démontage de l'éditeur, le nettoyage faisait clearTimeout
    // et l'écriture n'avait jamais lieu — alors que l'interface venait
    // d'afficher « Enregistrement… ».
    const save = vi.fn(async () => {})
    const { saver } = setup({ save })

    saver.notifyChange()
    await saver.flush() // l'utilisateur quitte avant la fin du délai

    expect(save).toHaveBeenCalledTimes(1)
  })

  it('n\'écrit rien quand rien n\'a changé', async () => {
    const save = vi.fn(async () => {})
    const { saver } = setup({ save })

    await saver.flush()
    await vi.advanceTimersByTimeAsync(5000)

    expect(save).not.toHaveBeenCalled()
  })

  it('n\'écrit qu\'une fois si on flush deux fois de suite', async () => {
    const save = vi.fn(async () => {})
    const { saver } = setup({ save })

    saver.notifyChange()
    await saver.flush()
    await saver.flush()

    expect(save).toHaveBeenCalledTimes(1)
  })

  it('signale l\'échec et garde la modification en attente', async () => {
    // Régression : l'erreur était avalée par un catch vide et l'interface
    // affichait « Synchronisé » alors que rien n'avait été écrit.
    const save = vi.fn(async () => { throw new Error('document trop volumineux') })
    const { saver, states } = setup({ save })

    saver.notifyChange()
    await vi.advanceTimersByTimeAsync(1500)

    expect(states).toContain('error:document trop volumineux')
    expect(states).not.toContain('saved')
    expect(saver.hasPendingChanges()).toBe(true)
  })

  it('réessaie l\'écriture échouée au flush suivant', async () => {
    let echoue = true
    const save = vi.fn(async () => { if (echoue) throw new Error('réseau') })
    const { saver } = setup({ save })

    saver.notifyChange()
    await vi.advanceTimersByTimeAsync(1500)
    expect(saver.hasPendingChanges()).toBe(true)

    echoue = false
    await saver.flush()

    expect(save).toHaveBeenCalledTimes(2)
    expect(saver.hasPendingChanges()).toBe(false)
  })

  it('sérialise les écritures : une lente n\'écrase pas une plus récente', async () => {
    const ordre = []
    const save = vi.fn((snap) => new Promise((resolve) => {
      // la première écriture est plus lente que la seconde
      setTimeout(() => { ordre.push(snap.version); resolve() }, snap.version === 1 ? 800 : 10)
    }))
    const { saver } = setup({ save })

    saver.notifyChange()
    const premier = saver.flush()
    saver.notifyChange()
    const second = saver.flush()

    await vi.advanceTimersByTimeAsync(1000)
    await Promise.all([premier, second])

    expect(ordre).toEqual([1, 2]) // et non [2, 1]
  })

  it('passe par pending puis saving puis saved', async () => {
    const { saver, states } = setup()
    saver.notifyChange()
    await vi.advanceTimersByTimeAsync(1500)
    expect(states).toEqual(['pending', 'saving', 'saved'])
  })

  it('n\'écrit plus rien après dispose', async () => {
    const save = vi.fn(async () => {})
    const { saver } = setup({ save })

    saver.dispose()
    saver.notifyChange()
    await vi.advanceTimersByTimeAsync(5000)

    expect(save).not.toHaveBeenCalled()
  })
})
