import React, { useState, useEffect } from 'react';
import { 
  X, Plus, Calendar, Clock, Paperclip, CheckCircle2, UserCheck, 
  Trash2, Edit3, Tag, Send, AlertCircle, FileText, Filter, ChevronRight, Layers, Sparkles, Search,
  BookOpen, Video, Palette, Server, CheckSquare, Image, FileSpreadsheet, Presentation
} from 'lucide-react';
import { TaskAttachmentsDisplay } from '../Employee/EmployeeDashboard';

const FLIPBOOK_SOP_STEPS = [
  '1. QA / QC of received input raw files',
  '2. Word file formatting as per guidelines',
  '3. Converting Word file into PDF',
  '4. Converting PDF into Flipbook using professional software',
  '5. Exporting Flipbook into different formats (Source file, Review file)',
  '6. Uploading LMS-ready format to server and creating embedded code',
  '7. Coordination with LMS team and sharing the embedded code'
];

const RAW_FILE_STREAMS = [
  'B - VOC',
  'Skill Academy',
  'UG - PG (Undergraduate & Postgraduate)',
  'AISECT Learn Market Oriented Program',
  'NEP (National Education Policy)'
];

const PRESET_PROJECTS = [
  { name: 'Flipbook Creation', icon: BookOpen },
  { name: 'Video Editing', icon: Video },
  { name: 'Graphic Design', icon: Palette },
  { name: 'LMS Operations', icon: Server }
];

export const ManagerTaskBankModal = ({ 
  isOpen, 
  onClose, 
  team, 
  teamMembers = [], 
  currentUser, 
  showToast, 
  onTaskAssigned 
}) => {
  const [bankTasks, setBankTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // 'all', 'today', 'tomorrow', 'date', 'day'
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedDay, setSelectedDay] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [projectCategory, setProjectCategory] = useState('Flipbook Creation');
  const [customProjectInput, setCustomProjectInput] = useState('');
  const [isCustomProject, setIsCustomProject] = useState(false);

  const [rawFileStream, setRawFileStream] = useState('B - VOC');
  const [availableSopSteps, setAvailableSopSteps] = useState([...FLIPBOOK_SOP_STEPS]);
  const [selectedSopSteps, setSelectedSopSteps] = useState([...FLIPBOOK_SOP_STEPS]);
  const [newCustomStepText, setNewCustomStepText] = useState('');

  const [title, setTitle] = useState('Flipbook Creation - B - VOC Process');
  const [description, setDescription] = useState('Complete Flipbook Creation SOP tasks for raw files received.');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Pending');
  const [targetDate, setTargetDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [targetDay, setTargetDay] = useState(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  });
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Assign Popover State
  const [assigningTask, setAssigningTask] = useState(null);
  const [assignDueDate, setAssignDueDate] = useState('');
  const [assigningLoading, setAssigningLoading] = useState(false);

  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const isFlipbook = !isCustomProject && projectCategory === 'Flipbook Creation';

  const fetchTaskBank = async () => {
    if (!team?.id) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/manager/task-bank?teamId=${team.id}`);
      const data = await res.json();
      if (res.ok) {
        setBankTasks(data.taskBank || []);
      }
    } catch (err) {
      if (showToast) showToast('Error loading Manager Task Bank.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && team?.id) {
      fetchTaskBank();
    }
  }, [isOpen, team?.id]);

  if (!isOpen || !team) return null;

  const handleSelectProject = (projName) => {
    if (projName === 'Flipbook Creation') {
      setIsCustomProject(false);
      setProjectCategory('Flipbook Creation');
      setRawFileStream('B - VOC');
      if (!editingId) {
        setTitle('Flipbook Creation - B - VOC Process');
        setAvailableSopSteps([...FLIPBOOK_SOP_STEPS]);
        setSelectedSopSteps([...FLIPBOOK_SOP_STEPS]);
      }
    } else if (projName === 'Custom') {
      setIsCustomProject(true);
      setProjectCategory('Custom');
      setRawFileStream('');
      if (!editingId) {
        setTitle(customProjectInput ? `${customProjectInput} Task` : 'Custom Project Task');
        setAvailableSopSteps([]);
        setSelectedSopSteps([]);
      }
    } else {
      setIsCustomProject(false);
      setProjectCategory(projName);
      setRawFileStream('');
      if (!editingId) {
        setTitle(`${projName} Task & Deliverables`);
        setAvailableSopSteps([]);
        setSelectedSopSteps([]);
      }
    }
  };

  const handleAddCustomSopStep = () => {
    if (!newCustomStepText.trim()) return;
    const stepName = `${availableSopSteps.length + 1}. ${newCustomStepText.trim()}`;
    setAvailableSopSteps(prev => [...prev, stepName]);
    setSelectedSopSteps(prev => [...prev, stepName]);
    setNewCustomStepText('');
    if (showToast) showToast('Added task step!', 'success');
  };

  const handleToggleSopStep = (step) => {
    if (selectedSopSteps.includes(step)) {
      setSelectedSopSteps(prev => prev.filter(s => s !== step));
    } else {
      setSelectedSopSteps(prev => [...prev, step]);
    }
  };

  const handleSelectAllSop = () => {
    setSelectedSopSteps([...availableSopSteps]);
  };

  const handleDeselectAllSop = () => {
    setSelectedSopSteps([]);
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

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
          if (showToast) showToast(`Uploaded attachment: ${file.name}`, 'info');
        }
      } catch (err) {
        if (showToast) showToast(`Error uploading ${file.name}`, 'error');
      }
    }
    setUploading(false);
    e.target.value = '';
  };

  const handleSaveDraft = async (e) => {
    e.preventDefault();
    if (!title.trim() || submitting) return;

    setSubmitting(true);
    try {
      const finalCategory = isCustomProject ? (customProjectInput.trim() || 'Custom Project') : projectCategory;

      const payload = {
        teamId: team.id,
        title: title.trim(),
        description: description.trim(),
        projectCategory: finalCategory,
        rawFileStream: isFlipbook ? rawFileStream : '',
        sopSteps: selectedSopSteps,
        priority,
        status,
        targetDate,
        targetDay,
        attachments,
        createdBy: currentUser?.name || currentUser?.email || 'Manager'
      };

      const url = editingId ? `/api/manager/task-bank/${editingId}` : '/api/manager/task-bank';
      const method = editingId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();
      setSubmitting(false);

      if (res.ok) {
        if (showToast) showToast(editingId ? 'Draft task updated!' : 'Task added to Daily Task Bank!', 'success');
        resetForm();
        fetchTaskBank();
      } else {
        if (showToast) showToast(data.error || 'Failed to save draft task.', 'error');
      }
    } catch (err) {
      setSubmitting(false);
      if (showToast) showToast('Error saving draft task.', 'error');
    }
  };

  const handleDeleteDraft = async (id, draftTitle) => {
    if (!window.confirm(`Delete draft task "${draftTitle}" from bank?`)) return;
    try {
      const res = await fetch(`/api/manager/task-bank/${id}`, { method: 'DELETE' });
      if (res.ok) {
        if (showToast) showToast('Draft task removed from bank.', 'success');
        fetchTaskBank();
      }
    } catch (err) {
      if (showToast) showToast('Error deleting draft task.', 'error');
    }
  };

  const handleEditDraft = (item) => {
    setEditingId(item.id);
    setTitle(item.title || '');
    setDescription(item.description || '');
    const isPreset = PRESET_PROJECTS.some(p => p.name === item.projectCategory);
    if (isPreset) {
      setProjectCategory(item.projectCategory);
      setIsCustomProject(false);
    } else {
      setProjectCategory('Custom');
      setCustomProjectInput(item.projectCategory || '');
      setIsCustomProject(true);
    }
    setRawFileStream(item.rawFileStream || 'B - VOC');
    const steps = item.sopSteps || (item.projectCategory === 'Flipbook Creation' ? FLIPBOOK_SOP_STEPS : []);
    setAvailableSopSteps(steps);
    setSelectedSopSteps(steps);
    setPriority(item.priority || 'Medium');
    setStatus(item.status || 'Pending');
    setTargetDate(item.targetDate || new Date().toISOString().split('T')[0]);
    setTargetDay(item.targetDay || 'Monday');
    setAttachments(item.attachments || []);
    setIsCreating(true);
  };

  const resetForm = () => {
    setIsCreating(false);
    setEditingId(null);
    setProjectCategory('Flipbook Creation');
    setIsCustomProject(false);
    setCustomProjectInput('');
    setRawFileStream('B - VOC');
    setAvailableSopSteps([...FLIPBOOK_SOP_STEPS]);
    setSelectedSopSteps([...FLIPBOOK_SOP_STEPS]);
    setTitle('Flipbook Creation - B - VOC Process');
    setDescription('Complete Flipbook Creation SOP tasks for raw files received.');
    setPriority('Medium');
    setStatus('Pending');
    setTargetDate(new Date().toISOString().split('T')[0]);
    setAttachments([]);
  };

  const handleAssignToMember = async (bankItem, member) => {
    setAssigningLoading(true);
    try {
      const res = await fetch(`/api/manager/task-bank/${bankItem.id}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          assignedTo: member.email,
          assignedToName: member.name,
          dueDate: assignDueDate || bankItem.targetDate || new Date().toISOString().split('T')[0]
        })
      });

      const data = await res.json();
      setAssigningLoading(false);

      if (res.ok) {
        if (showToast) showToast(`⚡ Task assigned to ${member.name} successfully!`, 'success');
        setAssigningTask(null);
        fetchTaskBank();
        if (onTaskAssigned) onTaskAssigned();
      } else {
        if (showToast) showToast(data.error || 'Failed to assign task.', 'error');
      }
    } catch (err) {
      setAssigningLoading(false);
      if (showToast) showToast('Error assigning task to member.', 'error');
    }
  };

  // Filter Logic
  const todayStr = new Date().toISOString().split('T')[0];
  const tomorrowObj = new Date();
  tomorrowObj.setDate(tomorrowObj.getDate() + 1);
  const tomorrowStr = tomorrowObj.toISOString().split('T')[0];

  const filteredTasks = bankTasks.filter(task => {
    const matchesSearch = !searchQuery || 
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
      task.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.projectCategory.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;
    if (filterMode === 'today') return task.targetDate === todayStr;
    if (filterMode === 'tomorrow') return task.targetDate === tomorrowStr;
    if (filterMode === 'date' && selectedDate) return task.targetDate === selectedDate;
    if (filterMode === 'day' && selectedDay !== 'All') return task.targetDay === selectedDay;
    return true;
  });

  const unassignedCount = bankTasks.filter(t => !t.isAssigned).length;
  const assignedCount = bankTasks.filter(t => t.isAssigned).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="glass-panel modal-container" 
        onClick={e => e.stopPropagation()}
        style={{ 
          maxWidth: '1280px', 
          width: '96vw', 
          maxHeight: '94vh', 
          display: 'flex', 
          flexDirection: 'column',
          padding: 0,
          overflow: 'hidden',
          background: 'var(--bg-card)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        
        {/* Header Bar */}
        <div style={{ 
          padding: '1.25rem 1.75rem', 
          borderBottom: '1px solid var(--border-subtle)', 
          background: 'var(--bg-card)',
          display: 'flex', 
          justify: 'space-between', 
          alignItems: 'center' 
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ 
              background: 'var(--primary-glow)', 
              color: 'var(--primary)', 
              padding: '10px', 
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Layers size={22} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                Manager Daily Task Repository & Bank
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '2px', marginBottom: 0 }}>
                Pre-create & store day-wise tasks, then 1-click assign them to team members when ready.
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {!isCreating && (
              <button 
                className="btn btn-primary" 
                onClick={() => { resetForm(); setIsCreating(true); }}
                style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                <Plus size={16} />
                <span>Add Task to Bank</span>
              </button>
            )}
            <button 
              onClick={onClose} 
              className="close-btn"
              title="Close Task Bank"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Quick Stats Bar */}
        <div style={{ 
          padding: '0.85rem 1.75rem', 
          background: 'var(--bg-input)', 
          borderBottom: '1px solid var(--border-subtle)', 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center',
          flexWrap: 'wrap' 
        }}>
          <div className="bank-stat-card">
            <span>📋 Total Bank Tasks:</span>
            <strong style={{ color: 'var(--text-main)', fontSize: '0.95rem' }}>{bankTasks.length}</strong>
          </div>

          <div className="bank-stat-card">
            <span>⏳ Unassigned Drafts:</span>
            <strong style={{ color: 'var(--accent-amber)', fontSize: '0.95rem' }}>{unassignedCount}</strong>
          </div>

          <div className="bank-stat-card">
            <span>✅ Assigned Tasks:</span>
            <strong style={{ color: 'var(--accent-emerald)', fontSize: '0.95rem' }}>{assignedCount}</strong>
          </div>
        </div>

        {/* Modal Body */}
        <div style={{ padding: '1.5rem 1.75rem', overflowY: 'auto', flex: 1, background: 'var(--bg-surface)' }}>

          {/* Rich Form View matching Main Task Creation Dashboard */}
          {isCreating && (
            <div className="glass-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem', background: 'var(--bg-card)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--border-subtle)' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0, color: 'var(--text-main)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Sparkles size={20} className="text-indigo-400" />
                  <span>{editingId ? 'Edit Bank Task Draft' : 'Draft New Task for Manager Bank'}</span>
                </h3>
                <button className="btn btn-secondary btn-sm" onClick={resetForm}>Cancel</button>
              </div>

              <form onSubmit={handleSaveDraft} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem' }}>
                
                {/* Left Column: Work Type, Raw Input Stream, SOP Sub-tasks */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* 1. SELECT WORK / PROJECT TYPE */}
                  <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                    <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Layers size={16} /> 1. Select Work / Project Type
                    </label>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '8px', marginBottom: '0.75rem' }}>
                      {PRESET_PROJECTS.map((proj) => {
                        const IconComp = proj.icon;
                        const isSelected = !isCustomProject && projectCategory === proj.name;
                        return (
                          <button
                            key={proj.name}
                            type="button"
                            className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => handleSelectProject(proj.name)}
                            style={{ padding: '0.6rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                          >
                            <IconComp size={16} />
                            <span>{proj.name}</span>
                          </button>
                        );
                      })}

                      <button
                        type="button"
                        className={`btn ${isCustomProject ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => handleSelectProject('Custom')}
                        style={{ padding: '0.6rem 0.85rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}
                      >
                        <Plus size={16} />
                        <span>+ Custom Project</span>
                      </button>
                    </div>

                    {isCustomProject && (
                      <div style={{ marginTop: '0.5rem' }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Type custom project name..." 
                          value={customProjectInput} 
                          onChange={e => {
                            setCustomProjectInput(e.target.value);
                            setTitle(`${e.target.value.trim() || 'Custom'} Task`);
                          }}
                        />
                      </div>
                    )}
                  </div>

                  {/* 2. SELECT FLIPBOOK RAW INPUT STREAM (For Flipbook) */}
                  {isFlipbook && (
                    <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                      <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--primary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Sparkles size={16} /> 2. Select Flipbook Raw Input Stream
                      </label>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '8px' }}>
                        {RAW_FILE_STREAMS.map((stream) => {
                          const isSelected = rawFileStream === stream;
                          return (
                            <button
                              key={stream}
                              type="button"
                              className={`btn ${isSelected ? 'btn-primary' : 'btn-secondary'}`}
                              onClick={() => {
                                setRawFileStream(stream);
                                setTitle(`Flipbook Creation - ${stream} Process`);
                              }}
                              style={{ padding: '0.55rem 0.75rem', fontSize: '0.8rem', textAlign: 'left', fontWeight: isSelected ? 700 : 500 }}
                            >
                              {isSelected ? `✓ ${stream}` : stream}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 3. FLIPBOOK SOP SUB-TASKS CHECKLIST */}
                  {isFlipbook && (
                    <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                        <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-emerald)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <CheckSquare size={16} /> 2. Flipbook SOP Sub-Tasks ({selectedSopSteps.length}/{availableSopSteps.length})
                        </label>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={handleSelectAllSop} style={{ fontSize: '0.72rem' }}>
                            ☑ Select All
                          </button>
                          <button type="button" className="btn btn-secondary btn-sm" onClick={handleDeselectAllSop} style={{ fontSize: '0.72rem' }}>
                            ✕ Clear All
                          </button>
                        </div>
                      </div>

                      {/* Custom Step Adder */}
                      <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
                        <input 
                          type="text" 
                          className="form-input" 
                          placeholder="Add custom SOP step..." 
                          style={{ fontSize: '0.8rem', padding: '0.45rem 0.75rem' }}
                          value={newCustomStepText} 
                          onChange={e => setNewCustomStepText(e.target.value)} 
                        />
                        <button type="button" className="btn btn-secondary btn-sm" onClick={handleAddCustomSopStep} style={{ whiteSpace: 'nowrap' }}>
                          + Add Task
                        </button>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '220px', overflowY: 'auto' }}>
                        {availableSopSteps.map((step) => {
                          const isChecked = selectedSopSteps.includes(step);
                          return (
                            <div 
                              key={step} 
                              onClick={() => handleToggleSopStep(step)}
                              style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '10px', 
                                padding: '8px 12px', 
                                background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-input)', 
                                border: isChecked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)', 
                                borderRadius: '8px',
                                cursor: 'pointer',
                                fontSize: '0.82rem',
                                color: isChecked ? 'var(--text-main)' : 'var(--text-muted)'
                              }}
                            >
                              <div style={{ 
                                width: 18, 
                                height: 18, 
                                borderRadius: 4, 
                                background: isChecked ? 'var(--accent-emerald)' : 'transparent', 
                                border: isChecked ? 'none' : '1px solid var(--text-muted)', 
                                display: 'flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: 'bold'
                              }}>
                                {isChecked && '✓'}
                              </div>
                              <span style={{ fontWeight: isChecked ? 600 : 400 }}>{step}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                </div>

                {/* Right Column: Title, Instructions, Target Date/Day, Priority, Attachments */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                  
                  {/* Task Title & Details */}
                  <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                    <div style={{ marginBottom: '1rem' }}>
                      <label className="form-label">Task Title *</label>
                      <input 
                        type="text" 
                        className="form-input" 
                        value={title} 
                        onChange={e => setTitle(e.target.value)} 
                        required 
                      />
                    </div>

                    <div>
                      <label className="form-label">Guidelines & Specific Instructions</label>
                      <textarea 
                        className="form-textarea" 
                        rows={4} 
                        placeholder="Enter detailed guidelines, requirements..." 
                        value={description} 
                        onChange={e => setDescription(e.target.value)} 
                      />
                    </div>
                  </div>

                  {/* Target Date, Day, Priority & Status */}
                  <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                      <div>
                        <label className="form-label">Target Date *</label>
                        <input 
                          type="date" 
                          className="form-input" 
                          value={targetDate} 
                          onChange={e => setTargetDate(e.target.value)} 
                          required
                        />
                      </div>

                      <div>
                        <label className="form-label">Target Day</label>
                        <select className="form-select" value={targetDay} onChange={e => setTargetDay(e.target.value)}>
                          {daysOfWeek.map(d => (
                            <option key={d} value={d}>{d}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                      <div>
                        <label className="form-label">Priority</label>
                        <select className="form-select" value={priority} onChange={e => setPriority(e.target.value)}>
                          <option value="Low">Low</option>
                          <option value="Medium">Medium</option>
                          <option value="High">High</option>
                          <option value="Urgent">Urgent 🔥</option>
                        </select>
                      </div>

                      <div>
                        <label className="form-label">Initial Status</label>
                        <select className="form-select" value={status} onChange={e => setStatus(e.target.value)}>
                          <option value="Pending">Pending</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Completed">Completed</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Attach Input Files & Docs */}
                  <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                    <label className="form-label">Attach Input Files & Docs (Word, PPT, Excel, PDF, Photos)</label>
                    <input type="file" multiple onChange={handleFileUpload} style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }} disabled={uploading} />
                    {uploading && <span style={{ fontSize: '0.75rem', color: 'var(--primary)', marginLeft: '8px' }}>Uploading file...</span>}
                    
                    {attachments.length > 0 && (
                      <TaskAttachmentsDisplay attachments={attachments} />
                    )}
                  </div>

                  {/* Form Submission Actions */}
                  <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: 'auto' }}>
                    <button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>
                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                      {submitting ? 'Saving...' : editingId ? 'Update Bank Task' : 'Save Task to Bank'}
                    </button>
                  </div>

                </div>

              </form>
            </div>
          )}

          {/* Controls & Filter Bar */}
          <div style={{ 
            display: 'flex', 
            justify: 'space-between', 
            alignItems: 'center', 
            gap: '1rem', 
            marginBottom: '1.25rem', 
            flexWrap: 'wrap' 
          }}>
            {/* Segmented Filter Pills */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
              <button 
                className={`btn btn-sm ${filterMode === 'all' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterMode('all')}
              >
                All ({bankTasks.length})
              </button>

              <button 
                className={`btn btn-sm ${filterMode === 'today' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterMode('today')}
              >
                Today
              </button>

              <button 
                className={`btn btn-sm ${filterMode === 'tomorrow' ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => setFilterMode('tomorrow')}
              >
                Tomorrow
              </button>

              <input 
                type="date" 
                className="select-filter" 
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                value={selectedDate} 
                onChange={e => { setSelectedDate(e.target.value); setFilterMode('date'); }} 
              />

              <select 
                className="select-filter" 
                style={{ padding: '0.35rem 0.6rem', fontSize: '0.8rem' }}
                value={selectedDay} 
                onChange={e => { setSelectedDay(e.target.value); setFilterMode('day'); }}
              >
                <option value="All">Day of Week</option>
                {daysOfWeek.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            {/* Real-time Search Box */}
            <div style={{ position: 'relative', width: '240px' }}>
              <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              <input 
                type="text" 
                className="form-input" 
                style={{ paddingLeft: '32px', paddingTop: '6px', paddingBottom: '6px', fontSize: '0.8rem' }}
                placeholder="Search draft tasks..." 
                value={searchQuery} 
                onChange={e => setSearchQuery(e.target.value)} 
              />
            </div>
          </div>

          {/* Tasks Cards List */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading Manager Task Bank...</div>
          ) : filteredTasks.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '3.5rem 1.5rem', 
              background: 'var(--bg-card)', 
              borderRadius: 'var(--radius-md)', 
              border: '1px dashed var(--border-subtle)' 
            }}>
              <Layers size={40} style={{ opacity: 0.3, marginBottom: '0.75rem', color: 'var(--primary)' }} />
              <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '4px' }}>No Draft Tasks Found</h4>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>Create task drafts for your team and store them day-wise for easy 1-click assignment.</p>
              <button className="btn btn-primary btn-sm" onClick={() => { resetForm(); setIsCreating(true); }}>
                + Create Task Draft
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredTasks.map(item => (
                <div 
                  key={item.id} 
                  className={`bank-task-card ${item.isAssigned ? 'is-assigned' : ''}`}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '6px' }}>
                        <span style={{ 
                          fontSize: '0.72rem', 
                          fontWeight: 700, 
                          padding: '3px 8px', 
                          borderRadius: '6px', 
                          background: 'var(--primary-glow)', 
                          color: 'var(--primary)',
                          border: '1px solid var(--border-glow)'
                        }}>
                          {item.projectCategory}
                        </span>

                        {item.rawFileStream && (
                          <span style={{ fontSize: '0.72rem', background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)', padding: '2px 7px', borderRadius: '4px', fontWeight: 600 }}>
                            {item.rawFileStream}
                          </span>
                        )}

                        <span className={`priority-badge ${item.priority?.toLowerCase()}`}>
                          {item.priority}
                        </span>

                        {item.targetDate && (
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={13} /> {item.targetDate} ({item.targetDay})
                          </span>
                        )}

                        {item.isAssigned ? (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            background: 'rgba(16, 185, 129, 0.15)', 
                            color: 'var(--accent-emerald)', 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontWeight: 700,
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                          }}>
                            ✅ Assigned to {item.assignedToName}
                          </span>
                        ) : (
                          <span style={{ 
                            fontSize: '0.72rem', 
                            background: 'rgba(245, 158, 11, 0.15)', 
                            color: 'var(--accent-amber)', 
                            padding: '3px 8px', 
                            borderRadius: '6px', 
                            fontWeight: 700,
                            border: '1px solid rgba(245, 158, 11, 0.3)'
                          }}>
                            ⏳ Unassigned Draft
                          </span>
                        )}
                      </div>

                      <h4 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', marginTop: '4px', marginBottom: '6px' }}>
                        {item.title}
                      </h4>

                      {item.description && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                          {item.description}
                        </p>
                      )}

                      {/* SOP Steps preview */}
                      {item.sopSteps && item.sopSteps.length > 0 && (
                        <div style={{ marginTop: '0.65rem', padding: '8px 12px', background: 'var(--bg-input)', borderRadius: '6px', border: '1px solid var(--border-subtle)' }}>
                          <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--accent-emerald)', marginBottom: '4px' }}>
                            SOP Checklist ({item.sopSteps.length} steps):
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {item.sopSteps.map(step => (
                              <div key={step} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <CheckSquare size={12} className="text-emerald-400" />
                                <span>{step}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {item.attachments && item.attachments.length > 0 && (
                        <TaskAttachmentsDisplay attachments={item.attachments} />
                      )}
                    </div>

                    {/* Action Controls */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                      {!item.isAssigned && (
                        <button 
                          className="btn btn-primary btn-sm"
                          style={{ display: 'flex', alignItems: 'center', gap: '5px', fontWeight: 600 }}
                          onClick={() => { setAssigningTask(item); setAssignDueDate(item.targetDate || todayStr); }}
                        >
                          <Send size={13} />
                          <span>1-Click Assign</span>
                        </button>
                      )}

                      <button 
                        className="btn btn-secondary btn-sm" 
                        title="Edit Draft Task"
                        onClick={() => handleEditDraft(item)}
                      >
                        <Edit3 size={13} />
                      </button>

                      <button 
                        className="btn btn-secondary btn-sm" 
                        title="Delete Draft Task"
                        style={{ color: 'var(--accent-rose)' }}
                        onClick={() => handleDeleteDraft(item.id, item.title)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Member Assign Popover */}
                  {assigningTask?.id === item.id && (
                    <div style={{ 
                      marginTop: '1rem', 
                      padding: '1.25rem', 
                      background: 'var(--bg-input)', 
                      borderRadius: 'var(--radius-md)', 
                      border: '1px solid var(--primary)' 
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.85rem' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <UserCheck size={16} /> Select Member to Assign Task:
                        </span>
                        <button className="btn btn-secondary btn-sm" onClick={() => setAssigningTask(null)}>Close</button>
                      </div>

                      <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <label style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-muted)' }}>Set Completion Due Date:</label>
                        <input 
                          type="date" 
                          className="form-input" 
                          style={{ width: 'auto', padding: '4px 10px', fontSize: '0.8rem' }}
                          value={assignDueDate} 
                          onChange={e => setAssignDueDate(e.target.value)} 
                        />
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '10px' }}>
                        {teamMembers.map(member => (
                          <div 
                            key={member.email}
                            className="member-assign-chip"
                            onClick={() => handleAssignToMember(item, member)}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                              <div style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'var(--primary-glow)',
                                color: 'var(--primary)',
                                fontWeight: 700,
                                fontSize: '0.75rem',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                              }}>
                                {member.name ? member.name[0].toUpperCase() : 'M'}
                              </div>
                              <div>
                                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)' }}>{member.name}</div>
                                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{member.email}</div>
                              </div>
                            </div>
                            <UserCheck size={16} className="text-indigo-400" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
};
