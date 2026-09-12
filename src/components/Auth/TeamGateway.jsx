import React, { useState } from 'react';
import { Users, PlusCircle, LogIn, ArrowRight, ShieldAlert, Sun, Moon } from 'lucide-react';

export const TeamGateway = ({ user, onTeamJoined, showToast, theme, onToggleTheme }) => {
  const [activeTab, setActiveTab] = useState('create'); // 'create' or 'join'
  const [teamName, setTeamName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!teamName.trim()) {
      showToast('Please enter a Team Name.', 'error');
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
      onTeamJoined(data.team, 'manager');
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

      const role = data.team.ownerEmail.toLowerCase() === user.email.toLowerCase() ? 'manager' : 'employee';
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
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: 54, height: 54 }}>
            <Users size={28} />
          </div>
          <h2>Welcome, {user.name}!</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.925rem', marginTop: '0.35rem' }}>
            To start managing or receiving tasks, create a new team or join an existing team.
          </p>
        </div>

        <div className="auth-tabs">
          <button 
            className={`auth-tab ${activeTab === 'create' ? 'active' : ''}`}
            onClick={() => setActiveTab('create')}
          >
            <PlusCircle size={15} style={{ marginRight: 6, display: 'inline' }} />
            Create Team (Team Owner)
          </button>
          <button 
            className={`auth-tab ${activeTab === 'join' ? 'active' : ''}`}
            onClick={() => setActiveTab('join')}
          >
            <LogIn size={15} style={{ marginRight: 6, display: 'inline' }} />
            Join Team (Team Member)
          </button>
        </div>

        {activeTab === 'create' ? (
          <form onSubmit={handleCreateTeam}>
            <div className="form-group">
              <label className="form-label">Team / Department Name</label>
              <input 
                type="text"
                className="form-input"
                placeholder="e.g. Engineering & Product Operations"
                value={teamName}
                onChange={e => setTeamName(e.target.value)}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4, display: 'block' }}>
                As creator, you will be the Team Owner. A unique 6-character Team Code will be generated for team members to join.
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
                Ask your Team Owner for their Team Code. You will join as a team member and receive assigned tasks.
              </span>
            </div>

            <button type="submit" className="btn btn-success" style={{ width: '100%' }} disabled={loading}>
              <span>{loading ? 'Joining...' : 'Join Team'}</span>
              <ArrowRight size={16} />
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
