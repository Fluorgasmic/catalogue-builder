import { useState } from 'react'

export default function Tooltip({ children, text, placement = 'top' }) {
  const [visible, setVisible] = useState(false)

  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-1.5',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-1.5',
    left: 'right-full top-1/2 -translate-y-1/2 mr-1.5',
    right: 'left-full top-1/2 -translate-y-1/2 ml-1.5',
  }[placement]

  return (
    <div className="relative inline-flex" onMouseEnter={() => setVisible(true)} onMouseLeave={() => setVisible(false)}>
      {children}
      {visible && text && (
        <div className={`tooltip ${pos}`}>{text}</div>
      )}
    </div>
  )
}
