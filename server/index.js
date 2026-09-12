import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import crypto from 'crypto';
import { emailService } from './services/emailService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'store.json');
const ARCHIVE_FILE = path.join(DATA_DIR, 'assigned_tasks_archive.json');

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

// Permanent Assigned Tasks Archive Helpers
const readArchiveData = () => {
  if (!fs.existsSync(ARCHIVE_FILE)) {
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify([], null, 2), 'utf-8');
    return [];
  }
  try {
    const raw = fs.readFileSync(ARCHIVE_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (err) {
    return [];
  }
};

const saveToPermanentArchive = (actionType, task) => {
  try {
    const archive = readArchiveData();
    const record = {
      archiveId: `arch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      action: actionType,
      taskId: task.id,
      teamId: task.teamId,
      title: task.title,
      description: task.description || '',
      assignedTo: task.assignedTo,
      assignedToName: task.assignedToName,
      createdBy: task.createdBy || 'System',
      dueDate: task.dueDate,
      priority: task.priority,
      status: task.status,
      notes: task.notes || '',
      attachments: task.attachments || [],
      timestamp: new Date().toISOString()
    };
    archive.unshift(record);
    fs.writeFileSync(ARCHIVE_FILE, JSON.stringify(archive, null, 2), 'utf-8');
    console.log(`[Permanent DB Archive] Recorded ${actionType} for task ${task.id} (${task.title})`);
  } catch (err) {
    console.error('Error saving to permanent archive:', err.message);
  }
};

// Nodemailer Transporter Setup
let transporter;
const initEmailTransporter = async () => {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.EMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || process.env.EMAIL_PASS;

  if (user && pass) {
    transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // SSL
      auth: { user, pass }
    });
    console.log(`Nodemailer initialized with Gmail SSL SMTP for user: ${user}`);
  } else {
    // Ethereal test SMTP account as fallback
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log(`Nodemailer test transporter ready (Ethereal: ${testAccount.user})`);
    } catch (err) {
      console.warn('Could not create Ethereal test email account:', err.message);
    }
  }
};
initEmailTransporter();

// Temporary OTP Store in Memory
const otpStore = new Map();

// Helper: Seed Data
const getInitialSeed = () => ({
  users: [
    {
      id: 'usr_mgr_1',
      name: 'Manager Sarah Jenkins',
      email: 'manager@company.com',
      password: 'password123',
      defaultRole: 'manager',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_emp_1',
      name: 'Alex Rivera',
      email: 'alex@company.com',
      password: 'password123',
      defaultRole: 'employee',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_emp_2',
      name: 'John Doe',
      email: 'john@company.com',
      password: 'password123',
      defaultRole: 'employee',
      createdAt: new Date().toISOString()
    },
    {
      id: 'usr_emp_3',
      name: 'Emily Watson',
      email: 'emily@company.com',
      password: 'password123',
      defaultRole: 'employee',
      createdAt: new Date().toISOString()
    }
  ],
  teams: [
    {
      id: 'team_alpha',
      name: 'Product Engineering Team',
      code: 'TEAM-7X9B2K',
      ownerEmail: 'manager@company.com',
      createdAt: new Date().toISOString(),
      members: [
        { email: 'manager@company.com', name: 'Manager Sarah Jenkins', role: 'manager' },
        { email: 'alex@company.com', name: 'Alex Rivera', role: 'employee' },
        { email: 'john@company.com', name: 'John Doe', role: 'employee' },
        { email: 'emily@company.com', name: 'Emily Watson', role: 'employee' }
      ]
    }
  ],
  tasks: [
    {
      id: 'task_101',
      teamId: 'team_alpha',
      title: 'Design New Dashboard UI Wireframes',
      description: 'Create high-fidelity responsive wireframes for the manager executive overview.',
      assignedTo: 'alex@company.com',
      assignedToName: 'Alex Rivera',
      createdBy: 'manager@company.com',
      dueDate: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
      priority: 'High',
      status: 'In Progress',
      notes: 'Initial component layout approved by design team.',
      createdAt: new Date(Date.now() - 86400000).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task_102',
      teamId: 'team_alpha',
      title: 'Fix Authentication Token Refresh Bug',
      description: 'Resolve session timeout issue where token renewal fails on background tab resume.',
      assignedTo: 'alex@company.com',
      assignedToName: 'Alex Rivera',
      createdBy: 'manager@company.com',
      dueDate: new Date(Date.now() + 86400000 * 4).toISOString().split('T')[0],
      priority: 'Urgent',
      status: 'Pending',
      notes: '',
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task_103',
      teamId: 'team_alpha',
      title: 'Database Indexing Optimization',
      description: 'Add index queries for user task lookups by email to speed up response time.',
      assignedTo: 'john@company.com',
      assignedToName: 'John Doe',
      createdBy: 'manager@company.com',
      dueDate: new Date(Date.now() + 86400000 * 1).toISOString().split('T')[0],
      priority: 'Medium',
      status: 'Completed',
      notes: 'Completed query optimization tests. Performance improved by 40%.',
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      updatedAt: new Date().toISOString()
    },
    {
      id: 'task_104',
      teamId: 'team_alpha',
      title: 'Write API Documentation for Task Endpoints',
      description: 'Document POST /api/tasks and PUT /api/tasks with Swagger JSON spec.',
      assignedTo: 'emily@company.com',
      assignedToName: 'Emily Watson',
      createdBy: 'manager@company.com',
      dueDate: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0],
      priority: 'Low',
      status: 'Pending',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }
  ]
});

// Helper: Read store
const readData = () => {
  if (!fs.existsSync(DATA_FILE)) {
    const seed = getInitialSeed();
    seed.messages = [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const db = JSON.parse(raw);
    if (!Array.isArray(db.messages)) db.messages = [];
    if (!Array.isArray(db.managerTaskBank)) db.managerTaskBank = [];
    if (!Array.isArray(db.activeTimers)) db.activeTimers = [];

    let dirty = false;
    // Ensure readBy array exists on team messages
    db.messages.forEach(m => {
      if (!Array.isArray(m.readBy)) {
        m.readBy = m.senderEmail ? [m.senderEmail.toLowerCase()] : [];
        dirty = true;
      }
    });

    // Ensure readBy, totalTimeSpent, and timeLogs exist on tasks
    if (Array.isArray(db.tasks)) {
      db.tasks.forEach(t => {
        if (typeof t.totalTimeSpent !== 'number') {
          t.totalTimeSpent = 0;
          dirty = true;
        }
        if (!Array.isArray(t.timeLogs)) {
          t.timeLogs = [];
          dirty = true;
        }
        if (Array.isArray(t.taskChat)) {
          t.taskChat.forEach(m => {
            if (!Array.isArray(m.readBy)) {
              m.readBy = m.senderEmail ? [m.senderEmail.toLowerCase()] : [];
              dirty = true;
            }
          });
        }
      });
    }

    if (dirty) {
      writeData(db);
    }

    return db;
  } catch (err) {
    console.error('Error reading JSON store, re-initializing:', err);
    const seed = getInitialSeed();
    seed.messages = [];
    fs.writeFileSync(DATA_FILE, JSON.stringify(seed, null, 2), 'utf-8');
    return seed;
  }
};

// Helper: Write store
const writeData = (data) => {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
};

// Dynamic Enrichment Helpers to ensure profile picture avatarUrl is attached everywhere
const enrichTeam = (db, team) => {
  if (!team) return null;
  const enrichedMembers = (team.members || []).map(m => {
    const userObj = (db.users || []).find(u => u.email.toLowerCase() === m.email.toLowerCase());
    return {
      ...m,
      avatarUrl: userObj?.avatarUrl || m.avatarUrl || ''
    };
  });
  return {
    ...team,
    members: enrichedMembers
  };
};

const enrichTask = (db, task) => {
  if (!task) return null;
  const assignee = (db.users || []).find(u => u.email.toLowerCase() === task.assignedTo?.toLowerCase());
  return {
    ...task,
    assignedToAvatarUrl: assignee?.avatarUrl || task.assignedToAvatarUrl || ''
  };
};

const enrichChatMessage = (db, msg) => {
  if (!msg) return null;
  const sender = (db.users || []).find(u => u.email.toLowerCase() === msg.senderEmail?.toLowerCase());
  return {
    ...msg,
    senderAvatarUrl: sender?.avatarUrl || msg.senderAvatarUrl || ''
  };
};

const generateTeamCode = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `TEAM-${code}`;
};

// --- API ROUTES ---

// Health Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// Reset / Re-seed
app.post('/api/seed', (req, res) => {
  const seed = getInitialSeed();
  writeData(seed);
  res.json({ message: 'Database reset successfully', data: seed });
});

// Helper: Send Email via HTTPS API (Resend / Brevo) or Nodemailer SMTP fallback
async function sendEmailViaApiOrSmtp({ toEmail, name, otpCode, type }) {
  const subject = `Your TaskMaster Verification Code: ${otpCode}`;
  const htmlContent = `
    <div style="font-family: Arial, sans-serif; background-color: #0b0f19; color: #f8fafc; padding: 24px; border-radius: 12px; max-width: 500px; margin: 0 auto; border: 1px solid #1e293b;">
      <h2 style="color: #6366f1; text-align: center; margin-bottom: 8px;">TaskMaster Pro</h2>
      <p style="text-align: center; color: #94a3b8; font-size: 14px;">Professional Study & Workspace Hub</p>
      <hr style="border: 0; border-top: 1px solid #334155; margin: 20px 0;" />
      <p style="font-size: 16px;">Hello <strong>${name || 'User'}</strong>,</p>
      <p style="font-size: 14px; color: #cbd5e1;">Your single-use verification code to complete your ${type === 'signup' ? 'registration' : 'sign in'} is:</p>
      <div style="background: rgba(99, 102, 241, 0.15); border: 1px dashed #6366f1; font-size: 32px; font-weight: bold; letter-spacing: 6px; text-align: center; color: #818cf8; padding: 16px; border-radius: 8px; margin: 20px 0;">
        ${otpCode}
      </div>
      <p style="font-size: 13px; color: #94a3b8; text-align: center;">This code is valid for 10 minutes. Do not share it with anyone.</p>
    </div>
  `;
  const textContent = `Hello ${name || 'User'},\n\nYour 6-digit security code for TaskMaster Pro is: ${otpCode}\n\nThis code will expire in 10 minutes.\n\nBest regards,\nTaskMaster Pro Team`;

  // 1. Check Resend API Key
  if (process.env.RESEND_API_KEY) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'TaskMaster Pro <onboarding@resend.dev>',
          to: [toEmail],
          subject,
          html: htmlContent
        })
      });
      if (res.ok) {
        console.log(`✅ Real email delivered to ${toEmail} via Resend HTTPS API!`);
        return true;
      }
    } catch (err) {
      console.error('Resend API error:', err.message);
    }
  }

  // 2. Check Brevo API Key
  if (process.env.BREVO_API_KEY) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': process.env.BREVO_API_KEY,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'TaskMaster Pro', email: 'no-reply@taskmasterpro.com' },
          to: [{ email: toEmail }],
          subject,
          htmlContent
        })
      });
      if (res.ok) {
        console.log(`✅ Real email delivered to ${toEmail} via Brevo HTTPS API!`);
        return true;
      }
    } catch (err) {
      console.error('Brevo API error:', err.message);
    }
  }

  // 3. Fallback to Nodemailer Transporter
  if (transporter) {
    try {
      const info = await transporter.sendMail({
        from: process.env.SMTP_USER || process.env.GMAIL_USER || '"TaskMaster Pro" <no-reply@taskmasterpro.com>',
        to: toEmail,
        subject,
        text: textContent,
        html: htmlContent
      });
      if (nodemailer.getTestMessageUrl(info)) {
        console.log(`Preview Email URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      console.log(`Mail sent via Nodemailer to ${toEmail}:`, info.messageId);
      return true;
    } catch (err) {
      console.error(`Nodemailer delivery error for ${toEmail}:`, err.message);
    }
  }

  return false;
}

// 1. AUTH: Send Email OTP
app.post('/api/auth/send-otp', async (req, res) => {
  const { email, type = 'signup', name } = req.body;
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readData();
  const existingUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);

  if (type === 'signup' && existingUser) {
    return res.status(400).json({ error: 'An account with this email address already exists. Please sign in.' });
  }

  if ((type === 'login' || type === 'reset') && !existingUser) {
    return res.status(404).json({ error: 'No account found with this email address. Please check spelling or register.' });
  }

  // 60-Second Resend Cooldown Check
  const existingOtp = otpStore.get(cleanEmail);
  if (existingOtp && existingOtp.resendAllowedAt && Date.now() < existingOtp.resendAllowedAt) {
    const remainingSeconds = Math.ceil((existingOtp.resendAllowedAt - Date.now()) / 1000);
    return res.status(429).json({ 
      error: `Please wait ${remainingSeconds} seconds before requesting a new verification code.`,
      resendCooldownSeconds: remainingSeconds
    });
  }

  // Generate Cryptographically Secure 6-Digit OTP
  const otpCode = crypto.randomInt(100000, 1000000).toString();
  const otpHash = crypto.createHash('sha256').update(otpCode).digest('hex');

  const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes
  const resendAllowedAt = Date.now() + 60 * 1000; // 60 seconds cooldown

  otpStore.set(cleanEmail, {
    otpHash,
    expiresAt,
    resendAllowedAt,
    attempts: 0,
    type,
    createdAt: new Date().toISOString()
  });

  try {
    await emailService.sendVerificationOtp({ toEmail: cleanEmail, name, otpCode, type });
    res.json({
      message: `Verification code sent to ${cleanEmail}. Please check your inbox.`,
      email: cleanEmail,
      resendCooldownSeconds: 60
    });
  } catch (err) {
    console.error(`[OTP Error] Failed sending OTP to ${cleanEmail}:`, err.message);
    res.status(500).json({ error: "We couldn't send the verification code. Please try again." });
  }
});

// 2. AUTH: Verify OTP & Register/Authenticate User
app.post('/api/auth/verify-otp', (req, res) => {
  const { email, otp, otpCode, type = 'signup', name, password, defaultRole } = req.body;
  const submittedOtp = (otp || otpCode || '').toString().trim();

  if (!email || !submittedOtp) {
    return res.status(400).json({ error: 'Email address and 6-digit verification code are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const storedOtp = otpStore.get(cleanEmail);

  if (!storedOtp) {
    return res.status(400).json({ error: 'No active verification code found for this email. Please request a new code.' });
  }

  // Expiration Check (10 Minutes)
  if (Date.now() > storedOtp.expiresAt) {
    otpStore.delete(cleanEmail);
    return res.status(400).json({ error: 'This code has expired. Please request a new code.' });
  }

  // Attempt Limit Check (Maximum 5 Failed Attempts)
  if (storedOtp.attempts >= 5) {
    otpStore.delete(cleanEmail);
    return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
  }

  // Secure Cryptographic Verification
  const submittedHash = crypto.createHash('sha256').update(submittedOtp).digest('hex');
  const isMatch = crypto.timingSafeEqual(
    Buffer.from(storedOtp.otpHash),
    Buffer.from(submittedHash)
  );

  if (!isMatch) {
    storedOtp.attempts += 1;
    if (storedOtp.attempts >= 5) {
      otpStore.delete(cleanEmail);
      return res.status(429).json({ error: 'Too many incorrect attempts. Please request a new code.' });
    }
    return res.status(400).json({ 
      error: 'That code is incorrect. Please check your email and try again.',
      remainingAttempts: 5 - storedOtp.attempts
    });
  }

  // OTP Verified! Consume single-use token
  otpStore.delete(cleanEmail);

  const db = readData();

  if (type === 'signup') {
    let user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      user = {
        id: `usr_${Date.now()}`,
        name: name ? name.trim() : cleanEmail.split('@')[0],
        email: cleanEmail,
        password: password || 'password123',
        defaultRole: defaultRole || 'employee',
        isVerified: true,
        verifiedAt: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };
      db.users.push(user);
      writeData(db);
    } else {
      user.isVerified = true;
      user.verifiedAt = new Date().toISOString();
      writeData(db);
    }

    const userTeams = db.teams.filter(t => t.members.some(m => m.email.toLowerCase() === cleanEmail)).map(t => enrichTeam(db, t));
    return res.json({
      message: 'Email verified successfully.',
      user: { id: user.id, name: user.name, email: user.email, defaultRole: user.defaultRole, isVerified: true, avatarUrl: user.avatarUrl || '' },
      userTeams
    });
  } else {
    // Login Verification
    const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
    if (!user) {
      return res.status(404).json({ error: 'User account not found.' });
    }
    user.isVerified = true;
    user.verifiedAt = new Date().toISOString();
    writeData(db);

    const userTeams = db.teams.filter(t => t.members.some(m => m.email.toLowerCase() === cleanEmail)).map(t => enrichTeam(db, t));
    return res.json({
      message: 'Email verified successfully.',
      user: { id: user.id, name: user.name, email: user.email, defaultRole: user.defaultRole, isVerified: true, avatarUrl: user.avatarUrl || '' },
      userTeams
    });
  }
});

// 3. AUTH: Password Login Direct
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readData();

  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user || user.password !== password) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const userTeams = db.teams.filter(t => t.members.some(m => m.email.toLowerCase() === cleanEmail)).map(t => enrichTeam(db, t));

  res.json({
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      defaultRole: user.defaultRole,
      bio: user.bio || '',
      jobTitle: user.jobTitle || '',
      avatarUrl: user.avatarUrl || ''
    },
    userTeams
  });
});

// 3b. AUTH: Direct Sign Up
app.post('/api/auth/signup', (req, res) => {
  const { name, email, password, defaultRole } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readData();

  const existingUser = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (existingUser) {
    return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
  }

  const newUser = {
    id: `usr_${Date.now()}`,
    name: name.trim(),
    email: cleanEmail,
    password: password,
    defaultRole: defaultRole || 'employee',
    createdAt: new Date().toISOString()
  };

  db.users.push(newUser);
  writeData(db);

  const userTeams = db.teams.filter(t => t.members.some(m => m.email.toLowerCase() === cleanEmail)).map(t => enrichTeam(db, t));

  res.status(201).json({
    message: 'Account registered successfully!',
    user: { id: newUser.id, name: newUser.name, email: newUser.email, defaultRole: newUser.defaultRole, avatarUrl: '' },
    userTeams
  });
});

// 3c. AUTH: Reset Password via Email OTP
app.post('/api/auth/reset-password', (req, res) => {
  const { email, otpCode, newPassword } = req.body;
  if (!email || !otpCode || !newPassword) {
    return res.status(400).json({ error: 'Email, verification code, and new password are required.' });
  }

  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const storedOtp = otpStore.get(cleanEmail);

  if (!storedOtp) {
    return res.status(400).json({ error: 'No active password reset verification code found. Please request a new code.' });
  }

  // Verify OTP Hash
  const submittedHash = crypto.createHash('sha256').update(otpCode.toString().trim()).digest('hex');
  const isMatch = crypto.timingSafeEqual(Buffer.from(storedOtp.otpHash), Buffer.from(submittedHash));

  if (!isMatch) {
    return res.status(400).json({ error: 'The 6-digit verification code is incorrect.' });
  }

  otpStore.delete(cleanEmail);
  const db = readData();

  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);
  if (!user) {
    return res.status(404).json({ error: 'User account not found.' });
  }

  user.password = newPassword;
  user.updatedAt = new Date().toISOString();
  writeData(db);

  const userTeams = db.teams.filter(t => t.members.some(m => m.email.toLowerCase() === cleanEmail));

  res.json({
    message: 'Password reset successfully! You are now logged in.',
    user: { 
      id: user.id, 
      name: user.name, 
      email: user.email, 
      defaultRole: user.defaultRole,
      bio: user.bio || '',
      phone: user.phone || '',
      jobTitle: user.jobTitle || '',
      avatarUrl: user.avatarUrl || ''
    },
    userTeams
  });
});

// 3d. USER PROFILE: Update Profile Details & Change Password
app.put('/api/user/profile', (req, res) => {
  const { email, name, bio, phone, jobTitle, avatarUrl, currentPassword, newPassword } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'User email is required.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const db = readData();
  const user = db.users.find(u => u.email.toLowerCase() === cleanEmail);

  if (!user) {
    return res.status(404).json({ error: 'User profile not found.' });
  }

  // Handle password change if requested
  if (newPassword) {
    if (user.password && currentPassword !== user.password) {
      return res.status(401).json({ error: 'Current password is incorrect.' });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'New password must be at least 6 characters long.' });
    }
    user.password = newPassword;
  }

  if (name && name.trim()) user.name = name.trim();
  if (bio !== undefined) user.bio = bio.trim();
  if (phone !== undefined) user.phone = phone.trim();
  if (jobTitle !== undefined) user.jobTitle = jobTitle.trim();
  if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;

  // Also sync updated name and avatarUrl in all team member lists, tasks, and chat
  (db.teams || []).forEach(t => {
    (t.members || []).forEach(m => {
      if (m.email && m.email.toLowerCase() === cleanEmail) {
        if (name && name.trim()) m.name = name.trim();
        if (avatarUrl !== undefined) m.avatarUrl = avatarUrl;
      }
    });
  });

  (db.tasks || []).forEach(task => {
    if (task.assignedTo && task.assignedTo.toLowerCase() === cleanEmail) {
      if (name && name.trim()) task.assignedToName = name.trim();
      if (avatarUrl !== undefined) task.assignedToAvatarUrl = avatarUrl;
    }
    if (Array.isArray(task.taskChat)) {
      task.taskChat.forEach(m => {
        if (m.senderEmail && m.senderEmail.toLowerCase() === cleanEmail) {
          if (name && name.trim()) m.senderName = name.trim();
          if (avatarUrl !== undefined) m.senderAvatarUrl = avatarUrl;
        }
      });
    }
  });

  (db.messages || []).forEach(msg => {
    if (msg.senderEmail && msg.senderEmail.toLowerCase() === cleanEmail) {
      if (name && name.trim()) msg.senderName = name.trim();
      if (avatarUrl !== undefined) msg.senderAvatarUrl = avatarUrl;
    }
  });

  writeData(db);

  res.json({
    message: 'Profile updated successfully!',
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      defaultRole: user.defaultRole,
      bio: user.bio || '',
      phone: user.phone || '',
      jobTitle: user.jobTitle || '',
      avatarUrl: user.avatarUrl || ''
    }
  });
});

// 3e. USER AVATAR: Upload Profile Image
app.post('/api/user/upload-avatar', (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'fileName and fileData base64 are required.' });
  }

  try {
    const ext = path.extname(fileName) || '.jpg';
    const safeName = `avatar_${Date.now()}_${Math.random().toString(36).substring(2, 6)}${ext}`;
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

    const base64Content = fileData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Content, 'base64');
    const filePath = path.join(uploadDir, safeName);
    fs.writeFileSync(filePath, buffer);

    const avatarUrl = `/uploads/${safeName}`;
    res.json({ success: true, avatarUrl });
  } catch (err) {
    console.error('Error uploading avatar image:', err);
    res.status(500).json({ error: 'Failed to upload profile photo.' });
  }
});

// 4. TEAM: Create Team
app.post('/api/teams/create', (req, res) => {
  const { name, ownerEmail, ownerName } = req.body;
  if (!name || !ownerEmail) {
    return res.status(400).json({ error: 'Team name and owner email are required.' });
  }

  const cleanOwnerEmail = ownerEmail.trim().toLowerCase();
  const db = readData();

  const teamCode = generateTeamCode();
  const newTeam = {
    id: `team_${Date.now()}`,
    name: name.trim(),
    code: teamCode,
    ownerEmail: cleanOwnerEmail,
    createdAt: new Date().toISOString(),
    members: [
      {
        email: cleanOwnerEmail,
        name: ownerName || cleanOwnerEmail.split('@')[0],
        role: 'manager'
      }
    ]
  };

  db.teams.push(newTeam);
  writeData(db);

  res.status(201).json({ message: 'Team created successfully!', team: enrichTeam(db, newTeam) });
});

// 5. TEAM: Join Team by Code
app.post('/api/teams/join', (req, res) => {
  const { code, userEmail, userName } = req.body;
  if (!code || !userEmail) {
    return res.status(400).json({ error: 'Team code and user email are required.' });
  }

  const cleanCode = code.trim().toUpperCase();
  const cleanUserEmail = userEmail.trim().toLowerCase();
  const db = readData();

  const team = db.teams.find(t => t.code.toUpperCase() === cleanCode);
  if (!team) {
    return res.status(404).json({ error: 'Invalid Team Code. Please verify with your manager.' });
  }

  const existingMember = team.members.find(m => m.email.toLowerCase() === cleanUserEmail);
  if (!existingMember) {
    team.members.push({
      email: cleanUserEmail,
      name: userName || cleanUserEmail.split('@')[0],
      role: 'employee'
    });
    writeData(db);
  }

  res.json({ message: `Successfully joined ${team.name}!`, team: enrichTeam(db, team) });
});

// 5b. TEAM: Leave Team
app.post('/api/teams/leave', (req, res) => {
  const { teamId, userEmail } = req.body;
  if (!teamId || !userEmail) {
    return res.status(400).json({ error: 'teamId and userEmail are required.' });
  }

  const cleanEmail = userEmail.trim().toLowerCase();
  const db = readData();

  const team = db.teams.find(t => t.id === teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  const initialLength = team.members.length;
  team.members = team.members.filter(m => m.email.toLowerCase() !== cleanEmail);

  if (team.members.length === initialLength) {
    return res.status(400).json({ error: 'User is not a member of this team.' });
  }

  // Transfer ownership if owner leaves and members remain
  if (team.ownerEmail.toLowerCase() === cleanEmail && team.members.length > 0) {
    team.ownerEmail = team.members[0].email;
    team.members[0].role = 'manager';
  }

  writeData(db);

  const userTeams = db.teams.filter(t => t.members.some(m => m.email.toLowerCase() === cleanEmail)).map(t => enrichTeam(db, t));
  res.json({ message: `Successfully left ${team.name}`, userTeams });
});

// 6. TEAM: Get Single Team Info & Live Members
app.get('/api/teams/:teamId', (req, res) => {
  const { teamId } = req.params;
  const db = readData();
  const team = db.teams.find(t => t.id === teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }
  res.json({ team: enrichTeam(db, team) });
});

// 6b. ATTACHMENTS: Upload File (Images, Word, PPT, Excel, PDF)
app.post('/api/tasks/upload-attachment', (req, res) => {
  const { fileName, fileData } = req.body;
  if (!fileName || !fileData) {
    return res.status(400).json({ error: 'fileName and fileData (base64 string) are required.' });
  }

  try {
    const uniqueId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storedFileName = `${uniqueId}_${safeName}`;
    const filePath = path.join(UPLOADS_DIR, storedFileName);

    // Strip any data URL prefix (e.g. data:application/...;base64,) safely
    const base64Clean = fileData.includes(';base64,') 
      ? fileData.split(';base64,').pop() 
      : fileData.replace(/^data:.*?,/, '');
    
    const buffer = Buffer.from(base64Clean, 'base64');
    fs.writeFileSync(filePath, buffer);

    const ext = path.extname(fileName).toLowerCase();
    let category = 'document';
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.svg'].includes(ext)) {
      category = 'image';
    } else if (['.doc', '.docx'].includes(ext)) {
      category = 'word';
    } else if (['.xls', '.xlsx', '.csv'].includes(ext)) {
      category = 'excel';
    } else if (['.ppt', '.pptx'].includes(ext)) {
      category = 'ppt';
    } else if (ext === '.pdf') {
      category = 'pdf';
    }

    const attachment = {
      id: uniqueId,
      fileName,
      category,
      url: `/uploads/${storedFileName}`,
      size: buffer.length,
      uploadedAt: new Date().toISOString()
    };

    res.status(201).json({ message: 'File uploaded successfully!', attachment });
  } catch (err) {
    console.error('File upload error:', err.message);
    res.status(500).json({ error: 'Failed to upload attachment.' });
  }
});

// 6b-2. ATTACHMENTS: Download Attachment Endpoint
app.get('/api/tasks/download-attachment/:fileName', (req, res) => {
  const { fileName } = req.params;
  const originalName = req.query.name || fileName;
  const filePath = path.join(UPLOADS_DIR, fileName);

  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }

  res.download(filePath, originalName, (err) => {
    if (err && !res.headersSent) {
      console.error('Attachment download error:', err.message);
      res.status(500).send('Could not download file.');
    }
  });
});

// 6c. TASKS: Get Permanent Tasks Archive
app.get('/api/tasks/archive', (req, res) => {
  const { teamId, userEmail } = req.query;
  let archive = readArchiveData();

  if (teamId) {
    archive = archive.filter(a => a.teamId === teamId);
  }
  if (userEmail) {
    const clean = userEmail.trim().toLowerCase();
    archive = archive.filter(a => a.assignedTo.toLowerCase() === clean);
  }

  res.json({ archive });
});

// 7. TASKS: GET Tasks for Team
app.get('/api/tasks', (req, res) => {
  const { teamId, assignedTo, status, search } = req.query;

  if (!teamId) {
    return res.status(400).json({ error: 'teamId query parameter is required.' });
  }

  const db = readData();
  let tasks = db.tasks.filter(t => t.teamId === teamId);

  if (assignedTo) {
    const cleanAssignee = assignedTo.trim().toLowerCase();
    tasks = tasks.filter(t => t.assignedTo.toLowerCase() === cleanAssignee);
  }

  if (status && status !== 'All') {
    tasks = tasks.filter(t => t.status.toLowerCase() === status.toLowerCase());
  }

  if (search) {
    const term = search.toLowerCase();
    tasks = tasks.filter(t => 
      t.title.toLowerCase().includes(term) ||
      t.description.toLowerCase().includes(term) ||
      t.assignedTo.toLowerCase().includes(term)
    );
  }

  res.json({ tasks: tasks.map(t => enrichTask(db, t)), serverTime: new Date().toISOString() });
});

// 8. TASKS: POST Create Task
app.post('/api/tasks', (req, res) => {
  const { teamId, title, description, assignedTo, assignedToName, dueDate, priority, createdBy, attachments, projectCategory, rawFileStream, sopSteps } = req.body;

  if (!teamId || !title || !assignedTo || !dueDate) {
    return res.status(400).json({ error: 'Missing required fields: teamId, title, assignedTo, dueDate.' });
  }

  const db = readData();
  const team = db.teams.find(t => t.id === teamId);
  if (!team) {
    return res.status(404).json({ error: 'Team not found.' });
  }

  const cleanAssignee = assignedTo.trim().toLowerCase();
  
  let resolvedName = assignedToName;
  if (!resolvedName) {
    const member = team.members.find(m => m.email.toLowerCase() === cleanAssignee);
    resolvedName = member ? member.name : cleanAssignee.split('@')[0];
  }

  const assigneeUser = (db.users || []).find(u => u.email.toLowerCase() === cleanAssignee);

  const newTask = {
    id: `task_${Date.now()}`,
    teamId,
    title: title.trim(),
    description: description ? description.trim() : '',
    projectCategory: projectCategory || 'Flipbook Creation',
    rawFileStream: rawFileStream || '',
    sopSteps: Array.isArray(sopSteps) ? sopSteps : [],
    taskChat: [],
    assignedTo: cleanAssignee,
    assignedToName: resolvedName,
    assignedToAvatarUrl: assigneeUser?.avatarUrl || '',
    createdBy: createdBy || 'Team Owner',
    dueDate,
    priority: priority || 'Medium',
    status: 'Pending',
    notes: '',
    attachments: Array.isArray(attachments) ? attachments : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.tasks.unshift(newTask);
  writeData(db);

  // Permanently store in Archive Database
  saveToPermanentArchive('ASSIGNED', newTask);

  res.status(201).json({ message: 'Task assigned successfully!', task: enrichTask(db, newTask) });
});

// 9. TASKS: PUT Edit Task
app.put('/api/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  const { title, description, assignedTo, assignedToName, dueDate, priority, status, notes, attachments, projectCategory, rawFileStream, sopSteps } = req.body;

  const db = readData();
  const taskIndex = db.tasks.findIndex(t => t.id === taskId);

  if (taskIndex === -1) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const currentTask = db.tasks[taskIndex];

  if (title !== undefined) currentTask.title = title.trim();
  if (description !== undefined) currentTask.description = description.trim();
  if (projectCategory !== undefined) currentTask.projectCategory = projectCategory;
  if (rawFileStream !== undefined) currentTask.rawFileStream = rawFileStream;
  if (sopSteps !== undefined && Array.isArray(sopSteps)) currentTask.sopSteps = sopSteps;
  if (assignedTo !== undefined) {
    currentTask.assignedTo = assignedTo.trim().toLowerCase();
    currentTask.assignedToName = assignedToName || assignedTo.split('@')[0];
    const assigneeUser = (db.users || []).find(u => u.email.toLowerCase() === currentTask.assignedTo);
    currentTask.assignedToAvatarUrl = assigneeUser?.avatarUrl || '';
  }
  if (dueDate !== undefined) currentTask.dueDate = dueDate;
  if (priority !== undefined) currentTask.priority = priority;
  if (status !== undefined) currentTask.status = status;
  if (notes !== undefined) currentTask.notes = notes;
  if (attachments !== undefined && Array.isArray(attachments)) currentTask.attachments = attachments;

  currentTask.updatedAt = new Date().toISOString();

  db.tasks[taskIndex] = currentTask;
  writeData(db);

  // Permanently record update in Archive Database
  saveToPermanentArchive('UPDATED', currentTask);

  res.json({ message: 'Task updated successfully!', task: enrichTask(db, currentTask) });
});

// 10. TASKS: PATCH Update Task Status
app.patch('/api/tasks/:taskId/status', (req, res) => {
  const { taskId } = req.params;
  const { status, note } = req.body;

  if (!status) {
    return res.status(400).json({ error: 'Status is required.' });
  }

  const db = readData();
  const task = db.tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  task.status = status;
  if (note !== undefined) {
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    task.notes = note ? `[${timestamp}]: ${note}\n${task.notes || ''}`.trim() : task.notes;
  }
  task.updatedAt = new Date().toISOString();

  writeData(db);

  // Permanently record status update in Archive Database
  saveToPermanentArchive(`STATUS_${status.toUpperCase().replace(/\s+/g, '_')}`, task);

  res.json({ message: 'Task status updated!', task: enrichTask(db, task) });
});

// 10b. TASKS: Interactive Member SOP Step Checkmark Progress
app.patch('/api/tasks/:taskId/sop-progress', (req, res) => {
  const { taskId } = req.params;
  const { completedSopSteps } = req.body;

  if (!Array.isArray(completedSopSteps)) {
    return res.status(400).json({ error: 'completedSopSteps array is required.' });
  }

  const db = readData();
  const task = db.tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  task.completedSopSteps = completedSopSteps;
  
  // Auto-update status based on SOP progress
  if (task.sopSteps && task.sopSteps.length > 0 && completedSopSteps.length === task.sopSteps.length) {
    task.status = 'Completed';
  } else if (completedSopSteps.length > 0 && task.status === 'Pending') {
    task.status = 'In Progress';
  }

  task.updatedAt = new Date().toISOString();
  writeData(db);

  saveToPermanentArchive('SOP_PROGRESS_UPDATED', task);

  res.json({ message: 'SOP progress updated!', task: enrichTask(db, task) });
});

// 11. TASKS: DELETE Task
app.delete('/api/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  const db = readData();

  const initialLength = db.tasks.length;
  db.tasks = db.tasks.filter(t => t.id !== taskId);

  if (db.tasks.length === initialLength) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  writeData(db);
  res.json({ message: 'Task deleted successfully.' });
});

// 11b. MANAGER TASK BANK: GET Unassigned Task Bank for Team
app.get('/api/manager/task-bank', (req, res) => {
  const { teamId } = req.query;
  if (!teamId) {
    return res.status(400).json({ error: 'teamId parameter is required.' });
  }

  const db = readData();
  const taskBank = (db.managerTaskBank || []).filter(item => item.teamId === teamId);
  res.json({ taskBank });
});

// 11c. MANAGER TASK BANK: POST Create Task Draft in Bank
app.post('/api/manager/task-bank', (req, res) => {
  const { teamId, title, description, projectCategory, rawFileStream, sopSteps, targetDate, targetDay, priority, attachments, createdBy } = req.body;
  
  if (!teamId || !title) {
    return res.status(400).json({ error: 'teamId and title are required.' });
  }

  const db = readData();
  db.managerTaskBank = db.managerTaskBank || [];

  const newTaskBankItem = {
    id: `bank_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teamId,
    title: title.trim(),
    description: description ? description.trim() : '',
    projectCategory: projectCategory || 'Flipbook Creation',
    rawFileStream: rawFileStream || '',
    sopSteps: Array.isArray(sopSteps) ? sopSteps : [],
    targetDate: targetDate || new Date().toISOString().split('T')[0],
    targetDay: targetDay || '',
    priority: priority || 'Medium',
    attachments: Array.isArray(attachments) ? attachments : [],
    isAssigned: false,
    createdBy: createdBy || 'Manager',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.managerTaskBank.unshift(newTaskBankItem);
  writeData(db);

  res.status(201).json({ message: 'Task added to Manager Task Bank!', task: newTaskBankItem });
});

// 11d. MANAGER TASK BANK: PUT Edit Draft in Bank
app.put('/api/manager/task-bank/:bankTaskId', (req, res) => {
  const { bankTaskId } = req.params;
  const { title, description, projectCategory, rawFileStream, sopSteps, targetDate, targetDay, priority, attachments } = req.body;

  const db = readData();
  const itemIndex = (db.managerTaskBank || []).findIndex(t => t.id === bankTaskId);

  if (itemIndex === -1) {
    return res.status(404).json({ error: 'Draft task not found in bank.' });
  }

  const item = db.managerTaskBank[itemIndex];
  if (title !== undefined) item.title = title.trim();
  if (description !== undefined) item.description = description.trim();
  if (projectCategory !== undefined) item.projectCategory = projectCategory;
  if (rawFileStream !== undefined) item.rawFileStream = rawFileStream;
  if (sopSteps !== undefined && Array.isArray(sopSteps)) item.sopSteps = sopSteps;
  if (targetDate !== undefined) item.targetDate = targetDate;
  if (targetDay !== undefined) item.targetDay = targetDay;
  if (priority !== undefined) item.priority = priority;
  if (attachments !== undefined && Array.isArray(attachments)) item.attachments = attachments;

  item.updatedAt = new Date().toISOString();
  db.managerTaskBank[itemIndex] = item;
  writeData(db);

  res.json({ message: 'Task draft updated in bank!', task: item });
});

// 11e. MANAGER TASK BANK: DELETE Draft Task from Bank
app.delete('/api/manager/task-bank/:bankTaskId', (req, res) => {
  const { bankTaskId } = req.params;
  const db = readData();

  const initialLen = (db.managerTaskBank || []).length;
  db.managerTaskBank = (db.managerTaskBank || []).filter(t => t.id !== bankTaskId);

  if (db.managerTaskBank.length === initialLen) {
    return res.status(404).json({ error: 'Draft task not found in bank.' });
  }

  writeData(db);
  res.json({ message: 'Draft task deleted from bank.' });
});

// 11f. MANAGER TASK BANK: POST 1-Click Assign Bank Task to Team Member
app.post('/api/manager/task-bank/:bankTaskId/assign', (req, res) => {
  const { bankTaskId } = req.params;
  const { assignedTo, assignedToName, dueDate } = req.body;

  if (!assignedTo) {
    return res.status(400).json({ error: 'assignedTo email is required.' });
  }

  const db = readData();
  const bankItem = (db.managerTaskBank || []).find(t => t.id === bankTaskId);

  if (!bankItem) {
    return res.status(404).json({ error: 'Draft task not found in bank.' });
  }

  const cleanAssignee = assignedTo.trim().toLowerCase();
  const team = db.teams.find(t => t.id === bankItem.teamId);
  
  let resolvedName = assignedToName;
  if (!resolvedName && team) {
    const member = team.members.find(m => m.email.toLowerCase() === cleanAssignee);
    resolvedName = member ? member.name : cleanAssignee.split('@')[0];
  }

  const assigneeUser = (db.users || []).find(u => u.email.toLowerCase() === cleanAssignee);

  // Promote to active assigned tasks
  const newTask = {
    id: `task_${Date.now()}`,
    teamId: bankItem.teamId,
    title: bankItem.title,
    description: bankItem.description,
    projectCategory: bankItem.projectCategory || 'Flipbook Creation',
    rawFileStream: bankItem.rawFileStream || '',
    sopSteps: Array.isArray(bankItem.sopSteps) ? bankItem.sopSteps : [],
    taskChat: [],
    assignedTo: cleanAssignee,
    assignedToName: resolvedName || cleanAssignee.split('@')[0],
    assignedToAvatarUrl: assigneeUser?.avatarUrl || '',
    createdBy: bankItem.createdBy || 'Team Owner',
    dueDate: dueDate || bankItem.targetDate || new Date().toISOString().split('T')[0],
    priority: bankItem.priority || 'Medium',
    status: 'Pending',
    notes: '',
    attachments: Array.isArray(bankItem.attachments) ? bankItem.attachments : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.tasks = db.tasks || [];
  db.tasks.unshift(newTask);

  // Update bank item state
  bankItem.isAssigned = true;
  bankItem.assignedTaskId = newTask.id;
  bankItem.assignedTo = cleanAssignee;
  bankItem.assignedToName = resolvedName;
  bankItem.assignedAt = new Date().toISOString();

  writeData(db);
  saveToPermanentArchive('ASSIGNED_FROM_BANK', newTask);

  res.status(201).json({ message: `Task assigned to ${resolvedName}!`, task: enrichTask(db, newTask), bankItem });
});

// 12. CHAT: GET Messages for Team
app.get('/api/chat/messages', (req, res) => {
  const { teamId, userEmail } = req.query;
  if (!teamId) {
    return res.status(400).json({ error: 'teamId query parameter is required.' });
  }

  const db = readData();
  const messages = (db.messages || []).filter(m => m.teamId === teamId);

  let unreadCount = 0;
  if (userEmail) {
    const cleanEmail = userEmail.trim().toLowerCase();
    unreadCount = messages.filter(m => 
      m.senderEmail.toLowerCase() !== cleanEmail && 
      (!m.readBy || !m.readBy.map(e => e.toLowerCase()).includes(cleanEmail))
    ).length;
  }

  const enrichedMessages = messages.map(m => enrichChatMessage(db, m));
  res.json({ messages: enrichedMessages, unreadCount });
});

// 13. CHAT: POST Send Message
app.post('/api/chat/messages', (req, res) => {
  const { teamId, senderEmail, senderName, senderRole, text, attachments } = req.body;
  if (!teamId || !senderEmail || (!text && (!attachments || attachments.length === 0))) {
    return res.status(400).json({ error: 'teamId, senderEmail, and message text or attachment are required.' });
  }

  const db = readData();
  db.messages = db.messages || [];
  const cleanSender = senderEmail.trim().toLowerCase();
  const senderUser = (db.users || []).find(u => u.email.toLowerCase() === cleanSender);

  const newMessage = {
    id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    teamId,
    senderEmail: cleanSender,
    senderName: senderName || cleanSender.split('@')[0],
    senderRole: senderRole || 'employee',
    senderAvatarUrl: senderUser?.avatarUrl || '',
    text: text ? text.trim() : '',
    attachments: Array.isArray(attachments) ? attachments : [],
    readBy: [cleanSender],
    createdAt: new Date().toISOString()
  };

  db.messages.push(newMessage);
  writeData(db);

  res.status(201).json({ message: 'Message sent successfully!', chatMessage: enrichChatMessage(db, newMessage) });
});

// 14. CHAT: POST Mark Team Chat Messages as Read for User
app.post('/api/chat/read', (req, res) => {
  const { teamId, userEmail } = req.body;
  if (!teamId || !userEmail) {
    return res.status(400).json({ error: 'teamId and userEmail are required.' });
  }

  const db = readData();
  const cleanEmail = userEmail.trim().toLowerCase();
  let updatedCount = 0;

  (db.messages || []).forEach(m => {
    if (m.teamId === teamId) {
      if (!Array.isArray(m.readBy)) m.readBy = [];
      const lowerReadBy = m.readBy.map(e => e.toLowerCase());
      if (!lowerReadBy.includes(cleanEmail)) {
        m.readBy.push(cleanEmail);
        updatedCount++;
      }
    }
  });

  if (updatedCount > 0) {
    writeData(db);
  }

  res.json({ success: true, updatedCount });
});

// 15. TASK CHAT: GET Messages for specific Task
app.get('/api/tasks/:taskId/chat', (req, res) => {
  const { taskId } = req.params;
  const db = readData();
  const task = db.tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const enrichedChat = (task.taskChat || []).map(m => enrichChatMessage(db, m));
  res.json({ chatMessages: enrichedChat });
});

// 16. TASK CHAT: POST Message to specific Task
app.post('/api/tasks/:taskId/chat', (req, res) => {
  const { taskId } = req.params;
  const { senderEmail, senderName, senderRole, text, attachments } = req.body;

  if (!senderEmail || (!text && (!attachments || attachments.length === 0))) {
    return res.status(400).json({ error: 'senderEmail and message text or attachment are required.' });
  }

  const db = readData();
  const task = db.tasks.find(t => t.id === taskId);

  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  task.taskChat = task.taskChat || [];
  const cleanSender = senderEmail.trim().toLowerCase();
  const senderUser = (db.users || []).find(u => u.email.toLowerCase() === cleanSender);

  const chatMessage = {
    id: `tmsg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    taskId,
    senderEmail: cleanSender,
    senderName: senderName || cleanSender.split('@')[0],
    senderRole: senderRole || 'employee',
    senderAvatarUrl: senderUser?.avatarUrl || '',
    text: text ? text.trim() : '',
    attachments: Array.isArray(attachments) ? attachments : [],
    readBy: [cleanSender],
    createdAt: new Date().toISOString()
  };

  task.taskChat.push(chatMessage);
  task.updatedAt = new Date().toISOString();

  writeData(db);

  res.status(201).json({ message: 'Task message sent!', chatMessage: enrichChatMessage(db, chatMessage) });
});

// 17. TASK CHAT: POST Mark Task Messages as Read for User
app.post('/api/tasks/:taskId/chat/read', (req, res) => {
  const { taskId } = req.params;
  const { userEmail } = req.body;
  if (!taskId || !userEmail) {
    return res.status(400).json({ error: 'taskId and userEmail are required.' });
  }

  const db = readData();
  const task = db.tasks.find(t => t.id === taskId);
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const cleanEmail = userEmail.trim().toLowerCase();
  let updatedCount = 0;

  (task.taskChat || []).forEach(m => {
    if (!Array.isArray(m.readBy)) m.readBy = [];
    const lowerReadBy = m.readBy.map(e => e.toLowerCase());
    if (!lowerReadBy.includes(cleanEmail)) {
      m.readBy.push(cleanEmail);
      updatedCount++;
    }
  });

  if (updatedCount > 0) {
    writeData(db);
  }

  res.json({ success: true, updatedCount });
});

// 18. TASK TIMER: POST Log Completed Timer Session (Pomodoro / Stopwatch)
app.post('/api/tasks/:taskId/timer/log', (req, res) => {
  const { taskId } = req.params;
  const { durationSeconds, mode, sessionType, userEmail, userName, notes } = req.body;

  if (!taskId || !durationSeconds || durationSeconds <= 0) {
    return res.status(400).json({ error: 'taskId and positive durationSeconds are required.' });
  }

  const db = readData();
  let task = db.tasks.find(t => t.id === taskId);
  if (!task) {
    task = (db.managerTaskBank || []).find(t => t.id === taskId);
  }
  if (!task) {
    return res.status(404).json({ error: 'Task not found.' });
  }

  const cleanEmail = userEmail ? userEmail.trim().toLowerCase() : 'member';
  const cleanName = userName || (cleanEmail.includes('@') ? cleanEmail.split('@')[0] : cleanEmail);
  const durationSec = Number(durationSeconds) || 0;
  const isWork = sessionType !== 'break';

  if (!Array.isArray(task.timeLogs)) task.timeLogs = [];
  if (typeof task.totalTimeSpent !== 'number') task.totalTimeSpent = 0;

  if (isWork) {
    task.totalTimeSpent += durationSec;
    // Automatically transition Pending status to In Progress if work started
    if (task.status === 'Pending') {
      task.status = 'In Progress';
    }
  }

  const timeLogEntry = {
    id: `timelog_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    taskId,
    userEmail: cleanEmail,
    userName: cleanName,
    mode: mode || 'standard', // 'pomodoro' or 'standard'
    sessionType: sessionType || 'work', // 'work' or 'break'
    durationSeconds: durationSec,
    notes: notes ? notes.trim() : '',
    createdAt: new Date().toISOString()
  };

  task.timeLogs.push(timeLogEntry);
  task.updatedAt = new Date().toISOString();

  // Audit permanent log
  saveToPermanentArchive(isWork ? 'TIMER_WORK_SESSION_LOGGED' : 'TIMER_BREAK_SESSION_LOGGED', task);

  writeData(db);

  res.status(201).json({
    message: `${isWork ? 'Focus Work' : 'Break'} session of ${Math.round(durationSec / 60)}m logged!`,
    totalTimeSpent: task.totalTimeSpent,
    timeLog: timeLogEntry,
    task
  });
});

// 19. TASK TIMER: POST Live Timer Heartbeat
app.post('/api/tasks/:taskId/timer/heartbeat', (req, res) => {
  const { taskId } = req.params;
  const { teamId, userEmail, userName, mode, sessionType, elapsedSeconds, remainingSeconds, isRunning, isPaused } = req.body;

  if (!teamId || !userEmail) {
    return res.status(400).json({ error: 'teamId and userEmail are required.' });
  }

  const db = readData();
  const cleanEmail = userEmail.trim().toLowerCase();
  const now = Date.now();

  if (!Array.isArray(db.activeTimers)) db.activeTimers = [];

  // Filter out expired timers (older than 30s) or existing timer for this user
  db.activeTimers = db.activeTimers.filter(t => (now - t.updatedTimestamp < 30000) && t.userEmail !== cleanEmail);

  if (isRunning && !isPaused) {
    let task = db.tasks.find(t => t.id === taskId);
    if (!task) {
      task = (db.managerTaskBank || []).find(t => t.id === taskId);
    }
    db.activeTimers.push({
      taskId,
      taskTitle: task ? task.title : 'Task',
      teamId,
      userEmail: cleanEmail,
      userName: userName || cleanEmail.split('@')[0],
      mode: mode || 'standard',
      sessionType: sessionType || 'work',
      elapsedSeconds: Number(elapsedSeconds) || 0,
      remainingSeconds: Number(remainingSeconds) || 0,
      updatedTimestamp: now
    });
  }

  writeData(db);
  res.json({ success: true, activeTimersCount: db.activeTimers.length });
});

// 20. TASK TIMER: GET Active Timers for Team
app.get('/api/teams/:teamId/active-timers', (req, res) => {
  const { teamId } = req.params;
  const db = readData();
  const now = Date.now();

  // Clean stale timers (> 35s without heartbeat)
  const activeTimers = (db.activeTimers || []).filter(t => t.teamId === teamId && (now - t.updatedTimestamp < 35000));
  res.json({ activeTimers });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Task Manager Server running on port ${PORT} (http://127.0.0.1:${PORT})`);
});
