import { useEffect, useRef, useState } from 'react'
import { useHerd } from '../context/HerdContext'
import { answerQuestion } from '../lib/assistant'

type Message = { role: 'user' | 'assistant'; text: string }

const SUGGESTIONS = [
  'How is the herd?',
  'Who is outside the fence?',
  'Any heat stress?',
  'Which animals are still?',
  'How are the batteries?',
  'How is Naledi?',
]

export function Assistant() {
  const herd = useHerd()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      text: 'I can check the herd, the fence, heat, stillness, batteries, and the LoRaWAN nodes. Ask in plain language.',
    },
  ])
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages])

  function ask(text: string) {
    const question = text.trim()
    if (!question) return
    const reply = answerQuestion(question, herd, herd.metrics, herd.feedMode)
    setMessages((current) => [
      ...current,
      { role: 'user', text: question },
      { role: 'assistant', text: reply },
    ])
    setDraft('')
  }

  return (
    <div className="chat-wrap">
      <div className="transcript" aria-live="polite">
        {messages.map((message, index) => (
          <p key={`${message.role}-${index}`} className={`bubble ${message.role === 'user' ? 'user' : 'bot'}`}>
            {message.text}
          </p>
        ))}
        <div ref={endRef} />
      </div>
      <div className="suggestions">
        {SUGGESTIONS.map((suggestion) => (
          <button type="button" key={suggestion} className="chip" onClick={() => ask(suggestion)}>
            {suggestion}
          </button>
        ))}
      </div>
      <form
        className="composer"
        onSubmit={(event) => {
          event.preventDefault()
          ask(draft)
        }}
      >
        <label className="sr-only" htmlFor="ask">
          Ask about the herd
        </label>
        <input
          id="ask"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Ask about an animal, the fence, or the sensors"
        />
        <button type="submit" className="primary" disabled={!draft.trim()}>
          Send
        </button>
      </form>
    </div>
  )
}
