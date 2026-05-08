import { Satellite, Sun, Moon, Newspaper, BarChart3, Radio } from 'lucide-react'
import './Header.css'

const tabs = [
  { id: 'iss', label: 'ISS Tracker', icon: <Satellite size={16} /> },
  { id: 'news', label: 'News', icon: <Newspaper size={16} /> },
  { id: 'charts', label: 'Charts', icon: <BarChart3 size={16} /> },
]

export default function Header({ theme, toggleTheme, activeTab, setActiveTab }) {
  return (
    <header className="header">
      <div className="container header-inner">
        <div className="header-brand">
          <div className="brand-icon">
            <span>🛸</span>
          </div>
          <div>
            <div className="brand-name">Real-Time ISS & News Dashboard</div>
            <div className="brand-sub">
              <span className="pulse-dot" style={{ width: 6, height: 6, display: 'inline-block', borderRadius: '50%', background: '#10b981', animation: 'pulse 2s infinite', marginRight: 6 }} />
              Live Tracking
            </div>
          </div>
        </div>

        <nav className="header-nav">
          {tabs.map(t => (
            <button
              key={t.id}
              id={`tab-${t.id}`}
              className={`header-tab ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => setActiveTab(t.id)}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </nav>

        <div className="header-actions">
          <div className="live-badge">
            <Radio size={12} />
            <span>LIVE</span>
          </div>
          <button id="theme-toggle" className="btn-icon" onClick={toggleTheme} title="Toggle theme">
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </div>
    </header>
  )
}
