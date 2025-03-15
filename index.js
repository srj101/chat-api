const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'; // In production, use environment variable

// Middleware
app.use(cors());
app.use(express.json());

// Rate limiting with proper IP detection
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  trustForwardHeader: true,
  // Custom IP extraction to handle various scenarios
  keyGenerator: (req) => {
    return req.ip || 
           req.headers['x-forwarded-for'] || 
           req.headers['x-real-ip'] || 
           req.connection.remoteAddress || 
           '127.0.0.1';
  }
});
app.use(limiter);

// Enable trust proxy if behind a reverse proxy
app.set('trust proxy', 1);

// File upload configuration
const storage = multer.diskStorage({
  destination: './uploads/',
  filename: (req, file, cb) => {
    cb(null, `${uuidv4()}${path.extname(file.originalname)}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 // 50KB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed!'));
  }
});

// In-memory storage
const users = new Map();
const messages = new Map();
const groups = new Map();
const sessions = new Map();

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });
};

// User Routes
app.post('/api/users/register', async (req, res) => {
  try {
    const { username, password, email } = req.body;
    
    if (users.has(username)) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = uuidv4();
    
    users.set(username, {
      id: userId,
      username,
      password: hashedPassword,
      email,
      createdAt: new Date().toISOString()
    });

    res.status(201).json({ message: 'User registered successfully', userId });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

app.post('/api/users/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = users.get(username);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, username }, JWT_SECRET, { expiresIn: '24h' });
    const sessionId = uuidv4();
    
    sessions.set(sessionId, {
      userId: user.id,
      lastActive: new Date().toISOString()
    });

    res.json({ token, sessionId });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Message Routes
app.post('/api/messages', authenticateToken, upload.single('file'), (req, res) => {
  try {
    const { recipientId, content, type } = req.body;
    const senderId = req.user.id;
    const messageId = uuidv4();
    
    const message = {
      id: messageId,
      senderId,
      recipientId,
      content,
      type: type || 'text',
      file: req.file ? {
        filename: req.file.filename,
        path: req.file.path,
        size: req.file.size
      } : null,
      status: {
        sent: true,
        delivered: false,
        seen: false,
        timestamp: new Date().toISOString()
      },
      createdAt: new Date().toISOString()
    };

    if (!messages.has(senderId)) {
      messages.set(senderId, new Map());
    }
    messages.get(senderId).set(messageId, message);

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

app.get('/api/messages/:userId', authenticateToken, (req, res) => {
  const { userId } = req.params;
  const userMessages = messages.get(userId);
  
  if (!userMessages) {
    return res.json([]);
  }

  res.json(Array.from(userMessages.values()));
});

app.patch('/api/messages/:messageId/status', authenticateToken, (req, res) => {
  const { messageId } = req.params;
  const { status } = req.body;
  const userId = req.user.id;

  const userMessages = messages.get(userId);
  if (!userMessages || !userMessages.has(messageId)) {
    return res.status(404).json({ error: 'Message not found' });
  }

  const message = userMessages.get(messageId);
  message.status = { ...message.status, ...status };
  userMessages.set(messageId, message);

  res.json(message);
});

// Group Chat Routes
app.post('/api/groups', authenticateToken, (req, res) => {
  const { name, members } = req.body;
  const groupId = uuidv4();
  
  groups.set(groupId, {
    id: groupId,
    name,
    creator: req.user.id,
    members: [...members, req.user.id],
    createdAt: new Date().toISOString()
  });

  res.status(201).json(groups.get(groupId));
});

app.post('/api/groups/:groupId/messages', authenticateToken, upload.single('file'), (req, res) => {
  const { groupId } = req.params;
  const { content, type } = req.body;
  const senderId = req.user.id;

  const group = groups.get(groupId);
  if (!group) {
    return res.status(404).json({ error: 'Group not found' });
  }

  if (!group.members.includes(senderId)) {
    return res.status(403).json({ error: 'Not a group member' });
  }

  const messageId = uuidv4();
  const message = {
    id: messageId,
    groupId,
    senderId,
    content,
    type: type || 'text',
    file: req.file ? {
      filename: req.file.filename,
      path: req.file.path,
      size: req.file.size
    } : null,
    status: {
      sent: true,
      delivered: false,
      seen: new Map(group.members.map(memberId => [memberId, false])),
      timestamp: new Date().toISOString()
    },
    createdAt: new Date().toISOString()
  };

  if (!messages.has(groupId)) {
    messages.set(groupId, new Map());
  }
  messages.get(groupId).set(messageId, message);

  res.status(201).json(message);
});

// User Status and Activity
app.get('/api/users/status', authenticateToken, (req, res) => {
  const activeUsers = Array.from(sessions.entries())
    .filter(([_, session]) => {
      const lastActive = new Date(session.lastActive);
      return (new Date() - lastActive) < 5 * 60 * 1000; // Consider active if last active within 5 minutes
    })
    .map(([_, session]) => session.userId);

  res.json({ activeUsers });
});

// Error handling middleware
app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'File size exceeds 50KB limit' });
    }
  }
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Enhanced Chat API server running on http://localhost:${PORT}`);
});
