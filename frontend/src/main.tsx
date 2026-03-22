import { height } from '@fortawesome/free-brands-svg-icons/fa42Group'
import { FormEvent, useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

const ui = { 
  page: { margin: 0, height: '100vh', background: '#f2f2f2', color: '#222', fontFamily: 'system-ui, sans-serif', display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 12 },
  leftPanel: { margin: '0', padding: 24, display: 'grid', gap: 12, gridTemplateRows: 'auto 1fr auto' },
  chat: { maxHeight: 500, padding: 12, border: '1px solid #ddd', background: '#fafafa', overflow: 'auto', display: 'grid', gap: 8 },
  form: { display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 },
  field: { padding: '10px 12px', border: '1px solid #ccc', background: '#fff', font: 'inherit' },
  msg: { maxWidth: '80%', padding: '10px 12px', borderRadius: 8, whiteSpace: 'pre-wrap' as const },
  user: { justifySelf: 'end', background: '#dcdcdc' },
  assistant: { justifySelf: 'start', background: '#ededed' },
  rightPanel: { padding: 12, border: '1px solid #ddd', background: '#fff', overflow: 'auto', height: '100%', whiteSpace: 'pre-wrap' },
  docList: { padding: 8, border: '1px solid #ddd', background: '#fff', overflow: 'auto', maxHeight: 600 }, 
}

function App() {
  const [status, setStatus] = useState('')
  const [input, setInput] = useState('')
  const [thinking, setThinking] = useState(false)
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([])
  const [docs, setDocs] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [docContent, setDocContent] = useState('')
  const [lastAnswer, setLastAnswer] = useState('')
  const [highlightedContent, setHighlightedContent] = useState('')

  const API_URL = import.meta.env.VITE_BACKEND_URL;


  useEffect(() => {
    const fetchDocs = async () => {
      const res = await fetch(`${API_URL}/api/documents`)
      const data = await res.json()
      setDocs(data)
    }
    fetchDocs()
  }, [])

  useEffect(() => {
    if (docContent && lastAnswer) {
      const cleanAnswer = lastAnswer.replace(/[*_#]/g, '')
      const highlighted = highlightDocument(docContent, cleanAnswer)
      setHighlightedContent(highlighted)
    }
  }, [docContent, lastAnswer])


  const sortedDocs = [...docs].sort((a, b) => {
    const numA = parseInt(a.filename)
    const numB = parseInt(b.filename)
    return numA - numB
  })


  const processFfu = async () => {
    setStatus('Processing...')
    const data = await fetch(`${API_URL}/api/process`, { method: 'POST' }).then((r) => r.json())
    setStatus(`${data.status}: ${data.count} document(s) processed`)
  }

  const send = async (e: FormEvent) => {
    e.preventDefault()
    if (!input.trim() || thinking) return
    const history = [...messages]
    setInput('')
    setThinking(true)
    setMessages([...history, { role: 'user', content: input.trim() }])
    const data = await fetch(`${API_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: input.trim(), history }),
    }).then((r) => r.json())
    setMessages((m) => [...m, { role: 'assistant', content: data.response }])
    setLastAnswer(data.response)
    setThinking(false)
  }


  const highlightDocument = (docText: string, aiText: string) => {
    if (!aiText) return docText

    const cleanAI = aiText.replace(/[*_#.,:;!?]/g, ' ')
    const cleanDoc = docText

    const words = cleanAI.split(/\s+/).filter(w => w.length > 3)
    const phrases: string[] = []
    for (let i = 0; i < words.length; i++) {
      if (i + 1 < words.length) phrases.push(`${words[i]} ${words[i+1]}`)
      if (i + 2 < words.length) phrases.push(`${words[i]} ${words[i+1]} ${words[i+2]}`)
      if (i + 3 < words.length) phrases.push(`${words[i]} ${words[i+1]} ${words[i+2]} ${words[i+3]}`)
    }

    const sentences = cleanDoc.split(/([.?!]\s+)/)

    const highlighted = sentences.map(sentence => {
      const found = phrases.some(phrase => {
        const regex = new RegExp(`\\b${phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i')
        return regex.test(sentence)
      })
      return found ? `<mark style="background: #ffff00; color: black;">${sentence}</mark>` : sentence
    })

    return highlighted.join('')
  }

  
  return (
    <div style={ui.page}>

      <div style={ui.leftPanel}>
        <button onClick={processFfu} style={ui.field}>Process FFU</button>
        {status && <div style={{ fontSize: '0.9em', color: '#555' }}>{status}</div>}
        <div style={ui.chat}>
          {messages.map((message, i) => (
            <div key={i} style={{ ...ui.msg, ...(message.role === 'user' ? ui.user : ui.assistant) }}>{message.content}</div>
          ))}
          {thinking && <div style={{ ...ui.msg, ...ui.assistant, color: '#666' }}>Thinking...</div>}
        </div>
        <form onSubmit={send} style={ui.form}>
          <input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask about the FFU documents" style={ui.field} />
          <button style={ui.field}>Send</button>
        </form>
        <div style={ui.docList}>
          <h3>Documents</h3>
            {sortedDocs.map((doc) => (
              <div 
                key={doc.id}
                onClick={async () => {
                  setSelectedDoc(doc.id)
                  const res = await fetch(`${API_URL}/api/documents/${doc.id}`)
                  const data = await res.json()
                  setDocContent(data.content)
                }}
                style={{ padding: 8, borderBottom: '1px solid #ddd', cursor: 'pointer'}}
              >
                {doc.filename}
              </div>
            ))}
        </div>
      </div>

      <div style={ui.rightPanel} dangerouslySetInnerHTML={{__html: highlightedContent}} /> 
    </div>
  )
}

createRoot(document.getElementById('root')!).render(<App />)
