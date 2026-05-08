import { useState, useEffect, useRef, useCallback } from 'react'
import { MessageCircle, X, Send, Trash2, Bot, User, Loader } from 'lucide-react'
import { toast } from 'react-toastify'
import './Chatbot.css'

const CHAT_STORAGE_KEY = 'iss-chatbot-messages'
const MAX_MESSAGES = 30
const HF_ROUTER_URL = 'https://router.huggingface.co/v1/chat/completions'
const AI_MODEL = 'Qwen/Qwen3-1.7B:featherless-ai'

function buildSystemPrompt(issData, newsData) {
  let context = `STRICT RULES:
1. You are a restricted AI assistant for this specific dashboard.
2. You have NO access to the internet or any general knowledge from your training data.
3. You can ONLY answer using the "DASHBOARD DATA" provided below.
4. If a user asks something NOT in the data (e.g., "Who is the president?" or "How to bake a cake"), you MUST answer: "I'm sorry, but that information is not available in my dashboard data. I can only answer questions about the ISS and the news articles currently displayed."
5. DO NOT GUESS.
6. Be concise.

DASHBOARD DATA:
`
  if (issData) {
    context += `[ISS LIVE] Latitude: ${issData.lat?.toFixed(4)}, Longitude: ${issData.lng?.toFixed(4)}, Speed: ${Math.round(issData.speed).toLocaleString()} km/h, Over: ${issData.location || 'Unknown'}\n`
  }

  if (Array.isArray(newsData) && newsData.length > 0) {
    context += `[NEWS ARTICLES] Total: ${newsData.length}. Headlines:\n`
    newsData.slice(0, 15).forEach((a, i) => {
      context += `- ${a.title} (Source: ${a.source})\n`
    })
  }

  return context
}

async function queryHuggingFace(messages, issData, newsData, apiKey) {
  const systemPrompt = buildSystemPrompt(issData, newsData)
  
  const payload = {
    model: AI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      ...messages.slice(-6).map(m => ({ role: m.role, content: m.content }))
    ],
    max_tokens: 400,
    temperature: 0.4
  }

  const res = await fetch(HF_ROUTER_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  })

  if (!res.ok) throw new Error(`HF Router API error: ${res.status}`)
  const data = await res.json()
  return data.choices?.[0]?.message?.content?.trim() || 'No response from AI.'
}

function generateLocalAnswer(message, issData, newsData) {
  const q = message.toLowerCase()

  if (q.includes('lat') && issData) return `The ISS is currently at latitude **${issData.lat?.toFixed(4)}°**.`
  if (q.includes('lon') && issData) return `The ISS is currently at longitude **${issData.lng?.toFixed(4)}°**.`
  if ((q.includes('speed') || q.includes('fast')) && issData) return `The ISS is travelling at **${issData.speed?.toLocaleString()} km/h** — that's about ${(issData.speed / 3.6).toFixed(0)} m/s! It completes an orbit every ~92 minutes.`
  if ((q.includes('where') || q.includes('location') || q.includes('over')) && issData) return `The ISS is currently flying over **${issData.location || 'an unknown location'}** at coordinates ${issData.lat?.toFixed(2)}°, ${issData.lng?.toFixed(2)}°.`
  if (q.includes('altitude') || q.includes('high')) return `The ISS orbits at approximately **408 km** above Earth's surface.`
  if (q.includes('orbit')) return `The ISS completes one orbit of Earth every **92 minutes**, travelling at ~27,600 km/h.`

  if ((q.includes('news') || q.includes('article')) && Array.isArray(newsData) && newsData.length > 0) {
    const total = newsData.length
    const byCategory = {}
    newsData.forEach(a => { byCategory[a.category] = (byCategory[a.category] || 0) + 1 })
    const catStr = Object.entries(byCategory).map(([c, n]) => `${n} ${c}`).join(', ')
    return `There are **${total} articles** loaded: ${catStr}. Ask me about a specific category for headlines!`
  }

  // Category-specific news
  const catMap = { tech: 'technology', science: 'science', space: 'space', world: 'world', business: 'business' }
  for (const [kw, cat] of Object.entries(catMap)) {
    if (q.includes(kw) && Array.isArray(newsData)) {
      const arts = newsData.filter(a => a.category === cat).slice(0, 3)
      if (arts.length > 0) {
        const list = arts.map((a, i) => `${i + 1}. **${a.title}** — ${a.source}`).join('\n')
        return `Here are top ${cat} headlines:\n\n${list}`
      }
    }
  }

  if (!issData && !Array.isArray(newsData)) return `I don't have any dashboard data yet. Please visit the **ISS Tracker** and **News** tabs to load data, then come back!`

  return `I can only answer questions based on dashboard data. Try asking:\n- "Where is the ISS right now?"\n- "What is the ISS speed?"\n- "Show me top technology news"\n- "How many articles are loaded?"`
}

export default function Chatbot({ issData, newsData }) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(CHAT_STORAGE_KEY) || '[]')
      return stored.slice(-MAX_MESSAGES)
    } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const bottomRef = useRef(null)
  const inputRef = useRef(null)
  const apiKey = import.meta.env.VITE_HF_API_KEY

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-MAX_MESSAGES)))
  }, [messages])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isTyping) return

    const userMsg = { id: Date.now(), role: 'user', content: text, ts: new Date().toISOString() }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setIsTyping(true)

    try {
      let reply
      if (apiKey && !apiKey.includes('your_')) {
        try {
          reply = await queryHuggingFace([...messages, userMsg], issData, newsData, apiKey)
        } catch (e) {
          console.warn('HF API failed, using local:', e.message)
          reply = generateLocalAnswer(text, issData, newsData)
        }
      } else {
        await new Promise(r => setTimeout(r, 800)) // simulate thinking
        reply = generateLocalAnswer(text, issData, newsData)
      }

      const botMsg = { id: Date.now() + 1, role: 'assistant', content: reply, ts: new Date().toISOString() }
      setMessages(prev => [...prev, botMsg])
    } catch {
      const errMsg = { id: Date.now() + 1, role: 'assistant', content: 'Sorry, I encountered an error. Please try again.', ts: new Date().toISOString(), error: true }
      setMessages(prev => [...prev, errMsg])
    } finally {
      setIsTyping(false)
    }
  }, [input, isTyping, messages, issData, newsData, apiKey])

  const clearChat = () => {
    setMessages([])
    localStorage.removeItem(CHAT_STORAGE_KEY)
    toast.success('Chat cleared!')
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const SUGGESTIONS = [
    'Where is the ISS right now?',
    'What is the ISS speed?',
    'Show top space news',
    'How many articles loaded?',
  ]

  return (
    <>
      {/* Floating Button */}
      <button
        id="chatbot-toggle"
        className={`chatbot-fab ${isOpen ? 'open' : ''}`}
        onClick={() => setIsOpen(o => !o)}
        title="AI Chat Assistant"
      >
        {isOpen ? <X size={22} /> : <MessageCircle size={22} />}
        {!isOpen && messages.length > 0 && (
          <span className="chat-badge">{Math.min(messages.filter(m => m.role === 'assistant').length, 9)}</span>
        )}
      </button>

      {/* Chat Window */}
      <div className={`chatbot-window ${isOpen ? 'visible' : ''}`}>
        {/* Header */}
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="chat-avatar">
              <Bot size={18} />
            </div>
            <div>
              <div className="chat-title">ISS Dashboard AI</div>
              <div className="chat-subtitle">
                <span className="pulse-dot" style={{ width: 6, height: 6, background: '#10b981', borderRadius: '50%', display: 'inline-block', animation: 'pulse 2s infinite', marginRight: 4 }} />
                Answers from dashboard data only
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn-icon" onClick={clearChat} title="Clear chat">
              <Trash2 size={15} />
            </button>
            <button className="btn-icon" onClick={() => setIsOpen(false)} title="Close">
              <X size={15} />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="chat-messages">
          {messages.length === 0 && (
            <div className="chat-welcome">
              <div className="welcome-icon">🛸</div>
              <h3>Hi! I'm your ISS Dashboard AI</h3>
              <p>I can answer questions about the ISS location, speed, news articles and more — based only on your live dashboard data.</p>
              <div className="suggestions">
                {SUGGESTIONS.map(s => (
                  <button key={s} className="suggestion-btn" onClick={() => { setInput(s); inputRef.current?.focus() }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`chat-msg ${msg.role}`}>
              <div className="msg-avatar">
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
              </div>
              <div className={`msg-bubble ${msg.error ? 'error' : ''}`}>
                <MessageContent content={msg.content} />
                <div className="msg-time">{new Date(msg.ts).toLocaleTimeString()}</div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="chat-msg assistant">
              <div className="msg-avatar"><Bot size={14} /></div>
              <div className="msg-bubble typing-bubble">
                <Loader size={14} className="spin" />
                <span>Thinking...</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <textarea
            ref={inputRef}
            id="chatbot-input"
            className="chat-input"
            placeholder="Ask about ISS or news..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            rows={1}
          />
          <button
            id="chatbot-send"
            className={`chat-send-btn ${input.trim() && !isTyping ? 'active' : ''}`}
            onClick={sendMessage}
            disabled={!input.trim() || isTyping}
          >
            <Send size={16} />
          </button>
        </div>
        <div className="chat-footer">Press Enter to send · Shift+Enter for new line</div>
      </div>
    </>
  )
}

// Render markdown-lite bold
function MessageContent({ content }) {
  const parts = content.split(/(\*\*[^*]+\*\*)/g)
  return (
    <div className="msg-text">
      {parts.map((part, i) =>
        part.startsWith('**') && part.endsWith('**')
          ? <strong key={i}>{part.slice(2, -2)}</strong>
          : part.split('\n').map((line, j) => (
            <span key={`${i}-${j}`}>{line}{j < part.split('\n').length - 1 ? <br /> : null}</span>
          ))
      )}
    </div>
  )
}
