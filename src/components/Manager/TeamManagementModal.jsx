import React, { useState, useEffect } from 'react';
import { X, Users, Copy, Check, Mail, UserMinus } from 'lucide-react';

export const TeamManagementModal = ({ isOpen, onClose, team, onLeaveTeam, showToast }) => {
  const [copied, setCopied] = useState(false);
  const [liveMembers, setLiveMembers] = useState(team?.members || []);

  useEffect(() => {
    if (isOpen && team?.id) {
      setLiveMembers(team.members || []);
      fetch(`/api/teams/${team.id}`)
        .then(res => res.json())
        .then(data => {
          if (data.team?.members) {
            setLiveMembers(data.team.members);
          }
        })
        .catch(() => {});
    }
  }, [isOpen, team]);

  if (!isOpen || !team) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(team.code);
    setCopied(true);
    showToast('Team code copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Users className="text-indigo-400" size={20} />
            <span>Team Members & Invite Code</span>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label className="form-label" style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Team Invite Code (Share with team members to join)
          </label>
          <div className="code-display">
            <span>{team.code}</span>
            <button 
              onClick={handleCopy} 
              className="btn btn-secondary btn-sm"
              style={{ marginLeft: 'auto' }}
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{copied ? 'Copied' : 'Copy Code'}</span>
            </button>
          </div>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <h4 style={{ fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span>Active Team Members ({liveMembers.length})</span>
            <div className="live-indicator" style={{ fontSize: '0.65rem' }}>
              <div className="live-dot" />
              <span>LIVE</span>
            </div>
          </h4>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {liveMembers.map((member, idx) => (
              <div 
                key={idx}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '0.75rem 1rem',
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  {member.avatarUrl ? (
                    <img 
                      src={member.avatarUrl} 
                      alt={member.name}
                      onError={e => {
                        e.target.style.display = 'none';
                        if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                      }}
                      style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover', border: member.role === 'manager' ? '2px solid #818cf8' : '2px solid #34d399', flexShrink: 0 }}
                    />
                  ) : null}
                  <div 
                    className="avatar-circle"
                    style={{ 
                      width: '38px', 
                      height: '38px', 
                      display: member.avatarUrl ? 'none' : 'flex',
                      flexShrink: 0,
                      background: member.role === 'manager' ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: member.role === 'manager' ? '#818cf8' : '#34d399',
                      border: member.role === 'manager' ? '2px solid #818cf8' : '2px solid #34d399'
                    }}
                  >
                    {member.name ? member.name[0].toUpperCase() : 'M'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{member.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Mail size={12} />
                      <span>{member.email}</span>
                    </div>
                  </div>
                </div>

                <span className={`role-badge ${member.role || 'employee'}`}>
                  {member.role === 'manager' ? 'Team Owner' : 'Team Member'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ marginTop: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          {onLeaveTeam ? (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (window.confirm(`Are you sure you want to leave the team "${team.name}"?`)) {
                  onClose();
                  onLeaveTeam(team.id);
                }
              }}
              style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserMinus size={14} />
              <span>Leave Team</span>
            </button>
          ) : <div />}

          <button className="btn btn-secondary" onClick={onClose}>
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
};
