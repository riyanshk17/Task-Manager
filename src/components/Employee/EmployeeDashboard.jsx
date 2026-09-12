import React, { useState, useEffect, useRef } from 'react';
import { 
  UserCheck, Clock, CheckCircle2, AlertCircle, Calendar, 
  MessageSquare, ArrowRight, Search, Check, Play, Filter,
  Paperclip, Image, FileText, FileSpreadsheet, Presentation, Download, UserMinus, Archive, File, BookOpen, CheckSquare
} from 'lucide-react';
import { TeamChatModal } from '../Common/TeamChat';
import { TaskChatModal } from '../Common/TaskChatModal';
import { TaskTimerModal, formatDuration } from '../Common/TaskTimerModal';
import { playNotificationChime } from '../../lib/notificationHelper';

export const TaskAttachmentsDisplay = ({ attachments }) => {
  if (!attachments || attachments.length === 0) return null;

  const getFileIcon = (category) => {
    switch (category) {
      case 'image': return <Image size={15} className="text-purple-400" />;
      case 'word': return <FileText size={15} className="text-blue-400" />;
      case 'excel': return <FileSpreadsheet size={15} className="text-emerald-400" />;
      case 'ppt': return <Presentation size={15} className="text-amber-400" />;
      case 'pdf': return <FileText size={15} className="text-red-400" />;
      default: return <Paperclip size={15} className="text-indigo-400" />;
    }
  };

  return (
    <div className="task-attachments-section" style={{ marginTop: '0.75rem', marginBottom: '0.75rem' }}>
      <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <Paperclip size={12} />
        <span>Attached Files ({attachments.length}):</span>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {attachments.map((file) => {
          const storedName = file.url ? file.url.split('/uploads/').pop() : '';
          const downloadUrl = storedName 
            ? `/api/tasks/download-attachment/${encodeURIComponent(storedName)}?name=${encodeURIComponent(file.fileName)}`
            : file.url;

          return (
            <div key={file.id || file.url} style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '8px',
              padding: '6px 10px',
              fontSize: '0.78rem',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              maxWidth: '100%'
            }}>
              {file.category === 'image' ? (
                <a href={file.url} target="_blank" rel="noopener noreferrer" title="View image">
                  <img src={file.url} alt={file.fileName} style={{ width: 28, height: 28, borderRadius: 4, objectFit: 'cover', cursor: 'pointer' }} />
                </a>
              ) : (
                getFileIcon(file.category)
              )}
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '140px', fontWeight: 500 }} title={file.fileName}>
                {file.fileName}
              </span>
              <a 
                href={downloadUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                download={file.fileName}
                style={{ color: 'var(--primary)', display: 'flex', alignItems: 'center', marginLeft: 'auto', padding: '2px' }}
                title="Download document"
              >
                <Download size={14} />
              </a>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const EmployeeDashboard = ({ user, activeTeam, onLeaveTeam, showToast, onUnreadCountChange, onRegisterOpenTeamChat }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');

  // Team Chat Modal State
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Task-Specific Chat State
  const [activeTaskChat, setActiveTaskChat] = useState(null);

  // In-Task Timer State
  const [activeTaskTimer, setActiveTaskTimer] = useState(null);

  // Permanent Archive Modal State
  const [isArchiveOpen, setIsArchiveOpen] = useState(false);
  const [archiveData, setArchiveData] = useState([]);

  // Notification & Unread Red Badge Tracking
  const [unreadTeamCount, setUnreadTeamCount] = useState(0);
  const [, setUnreadVersion] = useState(0);

  const knownTeamMsgIdsRef = useRef(null);
  const knownTaskChatMsgIdsRef = useRef(null);

  const getLocalReadMsgIds = (keySuffix) => {
    if (!user?.email) return new Set();
    try {
      const saved = localStorage.getItem(`tm_read_ids_${user.email}_${keySuffix}`);
      return saved ? new Set(JSON.parse(saved)) : new Set();
    } catch (e) {
      return new Set();
    }
  };

  const addLocalReadMsgIds = (keySuffix, idsArray) => {
    if (!user?.email || !idsArray || idsArray.length === 0) return;
    try {
      const existing = getLocalReadMsgIds(keySuffix);
      idsArray.forEach(id => existing.add(id));
      localStorage.setItem(`tm_read_ids_${user.email}_${keySuffix}`, JSON.stringify(Array.from(existing)));
    } catch (e) {}
  };

  useEffect(() => {
    if (onRegisterOpenTeamChat) {
      onRegisterOpenTeamChat(() => {
        markTeamChatAsRead();
        setIsChatOpen(true);
      });
    }
  }, [activeTeam, onRegisterOpenTeamChat]);

  const markTeamChatAsRead = async () => {
    setUnreadTeamCount(0);
    if (onUnreadCountChange) onUnreadCountChange(0);
    if (!activeTeam?.id || !user?.email) return;

    try {
      const res = await fetch(`/api/chat/messages?teamId=${activeTeam.id}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.messages)) {
        addLocalReadMsgIds(`team_${activeTeam.id}`, data.messages.map(m => m.id));
      }
    } catch (e) {}

    try {
      await fetch('/api/chat/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId: activeTeam.id, userEmail: user.email })
      });
    } catch (err) {
      // Silent catch
    }
  };

  const markTaskChatAsRead = async (task) => {
    if (!task?.id || !user?.email) return;
    if (Array.isArray(task.taskChat)) {
      addLocalReadMsgIds(`task_${task.id}`, task.taskChat.map(m => m.id));
    }
    try {
      await fetch(`/api/tasks/${task.id}/chat/read`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail: user.email })
      });
    } catch (err) {
      // Silent catch
    }
    setUnreadVersion(v => v + 1);
  };

  const getUnreadTaskChatCount = (task) => {
    if (!task?.taskChat || !user?.email) return 0;
    if (activeTaskChat?.id === task.id) return 0;
    const cleanEmail = user.email.toLowerCase();
    const localTaskReadSet = getLocalReadMsgIds(`task_${task.id}`);
    return task.taskChat.filter(msg => {
      const sender = msg.senderEmail ? msg.senderEmail.toLowerCase() : '';
      if (sender === cleanEmail) return false;
      if (localTaskReadSet.has(msg.id)) return false;
      const readByList = Array.isArray(msg.readBy) ? msg.readBy.map(e => e.toLowerCase()) : [];
      return !readByList.includes(cleanEmail);
    }).length;
  };

  const checkTeamChatNotifications = async () => {
    if (!activeTeam?.id || !user?.email) return;
    try {
      const cleanEmail = user.email.toLowerCase();
      const res = await fetch(`/api/chat/messages?teamId=${activeTeam.id}&userEmail=${user.email}`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.messages)) {
        const localReadSet = getLocalReadMsgIds(`team_${activeTeam.id}`);

        if (isChatOpen) {
          addLocalReadMsgIds(`team_${activeTeam.id}`, data.messages.map(m => m.id));
          setUnreadTeamCount(0);
          if (onUnreadCountChange) onUnreadCountChange(0);
          fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId: activeTeam.id, userEmail: user.email })
          }).catch(() => {});
        } else {
          const unread = data.messages.filter(m => {
            const sender = m.senderEmail ? m.senderEmail.toLowerCase() : '';
            if (sender === cleanEmail) return false;
            if (localReadSet.has(m.id)) return false;
            const readByList = Array.isArray(m.readBy) ? m.readBy.map(e => e.toLowerCase()) : [];
            return !readByList.includes(cleanEmail);
          });
          setUnreadTeamCount(unread.length);
          if (onUnreadCountChange) onUnreadCountChange(unread.length);
        }

        if (knownTeamMsgIdsRef.current === null) {
          // First load after login: mark all existing messages as seen locally
          // so they don't show as "unread" on re-login
          knownTeamMsgIdsRef.current = new Set(data.messages.map(m => m.id));
          // Call server read endpoint to persist read status
          fetch('/api/chat/read', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ teamId: activeTeam.id, userEmail: user.email })
          }).catch(() => {});
          addLocalReadMsgIds(`team_${activeTeam.id}`, data.messages.map(m => m.id));
          // After marking as read, the unread count should be 0
          setUnreadTeamCount(0);
          if (onUnreadCountChange) onUnreadCountChange(0);
        } else {
          data.messages.forEach(msg => {
            if (!knownTeamMsgIdsRef.current.has(msg.id)) {
              knownTeamMsgIdsRef.current.add(msg.id);
              if (msg.senderEmail.toLowerCase() !== cleanEmail) {
                playNotificationChime();
                if (showToast) {
                  showToast(`💬 Team Chat from ${msg.senderName}: "${msg.text.substring(0, 45)}${msg.text.length > 45 ? '...' : ''}"`, 'info');
                }
              }
            }
          });
        }
      }
    } catch (err) {
      // Ignore silent error
    }
  };

  const checkTaskChatNotifications = (newTasksList) => {
    if (!newTasksList || !user?.email) return;

    if (activeTaskChat?.id) {
      const activeTask = newTasksList.find(t => t.id === activeTaskChat.id);
      if (activeTask?.taskChat && knownTaskChatMsgIdsRef.current) {
        activeTask.taskChat.forEach(m => knownTaskChatMsgIdsRef.current.add(m.id));
      }
    }

    setUnreadVersion(v => v + 1);

    if (knownTaskChatMsgIdsRef.current === null) {
      const initialSet = new Set();
      newTasksList.forEach(t => {
        if (Array.isArray(t.taskChat)) {
          t.taskChat.forEach(m => initialSet.add(m.id));
        }
      });
      knownTaskChatMsgIdsRef.current = initialSet;
    } else {
      newTasksList.forEach(t => {
        if (Array.isArray(t.taskChat)) {
          t.taskChat.forEach(msg => {
            if (!knownTaskChatMsgIdsRef.current.has(msg.id)) {
              knownTaskChatMsgIdsRef.current.add(msg.id);
              if (msg.senderEmail.toLowerCase() !== user.email.toLowerCase()) {
                playNotificationChime();
                if (showToast) {
                  const contentSnippet = msg.text ? `"${msg.text.substring(0, 40)}${msg.text.length > 40 ? '...' : ''}"` : '📎 File Attachment';
                  showToast(`💬 Task Chat on "${t.title}" from ${msg.senderName}: ${contentSnippet}`, 'info');
                }
              }
            }
          });
        }
      });
    }
  };

  // Fetch tasks assigned specifically to this employee
  const fetchMyTasks = async (isSilent = false) => {
    if (!activeTeam?.id || !user?.email) return;
    if (!isSilent) setLoading(true);
    try {
      const res = await fetch(`/api/tasks?teamId=${activeTeam.id}&assignedTo=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (res.ok) {
        checkTaskChatNotifications(data.tasks || []);
        setTasks(data.tasks || []);
      }
    } catch (err) {
      if (!isSilent) showToast('Error fetching your assigned tasks.', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchPermanentArchive = async () => {
    if (!activeTeam?.id || !user?.email) return;
    try {
      const res = await fetch(`/api/tasks/archive?teamId=${activeTeam.id}&userEmail=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      if (res.ok) {
        setArchiveData(data.archive || []);
      }
    } catch (err) {
      showToast('Error loading permanent archive.', 'error');
    }
  };

  useEffect(() => {
    if (activeTeam && user) {
      fetchMyTasks();
      checkTeamChatNotifications();
      const interval = setInterval(() => {
        fetchMyTasks(true);
        checkTeamChatNotifications();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [activeTeam, user]);

  useEffect(() => {
    if (isChatOpen) {
      markTeamChatAsRead();
      checkTeamChatNotifications();
    }
  }, [isChatOpen]);

  useEffect(() => {
    if (activeTaskChat) {
      markTaskChatAsRead(activeTaskChat);
    }
  }, [activeTaskChat]);

  // Quick Status Update
  const handleUpdateStatus = async (taskId, newStatus) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(`Task status updated to "${newStatus}"!`, 'success');
        fetchMyTasks();
      } else {
        showToast(data.error || 'Failed to update status.', 'error');
      }
    } catch (err) {
      showToast('Server error updating task status.', 'error');
    }
  };

  // Interactive Work Tracker: Toggle SOP sub-task step
  const handleToggleSopStep = async (task, stepText) => {
    const currentCompleted = task.completedSopSteps || [];
    const isCompleted = currentCompleted.includes(stepText);
    const updatedCompleted = isCompleted
      ? currentCompleted.filter(s => s !== stepText)
      : [...currentCompleted, stepText];

    try {
      const res = await fetch(`/api/tasks/${task.id}/sop-progress`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completedSopSteps: updatedCompleted })
      });

      const data = await res.json();
      if (res.ok) {
        fetchMyTasks(true);
        if (data.task?.status === 'Completed' && task.status !== 'Completed') {
          showToast('All SOP steps finished! Task marked as Completed 🎉', 'success');
        }
      } else {
        showToast(data.error || 'Failed to update SOP progress.', 'error');
      }
    } catch (err) {
      showToast('Server error updating SOP progress.', 'error');
    }
  };

  // Filter My Tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesTab = activeTab === 'All' || task.status.toLowerCase() === activeTab.toLowerCase();
    return matchesSearch && matchesTab;
  });

  const today = new Date().toISOString().split('T')[0];
  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;
  const dueTodayCount = tasks.filter(t => t.dueDate === today && t.status !== 'Completed').length;

  return (
    <div>
      {/* Header Area */}
      <div className="dashboard-header">
        <div className="header-title-area">
          {/* Member Identity Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            {/* Avatar */}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid #10b981', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', background: 'rgba(16, 185, 129, 0.12)',
                border: '2px solid #10b981', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 800, color: '#10b981', flexShrink: 0, letterSpacing: '-1px'
              }}>
                {(user?.name || 'U').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <UserCheck className="text-emerald-400" size={22} />
                {user?.name || 'Team Member'}
                <div className="live-indicator" style={{ marginLeft: '0.3rem', fontSize: '0.68rem' }}>
                  <div className="live-dot" />
                  <span>LIVE SYNC</span>
                </div>
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '2px' }}>
                <span style={{
                  background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#10b981', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700
                }}>
                  👤 Team Member
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {activeTeam?.name} • My assigned tasks
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="action-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary btn-sm"
            style={{ position: 'relative' }}
            onClick={() => {
              markTeamChatAsRead();
              setIsChatOpen(true);
            }}
            title="Open Team Communication Chat"
          >
            <MessageSquare size={14} className="text-indigo-400" />
            <span>Team Chat</span>
            {unreadTeamCount > 0 && (
              <span className="chat-unread-badge">{unreadTeamCount > 99 ? '99+' : unreadTeamCount}</span>
            )}
          </button>

          <button 
            className="btn btn-secondary btn-sm"
            onClick={() => {
              fetchPermanentArchive();
              setIsArchiveOpen(true);
            }}
            title="View Permanent Assigned Tasks Database Archive"
          >
            <Archive size={14} className="text-indigo-400" />
            <span>Permanent Archive DB</span>
          </button>

          {onLeaveTeam && activeTeam && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => {
                if (window.confirm(`Are you sure you want to leave the team "${activeTeam.name}"?`)) {
                  onLeaveTeam(activeTeam.id);
                }
              }}
              style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)' }}
            >
              <UserMinus size={14} />
              <span>Leave Team</span>
            </button>
          )}
        </div>
      </div>

      {/* Employee Metrics Grid */}
      <div className="stats-grid">
        <div className="glass-panel stat-card" style={{ '--card-accent': '#10b981' }}>
          <div className="stat-icon">
            <UserCheck size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{tasks.length}</span>
            <span className="stat-label">Total Assigned to Me</span>
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ '--card-accent': '#6366f1' }}>
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{pendingCount + inProgressCount}</span>
            <span className="stat-label">Active Tasks</span>
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ '--card-accent': '#06b6d4' }}>
          <div className="stat-icon">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{completedCount}</span>
            <span className="stat-label">Completed Tasks</span>
          </div>
        </div>

        {dueTodayCount > 0 && (
          <div className="glass-panel stat-card" style={{ '--card-accent': '#f59e0b' }}>
            <div className="stat-icon">
              <Calendar size={24} />
            </div>
            <div className="stat-info">
              <span className="stat-value">{dueTodayCount}</span>
              <span className="stat-label">Due Today</span>
            </div>
          </div>
        )}
      </div>

      {/* Filter and Tab Bar */}
      <div className="glass-panel filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text"
            className="search-input"
            placeholder="Search my assigned tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="auth-tabs" style={{ marginBottom: 0 }}>
          {['All', 'Pending', 'In Progress', 'Completed'].map(tab => (
            <button
              key={tab}
              className={`auth-tab ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Task Cards Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          Loading your assigned tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: 48, height: 48, background: 'rgba(255, 255, 255, 0.05)' }}>
            <CheckCircle2 size={24} className="text-emerald-400" />
          </div>
          <h3>No Assigned Tasks</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            You have no tasks matching this filter assigned to email <strong>{user.email}</strong>.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))', gap: '1.5rem' }}>
          {filteredTasks.map(task => {
            const sopSteps = task.sopSteps || [];
            const completedSopSteps = task.completedSopSteps || [];
            const completedCount = completedSopSteps.length;
            const totalCount = sopSteps.length;
            const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
            const chatMessageCount = task.taskChat ? task.taskChat.length : 0;

            const unreadCount = getUnreadTaskChatCount(task);

            return (
              <div key={task.id} className="glass-panel task-card" style={{ cursor: 'default' }}>
                <div className="task-card-header">
                  <div className="task-title">{task.title}</div>
                  <span className={`priority-badge ${task.priority}`}>
                    {task.priority}
                  </span>
                </div>

                {task.rawFileStream && (
                  <div style={{ margin: '4px 0 8px 0' }}>
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.18)', color: '#818cf8', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                      {task.rawFileStream}
                    </span>
                  </div>
                )}

                {task.description && (
                  <div className="task-desc">{task.description}</div>
                )}

                {/* Interactive SOP Work Tracker Checklist for Member */}
                {totalCount > 0 && (
                  <div style={{ margin: '0.75rem 0', padding: '12px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '10px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                      <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--accent-emerald)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <CheckSquare size={15} />
                        <span>Work Tracker SOP ({completedCount}/{totalCount} Done)</span>
                      </div>
                      <span style={{ fontSize: '0.75rem', fontWeight: 700, color: progressPercent === 100 ? '#10b981' : '#6366f1' }}>
                        {progressPercent}%
                      </span>
                    </div>

                    {/* SOP Progress Bar */}
                    <div style={{ width: '100%', height: '7px', background: 'rgba(255, 255, 255, 0.12)', borderRadius: '4px', overflow: 'hidden', marginBottom: '10px' }}>
                      <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? 'linear-gradient(90deg, #10b981, #34d399)' : 'linear-gradient(90deg, #6366f1, #06b6d4)', transition: 'width 0.3s ease' }} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {sopSteps.map((step, idx) => {
                        const isDone = completedSopSteps.includes(step);
                        return (
                          <label key={idx} style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px', 
                            cursor: 'pointer', 
                            fontSize: '0.82rem', 
                            color: isDone ? 'var(--text-muted)' : 'var(--text-main)', 
                            textDecoration: isDone ? 'line-through' : 'none',
                            background: isDone ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                            padding: '4px 8px',
                            borderRadius: '6px',
                            transition: 'all 0.15s ease'
                          }}>
                            <input 
                              type="checkbox" 
                              checked={isDone}
                              onChange={() => handleToggleSopStep(task, step)}
                              style={{ accentColor: '#10b981', width: '15px', height: '15px', cursor: 'pointer' }}
                            />
                            <span style={{ fontWeight: isDone ? 400 : 500 }}>{step}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Render Attachments in Member POV */}
                <TaskAttachmentsDisplay attachments={task.attachments} />

                <div className="task-card-footer" style={{ borderTop: '1px solid var(--border-subtle)', marginBottom: '1rem', paddingTop: '0.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                  <div className={`due-date ${task.dueDate < today && task.status !== 'Completed' ? 'overdue' : ''}`}>
                    <Calendar size={14} />
                    <span>Due: {task.dueDate}</span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {formatDuration(task.totalTimeSpent || 0)}
                    </span>

                    <span className={`status-pill ${task.status.replace(' ', '-')}`}>
                      {task.status}
                    </span>
                  </div>
                </div>

                {/* Status Action Buttons & Task Chat for Member */}
                <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                  <button 
                    className="btn btn-secondary btn-sm"
                    style={{ background: 'rgba(99, 102, 241, 0.12)', color: '#818cf8', borderColor: 'rgba(99, 102, 241, 0.3)', flex: 1 }}
                    onClick={() => setActiveTaskTimer(task)}
                    title="Open Pomodoro & Stopwatch Timer for Deep Work"
                  >
                    <Clock size={14} />
                    <span>Focus Timer</span>
                  </button>

                  {task.status === 'Pending' && (
                    <button 
                      className="btn btn-primary btn-sm" 
                      style={{ flex: 1 }}
                      onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                    >
                      <Play size={14} />
                      <span>Start Work</span>
                    </button>
                  )}

                  {task.status === 'In Progress' && (
                    <button 
                      className="btn btn-success btn-sm" 
                      style={{ flex: 1 }}
                      onClick={() => handleUpdateStatus(task.id, 'Completed')}
                    >
                      <Check size={14} />
                      <span>Mark Complete</span>
                    </button>
                  )}

                  {task.status === 'Completed' && (
                    <button 
                      className="btn btn-secondary btn-sm" 
                      style={{ flex: 1 }}
                      onClick={() => handleUpdateStatus(task.id, 'In Progress')}
                    >
                      <span>Reopen Task</span>
                    </button>
                  )}

                  <button 
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, position: 'relative' }}
                    onClick={() => {
                      markTaskChatAsRead(task);
                      setActiveTaskChat(task);
                    }}
                    title="Open task specific chat with Manager and attach files"
                  >
                    <MessageSquare size={14} className="text-indigo-400" />
                    <span>Task Chat ({chatMessageCount})</span>
                    {unreadCount > 0 && (
                      <span className="chat-unread-badge">{unreadCount > 99 ? '99+' : unreadCount}</span>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Team Chat Modal */}
      <TeamChatModal 
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        team={activeTeam}
        currentUser={user}
        currentRole="employee"
        showToast={showToast}
      />

      {/* Task Specific Chat Drawer / Modal */}
      <TaskChatModal 
        isOpen={!!activeTaskChat}
        onClose={() => setActiveTaskChat(null)}
        task={activeTaskChat}
        currentUser={user}
        currentRole="employee"
        showToast={showToast}
      />

      {/* Task Focus Timer Modal */}
      <TaskTimerModal
        isOpen={!!activeTaskTimer}
        onClose={() => setActiveTaskTimer(null)}
        task={activeTaskTimer}
        team={activeTeam}
        currentUser={user}
        showToast={showToast}
        onTaskUpdated={(updatedTask) => {
          fetchTasks();
        }}
      />

      {/* Permanent Task Archive Modal */}
      {isArchiveOpen && (
        <div className="modal-overlay" onClick={() => setIsArchiveOpen(false)}>
          <div className="glass-panel modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '750px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Archive size={20} className="text-indigo-400" />
                <span>Permanent Assigned Tasks DB Archive</span>
              </div>
              <button className="close-btn" onClick={() => setIsArchiveOpen(false)}>×</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Immutable audit database log containing every task assigned to you permanently.
            </p>

            {archiveData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No permanent archive records found for your account.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {archiveData.map((item) => (
                  <div key={item.archiveId} style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-subtle)', borderRadius: '8px', padding: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                      <strong style={{ fontSize: '0.95rem' }}>{item.title}</strong>
                      <span style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px' }}>
                        {item.action}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', margin: '4px 0' }}>{item.description || 'No description provided.'}</p>
                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '6px', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Due: {item.dueDate} • Priority: {item.priority}</span>
                      <span>Archived At: {new Date(item.timestamp).toLocaleString()}</span>
                    </div>
                    {item.attachments && item.attachments.length > 0 && (
                      <TaskAttachmentsDisplay attachments={item.attachments} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
