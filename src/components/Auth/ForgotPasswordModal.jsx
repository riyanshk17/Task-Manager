import React, { useState, useEffect } from 'react';
import { KeyRound, Mail, Lock, ArrowRight, ShieldCheck, CheckCircle2, ArrowLeft, RefreshCw, X } from 'lucide-react';
import { OtpVerification } from './OtpVerification';

export const ForgotPasswordModal = ({ isOpen, onClose, onLoginSuccess, showToast }) => {
  const [step, setStep] = useState(1); // 1: Email, 2: OTP & New Password
  const [email, setEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    let timer;
    if (resendCooldown > 0) {
      timer = setInterval(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [resendCooldown]);

  if (!isOpen) return null;

  const handleSendResetOtp = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@') || loading) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, type: 'reset' })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        if (showToast) showToast(data.message || 'Verification code sent to your email!', 'success');
        setResendCooldown(60);
        setStep(2);
      } else {
        if (showToast) showToast(data.error || 'Failed to send reset code.', 'error');
      }
    } catch (err) {
      setLoading(false);
      if (showToast) showToast('Error sending reset code. Please try again.', 'error');
    }
  };

  const handleResetPasswordSubmit = async (e) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      if (showToast) showToast('Please enter the 6-digit verification code.', 'error');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      if (showToast) showToast('Password must be at least 6 characters.', 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      if (showToast) showToast('New passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          otpCode: otpCode.trim(),
          newPassword
        })
      });

      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        if (showToast) showToast('Password reset successfully!', 'success');
        onClose();
        if (onLoginSuccess) {
          onLoginSuccess(data.user, data.userTeams || []);
        }
      } else {
        if (showToast) showToast(data.error || 'Failed to reset password.', 'error');
      }
    } catch (err) {
      setLoading(false);
      if (showToast) showToast('Error resetting password. Please try again.', 'error');
    }
  };

  return (
    <div className="modal-overlay centered-modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-container reset-password-modal" onClick={e => e.stopPropagation()} style={{ textAlign: 'center' }}>
        
        <div style={{ position: 'relative', marginBottom: '1.25rem' }}>
          <button className="close-btn" onClick={onClose} style={{ position: 'absolute', top: 0, right: 0 }}>
            <X size={18} />
          </button>
          
          <div style={{ background: 'rgba(99, 102, 241, 0.15)', width: 48, height: 48, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem auto', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
            <KeyRound size={22} className="text-indigo-400" />
          </div>
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-main)', fontWeight: 800 }}>Reset Account Password</h3>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            Email Verification Security System
          </div>
        </div>

        {step === 1 ? (
          <form onSubmit={handleSendResetOtp}>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.25rem', lineHeight: '1.5' }}>
              Enter your registered account email address. We will send a 6-digit security OTP code to reset your password.
            </p>

            <div className="form-group" style={{ textAlign: 'left' }}>
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

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem', gap: '8px' }}
              disabled={loading}
            >
              <span>{loading ? 'Sending Code...' : 'Send Verification OTP'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleResetPasswordSubmit}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                Code sent to: <strong>{email}</strong>
              </span>
              <button 
                type="button" 
                style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.78rem' }}
                onClick={() => setStep(1)}
              >
                Change Email
              </button>
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">6-Digit Verification Code</label>
              <div style={{ position: 'relative' }}>
                <ShieldCheck size={16} className="search-icon" />
                <input 
                  type="text"
                  className="form-input"
                  style={{ paddingLeft: '2.4rem', letterSpacing: '0.2em', fontFamily: 'monospace', fontSize: '1.1rem', textAlign: 'center' }}
                  placeholder="123456"
                  maxLength={6}
                  value={otpCode}
                  onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} className="search-icon" />
                <input 
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder="Minimum 6 characters"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group" style={{ textAlign: 'left' }}>
              <label className="form-label">Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} className="search-icon" />
                <input 
                  type="password"
                  className="form-input"
                  style={{ paddingLeft: '2.4rem' }}
                  placeholder="Repeat new password"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            </div>

            <button 
              type="submit" 
              className="btn btn-primary" 
              style={{ width: '100%', marginTop: '1rem' }}
              disabled={loading}
            >
              <span>{loading ? 'Resetting Password...' : 'Confirm & Reset Password'}</span>
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem' }}>
              {resendCooldown > 0 ? (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Resend code in {resendCooldown}s
                </span>
              ) : (
                <button 
                  type="button"
                  style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}
                  onClick={handleSendResetOtp}
                >
                  Resend Verification OTP Code
                </button>
              )}
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
