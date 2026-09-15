import React, { useState, useEffect } from 'react';
import { 
  X, User, Lock, Settings, Shield, Bell, Moon, Sun, Camera, 
  Check, LogOut, Info, Sparkles, Layers, FileText, CheckCircle2, Briefcase
} from 'lucide-react';
import { AvatarCropModal } from './AvatarCropModal';

export const SettingsModal = ({ 
  isOpen, 
  onClose, 
  user, 
  onUpdateUser, 
  theme, 
  onToggleTheme, 
  onLogout, 
  showToast 
}) => {
  const [activeTab, setActiveTab] = useState('profile'); // 'profile', 'security', 'preferences', 'about'

  // Profile Form State
  const [name, setName] = useState(user?.name || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [jobTitle, setJobTitle] = useState(user?.jobTitle || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Avatar Crop Modal State
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [rawImageSrc, setRawImageSrc] = useState(null);

  // Security Form State
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingSecurity, setSavingSecurity] = useState(false);

  // Preferences State
  const [soundEnabled, setSoundEnabled] = useState(() => {
    return localStorage.getItem('tm_sound_enabled') !== 'false';
  });

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setBio(user.bio || '');
      setJobTitle(user.jobTitle || '');
      setAvatarUrl(user.avatarUrl || '');
    }
  }, [user]);

  if (!isOpen || !user) return null;

  const handleAvatarFileSelect = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      setRawImageSrc(reader.result);
      setIsCropOpen(true);
    };
    reader.readAsDataURL(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleCropComplete = async (croppedBase64) => {
    setIsCropOpen(false);
    setRawImageSrc(null);
    setUploadingAvatar(true);
    try {
      // Step 1: Upload the avatar file
      const uploadRes = await fetch('/api/user/upload-avatar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: 'avatar.jpg', fileData: croppedBase64 })
      });

      const uploadData = await uploadRes.json();

      if (!uploadRes.ok || !uploadData.avatarUrl) {
        setUploadingAvatar(false);
        if (showToast) showToast(uploadData.error || 'Failed to upload photo.', 'error');
        return;
      }

      const newAvatarUrl = uploadData.avatarUrl;
      setAvatarUrl(newAvatarUrl);

      // Step 2: Auto-save avatar to user profile immediately (no need to click Save)
      const profileRes = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: name.trim() || user.name,
          bio: bio.trim(),
          jobTitle: jobTitle.trim(),
          avatarUrl: newAvatarUrl
        })
      });

      const profileData = await profileRes.json();
      setUploadingAvatar(false);

      if (profileRes.ok && profileData.user) {
        if (onUpdateUser) onUpdateUser(profileData.user);
        if (showToast) showToast('✅ Profile photo saved and synced everywhere!', 'success');
      } else {
        if (showToast) showToast('Photo uploaded but profile sync failed. Please click Save Profile.', 'warning');
      }
    } catch (err) {
      setUploadingAvatar(false);
      if (showToast) showToast('Error uploading avatar photo.', 'error');
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || savingProfile) return;

    setSavingProfile(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          name: name.trim(),
          bio: bio.trim(),
          jobTitle: jobTitle.trim(),
          avatarUrl
        })
      });

      const data = await res.json();
      setSavingProfile(false);

      if (res.ok && data.user) {
        if (onUpdateUser) onUpdateUser(data.user);
        if (showToast) showToast('Profile details updated successfully!', 'success');
      } else {
        if (showToast) showToast(data.error || 'Failed to update profile.', 'error');
      }
    } catch (err) {
      setSavingProfile(false);
      if (showToast) showToast('Error saving profile changes.', 'error');
    }
  };

  const handleSaveSecurity = async (e) => {
    e.preventDefault();
    if (!newPassword || newPassword.length < 6) {
      if (showToast) showToast('New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      if (showToast) showToast('New passwords do not match.', 'error');
      return;
    }

    setSavingSecurity(true);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user.email,
          currentPassword,
          newPassword
        })
      });

      const data = await res.json();
      setSavingSecurity(false);

      if (res.ok) {
        if (showToast) showToast('Password updated successfully!', 'success');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        if (showToast) showToast(data.error || 'Failed to update password.', 'error');
      }
    } catch (err) {
      setSavingSecurity(false);
      if (showToast) showToast('Error updating password.', 'error');
    }
  };

  const handleToggleSound = () => {
    const nextState = !soundEnabled;
    setSoundEnabled(nextState);
    localStorage.setItem('tm_sound_enabled', String(nextState));
    if (showToast) showToast(`Notification sound chimes ${nextState ? 'enabled' : 'disabled'}.`, 'info');
  };

  const getInitials = (n) => {
    if (!n) return 'U';
    return n.split(' ').map(part => part[0]).join('').substring(0, 2).toUpperCase();
  };

  return (
    <div className="modal-overlay centered-modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-container settings-modal-responsive" onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="modal-header" style={{ padding: '1.25rem 1.5rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ position: 'relative' }}>
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt={user.name} 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)' }} 
                />
              ) : (
                <div className="avatar-circle" style={{ width: '48px', height: '48px', fontSize: '1.1rem', background: 'var(--primary-glow)', border: '2px solid var(--primary)', color: 'var(--primary)', fontWeight: 700 }}>
                  {getInitials(user.name)}
                </div>
              )}
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                {user.name}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                {user.email} • <span style={{ textTransform: 'capitalize', color: 'var(--primary)', fontWeight: 600 }}>{user.defaultRole === 'manager' ? 'Manager' : 'Member'}</span>
              </div>
            </div>
          </div>

          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Layout: Sidebar Tabs + Content */}
        <div className="settings-layout-wrapper">
          
          {/* Sidebar Tabs */}
          <div className="settings-sidebar-tabs">
            <div className="settings-tab-button-group">
              <button 
                className={`auth-tab ${activeTab === 'profile' ? 'active' : ''}`}
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '0.85rem', gap: '10px', borderRadius: '10px' }}
                onClick={() => setActiveTab('profile')}
              >
                <User size={16} />
                <span>My Profile</span>
              </button>

              <button 
                className={`auth-tab ${activeTab === 'security' ? 'active' : ''}`}
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '0.85rem', gap: '10px', borderRadius: '10px' }}
                onClick={() => setActiveTab('security')}
              >
                <Lock size={16} />
                <span>Security</span>
              </button>

              <button 
                className={`auth-tab ${activeTab === 'preferences' ? 'active' : ''}`}
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '0.85rem', gap: '10px', borderRadius: '10px' }}
                onClick={() => setActiveTab('preferences')}
              >
                <Settings size={16} />
                <span>Preferences</span>
              </button>

              <button 
                className={`auth-tab ${activeTab === 'about' ? 'active' : ''}`}
                style={{ justifyContent: 'flex-start', padding: '10px 14px', fontSize: '0.85rem', gap: '10px', borderRadius: '10px' }}
                onClick={() => setActiveTab('about')}
              >
                <Info size={16} />
                <span>About App</span>
              </button>
            </div>

            {/* Logout Action */}
            <div className="settings-logout-box" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
              <button 
                className="btn btn-secondary" 
                style={{ width: '100%', justifyContent: 'flex-start', padding: '9px 12px', fontSize: '0.85rem', gap: '8px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.08)' }}
                onClick={() => {
                  onClose();
                  if (onLogout) onLogout();
                }}
              >
                <LogOut size={16} />
                <span>Log Out</span>
              </button>
            </div>
          </div>

          {/* Main Tab Content */}
          <div className="settings-tab-content">
            
            {/* 1. PROFILE TAB */}
            {activeTab === 'profile' && (
              <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover' }} />
                  ) : (
                    <div className="avatar-circle" style={{ width: '64px', height: '64px', fontSize: '1.3rem', background: 'var(--primary-glow)', color: 'var(--primary)' }}>
                      {getInitials(user.name)}
                    </div>
                  )}

                  <div>
                    <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <Camera size={14} />
                      <span>{uploadingAvatar ? 'Uploading...' : 'Upload Photo'}</span>
                      <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleAvatarFileSelect} />
                    </label>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                      Supports JPG, PNG, WEBP images.
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <div style={{ position: 'relative' }}>
                      <User size={15} className="search-icon" />
                      <input 
                        type="text" 
                        className="form-input" 
                        style={{ paddingLeft: '2.4rem' }} 
                        value={name} 
                        onChange={e => setName(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Email Address (Verified)</label>
                    <div style={{ position: 'relative' }}>
                      <CheckCircle2 size={15} className="search-icon text-emerald-400" />
                      <input 
                        type="email" 
                        className="form-input" 
                        style={{ paddingLeft: '2.4rem', opacity: 0.7 }} 
                        value={user.email} 
                        readOnly 
                      />
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Job Title / Designation</label>
                  <div style={{ position: 'relative' }}>
                    <Briefcase size={15} className="search-icon" />
                    <input 
                      type="text" 
                      className="form-input" 
                      style={{ paddingLeft: '2.4rem' }} 
                      placeholder="e.g. Lead Engineer / Product Manager" 
                      value={jobTitle} 
                      onChange={e => setJobTitle(e.target.value)} 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Bio & Identification Description</label>
                  <textarea 
                    className="form-textarea" 
                    rows={3}
                    placeholder="Brief description about your responsibilities or domain expertise..." 
                    value={bio}
                    onChange={e => setBio(e.target.value)}
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ alignSelf: 'flex-start', padding: '10px 20px', gap: '8px' }}
                  disabled={savingProfile}
                >
                  <Check size={16} />
                  <span>{savingProfile ? 'Saving Changes...' : 'Save Profile Changes'}</span>
                </button>
              </form>
            )}

            {/* 2. SECURITY TAB */}
            {activeTab === 'security' && (
              <form onSubmit={handleSaveSecurity} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>Change Account Password</h4>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: 0 }}>
                  Update your password to keep your account secure.
                </p>

                <div className="form-group">
                  <label className="form-label">Current Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="••••••••" 
                    value={currentPassword} 
                    onChange={e => setCurrentPassword(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">New Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Minimum 6 characters" 
                    value={newPassword} 
                    onChange={e => setNewPassword(e.target.value)} 
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Confirm New Password</label>
                  <input 
                    type="password" 
                    className="form-input" 
                    placeholder="Repeat new password" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary" 
                  style={{ alignSelf: 'flex-start', padding: '10px 20px', gap: '8px' }}
                  disabled={savingSecurity}
                >
                  <Lock size={16} />
                  <span>{savingSecurity ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </form>
            )}

            {/* 3. PREFERENCES TAB */}
            {activeTab === 'preferences' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>App Visual Theme</h4>
                  <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0 12px 0' }}>
                    Choose your default visual theme preference.
                  </p>
                  <div style={{ display: 'flex', gap: '12px' }}>
                    <button 
                      className={`btn ${theme === 'light' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '12px', justifyContent: 'center', gap: '8px' }}
                      onClick={() => {
                        if (theme !== 'light') onToggleTheme();
                      }}
                    >
                      <Sun size={18} />
                      <span>Light Theme</span>
                    </button>
                    <button 
                      className={`btn ${theme === 'dark' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '12px', justifyContent: 'center', gap: '8px' }}
                      onClick={() => {
                        if (theme !== 'dark') onToggleTheme();
                      }}
                    >
                      <Moon size={18} />
                      <span>Dark Theme</span>
                    </button>
                  </div>
                </div>

                <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '1.25rem' }}>
                  <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>Sound & Audio Alerts</h4>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '10px', border: '1px solid var(--border-subtle)' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-main)' }}>
                        Notification Chimes
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                        Play audio chimes for new team chats & Pomodoro completion
                      </div>
                    </div>
                    <button 
                      className={`btn ${soundEnabled ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ padding: '6px 14px', fontSize: '0.8rem' }}
                      onClick={handleToggleSound}
                    >
                      {soundEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* 4. ABOUT TAB */}
            {activeTab === 'about' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '1rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
                  <div className="brand-icon" style={{ width: 44, height: 44 }}>
                    <Layers size={24} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.15rem', color: 'var(--text-main)' }}>TaskMaster Pro Workspace</h3>
                    <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
                      Version 2.4.0 (Enterprise Edition)
                    </div>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.55' }}>
                  TaskMaster Pro is a high-performance workspace platform engineered for academic, engineering, and corporate teams. It combines SOP work tracking, real-time live chat, Pomodoro deep work timers, manager task bank repositories, and permanent archive databases.
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Security Standard:</span>
                    <strong style={{ display: 'block', color: 'var(--text-main)', marginTop: '2px' }}>Cryptographic Email OTP</strong>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Focus Engine:</span>
                    <strong style={{ display: 'block', color: 'var(--text-main)', marginTop: '2px' }}>Pomodoro & Live Heartbeat</strong>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Database Integrity:</span>
                    <strong style={{ display: 'block', color: 'var(--text-main)', marginTop: '2px' }}>Immutable Permanent Archive</strong>
                  </div>
                  <div style={{ background: 'var(--bg-card)', padding: '10px 14px', borderRadius: '10px', border: '1px solid var(--border-subtle)', fontSize: '0.8rem' }}>
                    <span style={{ color: 'var(--text-muted)' }}>Engineered By:</span>
                    <strong style={{ display: 'block', color: 'var(--text-main)', marginTop: '2px' }}>Google DeepMind Antigravity</strong>
                  </div>
                </div>

                <div style={{ fontSize: '0.75rem', textAlign: 'center', color: 'var(--text-muted)', marginTop: '0.5rem' }}>
                  © 2026 TaskMaster Pro Inc. All Rights Reserved.
                </div>
              </div>
            )}

          </div>

        </div>
      </div>

      {/* Avatar Crop Modal */}
      <AvatarCropModal
        isOpen={isCropOpen}
        onClose={() => { setIsCropOpen(false); setRawImageSrc(null); }}
        imageSrc={rawImageSrc}
        onCropComplete={handleCropComplete}
      />
    </div>
  );
};
