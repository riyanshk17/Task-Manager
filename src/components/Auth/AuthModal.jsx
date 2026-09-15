import React, { useState } from 'react';
import { Layers, Mail, Lock, User, ArrowRight, Sun, Moon, KeyRound } from 'lucide-react';
import { OtpVerification } from './OtpVerification';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const AuthModal = ({ onLoginSuccess, showToast, theme, onToggleTheme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showOtpScreen, setShowOtpScreen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  
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
      // Sign Up Flow: Send OTP first
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            type: 'signup'
          })
        });

        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
          showToast(data.error || 'Failed to send verification code.', 'error');
          return;
        }

        showToast(`Verification code sent to ${email.trim()}!`, 'success');
        setShowOtpScreen(true);
      } catch (err) {
        setLoading(false);
        showToast('Unable to connect to server. Ensure backend is running.', 'error');
      }
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

        {showOtpScreen ? (
          <OtpVerification 
            email={email.trim()}
            name={name.trim()}
            password={password}
            type="signup"
            onVerifySuccess={(user, userTeams) => onLoginSuccess(user, userTeams)}
            onBackToEmail={() => setShowOtpScreen(false)}
            showToast={showToast}
          />
        ) : (
          <>
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
                onClick={() => {
                  setIsLogin(true);
                  setShowOtpScreen(false);
                }}
              >
                Sign In
              </button>
              <button 
                type="button"
                className={`auth-tab ${!isLogin ? 'active' : ''}`}
                onClick={() => {
                  setIsLogin(false);
                  setShowOtpScreen(false);
                }}
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                  <label className="form-label" style={{ marginBottom: 0 }}>Password</label>
                  {isLogin && (
                    <button 
                      type="button" 
                      onClick={() => setIsForgotPasswordOpen(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                    >
                      <KeyRound size={13} />
                      <span>Forgot Password?</span>
                    </button>
                  )}
                </div>
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
                {loading ? (isLogin ? 'Signing In...' : 'Sending Code...') : (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                    {isLogin ? 'Sign In to Account' : 'Send Verification Code'} <ArrowRight size={18} />
                  </span>
                )}
              </button>
            </form>
          </>
        )}

        <ForgotPasswordModal
          isOpen={isForgotPasswordOpen}
          onClose={() => setIsForgotPasswordOpen(false)}
          onLoginSuccess={onLoginSuccess}
          showToast={showToast}
        />
      </div>
    </div>
  );
};

