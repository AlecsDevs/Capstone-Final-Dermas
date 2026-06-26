import { useEffect, useRef, useState } from 'react'
import api from '../api/axios'
import { useAiAssistant } from '../hooks/useAiAssistant'
import '../style/ai-assistant.css'

interface GeographicTypeItem {
  id: number
  name: string
}

interface Message {
  role: 'user' | 'ai'
  text: string
}

interface Props {
  forceOpen?: boolean
  onClose?: () => void
}

export const AiAssistantPanel = ({ forceOpen, onClose }: Props) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [chatInput, setChatInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedGeoTypeId, setSelectedGeoTypeId] = useState<number | null>(null)
  const [geoTypes, setGeoTypes] = useState<GeographicTypeItem[]>([])
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { chatWithData } = useAiAssistant()

  const open = forceOpen || isOpen

  useEffect(() => {
    if (open && geoTypes.length === 0) {
      api.get<GeographicTypeItem[]>('/geographic-types').then(res => {
        setGeoTypes(res.data)
      }).catch(() => undefined)
    }
  }, [open])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleClose = () => {
    setIsOpen(false)
    onClose?.()
  }

  const handleSend = async () => {
    const q = chatInput.trim()
    if (!q || isLoading) return
    setChatInput('')
    setMessages(prev => [...prev, { role: 'user', text: q }])
    setIsLoading(true)
    try {
      const answer = await chatWithData(q, selectedGeoTypeId)
      setMessages(prev => [...prev, { role: 'ai', text: answer }])
    } catch {
      setMessages(prev => [...prev, {
        role: 'ai',
        text: 'Could not get an answer. Make sure the AI service is running (port 8001).'
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const SUGGESTED = [
    'Show all reports',
    'Show all emergency reports',
    'Show all incident reports',
    'Typhoon priority rescue — which barangay first?',
  ]

  return (
    <>
      <button
        className="ai-float-btn"
        title="AI Assistant — Ask about your records"
        onClick={() => setIsOpen(prev => !prev)}
        aria-label="Open AI Assistant"
      >
        <i className="bi bi-stars" />
      </button>

      {open && (
        <div className="ai-panel" role="dialog" aria-label="AI Assistant">

          {/* Header */}
          <div className="ai-panel-header">
            <div className="d-flex align-items-center gap-2">
              <i className="bi bi-shield-check ai-panel-icon" />
              <div>
                <div className="fw-bold" style={{ lineHeight: 1.2, letterSpacing: 0.3 }}>MDRRMO Assistant</div>
                <div style={{ fontSize: 11, opacity: 0.8 }}>Fast decisions from your records</div>
              </div>
            </div>
            <button className="btn-close btn-close-sm" onClick={handleClose} aria-label="Close" />
          </div>

          {/* Zone filter */}
          {geoTypes.length > 0 && (
            <div className="px-3 pt-2 pb-1" style={{ borderBottom: '1px solid #e2e8f0' }}>
              <select
                className="form-select form-select-sm"
                value={selectedGeoTypeId ?? ''}
                onChange={e => setSelectedGeoTypeId(e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">All Zones</option>
                {geoTypes.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}

          {/* Messages */}
          <div className="ai-messages">
            {messages.length === 0 && (
              <div className="ai-empty-state">
                <i className="bi bi-chat-dots" style={{ fontSize: 28, color: '#6366f1', marginBottom: 8 }} />
                <div className="fw-semibold mb-1" style={{ fontSize: 14 }}>Ask about your reports</div>
                <div className="text-muted mb-3" style={{ fontSize: 12 }}>Try one of these:</div>
                <div className="d-flex flex-column gap-1">
                  {SUGGESTED.map(s => (
                    <button
                      key={s}
                      className="ai-suggestion-btn"
                      onClick={() => { setChatInput(s); }}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) => (
              <div key={i} className={m.role === 'user' ? 'ai-msg-user' : 'ai-msg-ai'}>
                {m.text}
              </div>
            ))}

            {isLoading && (
              <div className="ai-msg-ai ai-typing">
                <span /><span /><span />
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="ai-panel-input">
            <textarea
              className="form-control form-control-sm"
              rows={2}
              placeholder="Ask a question about your reports…"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() }
              }}
              disabled={isLoading}
            />
            <button
              className="btn btn-sm ai-send-btn"
              style={{ background: '#7ebdb9', color: '#fff', border: 'none' }}
              onClick={handleSend}
              disabled={isLoading || !chatInput.trim()}
            >
              <i className="bi bi-send-fill" />
            </button>
          </div>

        </div>
      )}
    </>
  )
}
