import React, { useState } from 'react';
import { Layers, Users, LogOut, Copy, Check, Plus, ChevronDown, Sun, Moon, UserMinus, MessageSquare, Settings, ShieldCheck } from 'lucide-react';

export const Navbar = ({ 
  user, 
  activeTeam, 
  userTeams = [], 
  currentRole, 
  theme,
  onToggleTheme,
  onSelectTeam, 
  onOpenGateway, 
  onOpenTeamModal,
  onLeaveTeam, 
  onLogout, 
  showToast,
  unreadTeamCount = 0,
  onOpenChat,
  onOpenSettings,
  onOpenDeveloperControl
}) => {
  const [copied, setCopied] = useState(false);
  const isDeveloper = user && (user.email?.toLowerCase() === 'malviyariyansh11@gmail.com' || user.role === 'developer');
  const systemRole = user?.role || user?.defaultRole || (isDeveloper ? 'developer' : 'member');

  const handleCopyCode = (e) => {
    e.stopPropagation();
    if (!activeTeam?.code) return;
    navigator.clipboard.writeText(activeTeam.code);
    setCopied(true);
    showToast('Team code copied to clipboard!', 'success');
    setTimeout(() => setCopied(false), 2000);
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const isOwner = activeTeam?.ownerEmail?.toLowerCase() === user?.email?.toLowerCase();

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <div className="brand-icon">
          <Layers size={22} />
        </div>
        <div>
          <div className="brand-title">TaskMaster Pro</div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', letterSpacing: '0.05em' }}>
            STUDY & TEAM WORKSPACE
          </div>
        </div>
      </div>

      <div className="nav-controls">
        {/* Multi-Team Workspace Selector */}
        {userTeams.length > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{ position: 'relative' }}>
              <select 
                className="select-filter"
                style={{ 
                  paddingRight: '2rem', 
                  fontFamily: 'var(--font-heading)',
                  fontWeight: 600, 
                  background: 'rgba(99, 102, 241, 0.12)',
                  borderColor: 'rgba(99, 102, 241, 0.3)',
                  color: 'var(--primary)'
                }}
                value={activeTeam?.id || ''}
                onChange={e => {
                  if (e.target.value === '__new__') {
                    onOpenGateway();
                  } else {
                    onSelectTeam(e.target.value);
                  }
                }}
              >
                {userTeams.map(t => (
                  <option key={t.id} value={t.id} style={{ background: 'var(--bg-dropdown-item)', color: 'var(--text-main)' }}>
                    👥 {t.name} ({t.code})
                  </option>
                ))}
                <option value="__new__" style={{ background: 'var(--bg-dropdown-item)', color: 'var(--primary)', fontWeight: 'bold' }}>
                  + Create or Join Another Team...
                </option>
              </select>
            </div>
          </div>
        )}

        {activeTeam && (
          <div className="team-badge-pill" onClick={onOpenTeamModal} title="Click to view Team Members & Invite Code">
            <Users size={15} />
            <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.05em' }}>
              Code: {activeTeam.code}
            </span>
            <button 
              onClick={handleCopyCode} 
              style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
              title="Copy Team Code"
            >
              {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
            </button>
          </div>
        )}

        {activeTeam && onLeaveTeam && (
          <button
            onClick={() => {
              if (window.confirm(`Are you sure you want to leave the team "${activeTeam.name}"?`)) {
                onLeaveTeam(activeTeam.id);
              }
            }}
            className="btn btn-secondary btn-sm"
            style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)', display: 'flex', alignItems: 'center', gap: '4px' }}
            title="Leave this team workspace"
          >
            <UserMinus size={14} />
            <span style={{ fontSize: '0.8rem' }}>Leave</span>
          </button>
        )}


        {/* Global Chat Alert Icon Button */}
        {activeTeam && onOpenChat && (
          <button 
            onClick={onOpenChat}
            className={`nav-chat-btn ${unreadTeamCount > 0 ? 'has-unread' : ''}`}
            title={unreadTeamCount > 0 ? `${unreadTeamCount} unread message${unreadTeamCount > 1 ? 's' : ''}` : "Team Chat Workspace"}
          >
            <MessageSquare size={19} className={unreadTeamCount > 0 ? "text-red-400" : ""} />
            {unreadTeamCount > 0 && (
              <span className="chat-unread-badge navbar-chat-badge">
                {unreadTeamCount > 99 ? '99+' : unreadTeamCount}
              </span>
            )}
          </button>
        )}

        {/* Developer Control Panel Trigger */}
        {isDeveloper && onOpenDeveloperControl && (
          <button 
            onClick={onOpenDeveloperControl}
            className="btn btn-primary btn-sm"
            style={{ background: 'rgba(99, 102, 241, 0.2)', borderColor: 'rgba(99, 102, 241, 0.5)', color: '#a5b4fc', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700 }}
            title="Open System Developer Controls (Riyansh)"
          >
            <ShieldCheck size={16} />
            <span>Dev Controls</span>
          </button>
        )}

        {/* Settings & Profile Modal Trigger Button */}
        {onOpenSettings && (
          <button 
            onClick={onOpenSettings}
            className="theme-toggle-btn"
            title="Open User Profile & Application Settings"
          >
            <Settings size={18} />
          </button>
        )}

        {/* Theme Toggle Button */}
        <button 
          onClick={onToggleTheme} 
          className="theme-toggle-btn"
          title={`Switch to ${theme === 'dark' ? 'Light' : 'Dark'} Mode`}
        >
          {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* User Pill Button (Clickable for Settings & Profile) */}
        <div className="user-pill" onClick={onOpenSettings} style={{ cursor: onOpenSettings ? 'pointer' : 'default' }} title="Click to view & edit profile">
          {user?.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.name} 
              onError={e => {
                e.target.style.display = 'none';
                if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
              }}
              style={{ width: '34px', height: '34px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', flexShrink: 0 }} 
            />
          ) : null}
          <div 
            className="avatar-circle" 
            style={{ 
              width: '34px', 
              height: '34px', 
              flexShrink: 0, 
              border: '2px solid var(--primary)', 
              fontSize: '0.8rem', 
              fontWeight: 700,
              display: user?.avatarUrl ? 'none' : 'flex'
            }}
          >
            {getInitials(user?.name)}
          </div>
          <div className="user-info">
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span className="user-name">{user?.name}</span>
              {systemRole === 'developer' && (
                <span className="role-badge manager" style={{ fontSize: '0.62rem', padding: '1px 6px', background: 'rgba(99, 102, 241, 0.3)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.5)' }}>
                  DEV
                </span>
              )}
              {systemRole === 'admin' && (
                <span className="role-badge manager" style={{ fontSize: '0.62rem', padding: '1px 6px', background: 'rgba(245, 158, 11, 0.25)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.5)' }}>
                  ADMIN
                </span>
              )}
              {systemRole === 'member' && (
                <span className="role-badge employee" style={{ fontSize: '0.62rem', padding: '1px 6px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.4)' }}>
                  MEMBER
                </span>
              )}
            </div>
            <span className="user-email">{user?.email}</span>
          </div>
        </div>

        <button 
          onClick={onLogout} 
          className="btn btn-secondary btn-sm"
          title="Sign Out"
        >
          <LogOut size={15} />
        </button>

      </div>
    </nav>
  );
};
