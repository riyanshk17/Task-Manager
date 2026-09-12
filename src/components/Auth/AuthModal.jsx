import React, { useState } from 'react';
import { Layers, Mail, Lock, User, ArrowRight, ShieldCheck, Sun, Moon } from 'lucide-react';

export const AuthModal = ({ onLoginSuccess, showToast, theme, onToggleTheme }) => {
  const [isLogin, setIsLogin] = useState(true);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || (!isLogin && !name) || !password) {
      showToast('Please fill out all required fields.', 'error');
      return;
    }

    setLoading(true);

    if (isLogin) {
      // Direct Password Login
      try {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim(), password })
        });

        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
          showToast(data.error || 'Authentication failed. Please check credentials.', 'error');
          return;
        }

        showToast(`Welcome back, ${data.user.name}!`, 'success');
        onLoginSuccess(data.user, data.userTeams || []);
      } catch (err) {
        setLoading(false);
        showToast('Unable to connect to server. Ensure backend is running.', 'error');
      }
    } else {
      // Direct Sign Up Flow
      try {
        const res = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            password
          })
        });

        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
          showToast(data.error || 'Registration failed. Please try again.', 'error');
          return;
        }

        showToast(`Account registered successfully! Welcome ${data.user.name}.`, 'success');
        onLoginSuccess(data.user, data.userTeams || []);
      } catch (err) {
        setLoading(false);
        showToast('Unable to connect to server. Ensure backend is running.', 'error');
      }
    }
  };

  // Quick 1-Click Developer Login Demo Helper
  const handleDeveloperQuickLogin = async () => {
    setEmail('malviyariyansh11@gmail.com');
    setPassword('@Java8109');
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'malviyariyansh11@gmail.com', password: '@Java8109' })
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        showToast(`Logged in as Developer ${data.user.name}`, 'success');
        onLoginSuccess(data.user, data.userTeams || []);
      } else {
        showToast(data.error || 'Developer login failed.', 'error');
      }
    } catch (err) {
      setLoading(false);
      showToast('Error connecting to backend.', 'error');
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="glass-panel auth-card" style={{ position: 'relative' }}>
        {onToggleTheme && (
          <button 
            onClick={onToggleTheme} 
            className="theme-toggle-btn"
            style={{ position: 'absolute', top: 16, right: 16 }}
            title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        )}

        <div className="auth-header">
          <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: 52, height: 52 }}>
            <Layers size={28} />
          </div>
          <h2>TaskMaster Pro</h2>
          <div className="live-indicator" style={{ marginTop: '0.4rem' }}>
            <div className="live-dot" />
            <span>STUDY & TEAM WORKSPACE HUB</span>
          </div>
        </div>

        <div className="auth-tabs">
          <button 
            type="button"
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(true)}
          >
            Sign In
          </button>
          <button 
            type="button"
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => setIsLogin(false)}
          >
            Register Account
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <User size={16} className="search-icon" />
                <input 
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder="e.g. Sarah Jenkins"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required={!isLogin}
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} className="search-icon" />
              <input 
                type="email"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <Lock size={16} className="search-icon" />
              <input 
                type="password"
                className="form-input"
                style={{ paddingLeft: '2.4rem' }}
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
            </div>
          </div>

          <button 
            type="submit" 
            className="btn btn-primary"
            style={{ width: '100%', marginTop: '0.5rem', padding: '0.85rem' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                {isLogin ? 'Sign In to Account' : 'Create Member Account'} <ArrowRight size={18} />
              </span>
            )}
          </button>
        </form>

        <div className="quick-demo-box">
          <div className="quick-demo-title">Fast 1-Click Access</div>
          <button 
            type="button"
            className="btn btn-secondary"
            onClick={handleDeveloperQuickLogin}
            disabled={loading}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(99, 102, 241, 0.15)', borderColor: 'rgba(99, 102, 241, 0.3)', color: '#818cf8', fontWeight: 600 }}
          >
            <ShieldCheck size={16} /> Sign In as Developer (Riyansh)
          </button>
        </div>
      </div>
    </div>
  );
};
