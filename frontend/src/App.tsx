import { useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  HubConnectionBuilder,
  HttpTransportType,
  LogLevel,
} from '@microsoft/signalr'

type ChatResponse = {
  answer: string
  model: string
}

type ChatStreamUpdate = {
  text: string
  model: string
}

type Message = {
  id: number
  role: 'user' | 'assistant'
  text: string
  model?: string
}

type Transport = 'rest' | 'websocket'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://localhost:44398'

function App() {
  const [messages, setMessages] = useState<Message[]>([])
  const [prompt, setPrompt] = useState('')
  const [transport, setTransport] = useState<Transport>('rest')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const connection = useMemo(
    () =>
      new HubConnectionBuilder()
        .withUrl(`${API_BASE_URL}/hubs/chat`, { transport: HttpTransportType.WebSockets })
        .withAutomaticReconnect()
        .configureLogging(LogLevel.Warning)
        .build(),
    [],
  )

  useEffect(() => () => {
    void connection.stop()
  }, [connection])

  async function askRest(promptText: string): Promise<ChatResponse> {
    const apiUrl = `${API_BASE_URL}/api/chat`
    console.log('REST API URL:', apiUrl)

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: promptText }),
    })

    if (!response.ok) {
      const detail = await response.text()
      throw new Error(detail || `Request failed (${response.status}).`)
    }

    return response.json() as Promise<ChatResponse>
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const text = prompt.trim()

    if (!text || busy) return

    setPrompt('')
    setError('')
    setBusy(true)
    setMessages((current) => [
      ...current,
      { id: Date.now(), role: 'user', text },
    ])

    try {
      if (transport === 'websocket') {
        if (connection.state === 'Disconnected') {
          await connection.start()
        }

        const assistantId = Date.now() + 1
        setMessages((current) => [
          ...current,
          { id: assistantId, role: 'assistant', text: '' },
        ])
        await new Promise<void>((resolve, reject) => {
          connection.stream<ChatStreamUpdate>('Stream', text).subscribe({
            next: (update) => setMessages((current) => current.map((message) =>
              message.id === assistantId
                ? { ...message, text: message.text + update.text, model: update.model }
                : message,
            )),
            complete: resolve,
            error: reject,
          })
        })
      } else {
        const result = await askRest(text)
        setMessages((current) => [
          ...current,
          { id: Date.now() + 1, role: 'assistant', text: result.answer, model: result.model },
        ])
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'The request failed.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="page">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Connect AI home">
          <span className="brand-mark">C</span>
          <span>Connect <strong>AI</strong></span>
        </a>
        <span className="architecture">ASP.NET Core · LangChain · MCP</span>
      </header>

      <section className="chat-shell" aria-label="Connect AI chat">
        <div className="intro">
          <span className="eyebrow">YOUR AI WORKSPACE</span>
          <h1>What can I help you with?</h1>
          <p>Ask a question and choose how it travels to the assistant.</p>
        </div>

        <div className="transport-picker" role="group" aria-label="Connection type">
          <button
            className={transport === 'websocket' ? 'transport active' : 'transport'}
            type="button"
            onClick={() => setTransport('websocket')}
            aria-pressed={transport === 'websocket'}
          >
            <span className="status-dot" />
            WebSocket
            <small>SignalR</small>
          </button>
          <button
            className={transport === 'rest' ? 'transport active' : 'transport'}
            type="button"
            onClick={() => setTransport('rest')}
            aria-pressed={transport === 'rest'}
          >
            <span className="rest-icon">↗</span>
            REST API
            <small>HTTP</small>
          </button>
        </div>

        <div className="conversation" aria-live="polite">
          {messages.length === 0 && (
            <div className="empty-state">
              <div className="assistant-avatar">✦</div>
              <div>
                <strong>Start a conversation</strong>
                <p>Your prompt is handled by the backend orchestrator.</p>
              </div>
            </div>
          )}
          {messages.map((message) => (
            <article className={`message ${message.role}`} key={message.id}>
              {message.role === 'assistant' && <span className="assistant-avatar">✦</span>}
              <div className="message-content">
                <p>{message.text}</p>
                {message.model && <small>{message.model}</small>}
              </div>
            </article>
          ))}
          {busy && (messages.at(-1)?.role !== 'assistant' || !messages.at(-1)?.text) && (
            <div className="message assistant">
              <span className="assistant-avatar">✦</span>
              <div className="message-content pending">Thinking<span>···</span></div>
            </div>
          )}
        </div>

        {error && <p className="error" role="alert">{error}</p>}

        <form className="composer" onSubmit={submit}>
          <label className="sr-only" htmlFor="prompt">Message</label>
          <textarea
            id="prompt"
            value={prompt}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault()
                event.currentTarget.form?.requestSubmit()
              }
            }}
            placeholder="Message Connect AI..."
            rows={2}
            maxLength={20_000}
            disabled={busy}
          />
          <div className="composer-footer">
            <span>Enter to send · Shift + Enter for a new line</span>
            <button type="submit" disabled={busy || !prompt.trim()}>
              {busy ? 'Sending…' : 'Send'} <span aria-hidden="true">↑</span>
            </button>
          </div>
        </form>
        <p className="disclaimer">Responses are generated by an AI model and may need verification.</p>
      </section>
    </main>
  )
}

export default App
