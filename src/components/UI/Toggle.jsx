export default function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-2.5 cursor-pointer select-none">
      <div
        className={`relative w-9 h-5 rounded-full transition-colors duration-200 ${value ? 'bg-accent' : 'bg-surface-5'}`}
        onClick={() => onChange(!value)}
      >
        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all duration-200 ${value ? 'left-[18px]' : 'left-0.5'}`} />
      </div>
      {label && <span className="text-sm text-gray-300">{label}</span>}
    </label>
  )
}
