import React, { useState, useEffect } from 'react'
import { api } from '../api'

export default function ChoreManager() {
  const [chores, setChores] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newMinutes, setNewMinutes] = useState(5);
  const [newIcon, setNewIcon] = useState('🧹');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadChores(); }, []);

  const loadChores = async () => {
    try {
      const data = await api.getChores();
      setChores(data.chores);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.addChore({ name: newName, description: newDesc, minute_value: parseInt(newMinutes), icon: newIcon });
      setNewName('');
      setNewDesc('');
      setNewMinutes(5);
      setShowAdd(false);
      loadChores();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this chore?')) return;
    try {
      await api.deleteChore(id);
      loadChores();
    } catch (err) {
      alert(err.message);
    }
  };

  const iconOptions = ['🧹', '🧺', '🛏️', '🪥', '🍽️', '📚', '🧸', '👟', '💧', '🌱', '🐕', '🚮'];

  return (
    <div>
      <div className="manage-header">
        <h2>🧹 Chores</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '✕ Cancel' : '+ Add Chore'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{marginBottom:'1.5rem'}}>
          <h3 className="card-title">Create a Chore</h3>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Chore Name</label>
              <input
                type="text"
                className="form-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="e.g. Make bed"
              />
            </div>
            <div className="form-group">
              <label>Description (optional)</label>
              <input
                type="text"
                className="form-input"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="e.g. Fold blanket and arrange pillows"
              />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Screen Time Reward</label>
                <div style={{display:'flex', alignItems:'center', gap:'0.5rem'}}>
                  <input
                    type="number"
                    className="form-input"
                    value={newMinutes}
                    onChange={(e) => setNewMinutes(e.target.value)}
                    min="1"
                    max="60"
                    required
                  />
                  <span style={{fontWeight:600}}>minutes</span>
                </div>
              </div>
              <div className="form-group">
                <label>Icon</label>
                <div style={{display:'flex', gap:'0.3rem', flexWrap:'wrap'}}>
                  {iconOptions.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewIcon(icon)}
                      style={{
                        padding:'0.4rem 0.5rem',
                        fontSize:'1.3rem',
                        border: newIcon === icon ? '3px solid var(--primary)' : '2px solid #e0e0e0',
                        borderRadius:'8px',
                        background:'var(--card)',
                        cursor:'pointer'
                      }}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn btn-primary">Create Chore</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="app-loading"><div className="spinner">⭐</div><p>Loading...</p></div>
      ) : chores.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">🧹</div>
          <h3>No chores yet</h3>
          <p>Create chores that your kids can earn screen time with!</p>
        </div>
      ) : (
        <div>
          {chores.map((chore) => (
            <div key={chore.id} className="item-row">
              <div className="item-info">
                <span style={{fontSize:'1.3rem'}}>{chore.icon || '🧹'}</span>
                <span style={{fontWeight:600}}>{chore.name}</span>
                {chore.description && (
                  <span style={{color:'var(--text-light)', fontSize:'0.85rem'}}>{chore.description}</span>
                )}
                <span className="chore-value" style={{marginLeft:'0.5rem'}}>
                  {chore.minute_value} min
                </span>
              </div>
              <div className="item-actions">
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(chore.id)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
