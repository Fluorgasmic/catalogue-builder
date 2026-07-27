import { useMemo } from 'react'
import { LayoutTemplate, Info } from 'lucide-react'
import useCatalogStore from '../../store/catalogStore'
import Select from '../UI/Select'
import { allTemplates, distinctGroupValues } from '../../document/templateRegistry'
import { templateCapacity } from '../../document/pageTemplate'

/**
 * Affectation des gabarits de page.
 *
 * Un gabarit décide du découpage d'une page — « trois grandes puis six
 * petites » plutôt qu'une grille uniforme. On en choisit un par défaut, et on
 * le remplace catégorie par catégorie quand une famille de produits mérite un
 * traitement différent.
 */
export default function TemplateAssignment() {
  const {
    rawData, groupColumn, grid,
    pageTemplates, defaultTemplateId, templateByGroup,
    setDefaultTemplate, setGroupTemplate,
  } = useCatalogStore()

  const gabarits = useMemo(() => allTemplates(pageTemplates), [pageTemplates])
  const categories = useMemo(
    () => distinctGroupValues(rawData, groupColumn),
    [rawData, groupColumn],
  )

  const options = (avecDefaut) => [
    {
      value: '',
      label: avecDefaut
        ? `Gabarit par défaut${defaultTemplateId ? '' : ` (grille ${grid.columns} × ${grid.rows})`}`
        : `Grille du projet — ${grid.columns} × ${grid.rows}`,
    },
    ...gabarits.map((t) => {
      const n = templateCapacity(t)
      return { value: t.id, label: `${t.name} — ${n} vignette${n > 1 ? 's' : ''}` }
    }),
  ]

  return (
    <div>
      <h3 className="section-title flex items-center gap-2">
        <LayoutTemplate size={13} /> Gabarits de page
      </h3>

      <div className="flex flex-col gap-3">
        <div>
          <label className="label mb-2 block">Par défaut</label>
          <Select
            value={defaultTemplateId ?? ''}
            onChange={(v) => setDefaultTemplate(v)}
            placeholder={null}
            options={options(false)}
          />
        </div>

        {categories.length > 0 ? (
          <div className="p-3 bg-surface-3 rounded-xl border border-surface-5">
            <p className="text-xs text-gray-400 mb-3">
              Par catégorie <span className="text-gray-600">— {groupColumn}</span>
            </p>
            <div className="flex flex-col gap-2.5">
              {categories.map((cat) => (
                <div key={cat} className="grid grid-cols-[1fr_1.4fr] items-center gap-3">
                  <span className="text-xs text-gray-300 truncate" title={cat}>
                    {cat || <span className="text-gray-600 italic">sans valeur</span>}
                  </span>
                  <Select
                    value={templateByGroup?.[cat] ?? ''}
                    onChange={(v) => setGroupTemplate(cat, v)}
                    placeholder={null}
                    options={options(true)}
                  />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex items-start gap-2 px-3 py-2 bg-surface-3 border border-surface-5 rounded-lg">
            <Info size={13} className="text-gray-600 mt-0.5 shrink-0" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              Choisissez une colonne de regroupement dans l’onglet Données pour
              affecter un gabarit différent à chaque catégorie.
            </p>
          </div>
        )}

        <p className="text-[11px] text-gray-600 leading-relaxed">
          Le nombre de vignettes par page vient du gabarit, pas de la grille
          ci-dessus — celle-ci ne sert plus que de repli.
        </p>
      </div>
    </div>
  )
}
