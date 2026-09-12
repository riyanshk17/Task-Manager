import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Play, Pause, RotateCcw, Save, Timer, Coffee, Award, 
  Flame, CheckCircle, ChevronDown, ChevronUp, History, ExternalLink,
  Minimize2, Maximize2
} from 'lucide-react';

export const playChimeNotification = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
    osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.2); // A5
    
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch (e) {}
};

export const formatDuration = (totalSeconds) => {
  if (!totalSeconds || totalSeconds <= 0) return '0m';
  const hrs = Math.floor(totalSeconds / 3600);
  const mins = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  if (mins > 0) return `${mins}m ${secs > 0 ? secs + 's' : ''}`;
  return `${secs}s`;
};

export const TaskTimerModal = ({ 
  isOpen, 
  onClose, 
  task, 
  team,
  currentUser, 
  showToast, 
  onTaskUpdated 
}) => {
  const [mode, setMode] = useState('pomodoro'); // 'pomodoro' | 'standard'
  const [sessionType, setSessionType] = useState('work'); // 'work' | 'break' | 'longBreak'
  const [pomodoroMinutes, setPomodoroMinutes] = useState(25);
  
  // Timer numerical state (in seconds)
  const [remainingSeconds, setRemainingSeconds] = useState(25 * 60);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  const heartbeatIntervalRef = useRef(null);

  // Initialize timer on task change or mode change
  useEffect(() => {
    if (!isRunning) {
      if (mode === 'pomodoro') {
        const targetMins = sessionType === 'work' ? 25 : sessionType === 'break' ? 5 : 15;
        setPomodoroMinutes(targetMins);
        setRemainingSeconds(targetMins * 60);
        setElapsedSeconds(0);
      } else {
        setElapsedSeconds(0);
        setRemainingSeconds(0);
      }
    }
  }, [mode, sessionType]);

  // Main Ticker Interval
  useEffect(() => {
    let interval = null;
    if (isRunning && !isPaused) {
      interval = setInterval(() => {
        if (mode === 'pomodoro') {
          setRemainingSeconds(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              setIsRunning(false);
              playChimeNotification();
              if (showToast) {
                showToast(`🔔 ${sessionType === 'work' ? 'Pomodoro Focus Session Completed!' : 'Break Time Finished!'}`, 'success');
              }
              // Automatically submit logged work session
              handleAutoLogSession();
              return 0;
            }
            return prev - 1;
          });
          setElapsedSeconds(prev => prev + 1);
        } else {
          setElapsedSeconds(prev => prev + 1);
        }
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isRunning, isPaused, mode, sessionType]);

  // Heartbeat to server every 8s for live manager tracking
  useEffect(() => {
    if (isRunning && !isPaused && task?.id && team?.id && currentUser?.email) {
      const sendHeartbeat = () => {
        fetch(`/api/tasks/${task.id}/timer/heartbeat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            teamId: team.id,
            userEmail: currentUser.email,
            userName: currentUser.name || currentUser.email,
            mode,
            sessionType,
            elapsedSeconds,
            remainingSeconds,
            isRunning: true,
            isPaused: false
          })
        }).catch(() => {});
      };

      sendHeartbeat();
      heartbeatIntervalRef.current = setInterval(sendHeartbeat, 8000);
    } else {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    }

    return () => {
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    };
  }, [isRunning, isPaused, task?.id, team?.id, currentUser?.email, mode, sessionType, elapsedSeconds, remainingSeconds]);

  if (!isOpen || !task) return null;

  const handleStart = () => {
    setIsRunning(true);
    setIsPaused(false);
    if (showToast) showToast(`Started ${mode === 'pomodoro' ? sessionType : 'stopwatch'} timer`, 'info');
  };

  const handlePause = () => {
    setIsPaused(true);
  };

  const handleResume = () => {
    setIsPaused(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    setIsPaused(false);
    if (mode === 'pomodoro') {
      const targetMins = sessionType === 'work' ? 25 : sessionType === 'break' ? 5 : 15;
      setRemainingSeconds(targetMins * 60);
      setElapsedSeconds(0);
    } else {
      setElapsedSeconds(0);
    }
  };

  const handleAutoLogSession = async () => {
    const loggedSeconds = mode === 'pomodoro' ? pomodoroMinutes * 60 : elapsedSeconds;
    if (loggedSeconds <= 0) return;

    try {
      const res = await fetch(`/api/tasks/${task.id}/timer/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationSeconds: loggedSeconds,
          mode,
          sessionType,
          userEmail: currentUser.email,
          userName: currentUser.name || currentUser.email,
          notes: sessionNotes.trim() || `${mode === 'pomodoro' ? 'Pomodoro' : 'Standard'} ${sessionType} session`
        })
      });

      const data = await res.json();
      if (res.ok) {
        if (onTaskUpdated) onTaskUpdated(data.task);
      }
    } catch (e) {}
  };

  const handleSaveAndLog = async () => {
    if (elapsedSeconds <= 0 || submitting) {
      if (showToast) showToast('No elapsed time to log yet.', 'warning');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tasks/${task.id}/timer/log`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          durationSeconds: elapsedSeconds,
          mode,
          sessionType,
          userEmail: currentUser.email,
          userName: currentUser.name || currentUser.email,
          notes: sessionNotes.trim()
        })
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.ok) {
        if (showToast) showToast(data.message || 'Logged focus session!', 'success');
        handleReset();
        setSessionNotes('');
        if (onTaskUpdated) onTaskUpdated(data.task);
      } else {
        if (showToast) showToast(data.error || 'Failed to log timer session.', 'error');
      }
    } catch (err) {
      setSubmitting(false);
      if (showToast) showToast('Error saving timer log.', 'error');
    }
  };

  // Helper formatting mm:ss
  const formatTimeDisplay = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const totalPomodoroTarget = pomodoroMinutes * 60;

  // Floating Minimized Player
  if (isMinimized) {
    return (
      <div 
        className="glass-panel" 
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          zIndex: 9999,
          padding: '12px 18px',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 12px 32px rgba(0,0,0,0.4)',
          background: 'var(--bg-card)',
          border: '1px solid var(--primary)',
          animation: 'fadeIn 0.2s ease-out'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div className="pulsing-red-dot" style={{ background: isRunning && !isPaused ? '#10b981' : '#f59e0b' }} />
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {task.title}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)', fontFamily: 'monospace' }}>
              {mode === 'pomodoro' ? formatTimeDisplay(remainingSeconds) : formatTimeDisplay(elapsedSeconds)}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {!isRunning || isPaused ? (
            <button className="btn btn-primary btn-sm" style={{ padding: '6px 10px' }} onClick={isRunning ? handleResume : handleStart}>
              <Play size={14} />
            </button>
          ) : (
            <button className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }} onClick={handlePause}>
              <Pause size={14} />
            </button>
          )}

          <button className="btn btn-secondary btn-sm" style={{ padding: '6px 10px' }} onClick={() => setIsMinimized(false)}>
            <Maximize2 size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '580px', width: '92vw', padding: 0, overflow: 'hidden' }}>
        
        {/* Modal Header */}
        <div className="modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '10px' }}>
              <Timer className="text-indigo-400" size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                Deep-Work Focus Timer
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Logged hours sync automatically with leadership dashboard
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {isRunning && (
              <button className="close-btn" title="Minimize floating timer" onClick={() => setIsMinimized(true)}>
                <Minimize2 size={16} />
              </button>
            )}
            <button className="close-btn" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Body Content */}
        <div style={{ padding: '1.5rem', background: 'var(--bg-dark)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {/* Target Task Banner */}
          <div style={{ background: 'var(--bg-card)', padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border-subtle)' }}>
            <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-muted)', fontWeight: 600 }}>
              Task Being Timed
            </div>
            <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '2px' }}>
              {task.title}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--primary)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <span>Cumulative Logged: <strong>{formatDuration(task.totalTimeSpent || 0)}</strong></span>
              <span>• Status: <strong>{task.status}</strong></span>
            </div>
          </div>

          {/* Timer Mode Selector */}
          <div style={{ display: 'flex', background: 'var(--bg-card)', padding: '4px', borderRadius: '12px', gap: '6px', border: '1px solid var(--border-subtle)' }}>
            <button
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'pomodoro' ? 'var(--primary)' : 'transparent',
                color: mode === 'pomodoro' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={() => setMode('pomodoro')}
            >
              <Flame size={15} />
              Pomodoro Focus (25m)
            </button>

            <button
              style={{
                flex: 1,
                padding: '8px 12px',
                borderRadius: '8px',
                border: 'none',
                background: mode === 'standard' ? 'var(--primary)' : 'transparent',
                color: mode === 'standard' ? '#ffffff' : 'var(--text-muted)',
                fontWeight: 600,
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
              onClick={() => setMode('standard')}
            >
              <Timer size={15} />
              Standard Stopwatch
            </button>
          </div>

          {/* Pomodoro Sub-session selector */}
          {mode === 'pomodoro' && (
            <div style={{ display: 'flex', justifySelf: 'center', margin: '0 auto', gap: '8px' }}>
              <button 
                className={`btn btn-sm ${sessionType === 'work' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', borderRadius: '20px' }}
                onClick={() => setSessionType('work')}
              >
                🔥 Focus (25m)
              </button>
              <button 
                className={`btn btn-sm ${sessionType === 'break' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', borderRadius: '20px' }}
                onClick={() => setSessionType('break')}
              >
                ☕ Short Break (5m)
              </button>
              <button 
                className={`btn btn-sm ${sessionType === 'longBreak' ? 'btn-primary' : 'btn-secondary'}`}
                style={{ fontSize: '0.75rem', borderRadius: '20px' }}
                onClick={() => setSessionType('longBreak')}
              >
                🌴 Long Break (15m)
              </button>
            </div>
          )}

          {/* Digital Timer Circle Display */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', margin: '1rem 0' }}>
            <div 
              style={{
                width: '210px',
                height: '210px',
                borderRadius: '50%',
                background: 'var(--bg-card)',
                border: '6px solid var(--border-subtle)',
                borderColor: isRunning && !isPaused ? 'var(--primary)' : 'var(--border-subtle)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isRunning && !isPaused ? '0 0 30px rgba(99, 102, 241, 0.3)' : 'none',
                position: 'relative',
                transition: 'all 0.3s ease'
              }}
            >
              <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>
                {mode === 'pomodoro' ? `${sessionType} session` : 'Elapsed Work Time'}
              </div>

              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: 'var(--text-main)', fontFamily: 'monospace', margin: '6px 0' }}>
                {mode === 'pomodoro' ? formatTimeDisplay(remainingSeconds) : formatTimeDisplay(elapsedSeconds)}
              </div>

              <div style={{ fontSize: '0.75rem', color: isRunning && !isPaused ? '#10b981' : isPaused ? '#f59e0b' : 'var(--text-muted)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: isRunning && !isPaused ? '#10b981' : isPaused ? '#f59e0b' : '#6b7280' }} />
                {isRunning && !isPaused ? 'Tracking Deep Work...' : isPaused ? 'Timer Paused' : 'Ready to Start'}
              </div>
            </div>
          </div>

          {/* Controls Bar */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            {!isRunning || isPaused ? (
              <button 
                className="btn btn-primary" 
                style={{ minWidth: '140px', padding: '10px 20px', fontSize: '0.95rem', gap: '8px' }}
                onClick={isRunning ? handleResume : handleStart}
              >
                <Play size={18} />
                {isRunning ? 'Resume Timer' : 'Start Focus Work'}
              </button>
            ) : (
              <button 
                className="btn btn-secondary" 
                style={{ minWidth: '140px', padding: '10px 20px', fontSize: '0.95rem', gap: '8px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', borderColor: 'rgba(245, 158, 11, 0.3)' }}
                onClick={handlePause}
              >
                <Pause size={18} />
                Pause Timer
              </button>
            )}

            <button 
              className="btn btn-secondary" 
              style={{ padding: '10px 16px' }}
              onClick={handleReset}
              title="Reset Timer"
            >
              <RotateCcw size={16} />
              Reset
            </button>

            <button 
              className="btn btn-secondary" 
              style={{ padding: '10px 16px', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)', background: 'rgba(16, 185, 129, 0.1)' }}
              onClick={handleSaveAndLog}
              disabled={elapsedSeconds <= 0 || submitting}
              title="Save & Log Session to Manager Dashboard"
            >
              <Save size={16} />
              {submitting ? 'Saving...' : 'Log Hours'}
            </button>
          </div>

          {/* Session Notes Input */}
          <div style={{ marginTop: '0.5rem' }}>
            <input 
              type="text" 
              className="input-field" 
              style={{ fontSize: '0.85rem' }} 
              placeholder="Optional: Add quick note on what was accomplished in this session..." 
              value={sessionNotes}
              onChange={e => setSessionNotes(e.target.value)}
            />
          </div>

          {/* Session History Log Accordion */}
          <div style={{ marginTop: '0.25rem', borderTop: '1px solid var(--border-subtle)', paddingTop: '0.75rem' }}>
            <button 
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', padding: 0 }}
              onClick={() => setShowHistory(!showHistory)}
            >
              <History size={14} />
              <span>Logged Sessions History ({task.timeLogs ? task.timeLogs.length : 0})</span>
              {showHistory ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>

            {showHistory && (
              <div style={{ marginTop: '8px', maxHeight: '140px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {!task.timeLogs || task.timeLogs.length === 0 ? (
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    No sessions logged yet for this task.
                  </div>
                ) : (
                  task.timeLogs.map((log) => (
                    <div 
                      key={log.id} 
                      style={{ 
                        background: 'var(--bg-card)', 
                        padding: '6px 10px', 
                        borderRadius: '8px', 
                        fontSize: '0.75rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{log.userName}</span>
                        <span style={{ color: 'var(--text-muted)', marginLeft: '6px' }}>
                          ({log.mode === 'pomodoro' ? 'Pomodoro' : 'Stopwatch'} {log.sessionType})
                        </span>
                        {log.notes && <span style={{ fontStyle: 'italic', color: 'var(--text-muted)', marginLeft: '8px' }}>"{log.notes}"</span>}
                      </div>
                      <div style={{ fontWeight: 700, color: 'var(--primary)' }}>
                        +{formatDuration(log.durationSeconds)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
