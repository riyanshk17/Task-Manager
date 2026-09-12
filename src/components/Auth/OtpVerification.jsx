import React, { useState, useEffect, useRef } from 'react';
import { Mail, CheckCircle2, AlertCircle, ArrowLeft, RefreshCw, Lock, ShieldCheck, KeyRound } from 'lucide-react';

export const OtpVerification = ({
  email,
  onVerifySuccess,
  onBackToEmail,
  showToast,
  name,
  password,
  defaultRole,
  type = 'signup'
}) => {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(60);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const inputRefs = useRef([]);

  // Auto-focus first digit input on mount
  useEffect(() => {
    if (inputRefs.current[0]) {
      inputRefs.current[0].focus();
    }
  }, []);

  // 60-Second Resend Countdown Timer
  useEffect(() => {
    let timer;
    if (countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleDigitChange = (index, value) => {
    const cleanVal = value.replace(/[^0-9]/g, '');
    if (!cleanVal) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const newDigits = [...digits];
    newDigits[index] = cleanVal.slice(-1);
    setDigits(newDigits);
    setErrorMessage('');

    // Auto-advance to next input field
    if (index < 5 && cleanVal) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    const cleanNumbers = pastedData.replace(/[^0-9]/g, '').slice(0, 6);

    if (cleanNumbers.length > 0) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < cleanNumbers.length; i++) {
        newDigits[i] = cleanNumbers[i];
      }
      setDigits(newDigits);
      setErrorMessage('');

      const nextIndex = Math.min(cleanNumbers.length, 5);
      inputRefs.current[nextIndex]?.focus();
    }
  };

  const handleVerify = async (e) => {
    if (e) e.preventDefault();
    const otpCode = digits.join('');
    
    if (otpCode.length !== 6) {
      setErrorMessage('Please enter all 6 digits of your verification code.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email.trim(),
          otpCode,
          type,
          name,
          password,
          defaultRole
        })
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        setErrorMessage(data.error || 'Verification failed. Please try again.');
        if (showToast) showToast(data.error || 'Verification failed.', 'error');
        return;
      }

      setSuccessMessage('Email verified successfully!');
      if (showToast) showToast('Email verified successfully!', 'success');
      
      setTimeout(() => {
        onVerifySuccess(data.user, data.userTeams || []);
      }, 400);
    } catch (err) {
      setLoading(false);
      const netErr = 'Unable to connect to server. Please ensure backend is running.';
      setErrorMessage(netErr);
      if (showToast) showToast(netErr, 'error');
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || resending) return;

    setResending(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), type, name })
      });

      const data = await res.json();
      setResending(false);

      if (!res.ok) {
        setErrorMessage(data.error || 'Failed to resend code.');
        if (showToast) showToast(data.error || 'Failed to resend code.', 'error');
        return;
      }

      setSuccessMessage('A new 6-digit verification code has been sent to your email.');
      setCountdown(60);
      setDigits(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();

      if (showToast) showToast(`New OTP sent to ${email}`, 'info');
    } catch (err) {
      setResending(false);
      setErrorMessage('Network error while resending code. Please try again.');
    }
  };

  return (
    <div className="otp-verification-container">
      <div className="auth-header" style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
        <div 
          className="brand-icon" 
          style={{ 
            margin: '0 auto 0.75rem auto', 
            width: 54, 
            height: 54, 
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.2), rgba(168, 85, 247, 0.2))', 
            borderRadius: '16px', 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            boxShadow: '0 0 20px rgba(99, 102, 241, 0.15)'
          }}
        >
          <ShieldCheck size={28} style={{ color: '#818cf8' }} />
        </div>
        <h2 style={{ fontSize: '1.35rem', fontWeight: 700, margin: 0 }}>Security Verification</h2>
        <p className="auth-subtitle" style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: '0.35rem' }}>
          Enter the 6-digit verification code sent to:
        </p>
        <div 
          className="email-chip" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '6px', 
            background: 'rgba(99, 102, 241, 0.1)', 
            padding: '6px 14px', 
            borderRadius: '20px', 
            fontSize: '0.85rem', 
            fontWeight: 600, 
            marginTop: '0.5rem', 
            color: '#a5b4fc', 
            border: '1px solid rgba(99, 102, 241, 0.25)' 
          }}
        >
          <Mail size={14} style={{ color: '#818cf8' }} />
          <span>{email}</span>
        </div>
      </div>

      {errorMessage && (
        <div className="otp-alert otp-alert-error" role="alert" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', color: '#fca5a5', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          <AlertCircle size={16} style={{ flexShrink: 0 }} />
          <span>{errorMessage}</span>
        </div>
      )}

      {successMessage && (
        <div className="otp-alert otp-alert-success" role="status" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', borderRadius: '10px', background: 'rgba(34, 197, 94, 0.12)', border: '1px solid rgba(34, 197, 94, 0.3)', color: '#86efac', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
          <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
          <span>{successMessage}</span>
        </div>
      )}

      <form onSubmit={handleVerify}>
        <div className="otp-inputs-wrapper" style={{ margin: '1.25rem 0' }}>
          <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            <KeyRound size={13} style={{ color: '#818cf8' }} /> 6-Digit Security Code
          </label>
          <div className="otp-digit-group" style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
            {digits.map((digit, idx) => (
              <input
                key={idx}
                ref={(el) => (inputRefs.current[idx] = el)}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={1}
                value={digit}
                onChange={(e) => handleDigitChange(idx, e.target.value)}
                onKeyDown={(e) => handleKeyDown(idx, e)}
                onPaste={handlePaste}
                aria-label={`Digit ${idx + 1} of 6`}
                className="otp-digit-box"
                style={{
                  width: '46px',
                  height: '56px',
                  fontSize: '1.5rem',
                  fontWeight: '700',
                  textAlign: 'center',
                  borderRadius: '12px',
                  border: digit ? '2px solid #6366f1' : '1px solid var(--border-subtle)',
                  background: digit ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                  color: 'var(--text-main)',
                  outline: 'none',
                  transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                  boxShadow: digit ? '0 0 16px rgba(99, 102, 241, 0.3)' : 'none'
                }}
              />
            ))}
          </div>
        </div>

        <button
          type="submit"
          className="btn btn-primary"
          style={{ width: '100%', padding: '0.85rem', fontSize: '0.95rem', fontWeight: 600, marginTop: '0.5rem' }}
          disabled={loading || digits.join('').length !== 6}
        >
          {loading ? (
            <span>Verifying Code...</span>
          ) : (
            <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
              <Lock size={16} /> Verify & Create Account
            </span>
          )}
        </button>
      </form>

      <div className="otp-actions" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1.25rem', paddingTop: '1rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.85rem' }}>
        <button
          type="button"
          onClick={onBackToEmail}
          className="btn-link"
          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
        >
          <ArrowLeft size={14} /> Change Email
        </button>

        <button
          type="button"
          onClick={handleResend}
          disabled={countdown > 0 || resending}
          style={{
            background: 'none',
            border: 'none',
            color: countdown > 0 ? 'var(--text-muted)' : '#818cf8',
            cursor: countdown > 0 ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontWeight: 600,
            opacity: countdown > 0 ? 0.6 : 1
          }}
        >
          <RefreshCw size={14} className={resending ? 'animate-spin' : ''} />
          {countdown > 0 ? `Resend Code in ${countdown}s` : 'Resend Code'}
        </button>
      </div>
    </div>
  );
};

