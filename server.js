require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');

const app = express();

// Middleware - CORS before session
app.use(cors({
  origin: true,
  credentials: true
}));
app.use(express.json());

// Import routes at top level
const authRoutes = require('./routes/auth');
const movieRoutes = require('./routes/movies');
const theaterRoutes = require('./routes/theaters');
const showRoutes = require('./routes/shows');
const bookingRoutes = require('./routes/bookings');
const adminRoutes = require('./routes/admin');

// Serve static files FIRST - before any routes
app.use(express.static(path.join(__dirname, 'public')));

// Database connection and server start
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('✅ Connected to MongoDB Atlas');
    
    // Initialize session store after MongoDB connection
    const sessionMiddleware = session({
      secret: process.env.JWT_SECRET || 'tickethub_session_secret',
      resave: false,
      saveUninitialized: false,
      store: MongoStore.create({
        mongoUrl: process.env.MONGODB_URI,
        touchAfter: 24 * 3600
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax'
      },
      name: 'tickethub.sid'
    });
    
    app.use(sessionMiddleware);
    
    // Register API routes AFTER session middleware
    app.use('/api/auth', authRoutes);
    app.use('/api/movies', movieRoutes);
    app.use('/api/theaters', theaterRoutes);
    app.use('/api/shows', showRoutes);
    app.use('/api/bookings', bookingRoutes);
    app.use('/api/admin', adminRoutes);
    
    console.log('📝 Session-based authentication enabled');
    
    // Create admin user if not exists
    await createAdminUser();
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });

// Create default admin user
async function createAdminUser() {
  const User = require('./models/User');
  const bcrypt = require('bcrypt');
  
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@tickethub.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
    
    const existingAdmin = await User.findOne({ email: adminEmail });
    
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      await User.create({
        name: 'Admin',
        email: adminEmail,
        phone: '1234567890',
        password: hashedPassword,
        role: 'admin',
        isActive: true
      });
      console.log('👤 Admin user created:', adminEmail);
    }
  } catch (error) {
    console.error('Error creating admin user:', error.message);
  }
}

module.exports = app;
