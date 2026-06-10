import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../App'
import { api } from '../api'

export default function Dashboard() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [children, setChildren] = useState([]);
  const [selectedChild, setSelectedChild] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerSeconds, setTimerSeconds] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (selectedChild) {
      loadChildToday(selectedChild.id);
    }
  }, [selectedChild]);

  // Timer effect
  useEffect(() => {
    let interval;
    if (timerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((s) => s + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [timerRunning]);

  const loadData = async () => {
    try {
      const data = await api.getChildren();
      setChildren(data.children);
      if (data.children.length > 0) {
        setSelectedChild(data.children[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadChildToday = async (childId) => {
    try {
      const data = await api.getChildToday(childId);
      setTodayData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleComplete = async (choreId) => {
    if (!selectedChild) return;
    try {
      await api.completeChore(selectedChild.id, choreId);
      loadChildToday(selectedChild.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUncomplete = async (choreId) => {
    if (!selectedChild) return;
    try {
      await api.uncompleteChore(selectedChild.id, choreId);
      loadChildToday(selectedChild.id);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpgrade = async () => {
    try {
      await api.upgrade();
      const me = await api.me();
      setUser(me.user);
    } catch (err) {
      alert(err.message);
    }
  };

  const startTimer = () => {
    setTimerSeconds(0);
    setTimerRunning(true);
  };

  const stopTimer = async () => {
    setTimerRunning(false);
    if (timerSeconds >= 60 && selectedChild) {
      const minutes = Math.floor(timerSeconds / 60);
      // Round down to nearest minute
      try {
        await api.useTime(selectedChild.id, minutes);
        loadChildToday(selectedChild.id);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const formatTime = (totalSeconds) => {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return <div className="app-loading"><div className="spinner">⭐</div><p>Loading dashboard...</p></div>;
  }

  return (
    <div className="dashboard">
      <h2>👋 Welcome, {user.name}!</h2>
      <p className="welcome">
        {user.is_paid ? <span className="paid-badge">PAID</span> : <span className="free-badge">FREE TIER</span>}
        {'  '}
        {!user.is_paid && children.length > 1 && 'Upgrade to add more children and chores!'}
      </p>

      {/* Not paid - show plan options */}
      {!user.is_paid && (
        <div className="plans">
          <div className="plan-card current">
            <h3>🌟 Free</h3>
            <p>$0</p>
            <ul>
              <li>✓ 1 child OR 3 chores</li>
              <li>✓ Daily chore tracking</li>
              <li>✓ Screen time timer</li>
            </ul>
            <span className="free-badge">Current</span>
          </div>
          <div className="plan-card">
            <h3>🚀 Family</h3>
            <div className="price">$4.99<span style={{fontSize:'1rem', fontWeight:400}}>/mo</span></div>
            <ul>
              <li>✓ Unlimited children</li>
              <li>✓ Unlimited chores</li>
              <li>✓ Nanny access</li>
              <li>✓ Priority support</li>
            </ul>
            <button className="btn btn-primary" onClick={handleUpgrade}>Upgrade Now</button>
          </div>
        </div>
      )}

      {/* Children selector or empty state */}
      {children.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">👶</div>
          <h3>Add your first child!</h3>
          <p>Go to the Children tab to get started.</p>
          <button className="btn btn-primary" style={{marginTop:'1rem'}} onClick={() => navigate('/children')}>
            Add Children
          </button>
        </div>
      ) : (
        <>
          {/* Child selector */}
          <div className="child-grid" style={{marginBottom:'1.5rem'}}>
            {children.map((child) => (
              <div
                key={child.id}
                className={`child-card ${selectedChild?.id === child.id ? 'selected' : ''}`}
                onClick={() => setSelectedChild(child)}
                style={selectedChild?.id === child.id ? {border: '3px solid var(--primary)'} : {}}
              >
                <div className="avatar">{child.avatar === 'star' ? '⭐' : child.avatar === 'rocket' ? '🚀' : child.avatar === 'unicorn' ? '🦄' : '⭐'}</div>
                <div className="name">{child.name}</div>
              </div>
            ))}
          </div>

          {/* Today's data for selected child */}
          {todayData && (
            <>
              <div className="balance-card">
                <div className="balance-label">Screen Time Balance</div>
                <div className="balance-number">{todayData.balance} min</div>
                <div className="today-earned">
                  ✨ Earned today: {todayData.today_earned} min &middot; Used today: {todayData.minutes_used_today} min
                </div>
              </div>

              {/* Timer */}
              <div className="card timer-section">
                <h3 className="card-title">⏱️ Screen Time Timer</h3>
                <div className="timer-display">{formatTime(timerSeconds)}</div>
                <div className="timer-controls">
                  {!timerRunning ? (
                    <button className="timer-btn start" onClick={startTimer}>▶ Start Timer</button>
                  ) : (
                    <button className="timer-btn stop" onClick={stopTimer}>⏹ Stop & Log</button>
                  )}
                  <button className="timer-btn reset" onClick={() => { setTimerRunning(false); setTimerSeconds(0); }}>
                    ↺ Reset
                  </button>
                </div>
              </div>

              {/* Today's chores */}
              <div className="card">
                <h3 className="card-title">📋 Today's Chores for {selectedChild?.name}</h3>
                {todayData.chores.length === 0 ? (
                  <div className="empty-state">
                    <div className="icon">🧹</div>
                    <p>No chores yet! Add some in the Chores tab.</p>
                  </div>
                ) : (
                  <div className="chore-list">
                    {todayData.chores.map((chore) => (
                      <div key={chore.id} className={`chore-item ${chore.completed ? 'completed' : ''}`}>
                        <div className="chore-info">
                          <span className="chore-icon">{chore.icon || '🧹'}</span>
                          <span className="chore-name">{chore.name}</span>
                          <span className={`chore-value ${chore.completed ? 'earned' : ''}`}>
                            {chore.minute_value} min
                          </span>
                        </div>
                        {chore.completed ? (
                          <button className="btn btn-sm btn-outline" onClick={() => handleUncomplete(chore.id)}>
                            ✓ Done
                          </button>
                        ) : (
                          <button className="btn btn-sm btn-success" onClick={() => handleComplete(chore.id)}>
                            ✓ Check Off
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}