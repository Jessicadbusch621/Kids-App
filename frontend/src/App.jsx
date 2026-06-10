import React, { useState, useEffect, createContext, useContext } from 'react'
import { Routes, Route, Link, Navigate, useNavigate } from 'react-router-dom'
import { api } from './api'
import Login from './pages/Login'
import Signup from './pages/Signup'
import Dashboard from './pages/Dashboard'
import ChildView from './pages/ChildView'
import ChildLogin from './pages/ChildLogin'
import ChoreManager from './pages/ChoreManager'
import ChildrenManager from './pages/ChildrenManager'

export const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    api.me()
      .then((data) => setUser(data.user))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = async (email, password) => {
    const data = await api.login({ email, password });
    setUser(data.user);
    return data;
  };

  const signup = async (name, email, password) => {
    const data = await api.signup({ name, email, password });
    setUser(data.user);
    return data;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="app-loading">
        <div className="spinner">⭐</div>
        <p>Loading TidyTime...</p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, setUser }}>
      <div className="app">
        {user && (
          <nav className="nav">
            <div className="nav-brand">
              <Link to="/">✨ TidyTime</Link>
            </div>
            <div className="nav-links">
              <Link to="/">Dashboard</Link>
              <Link to="/children">Children</Link>
              <Link to="/chores">Chores</Link>
              <span className="nav-user">{user.name}</span>
              <button onClick={logout} className="btn btn-sm">Logout</button>
            </div>
          </nav>
        )}
        <main className="main">
          <Routes>
            <Route path="/login" element={user ? <Navigate to="/" /> : <Login />} />
            <Route path="/signup" element={user ? <Navigate to="/" /> : <Signup />} />
            <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
            <Route path="/children" element={user ? <ChildrenManager /> : <Navigate to="/login" />} />
            <Route path="/chores" element={user ? <ChoreManager /> : <Navigate to="/login" />} />
            <Route path="/child" element={<ChildLogin />} />
            <Route path="/child/:id" element={<ChildView />} />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
  );
}

export default App;
