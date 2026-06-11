import React, { useState, useEffect } from 'react'
import { api } from '../api'

export default function ChildrenManager() {
  const [children, setChildren] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newAvatar, setNewAvatar] = useState('star');
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadChildren(); }, []);

  const loadChildren = async () => {
    try {
      const data = await api.getChildren();
      setChildren(data.children);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await api.addChild({ name: newName, pin: newPin, avatar: newAvatar });
      setNewName('');
      setNewPin('');
      setShowAdd(false);
      loadChildren();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this child and all their data?')) return;
    try {
      await api.deleteChild(id);
      loadChildren();
    } catch (err) {
      alert(err.message);
    }
  };

  const avatars = [
    { value: 'star', emoji: '⭐' },
    { value: 'rocket', emoji: '🚀' },
    { value: 'unicorn', emoji: '🦄' },
    { value: 'dinosaur', emoji: '🦖' },
    { value: 'pizza', emoji: '🍕' },
    { value: 'cat', emoji: '🐱' },
    { value: 'dog', emoji: '🐶' },
    { value: 'robot', emoji: '🤖' },
  ];

  return (
    <div>
      <div className="manage-header">
        <h2>👶 Children</h2>
        <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? '✕ Cancel' : '+ Add Child'}
        </button>
      </div>

      {showAdd && (
        <div className="card" style={{marginBottom:'1.5rem'}}>
          <h3 className="card-title">Add a Child</h3>
          <form onSubmit={handleAdd}>
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                className="form-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                required
                placeholder="Child's name"
              />
            </div>
            <div className="form-group">
              <label>PIN (4 digits for child login)</label>
              <input
                type="text"
                className="form-input"
                value={newPin}
                onChange={(e) => setNewPin(e.target.value)}
                maxLength={4}
                placeholder="e.g. 1234"
                inputMode="numeric"
                pattern="[0-9]*"
              />
            </div>
            <div className="form-group">
              <label>Avatar</label>
              <div style={{display:'flex', gap:'0.5rem', flexWrap:'wrap'}}>
                {avatars.map((a) => (
                  <button
                    key={a.value}
                    type="button"
                    onClick={() => setNewAvatar(a.value)}
                    style={{
                      padding:'0.5rem',
                      fontSize:'1.5rem',
                      border: newAvatar === a.value ? '3px solid var(--primary)' : '2px solid #e0e0e0',
                      borderRadius:'10px',
                      background:'var(--card)',
                      cursor:'pointer'
                    }}
                  >
                    {a.emoji}
                  </button>
                ))}
              </div>
            </div>
            <div className="modal-actions">
              <button type="submit" className="btn btn-primary">Add Child</button>
              <button type="button" className="btn btn-outline" onClick={() => setShowAdd(false)}>Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="app-loading"><div className="spinner">⭐</div><p>Loading...</p></div>
      ) : children.length === 0 ? (
        <div className="card empty-state">
          <div className="icon">👶</div>
          <h3>No children yet</h3>
          <p>Add your first child to start tracking chores!</p>
        </div>
      ) : (
        <div>
          {children.map((child) => {
            const avatar = avatars.find(a => a.value === child.avatar) || avatars[0];
            return (
              <div key={child.id} className="item-row">
                <div className="item-info">
                  <span style={{fontSize:'1.5rem'}}>{avatar.emoji}</span>
                  <span style={{fontWeight:600}}>{child.name}</span>
                  {child.pin && <span style={{color:'var(--text-light)',fontSize:'0.85rem'}}>PIN: {child.pin}</span>}
                </div>
                <div className="item-actions">
                  <button className="btn btn-sm btn-danger" onClick={() => handleDelete(child.id)}>
                    Remove
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
