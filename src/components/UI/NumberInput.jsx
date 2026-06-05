export default function NumberInput({ value, onChange, min, max, step = 1, unit, className = '' }) {
  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <input
        type="number"
        className="input w-20 text-center"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => {
          const v = parseFloat(e.target.value)
          if (!isNaN(v)) onChange(v)
        }}
      />
      {unit && <span className="text-xs text-gray-500">{unit}</span>}
    </div>
  )
}
