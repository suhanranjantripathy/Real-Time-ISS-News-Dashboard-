import { useState, useEffect } from 'react'
import { ToastContainer } from 'react-toastify'
import Header from './components/Header'
import ISSTracker from './components/ISSTracker'
import NewsSection from './components/NewsSection'
import ChartsSection from './components/ChartsSection'
import Chatbot from './components/Chatbot'

function App() {
  const [theme, setTheme] = useState(() => localStorage.getItem('iss-theme') || 'dark')
  const [activeTab, setActiveTab] = useState('iss')
  const [filterCategory, setFilterCategory] = useState(null)

  // Global shared data for Chatbot and Components
  const [issData, setIssData] = useState(null)
  const [newsData, setNewsData] = useState([])

  // Load news data globally on mount so Chatbot has it immediately
  useEffect(() => {
    const cached = localStorage.getItem('iss-news-cache-technology')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        setNewsData(parsed.data || [])
      } catch (e) { console.error('Cache parse error', e) }
    }
  }, [])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('iss-theme', theme)
  }, [theme])

  const toggleTheme = () => setTheme(t => t === 'dark' ? 'light' : 'dark')

  return (
    <div className="app" style={{ minHeight: '100vh', background: 'var(--gradient-bg)' }}>
      <Header theme={theme} toggleTheme={toggleTheme} activeTab={activeTab} setActiveTab={setActiveTab} />
      <main className="container" style={{ paddingTop: '24px', paddingBottom: '80px' }}>
        {activeTab === 'iss' && <ISSTracker onDataUpdate={setIssData} />}
        {activeTab === 'news' && (
          <NewsSection 
            onDataUpdate={setNewsData} 
            initialCategory={filterCategory} 
            onCategoryChange={setFilterCategory} 
          />
        )}
        {activeTab === 'charts' && (
          <ChartsSection 
            issData={issData} 
            newsData={newsData} 
            onChartClick={(cat) => {
              setFilterCategory(cat);
              setActiveTab('news');
            }} 
          />
        )}
      </main>
      <Chatbot issData={issData} newsData={newsData} />
      <ToastContainer
        position="bottom-left"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        pauseOnHover
        theme={theme}
      />
    </div>
  )
}

export default App
