import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api'

export default function ChildLogin() {
  const navigate = useNavigate();
  const [childId, setChildId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const data = await api.childLogin(parseInt(childId), pin);
      navigate(`/child/${data.child.id}`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="auth-page">
      <div className="card auth-card">
        <h1>👶 Child Login</h1>
        <p className="subtitle">Enter your PIN to see your chores</p>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your ID Number</label>
            <input
              type="number"
              className="form-input"
              value={childId}
              onChange={(e) => setChildId(e.target.value)}
              required
              placeholder="Ask your parent for your ID"
            />
          </div>
          <div className="form-group">
            <label>Your Secret PIN</label>
            <input
              type="password"
              className="form-input"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              required
              maxLength={6}
              placeholder="••••"
              inputMode="numeric"
              pattern="[0-9]*"
            />
          </div>
          <button type="submit" className="btn btn-secondary" style={{ width: '100%' }}>
            🔓 Let me in!
          </button>
        </form>
      </div>
    </div>
  );
}