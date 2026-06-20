import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { NABUA_LOCATION_OPTIONS, normalizeNabuaLocation } from '../data/nabuaBarangays'

interface BarangayAutocompleteProps {
  value: string
  onChange: (value: string) => void
  onBlur?: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
}

export function BarangayAutocomplete({
  value, onChange, onBlur, placeholder = '', className = '', id,
}: BarangayAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [dropStyle, setDropStyle] = useState<React.CSSProperties>({})
  const inputRef = useRef<HTMLInputElement>(null)
  const dropId = useRef(`barangay-drop-${Math.random().toString(36).slice(2)}`)

  const calcPos = () => {
    if (!inputRef.current) return
    const r = inputRef.current.getBoundingClientRect()
    setDropStyle({
      position: 'fixed',
      top: r.bottom + 2,
      left: r.left,
      width: Math.max(r.width, 220),
      zIndex: 99999,
      background: '#fff',
      border: '1px solid #93c5fd',
      borderRadius: 8,
      boxShadow: '0 6px 20px rgba(0,0,0,0.15)',
      maxHeight: 240,
      overflowY: 'auto',
    })
  }

  const filter = (q: string) => {
    if (!q.trim()) return []
    const needle = q.toLowerCase().replace(/^nabua\s*/i, '').trim()
    if (!needle) return []
    return NABUA_LOCATION_OPTIONS
      .filter(o => o.toLowerCase().replace(/^nabua\s*/i, '').includes(needle))
      .slice(0, 10)
  }

  const handleFocus = () => {
    calcPos()
    const s = filter(value)
    setSuggestions(s)
    setOpen(s.length > 0)
  }

  const handleChange = (v: string) => {
    onChange(v)
    calcPos()
    setSuggestions(filter(v))
    setOpen(true)
  }

  const pick = (opt: string) => {
    onChange(opt)
    setOpen(false)
    setSuggestions([])
    if (onBlur) onBlur(opt)
  }

  const handleBlur = () => {
    setTimeout(() => {
      setOpen(false)
      setSuggestions([])
      if (!value) { if (onBlur) onBlur(''); return }
      const normalized = normalizeNabuaLocation(value)
      const valid = NABUA_LOCATION_OPTIONS.includes(normalized)
      if (!valid) {
        onChange('')
        if (onBlur) onBlur('')
      } else {
        if (normalized !== value) onChange(normalized)
        if (onBlur) onBlur(normalized)
      }
    }, 150)
  }

  // Close when clicking outside
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      const drop = document.getElementById(dropId.current)
      if (
        inputRef.current && !inputRef.current.contains(e.target as Node) &&
        drop && !drop.contains(e.target as Node)
      ) {
        setOpen(false)
        setSuggestions([])
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  return (
    <>
      <input
        ref={inputRef}
        id={id}
        type="text"
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && createPortal(
        <div id={dropId.current} className="zr-bgy-dropdown" style={dropStyle}>
          {suggestions.map(opt => (
            <div
              key={opt}
              className="zr-bgy-option"
              onMouseDown={() => pick(opt)}
              style={{ padding: '7px 12px', fontSize: 13, cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
            >
              {opt}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
