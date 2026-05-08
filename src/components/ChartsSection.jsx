import { useEffect, useRef, useState } from 'react'
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
} from 'chart.js'
import { Line, Doughnut } from 'react-chartjs-2'
import { TrendingUp, PieChart, Info } from 'lucide-react'
import './ChartsSection.css'

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  ArcElement, Tooltip, Legend, Filler
)

const CAT_COLORS = {
  technology: '#3b82f6',
  science: '#06b6d4',
  space: '#8b5cf6',
  world: '#10b981',
  business: '#f59e0b',
}

export default function ChartsSection({ issData, newsData, onChartClick }) {
  const [speedHistory, setSpeedHistory] = useState([])
  const [tick, setTick] = useState(0)

  // Build speed history from ISS updates
  useEffect(() => {
    if (issData?.speed) {
      setSpeedHistory(prev => {
        const entry = {
          time: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
          speed: issData.speed,
        }
        return [...prev, entry].slice(-30)
      })
    }
  }, [issData])

  // Simulate speed history if no real data yet
  useEffect(() => {
    if (speedHistory.length === 0) {
      const now = Date.now()
      const fake = Array.from({ length: 20 }, (_, i) => ({
        time: new Date(now - (19 - i) * 15000).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        speed: Math.round(27000 + Math.sin(i * 0.5) * 800 + Math.random() * 300),
      }))
      setSpeedHistory(fake)
    }
  }, [])

  // News distribution
  const catCounts = {}
  if (Array.isArray(newsData)) {
    newsData.forEach(a => {
      if (a.category) catCounts[a.category] = (catCounts[a.category] || 0) + 1
    })
  }
  if (Object.keys(catCounts).length === 0) {
    Object.assign(catCounts, { technology: 10, science: 10, space: 10, world: 10, business: 10 })
  }

  // Speed line chart data
  const speedChartData = {
    labels: speedHistory.map(s => s.time),
    datasets: [{
      label: 'ISS Speed (km/h)',
      data: speedHistory.map(s => s.speed),
      borderColor: '#3b82f6',
      backgroundColor: 'rgba(59,130,246,0.1)',
      pointBackgroundColor: '#3b82f6',
      pointRadius: 3,
      pointHoverRadius: 6,
      borderWidth: 2.5,
      tension: 0.4,
      fill: true,
    }],
  }

  const speedChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: 'rgba(13,17,23,0.95)',
        borderColor: 'rgba(59,130,246,0.3)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: ctx => ` ${ctx.raw.toLocaleString()} km/h`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#8892a4', maxTicksLimit: 8, font: { size: 11 } },
      },
      y: {
        grid: { color: 'rgba(255,255,255,0.04)' },
        ticks: { color: '#8892a4', font: { size: 11 }, callback: v => v.toLocaleString() },
        min: 24000,
        max: 30000,
      },
    },
  }

  // Doughnut chart data
  const cats = Object.keys(catCounts)
  const doughnutData = {
    labels: cats.map(c => c.charAt(0).toUpperCase() + c.slice(1)),
    datasets: [{
      data: cats.map(c => catCounts[c]),
      backgroundColor: cats.map(c => CAT_COLORS[c] || '#6b7280'),
      borderColor: cats.map(c => (CAT_COLORS[c] || '#6b7280') + '66'),
      borderWidth: 2,
      hoverOffset: 8,
    }],
  }

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          color: '#8892a4',
          padding: 16,
          font: { size: 12 },
          usePointStyle: true,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(13,17,23,0.95)',
        borderColor: 'rgba(255,255,255,0.1)',
        borderWidth: 1,
        padding: 12,
        callbacks: {
          label: ctx => ` ${ctx.label}: ${ctx.raw} articles`,
        },
      },
    },
    cutout: '65%',
    onClick: (event, elements) => {
      if (elements.length > 0) {
        const index = elements[0].index;
        const category = cats[index];
        onChartClick?.(category);
      }
    }
  }

  const currentSpeed = issData?.speed || (speedHistory.length > 0 ? speedHistory[speedHistory.length - 1]?.speed : 27600)
  const avgSpeed = speedHistory.length > 0 ? Math.round(speedHistory.reduce((s, e) => s + e.speed, 0) / speedHistory.length) : 27600
  const maxSpeed = speedHistory.length > 0 ? Math.max(...speedHistory.map(e => e.speed)) : 27600
  const totalArticles = Object.values(catCounts).reduce((s, v) => s + v, 0)

  return (
    <div className="charts-section">
      {/* Speed Stats Bar */}
      <div className="speed-stats-bar">
        <SpeedStat label="Current Speed" value={`${(currentSpeed || 0).toLocaleString()} km/h`} color="blue" />
        <SpeedStat label="Average Speed" value={`${avgSpeed.toLocaleString()} km/h`} color="cyan" />
        <SpeedStat label="Peak Speed" value={`${maxSpeed.toLocaleString()} km/h`} color="purple" />
        <SpeedStat label="Data Points" value={speedHistory.length} color="green" />
        <SpeedStat label="Total Articles" value={totalArticles} color="orange" />
      </div>

      {/* Charts Row */}
      <div className="charts-row">
        {/* Line Chart */}
        <div className="chart-card card">
          <div className="section-header">
            <div className="section-title">
              <span className="icon" style={{ background: 'rgba(59,130,246,0.15)' }}>
                <TrendingUp size={18} color="#3b82f6" />
              </span>
              ISS Speed Over Time
            </div>
            <span className="badge badge-blue">Last 30 readings</span>
          </div>
          <div className="chart-note">
            <Info size={12} />
            ISS orbits Earth at ~27,600 km/h — variations occur due to orbital mechanics
          </div>
          <div className="chart-canvas-wrap" style={{ height: 320 }}>
            {speedHistory.length > 0 ? (
              <Line data={speedChartData} options={speedChartOptions} />
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)' }}>
                Collecting speed data...
              </div>
            )}
          </div>
        </div>

        {/* Doughnut Chart */}
        <div className="chart-card card">
          <div className="section-header">
            <div className="section-title">
              <span className="icon" style={{ background: 'rgba(139,92,246,0.15)' }}>
                <PieChart size={18} color="#8b5cf6" />
              </span>
              News Distribution
            </div>
            <span className="badge badge-purple">{totalArticles} articles</span>
          </div>
          <div className="chart-note">
            <Info size={12} />
            Click a slice to filter articles by category
          </div>
          <div className="chart-canvas-wrap" style={{ height: 280 }}>
            <Doughnut data={doughnutData} options={doughnutOptions} />
          </div>
          {/* Legend */}
          <div className="donut-legend">
            {cats.map(cat => (
              <div key={cat} className="donut-legend-item">
                <div className="donut-legend-dot" style={{ background: CAT_COLORS[cat] }} />
                <span className="donut-legend-label">{cat.charAt(0).toUpperCase() + cat.slice(1)}</span>
                <span className="donut-legend-count">{catCounts[cat]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ISS Info Card */}
      <div className="card iss-info-card">
        <div className="section-title" style={{ marginBottom: 16 }}>
          <span className="icon" style={{ background: 'rgba(6,182,212,0.15)' }}>🛸</span>
          ISS Live Stats
        </div>
        <div className="iss-info-grid">
          <InfoItem label="Current Latitude" value={issData ? `${issData.lat?.toFixed(4)}°` : 'Fetching...'} />
          <InfoItem label="Current Longitude" value={issData ? `${issData.lng?.toFixed(4)}°` : 'Fetching...'} />
          <InfoItem label="Orbital Speed" value={`~${(currentSpeed || 27600).toLocaleString()} km/h`} />
          <InfoItem label="Altitude" value="~408 km" />
          <InfoItem label="Orbital Period" value="~92 minutes" />
          <InfoItem label="Orbits Per Day" value="~15.5" />
          <InfoItem label="Over Location" value={issData?.location || 'Calculating...'} />
          <InfoItem label="Data Updates" value="Every 15 seconds" />
        </div>
      </div>
    </div>
  )
}

function SpeedStat({ label, value, color }) {
  const colors = {
    blue: '#3b82f6', cyan: '#06b6d4', purple: '#8b5cf6', green: '#10b981', orange: '#f59e0b',
  }
  return (
    <div className="speed-stat-item card">
      <div className="stat-label">{label}</div>
      <div className="stat-value" style={{ color: colors[color], fontSize: 22 }}>{value}</div>
    </div>
  )
}

function InfoItem({ label, value }) {
  return (
    <div className="info-item">
      <div className="info-label">{label}</div>
      <div className="info-value">{value}</div>
    </div>
  )
}
