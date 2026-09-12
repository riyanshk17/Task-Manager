import React, { useState } from 'react';
import { Layers, Mail, Lock, User, ArrowRight, Zap, Shield, UserCheck, Sun, Moon, KeyRound } from 'lucide-react';
import { OtpVerification } from './OtpVerification';
import { ForgotPasswordModal } from './ForgotPasswordModal';

export const AuthModal = ({ onLoginSuccess, showToast, theme, onToggleTheme }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [showOtpStep, setShowOtpStep] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [defaultRole, setDefaultRole] = useState('manager');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || (!isLogin && !name) || (isLogin && !password)) {
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
          showToast(data.error || 'Authentication failed. Please check your credentials.', 'error');
          return;
        }

        showToast(`Welcome back, ${data.user.name}!`, 'success');
        onLoginSuccess(data.user, data.userTeams || []);
      } catch (err) {
        setLoading(false);
        showToast('Unable to connect to server. Ensure backend is running.', 'error');
      }
    } else {
      // Signup Flow: Request OTP Verification Code
      try {
        const res = await fetch('/api/auth/send-otp', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: email.trim(),
            type: 'signup',
            name: name.trim()
          })
        });

        const data = await res.json();
        setLoading(false);

        if (!res.ok) {
          showToast(data.error || 'Could not send verification code.', 'error');
          return;
        }

        showToast(data.message || 'Verification code sent to your email!', 'info');
        setShowOtpStep(true); // Transition to 6-digit OTP verification screen
      } catch (err) {
        setLoading(false);
        showToast('Unable to connect to server. Ensure backend is running.', 'error');
      }
    }
  };

  // Quick 1-Click Demo Login
  const handleQuickDemo = async (demoEmail, demoPassword) => {
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: demoEmail, password: demoPassword })
      });
      const data = await res.json();
      setLoading(false);
      if (res.ok) {
        showToast(`Logged in as ${data.user.name}`, 'success');
        onLoginSuccess(data.user, data.userTeams || []);
      } else {
        showToast(data.error || 'Demo login failed.', 'error');
      }
    } catch (err) {
      setLoading(false);
      showToast('Error executing demo login.', 'error');
    }
  };

  return (
    <>
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

          {showOtpStep ? (
            <OtpVerification
              email={email}
              name={name}
              password={password}
              defaultRole={defaultRole}
              type="signup"
              onVerifySuccess={(userData, userTeams) => {
                showToast('Account registered & verified successfully!', 'success');
                onLoginSuccess(userData, userTeams);
              }}
              onBackToEmail={() => setShowOtpStep(false)}
              showToast={showToast}
            />
          ) : (
            <>
              <div className="auth-header">
                <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: 48, height: 48 }}>
                  <Layers size={26} />
                </div>
                <h2>TaskMaster Pro</h2>
                <div className="live-indicator" style={{ marginTop: '0.4rem' }}>
                  <div className="live-dot" />
                  <span>ACADEMIC & TEAM STUDY HUB</span>
                </div>
              </div>

              <div className="auth-tabs">
                <button 
                  type="button"
                  className={`auth-tab ${isLogin ? 'active' : ''}`}
                  onClick={() => {
                    setIsLogin(true);
                    setShowOtpStep(false);
                  }}
                >
                  Sign In
                </button>
                <button 
                  type="button"
                  className={`auth-tab ${!isLogin ? 'active' : ''}`}
                  onClick={() => {
                    setIsLogin(false);
                    setShowOtpStep(false);
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
                  <label className="form-label">Account Email Address</label>
                  <div style={{ position: 'relative' }}>
                    <Mail size={16} className="search-icon" />
                    <input 
                      type="email"
                      className="form-input"
                      style={{ paddingLeft: '2.4rem' }}
                      placeholder="name@organization.com"
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
                        style={{ background: 'none', border: 'none', color: 'var(--primary)', fontSize: '0.78rem', cursor: 'pointer', fontWeight: 600 }}
                        onClick={() => setShowForgotPassword(true)}
                      >
                        Forgot Password?
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
                      required={isLogin}
                    />
                  </div>
                </div>

                {!isLogin && (
                  <div className="form-group">
                    <label className="form-label">Default Workspace Role</label>
                    <select 
                      className="form-select"
                      value={defaultRole}
                      onChange={e => setDefaultRole(e.target.value)}
                    >
                      <option value="manager">Team Owner (Assigns & Controls Tasks)</option>
                      <option value="employee">Team Member (Executes & Updates Tasks)</option>
                    </select>
                  </div>
                )}

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ width: '100%', marginTop: '0.5rem' }}
                  disabled={loading}
                >
                  <span>{loading ? 'Sending Code...' : (isLogin ? 'Sign In to Account' : 'Send Verification Code')}</span>
                  <ArrowRight size={16} />
                </button>
              </form>

              <div className="quick-demo-box">
                <div className="quick-demo-title">
                  <Zap size={12} style={{ display: 'inline', marginRight: 4 }} />
                  Instant 1-Click Demo Accounts
                </div>
                <div className="demo-btn-group">
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleQuickDemo('manager@company.com', 'password123')}
                  >
                    <Shield size={14} className="text-indigo-400" />
                    <span>Manager Demo</span>
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary btn-sm"
                    onClick={() => handleQuickDemo('alex@company.com', 'password123')}
                  >
                    <UserCheck size={14} className="text-emerald-400" />
                    <span>Member Demo</span>
                  </button>
                </div>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Forgot Password Modal — rendered OUTSIDE auth-card to avoid stacking context trap */}
      <ForgotPasswordModal
        isOpen={showForgotPassword}
        onClose={() => setShowForgotPassword(false)}
        onLoginSuccess={onLoginSuccess}
        showToast={showToast}
      />
    </>
  );
};

