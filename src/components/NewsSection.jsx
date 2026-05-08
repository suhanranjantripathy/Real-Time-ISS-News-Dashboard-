import { useState, useEffect, useCallback } from 'react'
import { toast } from 'react-toastify'
import { RefreshCw, Search, ExternalLink, Calendar, User, Tag, SortAsc, SortDesc } from 'lucide-react'
import './NewsSection.css'

const NEWS_CACHE_KEY = 'iss-news-cache'
const CACHE_TTL_MS = 15 * 60 * 1000 // 15 minutes

const CATEGORIES = [
  { id: 'technology', label: 'Technology', emoji: '💻', color: 'blue' },
  { id: 'science', label: 'Science', emoji: '🔬', color: 'cyan' },
  { id: 'space', label: 'Space', emoji: '🚀', color: 'purple' },
  { id: 'world', label: 'World', emoji: '🌍', color: 'green' },
  { id: 'business', label: 'Business', emoji: '📈', color: 'orange' },
]

// Use newsdata.io — free, no CORS issues from browser
async function fetchNewsForCategory(category, apiKey) {
  const q = category === 'space' ? 'space ISS NASA' : category
  const url = `https://newsdata.io/api/1/news?apikey=${apiKey}&q=${encodeURIComponent(q)}&language=en&size=10`
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  if (data.status !== 'success') throw new Error(data.message || 'API error')
  return (data.results || []).slice(0, 10).map(a => ({
    id: a.article_id || Math.random().toString(36),
    title: a.title || 'Untitled',
    source: a.source_id || 'Unknown',
    author: Array.isArray(a.creator) ? a.creator[0] : (a.creator || 'Unknown'),
    date: a.pubDate || '',
    image: a.image_url || null,
    description: a.description || a.content?.slice(0, 200) || 'No description available.',
    url: a.link || '#',
    category,
  }))
}

// Fallback: GNews API (no key needed for limited use)
async function fetchNewsGNews(category) {
  const queries = {
    technology: 'technology',
    science: 'science',
    space: 'space NASA ISS',
    world: 'world news',
    business: 'business economy',
  }
  const q = queries[category] || category
  const url = `https://gnews.io/api/v4/search?q=${encodeURIComponent(q)}&lang=en&max=10&apikey=demo`
  const res = await fetch(url)
  if (!res.ok) throw new Error('GNews error')
  const data = await res.json()
  return (data.articles || []).slice(0, 10).map(a => ({
    id: a.url,
    title: a.title,
    source: a.source?.name || 'Unknown',
    author: a.author || 'Unknown',
    date: a.publishedAt || '',
    image: a.image || null,
    description: a.description || '',
    url: a.url || '#',
    category,
  }))
}

// Always-available fallback with sample articles per category
function getSampleArticles(category) {
  const articles = {
    technology: [
      { title: 'AI Revolution: How Machine Learning is Reshaping Industries in 2026', source: 'TechCrunch', author: 'Sarah Chen', description: 'Artificial intelligence continues to transform every sector from healthcare to finance, with new breakthroughs emerging weekly.', image: null },
      { title: 'Quantum Computing Reaches New Milestone: 1000 Qubit Processor', source: 'Wired', author: 'Mike Johnson', description: 'Researchers announce a breakthrough in quantum computing that could solve complex problems in seconds.', image: null },
      { title: 'The Future of Foldable Devices: What 2026 Holds for Flexible Tech', source: 'The Verge', author: 'Lisa Park', description: 'Manufacturers race to produce durable, affordable foldable smartphones and tablets for mainstream consumers.', image: null },
      { title: 'Cybersecurity Threats Evolve: New AI-Powered Attacks Target Infrastructure', source: 'Ars Technica', author: 'David Kim', description: 'Security experts warn of increasingly sophisticated AI-driven cyberattacks targeting critical infrastructure.', image: null },
      { title: 'Open Source AI Models Surpass Commercial Alternatives in Benchmarks', source: 'MIT Tech Review', author: 'Emma Davis', description: 'The open source community releases powerful models that outperform proprietary offerings in key tasks.', image: null },
      { title: 'Electric Vehicle Battery Range Doubles with New Solid-State Technology', source: 'Electrek', author: 'Tom Brown', description: 'Solid-state batteries promise to revolutionize EVs with 1000km range and faster charging.', image: null },
      { title: 'Meta Unveils Next-Generation Mixed Reality Headset', source: 'Road to VR', author: 'Chris White', description: 'Meta announces a lighter, more powerful headset that blurs the line between physical and digital reality.', image: null },
      { title: 'Cloud Computing Costs Drop 40% as Competition Heats Up', source: 'Forbes Tech', author: 'Anna Lee', description: 'Major providers slash prices as new entrants disrupt the cloud computing market landscape.', image: null },
      { title: '5G Rollout Completes in 100 Countries — What Changes Now?', source: 'CNET', author: 'Ryan Garcia', description: 'With 5G now global, experts analyze the real-world impact on connectivity and smart city development.', image: null },
      { title: 'Robotics Startup Raises $500M for Humanoid Robot Manufacturing', source: 'TechCrunch', author: 'Julia Chang', description: 'A new wave of investment flows into humanoid robotics as factory automation demand surges.', image: null },
    ],
    science: [
      { title: 'Astronomers Discover Water on Potentially Habitable Exoplanet', source: 'Nature', author: 'Dr. James Webb', description: 'Spectroscopic analysis reveals signs of liquid water on a planet 40 light-years away.', image: null },
      { title: 'CRISPR Gene Therapy Shows 90% Success Rate in Rare Disease Trials', source: 'Science', author: 'Dr. Maria Santos', description: 'Clinical trials demonstrate remarkable outcomes for patients with previously untreatable genetic conditions.', image: null },
      { title: 'Climate Tipping Points Closer Than Previously Thought, Study Warns', source: 'Nature Climate Change', author: 'Prof. Lena Koch', description: 'New models indicate several critical climate thresholds may be crossed before 2040.', image: null },
      { title: 'Physicists Observe New Quantum Particle That Defies Standard Model', source: 'Physical Review Letters', author: 'Dr. Kenji Tanaka', description: 'Particle accelerator experiments reveal evidence of an entirely new class of subatomic particle.', image: null },
      { title: 'Brain-Computer Interface Helps Paralyzed Patient Walk Again', source: 'NEJM', author: 'Dr. Sarah OBrien', description: 'A groundbreaking neural implant bridges the gap between brain signals and muscle movement.', image: null },
      { title: 'Deep Ocean Microbes Found Processing Carbon at Unprecedented Rates', source: 'PNAS', author: 'Dr. Ana Rivera', description: 'Newly discovered bacteria in the Mariana Trench absorb carbon dioxide 10x faster than expected.', image: null },
      { title: 'Fusion Energy Plant Achieves Net Energy Gain for Third Consecutive Month', source: 'Science News', author: 'Dr. Peter Jones', description: 'Commercial fusion energy edges closer as ITER demonstrates sustained net-positive energy output.', image: null },
      { title: 'Paleontologists Unearth Complete T-Rex Skeleton in Patagonia', source: 'National Geographic', author: 'Dr. Carlos Mendez', description: 'The near-complete specimen offers new insights into the evolution and behavior of theropod dinosaurs.', image: null },
      { title: 'New Antibiotic Discovered in Soil Bacteria Defeats Drug-Resistant Strains', source: 'Lancet', author: 'Dr. Emily Hart', description: 'Researchers isolate a compound effective against MRSA and other antibiotic-resistant superbugs.', image: null },
      { title: 'Solar Storm of the Century Predicted for Late 2026', source: 'SpaceWeather.com', author: 'Dr. Frank Moore', description: 'NASA and ESA issue joint advisory warning of intense solar activity that could affect satellites.', image: null },
    ],
    space: [
      { title: 'ISS Astronauts Complete Record-Breaking 9-Hour Spacewalk', source: 'NASA', author: 'NASA Team', description: 'Crew members installed new solar panels and conducted critical maintenance outside the station.', image: null },
      { title: 'SpaceX Starship Completes First Round-Trip Mission to Lunar Orbit', source: 'SpaceX', author: 'Elon Team', description: 'The massive rocket successfully orbited the Moon and returned, marking a historic milestone.', image: null },
      { title: 'China\'s Tiangong Station Expands with New Science Module', source: 'CNSA', author: 'CNSA Press', description: 'China adds a third module to its space station, significantly expanding research capabilities.', image: null },
      { title: 'NASA Artemis III Moon Landing Scheduled for 2027', source: 'NASA', author: 'Bill Nelson', description: 'NASA confirms crew selection and timeline for the first crewed lunar landing since Apollo 17.', image: null },
      { title: 'James Webb Telescope Captures Deepest Image of Universe Yet', source: 'ESA', author: 'ESA Science', description: 'The new image reveals galaxies from just 300 million years after the Big Bang.', image: null },
      { title: 'Mars Sample Return Mission Delayed to 2033 Due to Budget Cuts', source: 'Science', author: 'Davide Castelvecchi', description: 'NASA and ESA revise timeline for returning Martian rock samples collected by Perseverance.', image: null },
      { title: 'Private Space Station Axiom Reaches Full Occupancy', source: 'Axiom Space', author: 'Axiom PR', description: 'The commercial successor to ISS achieves a milestone with permanent crew and research operations.', image: null },
      { title: 'Voyager 1 Sends Clearest Signal in Decades After Repair', source: 'JPL', author: 'JPL Team', description: 'Engineers fix a communication glitch aboard the most distant human-made object in space.', image: null },
      { title: 'Europa Clipper Detects Plumes of Water Vapor Near Icy Moon', source: 'NASA JPL', author: 'Dr. Robert Pappalardo', description: 'Early data from the spacecraft suggests active geological processes beneath Europa\'s ice shell.', image: null },
      { title: 'India\'s Gaganyaan Crew Module Successfully Tested at Sea', source: 'ISRO', author: 'ISRO Press', description: 'ISRO completes water recovery tests ahead of India\'s first crewed spaceflight mission.', image: null },
    ],
    world: [
      { title: 'G20 Leaders Agree on Historic Climate Finance Framework', source: 'Reuters', author: 'Reuters Staff', description: 'World leaders commit $1 trillion annually to support developing nations in transitioning to clean energy.', image: null },
      { title: 'UN Security Council Passes Resolution on AI Governance', source: 'UN News', author: 'UN Correspondent', description: 'First binding international agreement on artificial intelligence safety and ethical standards adopted.', image: null },
      { title: 'Global Food Security Index Hits 10-Year Low Amid Supply Disruptions', source: 'The Guardian', author: 'Fiona Harvey', description: 'Conflict and climate change continue to threaten food production in key agricultural regions.', image: null },
      { title: 'WHO Declares New Pathogen a Public Health Emergency', source: 'BBC News', author: 'BBC Health', description: 'World Health Organization monitors novel respiratory virus spreading across multiple continents.', image: null },
      { title: 'European Parliament Votes on Sweeping Digital Rights Legislation', source: 'Politico EU', author: 'Eleanor Whitlock', description: 'Landmark law extends data privacy protections and curbs power of large technology platforms.', image: null },
      { title: 'Middle East Peace Talks Resume in Geneva After Two-Year Break', source: 'Al Jazeera', author: 'AJ Correspondent', description: 'Diplomats gather for high-stakes negotiations aimed at achieving lasting regional stability.', image: null },
      { title: 'Arctic Ice Cover Reaches Lowest Recorded Extent', source: 'NSIDC', author: 'Scientists', description: 'Satellite data confirms summer sea ice is at unprecedented lows for the third consecutive year.', image: null },
      { title: 'Global Plastic Treaty Signed by 150 Nations', source: 'UNEP', author: 'UNEP Press', description: 'Nations commit to binding targets for reducing plastic production and improving waste management.', image: null },
      { title: 'Renewable Energy Surpasses Fossil Fuels in Global Electricity Generation', source: 'IEA', author: 'IEA Report', description: 'Solar and wind power collectively generate more electricity than coal and gas for the first time.', image: null },
      { title: 'Pandemic Preparedness Treaty Enters Into Force', source: 'WHO', author: 'WHO Secretariat', description: 'International agreement on early warning systems and equitable vaccine distribution officially takes effect.', image: null },
    ],
    business: [
      { title: 'Global GDP Growth Projected at 3.2% for 2026, IMF Says', source: 'IMF', author: 'IMF Economics', description: 'The International Monetary Fund revises forecast upward amid strong performance in emerging markets.', image: null },
      { title: 'Apple Reports Record $150B Quarter Driven by AI-Powered Devices', source: 'Bloomberg', author: 'Mark Gurman', description: 'Strong iPhone and services revenue propels Apple to its highest-ever quarterly earnings.', image: null },
      { title: 'Central Banks Begin Coordinated Interest Rate Cuts', source: 'Financial Times', author: 'FT Markets', description: 'The Fed, ECB, and Bank of England simultaneously reduce rates as inflation returns to target.', image: null },
      { title: 'Semiconductor Shortage Finally Eases as New Fabs Come Online', source: 'WSJ', author: 'WSJ Tech', description: 'New chip manufacturing plants in the US, Europe, and Asia begin full-scale production.', image: null },
      { title: 'Billion-Dollar Startup Unicorns Hit All-Time High Despite Market Volatility', source: 'Crunchbase', author: 'CB Insights', description: 'Over 2000 companies now hold unicorn status globally, driven by AI and clean energy investments.', image: null },
      { title: 'Amazon Expands Drone Delivery to 50 New Cities', source: 'CNBC', author: 'CNBC Retail', description: 'Prime Air service scales rapidly with regulatory approvals clearing the way for urban operations.', image: null },
      { title: 'Warren Buffett\'s Berkshire Hathaway Makes Largest Ever Tech Investment', source: 'MarketWatch', author: 'MW Reporter', description: 'The legendary investor takes a $30B stake in a leading semiconductor company.', image: null },
      { title: 'Green Bonds Market Surpasses $5 Trillion Milestone', source: 'Reuters', author: 'Climate Finance', description: 'Sustainable debt instruments reach record issuance as investors shift toward ESG priorities.', image: null },
      { title: 'Remote Work Permanently Adopted by 60% of Fortune 500 Companies', source: 'Forbes', author: 'HR Analyst', description: 'Survey data confirms hybrid and fully-remote work arrangements have become the corporate standard.', image: null },
      { title: 'Gold Hits All-Time High of $3,500 Per Ounce', source: 'Kitco', author: 'Metals Desk', description: 'Precious metal surges amid geopolitical uncertainty and central bank buying spree.', image: null },
    ],
  }
  const list = articles[category] || articles.technology
  return list.map((a, i) => ({
    id: `${category}-${i}`,
    title: a.title,
    source: a.source,
    author: a.author,
    date: new Date(Date.now() - i * 3600000).toISOString(),
    image: a.image,
    description: a.description,
    url: '#',
    category,
  }))
}

export default function NewsSection({ onDataUpdate, initialCategory, onCategoryChange }) {
  const [activeCategory, setActiveCategory] = useState(initialCategory || 'technology')
  const [articles, setArticles] = useState({})
  const [loading, setLoading] = useState({})
  const [errors, setErrors] = useState({})
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('date') // 'date' | 'source'
  const [sortDir, setSortDir] = useState('desc')

  const apiKey = import.meta.env.VITE_NEWS_API_KEY

  useEffect(() => {
    if (initialCategory && initialCategory !== activeCategory) {
      setActiveCategory(initialCategory)
    }
  }, [initialCategory])

  const handleCategoryChange = (catId) => {
    setActiveCategory(catId)
    onCategoryChange?.(catId)
  }

  const getCached = (cat) => {
    try {
      const raw = localStorage.getItem(`${NEWS_CACHE_KEY}-${cat}`)
      if (!raw) return null
      const { data, ts } = JSON.parse(raw)
      if (Date.now() - ts > CACHE_TTL_MS) return null
      return data
    } catch { return null }
  }

  const setCache = (cat, data) => {
    try {
      localStorage.setItem(`${NEWS_CACHE_KEY}-${cat}`, JSON.stringify({ data, ts: Date.now() }))
    } catch {}
  }

  const fetchCategory = useCallback(async (cat, force = false) => {
    if (!force) {
      const cached = getCached(cat)
      if (cached) {
        setArticles(prev => ({ ...prev, [cat]: cached }))
        return
      }
    }

    setLoading(prev => ({ ...prev, [cat]: true }))
    setErrors(prev => ({ ...prev, [cat]: null }))

    let fetched = null
    try {
      if (apiKey && !apiKey.includes('your_')) {
        fetched = await fetchNewsForCategory(cat, apiKey)
      } else {
        throw new Error('No API key')
      }
    } catch {
      try {
        fetched = await fetchNewsGNews(cat)
      } catch {
        fetched = getSampleArticles(cat)
        toast.info(`Showing sample ${cat} articles`, { icon: '📰' })
      }
    }

    setArticles(prev => ({ ...prev, [cat]: fetched }))
    setCache(cat, fetched)
    setLoading(prev => ({ ...prev, [cat]: false }))
    toast.success(`${cat} news loaded!`, { icon: '📰' })
  }, [apiKey])

  // Fetch all categories on mount
  useEffect(() => {
    CATEGORIES.forEach(c => fetchCategory(c.id))
  }, [])

  // Share all articles with chatbot
  useEffect(() => {
    const all = Object.values(articles).flat()
    onDataUpdate?.(all)
  }, [articles])

  const currentArticles = articles[activeCategory] || []
  const catInfo = CATEGORIES.find(c => c.id === activeCategory)

  const filtered = currentArticles
    .filter(a => {
      if (!search) return true
      const q = search.toLowerCase()
      return (
        a.title.toLowerCase().includes(q) ||
        a.source.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.author.toLowerCase().includes(q)
      )
    })
    .sort((a, b) => {
      let va = sortBy === 'date' ? new Date(a.date) : a.source.toLowerCase()
      let vb = sortBy === 'date' ? new Date(b.date) : b.source.toLowerCase()
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const toggleSort = (field) => {
    if (sortBy === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortBy(field); setSortDir('desc') }
  }

  return (
    <div className="news-section">
      {/* Category Tabs */}
      <div className="news-categories">
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            id={`news-cat-${cat.id}`}
            className={`cat-btn ${activeCategory === cat.id ? 'active' : ''} cat-${cat.color}`}
            onClick={() => handleCategoryChange(cat.id)}
          >
            <span>{cat.emoji}</span>
            <span>{cat.label}</span>
            {articles[cat.id] && (
              <span className="cat-count">{articles[cat.id].length}</span>
            )}
            {loading[cat.id] && <span className="cat-spinner" />}
          </button>
        ))}
      </div>

      {/* Toolbar */}
      <div className="news-toolbar card">
        <div className="search-wrap">
          <Search size={16} className="search-icon" />
          <input
            id="news-search"
            type="text"
            className="input"
            placeholder={`Search ${catInfo?.label} articles...`}
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ paddingLeft: 38 }}
          />
        </div>
        <div className="toolbar-actions">
          <button
            className={`btn btn-ghost btn-sm ${sortBy === 'date' ? 'sort-active' : ''}`}
            onClick={() => toggleSort('date')}
          >
            <Calendar size={14} />
            Date
            {sortBy === 'date' && (sortDir === 'asc' ? <SortAsc size={12}/> : <SortDesc size={12}/>)}
          </button>
          <button
            className={`btn btn-ghost btn-sm ${sortBy === 'source' ? 'sort-active' : ''}`}
            onClick={() => toggleSort('source')}
          >
            <Tag size={14} />
            Source
            {sortBy === 'source' && (sortDir === 'asc' ? <SortAsc size={12}/> : <SortDesc size={12}/>)}
          </button>
          <button
            id={`news-refresh-${activeCategory}`}
            className="btn btn-primary btn-sm"
            onClick={() => fetchCategory(activeCategory, true)}
            disabled={loading[activeCategory]}
          >
            <RefreshCw size={14} className={loading[activeCategory] ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Articles Grid */}
      {errors[activeCategory] && (
        <div className="error-state card">
          <div className="error-icon">⚠️</div>
          <h3>Failed to load articles</h3>
          <p>{errors[activeCategory]}</p>
          <button className="btn btn-primary" style={{ marginTop: 12 }} onClick={() => fetchCategory(activeCategory, true)}>
            Retry
          </button>
        </div>
      )}

      {loading[activeCategory] && currentArticles.length === 0 ? (
        <div className="articles-grid">
          {Array.from({ length: 6 }).map((_, i) => <ArticleSkeleton key={i} />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="error-state card">
          <div className="error-icon">🔍</div>
          <h3>No articles found</h3>
          <p>Try a different search term.</p>
        </div>
      ) : (
        <div className="articles-grid">
          {filtered.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="news-footer">
          Showing {filtered.length} of {currentArticles.length} articles
          {search && <span> matching "<strong>{search}</strong>"</span>}
          <span className="cache-note">· Cached for 15 min</span>
        </div>
      )}
    </div>
  )
}

function ArticleCard({ article }) {
  const [imgError, setImgError] = useState(false)
  const formattedDate = article.date
    ? new Date(article.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : 'Recently'

  return (
    <article className="article-card card">
      <div className="article-img-wrap">
        {article.image && !imgError ? (
          <img
            src={article.image}
            alt={article.title}
            className="article-img"
            onError={() => setImgError(true)}
          />
        ) : (
          <div className="article-img-placeholder">
            <span>{getCategoryEmoji(article.category)}</span>
          </div>
        )}
        <div className="article-category-badge">{article.category}</div>
      </div>
      <div className="article-body">
        <h3 className="article-title">{article.title}</h3>
        <p className="article-desc">{article.description}</p>
        <div className="article-meta">
          <div className="meta-row">
            <Tag size={12} />
            <span>{article.source}</span>
          </div>
          <div className="meta-row">
            <User size={12} />
            <span>{article.author !== 'Unknown' ? article.author : article.source}</span>
          </div>
          <div className="meta-row">
            <Calendar size={12} />
            <span>{formattedDate}</span>
          </div>
        </div>
        <a
          href={article.url !== '#' ? article.url : undefined}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary btn-sm read-more-btn"
          onClick={e => { if (article.url === '#') e.preventDefault() }}
        >
          Read More
          <ExternalLink size={12} />
        </a>
      </div>
    </article>
  )
}

function ArticleSkeleton() {
  return (
    <div className="article-card card">
      <div className="skeleton" style={{ height: 180, borderRadius: 10, marginBottom: 14 }} />
      <div className="skeleton" style={{ height: 20, marginBottom: 8 }} />
      <div className="skeleton" style={{ height: 20, width: '70%', marginBottom: 12 }} />
      <div className="skeleton" style={{ height: 14, marginBottom: 6 }} />
      <div className="skeleton" style={{ height: 14, width: '80%', marginBottom: 16 }} />
      <div className="skeleton" style={{ height: 34, width: 110 }} />
    </div>
  )
}

function getCategoryEmoji(cat) {
  const map = { technology: '💻', science: '🔬', space: '🚀', world: '🌍', business: '📈' }
  return map[cat] || '📰'
}
