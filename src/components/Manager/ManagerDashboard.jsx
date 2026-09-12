import React, { useState, useEffect, useRef } from 'react';
import { 
  PlusCircle, Users, CheckCircle2, Clock, AlertCircle, LayoutGrid, 
  List, Search, Filter, Edit3, Trash2, ShieldCheck, Mail, Calendar, Flag, Eye, Archive, UserMinus, MessageSquare, BookOpen, Layers
} from 'lucide-react';
import { TaskModal } from './TaskModal';
import { TeamManagementModal } from './TeamManagementModal';
import { ManagerTaskBankModal } from './ManagerTaskBankModal';
import { TaskAttachmentsDisplay } from '../Employee/EmployeeDashboard';
import { TeamChatModal } from '../Common/TeamChat';
import { TaskChatModal } from '../Common/TaskChatModal';
import { formatDuration } from '../Common/TaskTimerModal';
import { playNotificationChime } from '../../lib/notificationHelper';

export const ManagerDashboard = ({ user, activeTeam, onOpenTeamModal, onLeaveTeam, showToast, onUnreadCountChange, onRegisterOpenTeamChat }) => {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [teamMembers, setTeamMembers] = useState([]);
  
  // Filter States
  const [searchQuery, setSearchQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [viewMode, setViewMode] = useState('list'); // Default to single-line list view for multiple tasks

  // Modal States
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [isTaskBankOpen, setIsTaskBankOpen] = useState(false);
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState(null);

  // Task-Specific Chat State
  const [activeTaskChat, setActiveTaskChat] = useState(null);

  // Active Live Timers & Time Logs Inspection State
  const [activeTimers, setActiveTimers] = useState([]);
  const [selectedTimeLogsTask, setSelectedTimeLogsTask] = useState(null);

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

  const fetchActiveTimers = async () => {
    if (!activeTeam?.id) return;
    try {
      const res = await fetch(`/api/teams/${activeTeam.id}/active-timers`);
      const data = await res.json();
      if (res.ok && Array.isArray(data.activeTimers)) {
        setActiveTimers(data.activeTimers);
      }
    } catch (e) {}
  };

  // Fetch Tasks & Team Members for Team
  const fetchTasksAndTeam = async (isSilent = false) => {
    if (!activeTeam?.id) return;
    if (!isSilent) setLoading(true);
    try {
      const [tasksRes, teamRes] = await Promise.all([
        fetch(`/api/tasks?teamId=${activeTeam.id}`),
        fetch(`/api/teams/${activeTeam.id}`)
      ]);
      const tasksData = await tasksRes.json();
      const teamData = await teamRes.json();
      if (tasksRes.ok && tasksData.tasks) {
        checkTaskChatNotifications(tasksData.tasks);
        setTasks(prev => JSON.stringify(prev) === JSON.stringify(tasksData.tasks) ? prev : tasksData.tasks);
      }
      if (teamRes.ok && teamData.team?.members) {
        setTeamMembers(prev => JSON.stringify(prev) === JSON.stringify(teamData.team.members) ? prev : teamData.team.members);
      }
      fetchActiveTimers();
    } catch (err) {
      if (!isSilent) showToast('Error fetching tasks from server.', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  const fetchPermanentArchive = async () => {
    if (!activeTeam?.id) return;
    try {
      const res = await fetch(`/api/tasks/archive?teamId=${activeTeam.id}`);
      const data = await res.json();
      if (res.ok) {
        setArchiveData(data.archive || []);
      }
    } catch (err) {
      showToast('Error loading permanent task archive database.', 'error');
    }
  };

  useEffect(() => {
    if (activeTeam) {
      fetchTasksAndTeam();
      checkTeamChatNotifications();
      fetchActiveTimers();
      const interval = setInterval(() => {
        fetchTasksAndTeam(true);
        checkTeamChatNotifications();
        fetchActiveTimers();
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [activeTeam]);

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

  // Handle Create or Edit Task
  const handleSaveTask = async (taskPayload, taskId) => {
    try {
      const endpoint = taskId ? `/api/tasks/${taskId}` : '/api/tasks';
      const method = taskId ? 'PUT' : 'POST';

      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...taskPayload,
          teamId: activeTeam.id,
          createdBy: user.email
        })
      });

      const data = await res.json();
      if (res.ok) {
        showToast(taskId ? 'Task updated successfully!' : 'New Flipbook task assigned to team member!', 'success');
        setIsTaskModalOpen(false);
        setTaskToEdit(null);
        fetchTasksAndTeam();
      } else {
        showToast(data.error || 'Failed to save task.', 'error');
      }
    } catch (err) {
      showToast('Server error while saving task.', 'error');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId, title) => {
    if (!window.confirm(`Are you sure you want to delete task "${title}"?`)) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (res.ok) {
        showToast('Task deleted successfully.', 'success');
        fetchTasksAndTeam();
      }
    } catch (err) {
      showToast('Error deleting task.', 'error');
    }
  };

  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setIsTaskModalOpen(true);
  };

  const handleOpenEditModal = (task) => {
    setTaskToEdit(task);
    setIsTaskModalOpen(true);
  };

  // Filter Tasks
  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          task.assignedTo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAssignee = assigneeFilter === 'All' || task.assignedTo.toLowerCase() === assigneeFilter.toLowerCase();
    const matchesStatus = statusFilter === 'All' || task.status.toLowerCase() === statusFilter.toLowerCase();
    return matchesSearch && matchesAssignee && matchesStatus;
  });

  const today = new Date().toISOString().split('T')[0];
  const pendingCount = tasks.filter(t => t.status === 'Pending').length;
  const inProgressCount = tasks.filter(t => t.status === 'In Progress').length;
  const completedCount = tasks.filter(t => t.status === 'Completed').length;

  return (
    <div>
      {/* Executive Header Area */}
      <div className="dashboard-header">
        <div className="header-title-area">
          {/* Owner Identity Banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
            {/* Avatar */}
            {user?.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.name}
                style={{ width: '52px', height: '52px', borderRadius: '50%', objectFit: 'cover', border: '2px solid var(--primary)', flexShrink: 0 }}
              />
            ) : (
              <div style={{
                width: '52px', height: '52px', borderRadius: '50%', background: 'var(--primary-glow)',
                border: '2px solid var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 800, color: 'var(--primary)', flexShrink: 0, letterSpacing: '-1px'
              }}>
                {(user?.name || 'U').split(' ').map(p => p[0]).join('').substring(0, 2).toUpperCase()}
              </div>
            )}
            <div>
              <h1 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 800, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldCheck className="text-indigo-400" size={22} />
                {user?.name || 'Team Owner'}
                <div className="live-indicator" style={{ marginLeft: '0.3rem', fontSize: '0.68rem' }}>
                  <div className="live-dot" />
                  <span>LIVE SYNC</span>
                </div>
              </h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap', marginTop: '2px' }}>
                <span style={{
                  background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.35)',
                  color: 'var(--primary)', borderRadius: '20px', padding: '2px 10px', fontSize: '0.72rem', fontWeight: 700
                }}>
                  🛡️ Team Owner
                </span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {activeTeam?.name} • <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{activeTeam?.code}</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="action-bar" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="btn btn-secondary" 
            onClick={() => {
              markTeamChatAsRead();
              setIsChatOpen(true);
            }}
            title="Open Team Communication Chat"
            style={{ position: 'relative' }}
          >
            <MessageSquare size={16} className={unreadTeamCount > 0 ? "text-red-400" : "text-indigo-400"} />
            <span>Team Chat</span>
            {unreadTeamCount > 0 && (
              <span className="chat-unread-badge" title={`${unreadTeamCount} unread Team Chat messages`}>
                {unreadTeamCount > 99 ? '99+' : unreadTeamCount}
              </span>
            )}
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => {
              fetchPermanentArchive();
              setIsArchiveOpen(true);
            }}
            title="View Permanent Assigned Tasks Database Archive"
          >
            <Archive size={16} className="text-indigo-400" />
            <span>Permanent Archive DB</span>
          </button>

          <button className="btn btn-secondary" onClick={onOpenTeamModal}>
            <Users size={16} />
            <span>Team ({teamMembers.length})</span>
          </button>

          <button 
            className="btn btn-secondary" 
            onClick={() => setIsTaskBankOpen(true)}
            title="Open Manager Daily Task Bank & 1-Click Assignment Repository"
            style={{ background: 'var(--primary-glow)', borderColor: 'var(--border-glow)', color: 'var(--primary)', fontWeight: 600 }}
          >
            <Layers size={16} />
            <span>📋 Manager Task Bank</span>
          </button>

          <button className="btn btn-primary" onClick={handleOpenCreateModal}>
            <PlusCircle size={16} />
            <span>Assign Task (Full-Screen)</span>
          </button>

          {onLeaveTeam && activeTeam && (
            <button
              className="btn btn-secondary"
              onClick={() => {
                if (window.confirm(`Are you sure you want to leave the team "${activeTeam.name}"?`)) {
                  onLeaveTeam(activeTeam.id);
                }
              }}
              style={{ color: '#fca5a5', borderColor: 'rgba(239, 68, 68, 0.3)', background: 'rgba(239, 68, 68, 0.1)' }}
            >
              <UserMinus size={16} />
              <span>Leave</span>
            </button>
          )}
        </div>
      </div>

      {/* Metrics Bar */}
      <div className="stats-grid">
        <div className="glass-panel stat-card" style={{ '--card-accent': '#6366f1' }}>
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{tasks.length}</span>
            <span className="stat-label">Total Assigned Tasks</span>
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ '--card-accent': '#f59e0b' }}>
          <div className="stat-icon">
            <AlertCircle size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{pendingCount}</span>
            <span className="stat-label">Pending Review</span>
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ '--card-accent': '#06b6d4' }}>
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{inProgressCount}</span>
            <span className="stat-label">In Execution</span>
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ '--card-accent': '#10b981' }}>
          <div className="stat-icon">
            <CheckCircle2 size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{completedCount}</span>
            <span className="stat-label">Completed Tasks</span>
          </div>
        </div>

        <div className="glass-panel stat-card" style={{ '--card-accent': '#818cf8' }}>
          <div className="stat-icon">
            <Clock size={24} />
          </div>
          <div className="stat-info">
            <span className="stat-value">{formatDuration(tasks.reduce((sum, t) => sum + (t.totalTimeSpent || 0), 0))}</span>
            <span className="stat-label">Total Logged Focus</span>
          </div>
        </div>
      </div>

      {/* Real-time Live Member Focus Banner */}
      {activeTimers.length > 0 && (
        <div 
          className="glass-panel" 
          style={{
            marginBottom: '1.25rem',
            padding: '12px 18px',
            borderRadius: '12px',
            background: 'rgba(16, 185, 129, 0.08)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            display: 'flex',
            alignItems: 'center',
            gap: '12px'
          }}
        >
          <div className="pulsing-red-dot" style={{ background: '#10b981' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span>Live Deep-Work Active Timers ({activeTimers.length} Team Members Focus Working)</span>
            </div>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginTop: '4px' }}>
              {activeTimers.map(timer => (
                <div key={timer.userEmail + timer.taskId} style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  <strong style={{ color: '#34d399' }}>{timer.userName}</strong> is working on <span style={{ color: 'var(--text-main)', fontStyle: 'italic' }}>"{timer.taskTitle}"</span> ({timer.mode === 'pomodoro' ? `${Math.ceil(timer.remainingSeconds / 60)}m left` : `${Math.floor(timer.elapsedSeconds / 60)}m elapsed`})
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Filter and View Bar */}
      <div className="glass-panel filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input 
            type="text"
            className="search-input"
            placeholder="Search by title, raw file stream, or member email..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-controls">
          <select 
            className="select-filter"
            value={assigneeFilter}
            onChange={e => setAssigneeFilter(e.target.value)}
          >
            <option value="All">All Assignees</option>
            {teamMembers.map((m, idx) => (
              <option key={idx} value={m.email}>{m.name} ({m.email})</option>
            ))}
          </select>

          <select 
            className="select-filter"
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
          >
            <option value="All">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="In Progress">In Progress</option>
            <option value="Completed">Completed</option>
          </select>

          <div className="view-toggle">
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => setViewMode('list')}
              title="Compact Single-Line List View"
            >
              <List size={15} />
              <span>Single Line List</span>
            </button>
            <button 
              className={`view-btn ${viewMode === 'kanban' ? 'active' : ''}`}
              onClick={() => setViewMode('kanban')}
              title="Kanban Board View"
            >
              <LayoutGrid size={15} />
              <span>Kanban Board</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content Rendering: Single-Line Table View vs Kanban */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>
          Loading tasks...
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="glass-panel" style={{ textAlign: 'center', padding: '4rem 2rem' }}>
          <div className="brand-icon" style={{ margin: '0 auto 1rem auto', width: 48, height: 48, background: 'rgba(255, 255, 255, 0.05)' }}>
            <Filter size={24} className="text-muted" />
          </div>
          <h3>No Tasks Found</h3>
          <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '0.35rem' }}>
            No tasks match your current filter criteria or no tasks have been assigned yet.
          </p>
          <button className="btn btn-primary" style={{ marginTop: '1.25rem' }} onClick={handleOpenCreateModal}>
            <PlusCircle size={16} />
            <span>Assign First Task (Full-Screen)</span>
          </button>
        </div>
      ) : viewMode === 'list' ? (
        /* Sleek Single-Line Compact Table Layout for Multiple Tasks */
        <div className="glass-panel" style={{ overflowX: 'auto', padding: '0.5rem' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Task & Stream</th>
                <th style={{ padding: '0.75rem 1rem' }}>SOP Sub-Tasks Checklist</th>
                <th style={{ padding: '0.75rem 1rem' }}>Assigned Member</th>
                <th style={{ padding: '0.75rem 1rem' }}>Focus Time</th>
                <th style={{ padding: '0.75rem 1rem' }}>Priority</th>
                <th style={{ padding: '0.75rem 1rem' }}>Due Date</th>
                <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTasks.map(task => {
                const sopSteps = task.sopSteps || [];
                const completedSopSteps = task.completedSopSteps || [];
                const completedCount = completedSopSteps.length;
                const totalCount = sopSteps.length;
                const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                const chatCount = task.taskChat ? task.taskChat.length : 0;

                return (
                  <tr 
                    key={task.id} 
                    style={{ borderBottom: '1px solid var(--border-table-row)', transition: 'background 0.15s ease' }}
                  >
                    {/* Task & Raw Stream (Single Line) */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{task.title}</span>
                        {task.rawFileStream && (
                          <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.18)', color: '#818cf8', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                            {task.rawFileStream}
                          </span>
                        )}
                      </div>
                      {task.description && (
                        <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '280px' }}>
                          {task.description}
                        </div>
                      )}
                      <TaskAttachmentsDisplay attachments={task.attachments} />
                    </td>

                    {/* SOP Checklist Progress */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      {totalCount > 0 ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '220px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', fontWeight: 600, color: 'var(--accent-emerald)' }}>
                            <span>SOP Tracker</span>
                            <span>{completedCount}/{totalCount} ({progressPercent}%)</span>
                          </div>
                          <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? '#10b981' : '#6366f1', transition: 'width 0.3s ease' }} />
                          </div>
                        </div>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>Standard SOP</span>
                      )}
                    </td>

                    {/* Assignee */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      {(() => {
                        const member = activeTeam?.members?.find(m => m.email?.toLowerCase() === task.assignedTo?.toLowerCase());
                        const avatarUrl = task.assignedToAvatarUrl || member?.avatarUrl;
                        return (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {avatarUrl ? (
                              <img
                                src={avatarUrl}
                                alt={task.assignedToName || 'Member'}
                                onError={e => {
                                  e.target.style.display = 'none';
                                  if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                }}
                                style={{
                                  width: 28,
                                  height: 28,
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  border: '1.5px solid var(--primary)',
                                  flexShrink: 0,
                                  boxShadow: '0 2px 5px rgba(0,0,0,0.15)'
                                }}
                              />
                            ) : null}
                            <div
                              className="avatar-circle"
                              style={{
                                width: 28,
                                height: 28,
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                display: avatarUrl ? 'none' : 'flex',
                                flexShrink: 0
                              }}
                            >
                              {task.assignedToName ? task.assignedToName[0].toUpperCase() : 'M'}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, fontSize: '0.82rem' }}>{task.assignedToName}</div>
                              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{task.assignedTo}</div>
                            </div>
                          </div>
                        );
                      })()}
                    </td>

                    {/* Focus Time */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      <button 
                        style={{
                          background: 'rgba(99, 102, 241, 0.15)',
                          border: '1px solid rgba(99, 102, 241, 0.3)',
                          color: '#818cf8',
                          padding: '4px 10px',
                          borderRadius: '12px',
                          fontSize: '0.78rem',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        onClick={() => setSelectedTimeLogsTask(task)}
                        title="View Detailed Time Log Breakdown"
                      >
                        <Clock size={12} />
                        <span>{formatDuration(task.totalTimeSpent || 0)}</span>
                      </button>
                    </td>

                    {/* Priority */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      <span className={`priority-badge ${task.priority}`}>
                        {task.priority}
                      </span>
                    </td>

                    {/* Due Date */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      <span className={task.dueDate < today && task.status !== 'Completed' ? 'due-date overdue' : 'due-date'} style={{ fontSize: '0.8rem' }}>
                        {task.dueDate}
                      </span>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '0.75rem 1rem', verticalAlign: 'middle' }}>
                      <span className={`status-pill ${task.status.replace(' ', '-')}`}>
                        {task.status}
                      </span>
                    </td>

                    {/* Single-Line Action Buttons */}
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'right', verticalAlign: 'middle' }}>
                      <div style={{ display: 'flex', gap: '0.35rem', justifyContent: 'flex-end', alignItems: 'center' }}>
                        {(() => {
                          const unreadCount = getUnreadTaskChatCount(task);
                          return (
                            <button 
                              className="btn btn-secondary btn-sm"
                              onClick={() => {
                                markTaskChatAsRead(task);
                                setActiveTaskChat(task);
                              }}
                              title="Open Task Chat with Member"
                              style={{ display: 'flex', alignItems: 'center', gap: '4px', position: 'relative' }}
                            >
                              <MessageSquare size={13} className={unreadCount > 0 ? "text-red-400" : "text-indigo-400"} />
                              <span>Chat</span>
                              {unreadCount > 0 ? (
                                <span className="chat-unread-badge" title={`${unreadCount} unread task messages`}>
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>({chatCount})</span>
                              )}
                            </button>
                          );
                        })()}
                        <button 
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleOpenEditModal(task)}
                          title="Edit Task & SOP Checklist"
                        >
                          <Edit3 size={13} />
                          <span>Edit</span>
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleDeleteTask(task.id, task.title)}
                          title="Delete Task"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        /* Kanban Board View */
        <div className="kanban-board">
          {['Pending', 'In Progress', 'Completed'].map((columnStatus) => {
            const colTasks = filteredTasks.filter(t => t.status === columnStatus);
            return (
              <div key={columnStatus} className="kanban-col">
                <div className="col-header">
                  <div className="col-title">
                    <span className={`status-pill ${columnStatus.replace(' ', '-')}`}>
                      {columnStatus}
                    </span>
                  </div>
                  <span className="col-count">{colTasks.length}</span>
                </div>

                <div>
                  {colTasks.map(task => {
                    const sopSteps = task.sopSteps || [];
                    const completedSopSteps = task.completedSopSteps || [];
                    const completedCount = completedSopSteps.length;
                    const totalCount = sopSteps.length;
                    const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
                    const chatCount = task.taskChat ? task.taskChat.length : 0;
                    const unreadCount = getUnreadTaskChatCount(task);

                    return (
                      <div key={task.id} className="glass-panel task-card" onClick={() => handleOpenEditModal(task)}>
                        <div className="task-card-header">
                          <div className="task-title">{task.title}</div>
                          <span className={`priority-badge ${task.priority}`}>
                            {task.priority}
                          </span>
                        </div>

                        {task.rawFileStream && (
                          <div style={{ margin: '4px 0 8px 0' }}>
                            <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '12px', background: 'rgba(99, 102, 241, 0.18)', color: '#818cf8', fontWeight: 700, border: '1px solid rgba(99, 102, 241, 0.3)' }}>
                              {task.rawFileStream}
                            </span>
                          </div>
                        )}

                        {task.description && (
                          <div className="task-desc">{task.description}</div>
                        )}

                        {/* SOP Tracker Progress Bar */}
                        {totalCount > 0 && (
                          <div style={{ margin: '0.5rem 0', padding: '6px 8px', background: 'rgba(16, 185, 129, 0.05)', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontWeight: 600, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                              <span>Work Progress</span>
                              <span>{completedCount}/{totalCount} ({progressPercent}%)</span>
                            </div>
                            <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                              <div style={{ width: `${progressPercent}%`, height: '100%', background: progressPercent === 100 ? '#10b981' : '#6366f1' }} />
                            </div>
                          </div>
                        )}

                        <TaskAttachmentsDisplay attachments={task.attachments} />

                        {/* Member Assignee Badge */}
                        {(() => {
                          const member = activeTeam?.members?.find(m => m.email?.toLowerCase() === task.assignedTo?.toLowerCase());
                          const avatarUrl = task.assignedToAvatarUrl || member?.avatarUrl;
                          return (
                            <div className="task-assignee-box">
                              {avatarUrl ? (
                                <img
                                  src={avatarUrl}
                                  alt={task.assignedToName || 'Member'}
                                  onError={e => {
                                    e.target.style.display = 'none';
                                    if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                                  }}
                                  style={{
                                    width: 28,
                                    height: 28,
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                    border: '1.5px solid var(--primary)',
                                    flexShrink: 0
                                  }}
                                />
                              ) : null}
                              <div 
                                className="assignee-avatar"
                                style={{ display: avatarUrl ? 'none' : 'flex' }}
                              >
                                {task.assignedToName ? task.assignedToName[0].toUpperCase() : 'E'}
                              </div>
                              <div className="assignee-info">
                                <span className="assignee-name">{task.assignedToName}</span>
                                <span className="assignee-email">{task.assignedTo}</span>
                              </div>
                            </div>
                          );
                        })()}

                        <div className="task-card-footer" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div className={`due-date ${task.dueDate < today && task.status !== 'Completed' ? 'overdue' : ''}`}>
                              <Calendar size={13} />
                              <span>{task.dueDate}</span>
                            </div>

                            <button 
                              style={{
                                background: 'rgba(99, 102, 241, 0.15)',
                                border: '1px solid rgba(99, 102, 241, 0.3)',
                                color: '#818cf8',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.72rem',
                                fontWeight: 700,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedTimeLogsTask(task);
                              }}
                              title="View Detailed Time Log Breakdown"
                            >
                              <Clock size={11} />
                              <span>{formatDuration(task.totalTimeSpent || 0)}</span>
                            </button>
                          </div>

                          <div style={{ display: 'flex', gap: '0.25rem' }} onClick={e => e.stopPropagation()}>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '0.25rem 0.5rem', position: 'relative' }}
                              onClick={() => {
                                markTaskChatAsRead(task);
                                setActiveTaskChat(task);
                              }}
                              title="Task Chat"
                            >
                              <MessageSquare size={13} className={unreadCount > 0 ? "text-red-400" : "text-indigo-400"} />
                              {unreadCount > 0 ? (
                                <span className="chat-unread-badge" style={{ minWidth: 16, height: 16, fontSize: '0.65rem', padding: '0 4px' }}>
                                  {unreadCount > 99 ? '99+' : unreadCount}
                                </span>
                              ) : (
                                <span style={{ fontSize: '0.7rem' }}>{chatCount}</span>
                              )}
                            </button>
                            <button 
                              className="btn btn-secondary btn-sm" 
                              style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => handleOpenEditModal(task)}
                              title="Edit Task & SOP"
                            >
                              <Edit3 size={13} />
                            </button>
                            <button 
                              className="btn btn-danger btn-sm" 
                              style={{ padding: '0.25rem 0.5rem' }}
                              onClick={() => handleDeleteTask(task.id, task.title)}
                              title="Delete Task"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
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
        currentRole="manager"
        showToast={showToast}
      />

      {/* Task-Specific Chat Drawer / Modal */}
      <TaskChatModal 
        isOpen={!!activeTaskChat}
        onClose={() => setActiveTaskChat(null)}
        task={activeTaskChat}
        currentUser={user}
        currentRole="manager"
        showToast={showToast}
      />

      {/* Permanent Task Archive Modal */}
      {isArchiveOpen && (
        <div className="modal-overlay" onClick={() => setIsArchiveOpen(false)}>
          <div className="glass-panel modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '800px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Archive size={20} className="text-indigo-400" />
                <span>Permanent Assigned Tasks DB Archive</span>
              </div>
              <button className="close-btn" onClick={() => setIsArchiveOpen(false)}>×</button>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1rem' }}>
              Immutable audit database log containing every task assigned, updated, or completed across this workspace.
            </p>

            {archiveData.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                No permanent archive records found for this team.
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
                      <span>Assigned to: <strong>{item.assignedToName}</strong> ({item.assignedTo})</span>
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

      {/* Manager Task Bank Repository Modal */}
      <ManagerTaskBankModal 
        isOpen={isTaskBankOpen}
        onClose={() => setIsTaskBankOpen(false)}
        team={activeTeam}
        teamMembers={teamMembers}
        currentUser={user}
        showToast={showToast}
        onTaskAssigned={() => {
          fetchTasksAndTeam();
        }}
      />

      {/* Detailed Time Logs Breakdown Modal for Manager */}
      {selectedTimeLogsTask && (
        <div className="modal-overlay" onClick={() => setSelectedTimeLogsTask(null)}>
          <div className="glass-panel modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '650px', maxHeight: '85vh', overflowY: 'auto' }}>
            <div className="modal-header">
              <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Clock size={20} className="text-indigo-400" />
                <span>Deep Work Focus Time Logs</span>
              </div>
              <button className="close-btn" onClick={() => setSelectedTimeLogsTask(null)}>×</button>
            </div>

            <div style={{ padding: '12px 16px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', marginBottom: '1.25rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-main)' }}>{selectedTimeLogsTask.title}</h4>
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', gap: '16px' }}>
                <span>Total Accumulated Focus: <strong style={{ color: '#818cf8' }}>{formatDuration(selectedTimeLogsTask.totalTimeSpent || 0)}</strong></span>
                <span>Assigned Member: <strong>{selectedTimeLogsTask.assignedToName}</strong></span>
              </div>
            </div>

            {!selectedTimeLogsTask.timeLogs || selectedTimeLogsTask.timeLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2.5rem', color: '#94a3b8' }}>
                <Clock size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
                <p>No timer sessions logged yet for this task by the assigned member.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedTimeLogsTask.timeLogs.map((log) => (
                  <div key={log.id} style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid var(--border-subtle)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>{log.userName}</span>
                        <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '10px', background: log.mode === 'pomodoro' ? 'rgba(245, 158, 11, 0.2)' : 'rgba(99, 102, 241, 0.2)', color: log.mode === 'pomodoro' ? '#f59e0b' : '#818cf8' }}>
                          {log.mode === 'pomodoro' ? '🔥 Pomodoro' : '⏱️ Stopwatch'} ({log.sessionType})
                        </span>
                      </div>
                      {log.notes && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px', fontStyle: 'italic' }}>
                          "{log.notes}"
                        </div>
                      )}
                      <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '6px' }}>
                        Logged on: {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>

                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#10b981', fontFamily: 'monospace' }}>
                      +{formatDuration(log.durationSeconds)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Task Modal (Full-Screen Assignment Dashboard) */}
      <TaskModal 
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        teamMembers={teamMembers}
        taskToEdit={taskToEdit}
        onSaveTask={handleSaveTask}
        showToast={showToast}
        teamId={activeTeam?.id}
      />

      <TeamManagementModal 
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        team={activeTeam}
        onLeaveTeam={onLeaveTeam}
        showToast={showToast}
      />
    </div>
  );
};
