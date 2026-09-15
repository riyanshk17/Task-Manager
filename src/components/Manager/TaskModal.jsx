import React, { useState, useEffect } from 'react';
import { 
  X, Calendar, User, Flag, AlertCircle, FileText, CheckCircle2, 
  Paperclip, Image, FileSpreadsheet, Presentation, Trash2, CheckSquare, Layers, BookOpen, Sparkles, Plus, Video, Palette, Server
} from 'lucide-react';

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

export const TaskModal = ({ isOpen, onClose, teamMembers, taskToEdit, onSaveTask, showToast, teamId }) => {
  const [projectCategory, setProjectCategory] = useState('Flipbook Creation');
  const [customProjectInput, setCustomProjectInput] = useState('');
  const [isCustomProject, setIsCustomProject] = useState(false);

  const [rawFileStream, setRawFileStream] = useState('B - VOC');
  const [availableSopSteps, setAvailableSopSteps] = useState([...FLIPBOOK_SOP_STEPS]);
  const [selectedSopSteps, setSelectedSopSteps] = useState([...FLIPBOOK_SOP_STEPS]);
  const [newCustomStepText, setNewCustomStepText] = useState('');
  
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [status, setStatus] = useState('Pending');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Bank Pre-fill state
  const [bankTasks, setBankTasks] = useState([]);
  const [selectedBankId, setSelectedBankId] = useState('');

  const isFlipbook = !isCustomProject && projectCategory === 'Flipbook Creation';

  useEffect(() => {
    if (!isOpen) return;

    if (taskToEdit) {
      const isPreset = PRESET_PROJECTS.some(p => p.name === taskToEdit.projectCategory);
      if (isPreset) {
        setProjectCategory(taskToEdit.projectCategory);
        setIsCustomProject(false);
      } else if (taskToEdit.projectCategory) {
        setProjectCategory('Custom');
        setCustomProjectInput(taskToEdit.projectCategory);
        setIsCustomProject(true);
      }

      setRawFileStream(taskToEdit.rawFileStream || (taskToEdit.projectCategory === 'Flipbook Creation' ? 'B - VOC' : ''));
      const taskSteps = taskToEdit.sopSteps || (taskToEdit.projectCategory === 'Flipbook Creation' ? FLIPBOOK_SOP_STEPS : []);
      setAvailableSopSteps(taskSteps);
      setSelectedSopSteps(taskSteps);
      setTitle(taskToEdit.title || '');
      setDescription(taskToEdit.description || '');
      setAssignedTo(taskToEdit.assignedTo || '');
      setDueDate(taskToEdit.dueDate || '');
      setPriority(taskToEdit.priority || 'Medium');
      setStatus(taskToEdit.status || 'Pending');
      setAttachments(taskToEdit.attachments || []);
    } else {
      setProjectCategory('Flipbook Creation');
      setIsCustomProject(false);
      setCustomProjectInput('');
      setRawFileStream('B - VOC');
      setAvailableSopSteps([...FLIPBOOK_SOP_STEPS]);
      setSelectedSopSteps([...FLIPBOOK_SOP_STEPS]);
      setTitle('Flipbook Creation - B - VOC Process');
      setDescription('Complete Flipbook Creation SOP tasks for raw files received.');
      setAssignedTo(teamMembers?.length > 0 ? teamMembers[0].email : '');
      const defaultDate = new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0];
      setDueDate(defaultDate);
      setPriority('Medium');
      setStatus('Pending');
      setAttachments([]);
    }

    if (teamId) {
      fetch(`/api/manager/task-bank?teamId=${teamId}`)
        .then(res => res.json())
        .then(data => {
          if (data.taskBank) {
            setBankTasks(data.taskBank.filter(t => !t.isAssigned));
          }
        })
        .catch(() => {});
    }
  }, [isOpen, taskToEdit, teamId]);

  const handleSelectFromBank = (bankTaskId) => {
    setSelectedBankId(bankTaskId);
    if (!bankTaskId) return;
    const item = bankTasks.find(t => t.id === bankTaskId);
    if (!item) return;

    setTitle(item.title || '');
    setDescription(item.description || '');
    setPriority(item.priority || 'Medium');
    if (item.targetDate) setDueDate(item.targetDate);
    if (item.projectCategory) {
      const isPreset = PRESET_PROJECTS.some(p => p.name === item.projectCategory);
      if (isPreset) {
        setProjectCategory(item.projectCategory);
        setIsCustomProject(false);
      } else {
        setProjectCategory('Custom');
        setCustomProjectInput(item.projectCategory);
        setIsCustomProject(true);
      }
    }
    if (item.attachments && item.attachments.length > 0) {
      setAttachments(item.attachments);
    }
    if (item.sopSteps && item.sopSteps.length > 0) {
      setAvailableSopSteps(item.sopSteps);
      setSelectedSopSteps(item.sopSteps);
    }
    if (showToast) showToast(`Pre-filled task details from Manager Bank: "${item.title}"`, 'success');
  };

  const handleSelectProject = (projName) => {
    if (projName === 'Flipbook Creation') {
      setIsCustomProject(false);
      setProjectCategory('Flipbook Creation');
      setRawFileStream('B - VOC');
      if (!taskToEdit) {
        setTitle('Flipbook Creation - B - VOC Process');
        setAvailableSopSteps([...FLIPBOOK_SOP_STEPS]);
        setSelectedSopSteps([...FLIPBOOK_SOP_STEPS]);
      }
    } else if (projName === 'Custom') {
      setIsCustomProject(true);
      setProjectCategory('Custom');
      setRawFileStream('');
      if (!taskToEdit) {
        setTitle(customProjectInput ? customProjectInput : 'Custom Work Task');
        setAvailableSopSteps([]);
        setSelectedSopSteps([]);
      }
    } else {
      setIsCustomProject(false);
      setProjectCategory(projName);
      setRawFileStream('');
      if (!taskToEdit) {
        setTitle(`${projName} Work`);
        setAvailableSopSteps([]);
        setSelectedSopSteps([]);
      }
    }
  };

  const handleRawStreamChange = (stream) => {
    setRawFileStream(stream);
    if (!taskToEdit && isFlipbook) {
      setTitle(`Flipbook Creation - ${stream}`);
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

  const handleDeleteSopStep = (stepToDelete) => {
    setAvailableSopSteps(prev => prev.filter(s => s !== stepToDelete));
    setSelectedSopSteps(prev => prev.filter(s => s !== stepToDelete));
    if (showToast) showToast('Subtask step removed.', 'info');
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

  if (!isOpen) return null;

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
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
          body: JSON.stringify({
            fileName: file.name,
            fileData
          })
        });

        const data = await res.json();
        if (res.ok && data.attachment) {
          setAttachments(prev => [...prev, data.attachment]);
          if (showToast) showToast(`Attached file: ${file.name}`, 'success');
        } else {
          if (showToast) showToast(data.error || 'Failed to upload file.', 'error');
        }
      } catch (err) {
        if (showToast) showToast(`Error uploading ${file.name}`, 'error');
      }
    }

    setUploading(false);
  };

  const handleRemoveAttachment = (idToRemove) => {
    setAttachments(prev => prev.filter(a => a.id !== idToRemove));
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'image': return <Image size={14} className="text-purple-400" />;
      case 'word': return <FileText size={14} className="text-blue-400" />;
      case 'excel': return <FileSpreadsheet size={14} className="text-emerald-400" />;
      case 'ppt': return <Presentation size={14} className="text-amber-400" />;
      default: return <Paperclip size={14} className="text-indigo-400" />;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !assignedTo || !dueDate) {
      showToast('Please fill out Title, Assignee Email, and Due Date.', 'error');
      return;
    }

    if (isFlipbook && selectedSopSteps.length === 0) {
      showToast('Please select at least 1 SOP sub-task step for Flipbook Creation.', 'error');
      return;
    }

    setLoading(true);

    const selectedMember = teamMembers.find(m => m.email.toLowerCase() === assignedTo.toLowerCase());
    const assignedToName = selectedMember ? selectedMember.name : assignedTo.split('@')[0];

    const finalCategory = isCustomProject ? (customProjectInput.trim() || 'Custom Project') : projectCategory;

    const payload = {
      title: title.trim(),
      description: description.trim(),
      projectCategory: finalCategory,
      rawFileStream: isFlipbook ? rawFileStream : '',
      sopSteps: selectedSopSteps,
      assignedTo: assignedTo.trim().toLowerCase(),
      assignedToName,
      dueDate,
      priority,
      status,
      attachments
    };

    await onSaveTask(payload, taskToEdit ? taskToEdit.id : null);
    setLoading(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="glass-panel modal-container full-screen-dashboard" onClick={e => e.stopPropagation()} style={{ width: '94vw', maxWidth: '1400px', height: '92vh', display: 'flex', flexDirection: 'column', padding: 0, overflow: 'hidden' }}>
        
        {/* Full-Screen Dashboard Header */}
        <div className="modal-header" style={{ padding: '1.25rem 2rem', background: 'var(--bg-card)', borderBottom: '1px solid var(--border-subtle)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div style={{ background: 'rgba(99, 102, 241, 0.15)', padding: '10px', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BookOpen size={24} className="text-indigo-400" />
            </div>
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: 0, color: 'var(--text-main)' }}>
                {taskToEdit ? 'Edit Task Assignment' : 'Assign Work Dashboard'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: 0 }}>
                {isFlipbook ? 'Flipbook Creation SOP Checklist & Input File Stream Assignment' : `Assign Tasks & Instructions for ${isCustomProject ? (customProjectInput || 'Custom Work') : projectCategory}`}
              </p>
            </div>
          </div>
          <button className="close-btn" onClick={onClose} style={{ padding: '6px', background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
            <X size={20} />
          </button>
        </div>

        {/* Full-Screen Dashboard Form Body */}
        <form onSubmit={handleSubmit} style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.5rem', padding: '1.5rem 2rem', overflowY: 'auto', background: 'var(--bg-dark)' }}>
          
          {/* Left Column: Project Work & Dynamic Sub-Tasks */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            {/* Quick-Fill from Manager Task Bank Banner */}
            {bankTasks.length > 0 && !taskToEdit && (
              <div style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', padding: '1rem', borderRadius: '12px' }}>
                <label style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Sparkles size={16} /> ⚡ Quick-Fill from Manager Daily Task Bank ({bankTasks.length} Drafts Available):
                </label>
                <select 
                  className="select-filter" 
                  style={{ width: '100%', background: 'var(--bg-card)', color: 'var(--text-main)', padding: '0.5rem', borderRadius: '8px' }}
                  value={selectedBankId}
                  onChange={e => handleSelectFromBank(e.target.value)}
                >
                  <option value="">-- Select a pre-created draft task from your bank --</option>
                  {bankTasks.map(b => (
                    <option key={b.id} value={b.id}>
                      📌 [{b.projectCategory}] {b.title} ({b.targetDate || b.targetDay || 'No date'})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Work Category Selector (Preset + Custom) */}
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
                    placeholder="Enter custom project name (e.g. Content Audit, SEO Optimization)..."
                    value={customProjectInput}
                    onChange={e => {
                      setCustomProjectInput(e.target.value);
                      if (!taskToEdit) setTitle(e.target.value ? e.target.value : 'Custom Work Task');
                    }}
                    required={isCustomProject}
                  />
                </div>
              )}
            </div>

            {/* Raw Input File Categories — ONLY SHOWN FOR FLIPBOOK CREATION */}
            {isFlipbook && (
              <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--secondary)', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '0.75rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Sparkles size={16} /> 2. Select Flipbook Raw Input Stream
                </label>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px' }}>
                  {RAW_FILE_STREAMS.map((stream) => (
                    <button
                      key={stream}
                      type="button"
                      onClick={() => handleRawStreamChange(stream)}
                      style={{
                        padding: '0.65rem 0.85rem',
                        borderRadius: '8px',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        textAlign: 'left',
                        border: rawFileStream === stream ? '2px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: rawFileStream === stream ? 'rgba(99, 102, 241, 0.15)' : 'var(--bg-input)',
                        color: rawFileStream === stream ? 'var(--primary)' : 'var(--text-main)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                    >
                      {rawFileStream === stream ? '✔ ' : ''}{stream}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* SOP & Custom Sub-Tasks Checklist Selection */}
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)', flex: 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                <label className="form-label" style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-emerald)', letterSpacing: '0.05em', textTransform: 'uppercase', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckSquare size={16} /> {isFlipbook ? '2' : '2'}. {isFlipbook ? 'Flipbook SOP Sub-Tasks' : `Tasks / Sub-Tasks for ${isCustomProject ? (customProjectInput || 'Custom Project') : projectCategory}`} ({selectedSopSteps.length}/{availableSopSteps.length})
                </label>
                {availableSopSteps.length > 0 && (
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    <button 
                      type="button" 
                      onClick={handleSelectAllSop} 
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', color: '#34d399', borderColor: 'rgba(16, 185, 129, 0.4)', background: 'rgba(16, 185, 129, 0.12)', fontWeight: 600 }}
                    >
                      <CheckSquare size={13} />
                      <span>Select All</span>
                    </button>
                    <button 
                      type="button" 
                      onClick={handleDeselectAllSop} 
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: '0.78rem', padding: '4px 10px', display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--text-muted)', borderColor: 'var(--border-subtle)', background: 'var(--bg-input)', fontWeight: 600 }}
                    >
                      <X size={13} />
                      <span>Clear All</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Add Custom Sub-Task Input */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '0.85rem' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder={isFlipbook ? "Add custom SOP step..." : `Type task step for ${isCustomProject ? (customProjectInput || 'this project') : projectCategory}...`}
                  value={newCustomStepText}
                  onChange={e => setNewCustomStepText(e.target.value)}
                  style={{ fontSize: '0.85rem' }}
                />
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={handleAddCustomSopStep}
                  disabled={!newCustomStepText.trim()}
                  style={{ whiteSpace: 'nowrap', fontWeight: 600 }}
                >
                  <Plus size={14} /> Add Task
                </button>
              </div>

              {availableSopSteps.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 1rem', background: 'var(--bg-input)', borderRadius: '8px', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                  No sub-tasks added yet. Type a task above and click <strong>"+ Add Task"</strong> to assign sub-tasks to the member.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {availableSopSteps.map((step, idx) => {
                    const isChecked = selectedSopSteps.includes(step);
                    return (
                      <div 
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '8px',
                          padding: '8px 12px',
                          borderRadius: '8px',
                          background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'var(--bg-input)',
                          border: isChecked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border-subtle)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <label 
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            color: 'var(--text-main)',
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            flex: 1
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleSopStep(step)}
                            style={{ width: '16px', height: '16px', accentColor: 'var(--accent-emerald)', cursor: 'pointer' }}
                          />
                          <span style={{ fontWeight: isChecked ? 600 : 400 }}>{step}</span>
                        </label>

                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteSopStep(step);
                          }}
                          style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.25)',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '4px 6px',
                            borderRadius: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'var(--transition-fast)'
                          }}
                          title="Delete this subtask step"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>

          {/* Right Column: Member Assignment & Attachments */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
              <div className="form-group">
                <label className="form-label">Task Assignment Title *</label>
                <input 
                  type="text"
                  className="form-input"
                  placeholder="Task title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Guidelines & Specific Instructions</label>
                <textarea 
                  className="form-textarea"
                  style={{ minHeight: '80px' }}
                  placeholder="Provide guidance or custom specs for assigned team member..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Assign To Member *</label>
                  <select 
                    className="form-select"
                    value={assignedTo}
                    onChange={e => setAssignedTo(e.target.value)}
                    required
                  >
                    <option value="">Select Team Member...</option>
                    {teamMembers.map((m, idx) => (
                      <option key={idx} value={m.email}>
                        👤 {m.name} ({m.email})
                      </option>
                    ))}
                  </select>

                  {assignedTo && (() => {
                    const selectedMember = teamMembers.find(m => m.email?.toLowerCase() === assignedTo.toLowerCase());
                    if (!selectedMember) return null;
                    return (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '8px', padding: '6px 12px', background: 'var(--bg-input)', borderRadius: '8px', border: '1px solid var(--border-subtle)' }}>
                        {selectedMember.avatarUrl ? (
                          <img
                            src={selectedMember.avatarUrl}
                            alt={selectedMember.name}
                            onError={e => {
                              e.target.style.display = 'none';
                              if (e.target.nextSibling) e.target.nextSibling.style.display = 'flex';
                            }}
                            style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1.5px solid var(--primary)', flexShrink: 0 }}
                          />
                        ) : null}
                        <div
                          className="avatar-circle"
                          style={{
                            width: 28,
                            height: 28,
                            fontSize: '0.72rem',
                            fontWeight: 700,
                            display: selectedMember.avatarUrl ? 'none' : 'flex',
                            flexShrink: 0
                          }}
                        >
                          {selectedMember.name ? selectedMember.name[0].toUpperCase() : 'M'}
                        </div>
                        <div style={{ fontSize: '0.8rem', lineHeight: '1.2' }}>
                          <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{selectedMember.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{selectedMember.email}</div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                <div className="form-group">
                  <label className="form-label">Completion Due Date *</label>
                  <input 
                    type="date"
                    className="form-input"
                    value={dueDate}
                    onChange={e => setDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select 
                    className="form-select"
                    value={priority}
                    onChange={e => setPriority(e.target.value)}
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                    <option value="Urgent">Urgent 🔥</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Initial Status</label>
                  <select 
                    className="form-select"
                    value={status}
                    onChange={e => setStatus(e.target.value)}
                  >
                    <option value="Pending">Pending</option>
                    <option value="In Progress">In Progress</option>
                    <option value="Completed">Completed</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Document & Raw File Attachments */}
            <div className="glass-panel" style={{ padding: '1.25rem', background: 'var(--bg-card)' }}>
              <label className="form-label" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>Attach Input Files & Docs (Word, PPT, Excel, PDF, Photos)</span>
                {uploading && <span style={{ fontSize: '0.75rem', color: 'var(--primary)' }}>Uploading...</span>}
              </label>

              <div style={{ position: 'relative' }}>
                <input 
                  type="file" 
                  multiple
                  accept="image/*,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.pdf"
                  onChange={handleFileUpload}
                  id="task-file-upload-full"
                  style={{ display: 'none' }}
                />
                <label 
                  htmlFor="task-file-upload-full" 
                  className="btn btn-secondary"
                  style={{ width: '100%', border: '1px dashed var(--primary)', background: 'rgba(99, 102, 241, 0.08)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                >
                  <Paperclip size={16} className="text-indigo-400" />
                  <span>Upload Input Files for Member...</span>
                </label>
              </div>

              {attachments.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '0.75rem' }}>
                  {attachments.map((att) => (
                    <div key={att.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(255, 255, 255, 0.06)', border: '1px solid var(--border-subtle)', borderRadius: '6px', padding: '4px 10px', fontSize: '0.8rem' }}>
                      {getCategoryIcon(att.category)}
                      <span style={{ maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {att.fileName}
                      </span>
                      <button 
                        type="button" 
                        onClick={() => handleRemoveAttachment(att.id)}
                        style={{ background: 'none', border: 'none', color: '#fca5a5', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: '2px' }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: 'auto', paddingTop: '1rem' }}>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" style={{ padding: '0.75rem 1.5rem' }} disabled={loading || uploading}>
                <CheckCircle2 size={18} />
                <span>{loading ? 'Assigning Task...' : (taskToEdit ? 'Save Task Updates' : 'Assign Task')}</span>
              </button>
            </div>

          </div>

        </form>

      </div>
    </div>
  );
};
