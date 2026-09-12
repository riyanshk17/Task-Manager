import React, { useState } from 'react';
import { Users, PlusCircle, LogIn, ArrowRight, ShieldAlert, Sun, Moon, Lock, LogOut } from 'lucide-react';

export const TeamGateway = ({ user, onTeamJoined, showToast, theme, onToggleTheme, onLogout }) => {
  const isPrivileged = user && (user.role === 'developer' || user.role === 'admin' || user.email.toLowerCase() === 'malviyariyansh11@gmail.com');
  const [activeTab, setActiveTab] = useState(isPrivileged ? 'create' : 'join'); // Privileged can create, Members join
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      showToast('Please enter a Team Name.', 'error');
      return;
    }

    if (!isPrivileged) {
      showToast('Only Admins or the Developer can create new teams. Please join an existing team via Team Code.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/teams/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamName.trim(),
          ownerEmail: user.email,
          ownerName: user.name
        })
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        showToast(data.error || 'Failed to create team.', 'error');
        return;
      }

      showToast(`Team "${data.team.name}" created! Team Code: ${data.team.code}`, 'success');
      onTeamJoined(data.team, user.role || 'admin');
    } catch (err) {
      setLoading(false);
      showToast('Server error creating team.', 'error');
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    if (!joinCode.trim()) {
      showToast('Please enter a valid Team Code.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/teams/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: joinCode.trim().toUpperCase(),
          userEmail: user.email,
          userName: user.name
        })
      });

      const data = await res.json();
      setLoading(false);

      if (!res.ok) {
        showToast(data.error || 'Invalid Team Code.', 'error');
        return;
      }

      const role = isPrivileged ? (user.role || 'admin') : 'member';
      showToast(`Joined ${data.team.name} successfully!`, 'success');
      onTeamJoined(data.team, role);
    } catch (err) {
      setLoading(false);
      showToast('Server error joining team.', 'error');
    }
  };

  return (
    <div className="gateway-wrapper">
      <div className="glass-panel gateway-card" style={{ position: 'relative' }}>
        <div style={{ position: 'absolute', top: 16, right: 16, display: 'flex', gap: '8px', alignItems: 'center' }}>
          {onToggleTheme && (
            <button 
              onClick={onToggleTheme} 
              className="theme-toggle-btn"
              title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
            >
              {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
          {onLogout && (
            <button 
              onClick={onLogout} 
              className="theme-toggle-btn"
              style={{ color: '#ef4444' }}
              title="Log Out"
            >
              <LogOut size={18} />
            </button>
          )}
        </div>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: 54, height: 54 }}>
            <Users size={28} />
          </div>
          <h2>Welcome, {user.name}!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginTop: '0.35rem' }}>
            {isPrivileged 
              ? 'Create a team for your workspace or join an existing team via Team Code.' 
              : 'Enter your 6-character Team Code provided by your Admin or Developer to join your team.'}
          </p>
        </div>

        <div className="auth-tabs">
          {isPrivileged && (
            <button 
              className={`auth-tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              <PlusCircle size={15} style={{ marginRight: 6, display: 'inline' }} />
              Create Team (Admin / Developer)
            </button>
          )}
          <button 
            className={`auth-tab ${activeTab === 'join' || !isPrivileged ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            <LogIn size={15} style={{ marginRight: 6, display: 'inline' }} />
            Join Team (Team Member)
          </button>
        </div>

        {activeTab === 'create' && isPrivileged ? (
          <form onSubmit={handleCreateTeam}>
            <div className="form-group">
              <label className="form-label">Team / Department Name</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Product Engineering Operations"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>
                As Admin/Developer, creating a team generates a unique 6-character Team Code for members to join.
              </span>
            </div>

            <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={loading}>
              <span>{loading ? 'Creating...' : 'Create Team & Generate Code'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoinTeam}>
            <div className="form-group">
              <label className="form-label">Enter 6-Character Team Code</label>
              <input 
                type="text"
                className="form-input"
                style={{ fontFamily: 'monospace', fontSize: '1.1rem', letterSpacing: '0.08em', textTransform: 'uppercase' }}
                placeholder="e.g. TEAM-7X9B2K"
                value={joinCode}
                onChange={e => setJoinCode(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>
                Ask your Admin or Developer for the Team Code to join your workspace.
              </span>
            </div>

            <button type="submit" className="btn btn-success" style={{ width: '100%' }} disabled={loading}>
              <span>{loading ? 'Joining...' : 'Join Team'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}

        {onLogout && (
          <div style={{ marginTop: '1.5rem', textAlign: 'center', borderTop: '1px solid var(--border-subtle)', paddingTop: '1rem' }}>
            <button 
              type="button" 
              onClick={onLogout} 
              className="btn btn-secondary btn-sm"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.3)' }}
            >
              <LogOut size={15} />
              <span>Log Out</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
