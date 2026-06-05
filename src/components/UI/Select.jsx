import { ChevronDown } from 'lucide-react'

export default function Select({ value, onChange, options = [], placeholder = 'Choisir…', className = '' }) {
  return (
    <div className={`relative ${className}`}>
      <select
        className="input appearance-none pr-8 cursor-pointer w-full"
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
      >
        {placeholder && <option value="">{placeholder}</option>}
        {options.map((opt) => {
          const val = typeof opt === 'object' ? opt.value : opt
          const label = typeof opt === 'object' ? opt.label : opt
          return <option key={val} value={val}>{label}</option>
        })}
      </select>
      <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
    </div>
  )
}
