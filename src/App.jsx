import React, { useState, useEffect } from 'react';
import { AuthModal } from './components/Auth/AuthModal';
import { TeamGateway } from './components/Auth/TeamGateway';
import { Navbar } from './components/Common/Navbar';
import { ManagerDashboard } from './components/Manager/ManagerDashboard';
import { EmployeeDashboard } from './components/Employee/EmployeeDashboard';
import { TeamManagementModal } from './components/Manager/TeamManagementModal';
import { SettingsModal } from './components/Common/SettingsModal';
import { Toast } from './components/UI/Toast';
import { AnimatedBackground } from './components/Common/AnimatedBackground';

export function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('tm_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [userTeams, setUserTeams] = useState(() => {
    const saved = localStorage.getItem('tm_userTeams');
    return saved ? JSON.parse(saved) : [];
  });

  const [activeTeam, setActiveTeam] = useState(() => {
    const saved = localStorage.getItem('tm_activeTeam');
    return saved ? JSON.parse(saved) : null;
  });

  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('tm_theme') || 'light';
  });

  const [currentRole, setCurrentRole] = useState('employee');
  const [toast, setToast] = useState(null);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [showGatewayModal, setShowGatewayModal] = useState(false);

  // Global Chat Notification state
  const [unreadTeamCount, setUnreadTeamCount] = useState(0);
  const openTeamChatFnRef = React.useRef(null);

  // Sync theme to document element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('tm_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Sync state to localStorage
  useEffect(() => {
    if (user) localStorage.setItem('tm_user', JSON.stringify(user));
    else localStorage.removeItem('tm_user');
  }, [user]);

  useEffect(() => {
    if (userTeams.length > 0) localStorage.setItem('tm_userTeams', JSON.stringify(userTeams));
    else localStorage.removeItem('tm_userTeams');
  }, [userTeams]);

  useEffect(() => {
    if (activeTeam) localStorage.setItem('tm_activeTeam', JSON.stringify(activeTeam));
    else localStorage.removeItem('tm_activeTeam');
  }, [activeTeam]);

  // Role Enforcement: STRICTLY based on team ownership or explicit team member role.
  // defaultRole is NEVER used when inside a team — a user who joined via code is always a member
  // regardless of what role they chose at registration.
  useEffect(() => {
    if (user) {
      if (activeTeam) {
        const isOwner = activeTeam.ownerEmail
          ? activeTeam.ownerEmail.toLowerCase() === user.email.toLowerCase()
          : false;
        const memberObj = Array.isArray(activeTeam.members)
          ? activeTeam.members.find(m => m.email && m.email.toLowerCase() === user.email.toLowerCase())
          : null;
        // Only owner or a member explicitly assigned role='manager' gets manager dashboard
        const isManager = isOwner || (memberObj && memberObj.role === 'manager');
        setCurrentRole(isManager ? 'manager' : 'employee');
      } else {
        // No team yet — use defaultRole only in this case
        setCurrentRole(user.defaultRole === 'manager' ? 'manager' : 'employee');
      }
    }
  }, [activeTeam, user]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  const handleLoginSuccess = (userData, teams) => {
    setUser(userData);
    setUserTeams(teams || []);
    if (teams && teams.length > 0) {
      const firstTeam = teams[0];
      setActiveTeam(firstTeam);
      const isOwner = firstTeam.ownerEmail
        ? firstTeam.ownerEmail.toLowerCase() === userData.email.toLowerCase()
        : false;
      const memberObj = Array.isArray(firstTeam.members)
        ? firstTeam.members.find(m => m.email && m.email.toLowerCase() === userData.email.toLowerCase())
        : null;
      // Only owner or explicitly assigned team manager gets manager dashboard
      const isManager = isOwner || (memberObj && memberObj.role === 'manager');
      setCurrentRole(isManager ? 'manager' : 'employee');
    } else {
      setActiveTeam(null);
      setCurrentRole(userData.defaultRole === 'manager' ? 'manager' : 'employee');
    }
  };

  const handleTeamJoined = (team, role) => {
    setActiveTeam(team);
    setUserTeams(prev => {
      const exists = prev.some(t => t.id === team.id);
      return exists ? prev.map(t => t.id === team.id ? team : t) : [...prev, team];
    });
    setCurrentRole(role || 'employee');
    setShowGatewayModal(false);
  };

  const handleSelectTeam = (teamId) => {
    const selected = userTeams.find(t => t.id === teamId);
    if (selected) {
      setActiveTeam(selected);
      const isOwner = selected.ownerEmail
        ? selected.ownerEmail.toLowerCase() === user.email.toLowerCase()
        : false;
      const memberObj = Array.isArray(selected.members)
        ? selected.members.find(m => m.email && m.email.toLowerCase() === user.email.toLowerCase())
        : null;
      // Only owner or explicitly assigned team manager gets manager dashboard
      const isManager = isOwner || (memberObj && memberObj.role === 'manager');
      setCurrentRole(isManager ? 'manager' : 'employee');
      showToast(`Switched to team workspace: ${selected.name}`, 'info');
    }
  };

  const handleLeaveTeam = async (teamId) => {
    if (!user || !teamId) return;
    try {
      const res = await fetch('/api/teams/leave', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId, userEmail: user.email })
      });
      const data = await res.json();
      if (!res.ok) {
        showToast(data.error || 'Failed to leave team.', 'error');
        return;
      }

      showToast(data.message || 'Successfully left team.', 'success');
      const updatedTeams = data.userTeams || [];
      setUserTeams(updatedTeams);

      if (updatedTeams.length > 0) {
        const nextTeam = updatedTeams[0];
        setActiveTeam(nextTeam);
        const isOwner = nextTeam.ownerEmail.toLowerCase() === user.email.toLowerCase();
        setCurrentRole(isOwner ? 'manager' : 'employee');
      } else {
        setActiveTeam(null);
        setShowGatewayModal(true);
      }
    } catch (err) {
      showToast('Error leaving team. Please try again.', 'error');
    }
  };

  const handleLogout = () => {
    if (!window.confirm('Are you sure you want to log out of TaskMaster Pro?')) return;
    setUser(null);
    setUserTeams([]);
    setActiveTeam(null);
    localStorage.removeItem('tm_user');
    localStorage.removeItem('tm_userTeams');
    localStorage.removeItem('tm_activeTeam');
    showToast('Logged out successfully.', 'info');
  };

  return (
    <>
      <AnimatedBackground />
      <div className="app-container">
        <Toast toast={toast} onClose={() => setToast(null)} />

        {!user ? (
          <AuthModal onLoginSuccess={handleLoginSuccess} showToast={showToast} theme={theme} onToggleTheme={toggleTheme} />
        ) : !activeTeam || showGatewayModal ? (
          <div style={{ position: 'relative' }}>
            {userTeams.length > 0 && (
              <div style={{ position: 'absolute', top: 20, right: 20, zIndex: 100 }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowGatewayModal(false)}>
                  Back to Dashboard
                </button>
              </div>
            )}
            <TeamGateway user={user} onTeamJoined={handleTeamJoined} showToast={showToast} theme={theme} onToggleTheme={toggleTheme} />
          </div>
        ) : (
          <>
            <Navbar 
              user={user}
              activeTeam={activeTeam}
              userTeams={userTeams}
              currentRole={currentRole}
              theme={theme}
              onToggleTheme={toggleTheme}
              onSelectTeam={handleSelectTeam}
              onOpenGateway={() => setShowGatewayModal(true)}
              onOpenTeamModal={() => setIsTeamModalOpen(true)}
              onOpenSettings={() => setIsSettingsOpen(true)}
              onLeaveTeam={handleLeaveTeam}
              onLogout={handleLogout}
              showToast={showToast}
              unreadTeamCount={unreadTeamCount}
              onOpenChat={() => {
                if (openTeamChatFnRef.current) {
                  openTeamChatFnRef.current();
                }
              }}
            />
            <main className="main-content">
              {currentRole === 'manager' ? (
                <ManagerDashboard 
                  user={user}
                  activeTeam={activeTeam}
                  onOpenTeamModal={() => setIsTeamModalOpen(true)}
                  onLeaveTeam={handleLeaveTeam}
                  showToast={showToast}
                  onUnreadCountChange={setUnreadTeamCount}
                  onRegisterOpenTeamChat={(fn) => { openTeamChatFnRef.current = fn; }}
                />
              ) : (
                <EmployeeDashboard 
                  user={user}
                  activeTeam={activeTeam}
                  onLeaveTeam={handleLeaveTeam}
                  showToast={showToast}
                  onUnreadCountChange={setUnreadTeamCount}
                  onRegisterOpenTeamChat={(fn) => { openTeamChatFnRef.current = fn; }}
                />
              )}
            </main>

            <TeamManagementModal 
              isOpen={isTeamModalOpen}
              onClose={() => setIsTeamModalOpen(false)}
              team={activeTeam}
              onLeaveTeam={handleLeaveTeam}
              showToast={showToast}
            />

            <SettingsModal
              isOpen={isSettingsOpen}
              onClose={() => setIsSettingsOpen(false)}
              user={user}
              onUpdateUser={(updatedUser) => {
                setUser(updatedUser);
              }}
              theme={theme}
              onToggleTheme={toggleTheme}
              onLogout={handleLogout}
              showToast={showToast}
            />
          </>
        )}
      </div>
    </>
  );
};

export default App;
