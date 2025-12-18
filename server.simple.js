require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const session = require('express-session');
const MongoStore = require('connect-mongo');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Connect to MongoDB with better error handling
mongoose.set('strictQuery', false);
mongoose.connect(process.env.MONGODB_URI, {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
})
  .then(async () => {
    console.log('✅ Connected to MongoDB');
    
    // Session middleware
    app.use(session({
      secret: process.env.JWT_SECRET || 'movie_booking_secret',
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
      }
    }));

    // API Routes
    const authRoutes = require('./routes/auth.simple');
    const movieRoutes = require('./routes/movies.simple');
    const showRoutes = require('./routes/shows.simple');
    const bookingRoutes = require('./routes/bookings.simple');

    app.use('/api/auth', authRoutes);
    app.use('/api/movies', movieRoutes);
    app.use('/api/shows', showRoutes);
    app.use('/api/bookings', bookingRoutes);

    // Serve static files
    app.use(express.static(path.join(__dirname, 'public')));

    // Seed sample data
    await seedDatabase();

    // Start server
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', err => {
  console.error('❌ MongoDB error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB disconnected');
});

mongoose.connection.on('reconnected', () => {
  console.log('✅ MongoDB reconnected');
});

// Seed sample data
async function seedDatabase() {
  const Movie = require('./models/Movie.simple');
  const Theatre = require('./models/Theatre.simple');
  const Show = require('./models/Show.simple');

  try {
    // Check if data already exists
    const movieCount = await Movie.countDocuments();
    if (movieCount > 0) {
      console.log('📊 Database already seeded');
      return;
    }

    // Create movies
    const movies = await Movie.insertMany([
      {
        title: 'The Dark Knight',
        description: 'When the menace known as the Joker wreaks havoc and chaos on the people of Gotham, Batman must accept one of the greatest psychological and physical tests.',
        duration: 152,
        language: 'English',
        genre: 'Action',
        poster: 'https://images.unsplash.com/photo-1509347528160-9a9e33742cdb?w=400'
      },
      {
        title: 'Inception',
        description: 'A thief who steals corporate secrets through the use of dream-sharing technology is given the inverse task of planting an idea.',
        duration: 148,
        language: 'English',
        genre: 'Sci-Fi',
        poster: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400'
      },
      {
        title: 'Interstellar',
        description: 'A team of explorers travel through a wormhole in space in an attempt to ensure humanity\'s survival.',
        duration: 169,
        language: 'English',
        genre: 'Sci-Fi',
        poster: 'https://images.unsplash.com/photo-1419242902214-272b3f66ee7a?w=400'
      },
      {
        title: 'Avengers: Endgame',
        description: 'After the devastating events of Infinity War, the Avengers assemble once more to reverse Thanos\' actions.',
        duration: 181,
        language: 'English',
        genre: 'Action',
        poster: 'https://images.unsplash.com/photo-1626814026160-2237a95fc5a0?w=400'
      }
    ]);

    // Create theatres
    const theatres = await Theatre.insertMany([
      { name: 'PVR Cinemas', location: 'Phoenix Mall, Mumbai' },
      { name: 'INOX', location: 'City Center, Delhi' },
      { name: 'Cinepolis', location: 'Forum Mall, Bangalore' }
    ]);

    // Create shows for next 3 days
    const shows = [];
    const now = new Date();
    
    for (let day = 0; day < 3; day++) {
      const showDate = new Date(now);
      showDate.setDate(showDate.getDate() + day);
      
      // Morning shows
      movies.forEach((movie, idx) => {
        const theatre = theatres[idx % theatres.length];
        
        // 10 AM show
        const morning = new Date(showDate);
        morning.setHours(10, 0, 0);
        shows.push({
          movieId: movie._id,
          theatreId: theatre._id,
          showTime: morning,
          totalSeats: 100,
          bookedSeats: [],
          price: 200
        });

        // 2 PM show
        const afternoon = new Date(showDate);
        afternoon.setHours(14, 0, 0);
        shows.push({
          movieId: movie._id,
          theatreId: theatre._id,
          showTime: afternoon,
          totalSeats: 100,
          bookedSeats: [],
          price: 250
        });

        // 6 PM show
        const evening = new Date(showDate);
        evening.setHours(18, 0, 0);
        shows.push({
          movieId: movie._id,
          theatreId: theatre._id,
          showTime: evening,
          totalSeats: 100,
          bookedSeats: [],
          price: 300
        });

        // 9 PM show
        const night = new Date(showDate);
        night.setHours(21, 0, 0);
        shows.push({
          movieId: movie._id,
          theatreId: theatre._id,
          showTime: night,
          totalSeats: 100,
          bookedSeats: [],
          price: 300
        });
      });
    }

    await Show.insertMany(shows);

    console.log('✅ Database seeded with sample data');
    console.log(`   - ${movies.length} movies`);
    console.log(`   - ${theatres.length} theatres`);
    console.log(`   - ${shows.length} shows`);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
  }
}
