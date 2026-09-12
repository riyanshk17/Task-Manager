import React, { useState, useEffect, useRef } from 'react';
import { MessageSquare, Send, X, Paperclip, ShieldCheck, UserCheck, RefreshCw } from 'lucide-react';
import { TaskAttachmentsDisplay } from '../Employee/EmployeeDashboard';

export const TeamChatModal = ({ isOpen, onClose, team, currentUser, currentRole, showToast }) => {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  const messagesEndRef = useRef(null);

  const fetchMessages = async (isSilent = false) => {
    if (!team?.id) return;
    if (!isSilent) setLoading(true);

    try {
      const res = await fetch(`/api/chat/messages?teamId=${team.id}`);
      const data = await res.json();
      if (res.ok) {
        setMessages(data.messages || []);
      }
    } catch (err) {
      if (!isSilent && showToast) showToast('Error loading chat history.', 'error');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && team?.id) {
      fetchMessages();
      if (currentUser?.email) {
        fetch('/api/chat/read', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ teamId: team.id, userEmail: currentUser.email })
        }).catch(() => {});
      }
      const interval = setInterval(() => {
        fetchMessages(true);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isOpen, team, currentUser?.email]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  if (!isOpen || !team) return null;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files || files.length === 0) return;

    setUploading(true);

    for (const file of files) {
      try {
        const reader = new FileReader();
        const base64Promise = new Promise((resolve, reject) => {
          reader.onload = () => resolve(reader.result);
          reader.onerror = error => reject(error);
          reader.readAsDataURL(file);
        });

        const fileData = await base64Promise;

        const res = await fetch('/api/tasks/upload-attachment', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileName: file.name, fileData })
        });

        const data = await res.json();
        if (res.ok && data.attachment) {
          setAttachments(prev => [...prev, data.attachment]);
          if (showToast) showToast(`Attached file: ${file.name}`, 'info');
        } else {
          if (showToast) showToast(data.error || 'Failed to upload attachment.', 'error');
        }
      } catch (err) {
        if (showToast) showToast(`Error uploading ${file.name}`, 'error');
      }
    }

    setUploading(false);
    e.target.value = '';
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!inputText.trim() && attachments.length === 0) || sending) return;

    setSending(true);
    try {
      const res = await fetch('/api/chat/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: team.id,
          senderEmail: currentUser.email,
          senderName: currentUser.name,
          senderRole: currentRole || 'employee',
          senderAvatarUrl: currentUser?.avatarUrl || '',
          text: inputText.trim(),
          attachments
        })
      });

      const data = await res.json();
      setSending(false);

      if (res.ok) {
        setInputText('');
        setAttachments([]);
        if (showToast) showToast('Team message sent!', 'success');
        fetchMessages(true);
      } else {
        if (showToast) showToast(data.error || 'Failed to send message.', 'error');
      }
    } catch (err) {
      setSending(false);
      if (showToast) showToast('Error sending message to team.', 'error');
    }
  };

  const getInitials = (name) => {
    if (!name) return 'U';
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  const renderChatAvatar = (avatarUrl, name, isOwner) => (
    <div style={{ width: 34, height: 34, flexShrink: 0, position: 'relative' }}>
      {avatarUrl ? (
        <img
          src={avatarUrl}
          alt={name || 'User'}
          onError={e => {
            e.target.style.display = 'none';
            if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
          }}
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            objectFit: 'cover',
            border: isOwner ? '2px solid #818cf8' : '2px solid #34d399',
            boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
          }}
        />
      ) : null}
      <div
        className="avatar-circle"
        style={{
          width: '34px',
          height: '34px',
          fontSize: '0.78rem',
          fontWeight: 700,
          display: avatarUrl ? 'none' : 'flex',
          background: isOwner ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)',
          color: isOwner ? '#818cf8' : '#34d399',
          border: isOwner ? '2px solid #818cf8' : '2px solid #34d399',
          borderRadius: '50%',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        {getInitials(name)}
      </div>
    </div>
  );

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-container" onClick={e => e.stopPropagation()} style={{ width: '90vw', maxWidth: '750px', height: '80vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Chat Header */}
        <div className="modal-header" style={{ padding: '1rem 1.5rem', borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-card)' }}>
          <div className="modal-title" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '8px', borderRadius: '10px' }}>
              <MessageSquare className="text-indigo-400" size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                {team.name} • Workspace Chat
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Real-time communication & document sharing between Manager & Members
              </div>
            </div>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Chat Messages Log */}
        <div style={{ flex: 1, padding: '1.25rem', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: 'var(--bg-dark)' }}>
          {loading && messages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
              Loading team chat...
            </div>
          ) : messages.length === 0 ? (
            <div style={{ textAlign: 'center', margin: 'auto', color: 'var(--text-muted)' }}>
              <MessageSquare size={32} style={{ opacity: 0.3, marginBottom: '0.5rem' }} />
              <p>No messages yet. Start the conversation with your team!</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isMe = msg.senderEmail.toLowerCase() === currentUser?.email?.toLowerCase();
              const isOwner = msg.senderRole === 'manager';
              const member = team?.members?.find(m => m.email?.toLowerCase() === msg.senderEmail?.toLowerCase());
              const avatarUrl = msg.senderAvatarUrl || member?.avatarUrl || (isMe ? currentUser?.avatarUrl : '');

              return (
                <div 
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: isMe ? 'row-reverse' : 'row',
                    alignItems: 'flex-start',
                    gap: '10px',
                    maxWidth: '85%',
                    alignSelf: isMe ? 'flex-end' : 'flex-start'
                  }}
                >
                  {/* WhatsApp Profile Avatar */}
                  {renderChatAvatar(avatarUrl, msg.senderName, isOwner)}

                  {/* Message Bubble Column */}
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: isMe ? 'flex-end' : 'flex-start', maxWidth: 'calc(100% - 44px)' }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ fontWeight: 600, color: 'var(--text-main)' }}>{msg.senderName}</span>
                      <span style={{ fontSize: '0.65rem', padding: '1px 6px', borderRadius: '10px', background: isOwner ? 'rgba(99, 102, 241, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: isOwner ? '#818cf8' : '#34d399', fontWeight: 600 }}>
                        {isOwner ? 'Owner' : 'Member'}
                      </span>
                      <span>• {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>

                    <div style={{
                      padding: '10px 14px',
                      borderRadius: isMe ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                      background: isMe ? 'var(--primary)' : 'var(--bg-input)',
                      color: isMe ? '#ffffff' : 'var(--text-main)',
                      fontSize: '0.9rem',
                      lineHeight: '1.45',
                      border: isMe ? 'none' : '1px solid var(--border-subtle)',
                      wordBreak: 'break-word',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}>
                      {msg.text}
                      {msg.attachments && msg.attachments.length > 0 && (
                        <TaskAttachmentsDisplay attachments={msg.attachments} />
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Attachment Pending Badges */}
        {attachments.length > 0 && (
          <div style={{ padding: '6px 1rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {attachments.map(att => (
              <span key={att.id} style={{ fontSize: '0.75rem', background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', padding: '2px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                📎 {att.fileName}
                <button type="button" onClick={() => setAttachments(prev => prev.filter(a => a.id !== att.id))} style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>×</button>
              </span>
            ))}
          </div>
        )}

        {/* Input Bar */}
        <form onSubmit={handleSendMessage} style={{ padding: '1rem', background: 'var(--bg-card)', borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            type="file"
            multiple
            accept="image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.pdf"
            onChange={handleFileUpload}
            id="team-chat-file"
            style={{ display: 'none' }}
          />
          <label 
            htmlFor="team-chat-file" 
            className="btn btn-secondary btn-sm"
            style={{ padding: '0.6rem 0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            title="Attach Document / Photo to Workspace Chat"
          >
            <Paperclip size={16} className="text-indigo-400" />
          </label>

          <input
            type="text"
            className="form-input"
            placeholder="Type a message or attach documents to team..."
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            style={{ flex: 1 }}
          />
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={sending || uploading || (!inputText.trim() && attachments.length === 0)}
            style={{ padding: '0 1.25rem' }}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </form>

      </div>
    </div>
  );
};
