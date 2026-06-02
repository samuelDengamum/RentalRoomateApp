import express, { Express, NextFunction, Request, Response } from 'express';
import http from 'http';
import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { Server as SocketIOServer } from 'socket.io';

/**
 * Express application setup.
 * Central entry point for backend. Bootstraps the Express application, sets up middleware, 
 * database connection, REST routes, and initializes the Socket.io server for real-time messaging.
 */

// Import routes
import authRoutes from './routes/auth';
import propertyRoutes from './routes/property';
import messageRoutes from './routes/message';
import roommateRoutes from './routes/roommate';
import notificationRoutes from './routes/notification';
import tourRequestRoutes from './routes/tourRequest';
import reportRoutes from './routes/report';
import adminRoutes from './routes/admin';
import statsRoutes from './routes/stats';
import { setSocketServer, setUserOnline, setUserOffline } from './socket';

dotenv.config();

const app: Express = express();
const httpServer = http.createServer(app);
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/rental-roommate';

const io = new SocketIOServer(httpServer, {
  cors: {
    origin: '*'
  }
});
setSocketServer(io);

io.on('connection', (socket) => {
  const userId = socket.handshake.query.userId as string | undefined;
  if (userId) {
    socket.join(`user:${userId}`);
    setUserOnline(userId);
  }

  socket.on('join:conversation', (otherUserId: string) => {
    if (!userId || !otherUserId) return;
    const room = [userId, otherUserId].sort().join(':');
    socket.join(`conversation:${room}`);
  });

  socket.on('disconnect', () => {
    if (userId) {
      setUserOffline(userId);
    }
  });
});

// Middleware
app.use(cors());
app.use(express.json());

const uploadsPath = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadsPath)) {
  fs.mkdirSync(uploadsPath, { recursive: true });
}
app.use('/uploads', express.static(uploadsPath));

// Database connection
mongoose.connect(MONGODB_URI)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.log('MongoDB connection error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/roommates', roommateRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/tour-requests', tourRequestRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/stats', statsRoutes);

// Health check
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'Server is running' });
});

// First-admin setup — works only when zero admins exist in the database
app.post('/api/setup/make-admin', async (req: Request, res: Response) => {
  try {
    const { email, secret } = req.body as { email?: string; secret?: string };
    const SETUP_SECRET = process.env.SETUP_SECRET || 'setup1234';

    if (!secret || secret !== SETUP_SECRET) {
      return res.status(403).json({ error: 'Invalid setup secret' });
    }

    const User = (await import('./models/User')).default;

    const adminExists = await User.exists({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({ error: 'An admin already exists. Use the Admin Console to manage roles.' });
    }

    const user = await User.findOne({ email: email?.trim().toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: `No account found for ${email}. Register first, then call this endpoint.` });
    }

    user.role = 'admin';
    user.banned = false;
    await user.save();

    res.json({ message: `${user.firstName} ${user.lastName} (${user.email}) is now an admin. Log out and back in.` });
  } catch {
    res.status(500).json({ error: 'Setup failed' });
  }
});

// Unknown route handler to keep API errors JSON-formatted.
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
});

// Error handling
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  console.error(err);
  const status = err?.status || err?.statusCode || 500;
  const message = err?.message || 'Internal server error';
  res.status(status).json({ error: message });
});

httpServer.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
