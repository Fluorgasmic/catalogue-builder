export default function Divider({ label, className = '' }) {
  if (label) {
    return (
      <div className={`flex items-center gap-3 my-2 ${className}`}>
        <div className="flex-1 h-px bg-surface-5" />
        <span className="text-[10px] font-medium text-gray-600 uppercase tracking-wider">{label}</span>
        <div className="flex-1 h-px bg-surface-5" />
      </div>
    )
  }
  return <div className={`h-px bg-surface-5 my-3 ${className}`} />
}
