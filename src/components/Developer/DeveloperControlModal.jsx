import React, { useState, useEffect } from 'react';
import { Shield, ShieldAlert, ShieldCheck, UserCheck, UserX, UserPlus, Search, RefreshCw, X, Award, Users, Layers, AlertCircle, CheckCircle2 } from 'lucide-react';

export const DeveloperControlModal = ({ isOpen, onClose, user, showToast }) => {
  const [usersList, setUsersList] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Quick role assignment form
  const [targetEmail, setTargetEmail] = useState('');
  const [actionRole, setActionRole] = useState('admin');
  const [submittingRole, setSubmittingRole] = useState(false);

  const fetchDeveloperData = async () => {
    if (!user || user.email.toLowerCase() !== 'malviyariyansh11@gmail.com') return;
    setLoading(true);
    try {
      const res = await fetch(`/api/developer/users?requesterEmail=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      setLoading(false);

      if (res.ok) {
        setUsersList(data.users || []);
        setStats(data.stats || null);
      } else {
        if (showToast) showToast(data.error || 'Failed to fetch developer system data.', 'error');
      }
    } catch (err) {
      setLoading(false);
      if (showToast) showToast('Network error while connecting to developer portal.', 'error');
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchDeveloperData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAssignRole = async (emailToUpdate, newRoleToAssign) => {
    const email = (emailToUpdate || targetEmail).trim();
    if (!email) {
      if (showToast) showToast('Please enter a user email address.', 'error');
      return;
    }

    setSubmittingRole(true);
    try {
      const res = await fetch('/api/developer/change-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterEmail: user.email,
          targetEmail: email,
          newRole: newRoleToAssign || actionRole
        })
      });

      const data = await res.json();
      setSubmittingRole(false);

      if (res.ok) {
        if (showToast) showToast(data.message || 'User role updated successfully!', 'success');
        setTargetEmail('');
        fetchDeveloperData();
      } else {
        if (showToast) showToast(data.error || 'Could not update user role.', 'error');
      }
    } catch (err) {
      setSubmittingRole(false);
      if (showToast) showToast('Error updating role. Please try again.', 'error');
    }
  };

  const handleToggleBlock = async (targetUserEmail) => {
    try {
      const res = await fetch('/api/developer/toggle-block', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterEmail: user.email,
          targetEmail: targetUserEmail
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (showToast) showToast(data.message, 'info');
        fetchDeveloperData();
      } else {
        if (showToast) showToast(data.error || 'Failed to update account status.', 'error');
      }
    } catch (err) {
      if (showToast) showToast('Error updating account block status.', 'error');
    }
  };

  const filteredUsers = usersList.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.role.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="modal-overlay">
      <div className="glass-panel modal-container" style={{ maxWidth: '840px', padding: '2rem' }}>
        <div className="modal-header" style={{ borderBottom: '1px solid var(--border-subtle)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: 44, height: 44, borderRadius: '12px', background: 'rgba(99, 102, 241, 0.2)', border: '1px solid rgba(99, 102, 241, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#818cf8' }}>
              <ShieldCheck size={26} />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 className="modal-title" style={{ margin: 0 }}>System Developer Controls</h3>
                <span className="role-badge manager" style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.5)' }}>
                  DEVELOPER ACCESS
                </span>
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: '2px 0 0 0' }}>
                System-wide management portal for Developer <strong style={{ color: 'var(--text-main)' }}>Riyansh Malviya</strong>
              </p>
            </div>
          </div>

          <button onClick={onClose} className="close-btn">
            <X size={20} />
          </button>
        </div>

        {/* Stats Row */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
            <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>TOTAL USERS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)' }}>{stats.totalUsers}</div>
            </div>
            <div style={{ background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#fcd34d', fontWeight: 600 }}>ADMINS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fbbf24' }}>{stats.admins}</div>
            </div>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#6ee7b7', fontWeight: 600 }}>MEMBERS</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#34d399' }}>{stats.members}</div>
            </div>
            <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '10px', padding: '12px 16px' }}>
              <div style={{ fontSize: '0.75rem', color: '#fca5a5', fontWeight: 600 }}>BLOCKED</div>
              <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171' }}>{stats.blocked}</div>
            </div>
          </div>
        )}

        {/* Quick Assign Admin / Member Role Form */}
        <div style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', borderRadius: '12px', padding: '1.25rem', marginBottom: '1.75rem' }}>
          <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-main)', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserPlus size={18} className="text-indigo-400" />
            <span>Assign System Role via Email ID</span>
          </div>
          <form onSubmit={(e) => { e.preventDefault(); handleAssignRole(); }} style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input 
              type="email"
              placeholder="Enter user email (e.g. admin@company.com)"
              value={targetEmail}
              onChange={e => setTargetEmail(e.target.value)}
              className="form-input"
              style={{ flex: 2, minWidth: '240px' }}
              required
            />
            <select 
              value={actionRole} 
              onChange={e => setActionRole(e.target.value)}
              className="form-select"
              style={{ flex: 1, minWidth: '130px' }}
            >
              <option value="admin">👑 Make Admin</option>
              <option value="member">👤 Set Member</option>
            </select>
            <button 
              type="submit" 
              className="btn btn-primary"
              disabled={submittingRole}
              style={{ minWidth: '140px' }}
            >
              {submittingRole ? 'Updating...' : 'Update Role'}
            </button>
          </form>
        </div>

        {/* Search & User Accounts Table */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem', flexWrap: 'wrap', gap: '10px' }}>
            <h4 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Users size={18} /> Registered System Users ({filteredUsers.length})
            </h4>

            <div style={{ position: 'relative', minWidth: '240px' }}>
              <Search size={16} className="search-icon" />
              <input 
                type="text" 
                placeholder="Search user by name, email, role..." 
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="search-input"
                style={{ paddingLeft: '2.4rem' }}
              />
            </div>
          </div>

          <div style={{ border: '1px solid var(--border-subtle)', borderRadius: '12px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                  <th style={{ padding: '12px 16px' }}>User Details</th>
                  <th style={{ padding: '12px 16px' }}>System Role</th>
                  <th style={{ padding: '12px 16px' }}>Status</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
                      No registered user accounts found.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{u.name}</div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{u.email}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.role === 'developer' && (
                          <span className="role-badge manager" style={{ background: 'rgba(99, 102, 241, 0.25)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.5)' }}>
                            🛡️ DEVELOPER
                          </span>
                        )}
                        {u.role === 'admin' && (
                          <span className="role-badge manager" style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fcd34d', border: '1px solid rgba(245, 158, 11, 0.4)' }}>
                            👑 ADMIN
                          </span>
                        )}
                        {u.role === 'member' && (
                          <span className="role-badge employee" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                            👤 MEMBER
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        {u.isBlocked ? (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#fca5a5', background: 'rgba(239, 68, 68, 0.15)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(239, 68, 68, 0.3)' }}>
                            BLOCKED
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#86efac', background: 'rgba(34, 197, 94, 0.15)', padding: '3px 10px', borderRadius: '12px', border: '1px solid rgba(34, 197, 94, 0.3)' }}>
                            ACTIVE
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        {u.email.toLowerCase() === 'malviyariyansh11@gmail.com' ? (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-dim)', italic: true }}>Primary Developer</span>
                        ) : (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                            {u.role === 'admin' ? (
                              <button 
                                onClick={() => handleAssignRole(u.email, 'member')} 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                title="Demote to Member"
                              >
                                Set Member
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleAssignRole(u.email, 'admin')} 
                                className="btn btn-primary" 
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                title="Promote to Admin"
                              >
                                Make Admin
                              </button>
                            )}

                            <button 
                              onClick={() => handleToggleBlock(u.email)} 
                              style={{ 
                                background: u.isBlocked ? 'rgba(34, 197, 94, 0.2)' : 'rgba(239, 68, 68, 0.2)', 
                                color: u.isBlocked ? '#86efac' : '#fca5a5', 
                                border: u.isBlocked ? '1px solid rgba(34, 197, 94, 0.4)' : '1px solid rgba(239, 68, 68, 0.4)', 
                                padding: '4px 10px', 
                                borderRadius: '6px', 
                                fontSize: '0.75rem', 
                                fontWeight: 600, 
                                cursor: 'pointer' 
                              }}
                            >
                              {u.isBlocked ? 'Unblock' : 'Block'}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};
