import React, { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from '../api'

export default function ChildView() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    loadData();
  }, [id]);

  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => setTimerSeconds(s => s + 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const loadData = async () => {
    try {
      const result = await api.childView(id);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (s) => {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner">⭐</div>
        <p>Loading your chores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auth-page">
        <div className="card auth-card">
          <h1>😢 Oops!</h1>
          <p>{error}</p>
          <Link to="/child" className="btn btn-primary" style={{marginTop:'1rem', display:'inline-block'}}>
            Try Again
          </Link>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const emojiMap = { 'star': '⭐', 'rocket': '🚀', 'unicorn': '🦄', 'dinosaur': '🦖', 'pizza': '🍕' };
  const avatar = emojiMap[data.child.avatar] || '⭐';

  return (
    <div className="child-view">
      <div className="hero">
        <div className="avatar">{avatar}</div>
        <h1>Hey {data.child.name}! 👋</h1>
      </div>

      {/* Balance */}
      <div className="balance-card">
        <div className="balance-label">Your Screen Time</div>
        <div className="balance-number">{data.balance} ⏱️</div>
        <div className="today-earned">
          Earned today: {data.today_earned} min • Used: {data.minutes_used_today} min
        </div>
      </div>

      {/* Timer */}
      <div className="card timer-section">
        <h3 className="card-title">⏱️ Timer</h3>
        <div className="timer-display">{formatTime(timerSeconds)}</div>
        <div className="timer-controls">
          {!timerRunning ? (
            <button className="timer-btn start" onClick={() => { setTimerSeconds(0); setTimerRunning(true); }}>
              ▶ Start
            </button>
          ) : (
            <button className="timer-btn stop" onClick={() => { setTimerRunning(false); setTimerSeconds(0); }}>
              ⏹ Stop
            </button>
          )}
          <button className="timer-btn reset" onClick={() => { setTimerRunning(false); setTimerSeconds(0); }}>
            ↺ Reset
          </button>
        </div>
      </div>

      {/* Chores */}
      <div className="card">
        <h3 className="card-title">📋 Today's Chores</h3>
        {data.chores.length === 0 ? (
          <div className="empty-state">
            <div className="icon">🧹</div>
            <p>No chores for today! 🎉</p>
          </div>
        ) : (
          <div className="chore-list">
            {data.chores.map((chore) => (
              <div key={chore.id} className={`chore-item ${chore.completed ? 'completed' : ''}`}>
                <div className="chore-info">
                  <span className="chore-icon">{chore.icon || '🧹'}</span>
                  <span className="chore-name">{chore.name}</span>
                  <span className={`chore-value ${chore.completed ? 'earned' : ''}`}>
                    {chore.minute_value} min
                  </span>
                </div>
                {chore.completed ? (
                  <span style={{color: 'var(--success)', fontWeight: 700}}>✅ Done!</span>
                ) : (
                  <span style={{color: 'var(--text-light)'}}>⏳ Not done yet</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}