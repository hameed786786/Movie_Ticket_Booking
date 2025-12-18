require('dotenv').config();
const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// In-memory database
const db = {
  users: [],
  movies: [],
  theatres: [],
  shows: [],
  bookings: []
};

// Helper to generate IDs
let userId = 1;
let movieId = 1;
let theatreId = 1;
let showId = 1;
let bookingId = 1;

// Seed initial data
function seedDatabase() {
  // Add movies
  db.movies = [
    {
      _id: movieId++,
      title: "Avatar: The Way of Water",
      description: "Jake Sully lives with his newfound family formed on the extrasolar moon Pandora.",
      duration: 192,
      language: "English",
      genre: "Action, Adventure, Sci-Fi",
      posterUrl: "https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg"
    },
    {
      _id: movieId++,
      title: "The Batman",
      description: "When a sadistic serial killer begins murdering key political figures in Gotham, Batman is forced to investigate the city's hidden corruption.",
      duration: 176,
      language: "English",
      genre: "Action, Crime, Drama",
      posterUrl: "https://image.tmdb.org/t/p/w500/74xTEgt7R36Fpooo50r9T25onhq.jpg"
    },
    {
      _id: movieId++,
      title: "Spider-Man: No Way Home",
      description: "Peter Parker seeks Doctor Strange's help to make people forget that he is Spider-Man.",
      duration: 148,
      language: "English",
      genre: "Action, Adventure, Fantasy",
      posterUrl: "https://image.tmdb.org/t/p/w500/1g0dhYtq4irTY1GPXvft6k4YLjm.jpg"
    },
    {
      _id: movieId++,
      title: "Top Gun: Maverick",
      description: "After thirty years, Maverick is still pushing the envelope as a top naval aviator.",
      duration: 130,
      language: "English",
      genre: "Action, Drama",
      posterUrl: "https://image.tmdb.org/t/p/w500/62HCnUTziyWcpDaBO2i1DX17ljH.jpg"
    }
  ];

  // Add theatres
  db.theatres = [
    { _id: theatreId++, name: "PVR Cinemas", location: "Phoenix Mall, Mumbai" },
    { _id: theatreId++, name: "INOX", location: "City Center, Delhi" },
    { _id: theatreId++, name: "Cinepolis", location: "Fun Republic, Bangalore" }
  ];

  // Add shows
  const today = new Date();
  db.movies.forEach(movie => {
    db.theatres.forEach(theatre => {
      // Morning show
      const morning = new Date(today);
      morning.setHours(10, 0, 0, 0);
      db.shows.push({
        _id: showId++,
        movieId: movie._id,
        theatreId: theatre._id,
        showTime: morning,
        totalSeats: 100,
        bookedSeats: []
      });

      // Afternoon show
      const afternoon = new Date(today);
      afternoon.setHours(14, 30, 0, 0);
      db.shows.push({
        _id: showId++,
        movieId: movie._id,
        theatreId: theatre._id,
        showTime: afternoon,
        totalSeats: 100,
        bookedSeats: []
      });

      // Evening show
      const evening = new Date(today);
      evening.setHours(18, 0, 0, 0);
      db.shows.push({
        _id: showId++,
        movieId: movie._id,
        theatreId: theatre._id,
        showTime: evening,
        totalSeats: 100,
        bookedSeats: []
      });

      // Night show
      const night = new Date(today);
      night.setHours(21, 30, 0, 0);
      db.shows.push({
        _id: showId++,
        movieId: movie._id,
        theatreId: theatre._id,
        showTime: night,
        totalSeats: 100,
        bookedSeats: []
      });
    });
  });

  console.log(`✅ Seeded ${db.movies.length} movies, ${db.theatres.length} theatres, ${db.shows.length} shows`);
}

// Auth Routes
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    const existingUser = db.users.find(u => u.email === email);
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      _id: userId++,
      name,
      email,
      password: hashedPassword,
      createdAt: new Date()
    };

    db.users.push(user);

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = db.users.find(u => u.email === email);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    res.json({
      success: true,
      message: 'Login successful',
      user: { _id: user._id, name: user.name, email: user.email }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Movie Routes
app.get('/api/movies', (req, res) => {
  res.json({ success: true, movies: db.movies });
});

app.get('/api/movies/:id', (req, res) => {
  const movie = db.movies.find(m => m._id === parseInt(req.params.id));
  if (!movie) {
    return res.status(404).json({ success: false, message: 'Movie not found' });
  }
  res.json({ success: true, movie });
});

// Get shows for a specific movie
app.get('/api/movies/:id/shows', (req, res) => {
  const movieId = parseInt(req.params.id);
  const shows = db.shows.filter(s => s.movieId === movieId);
  
  const showsWithDetails = shows.map(show => {
    const theatre = db.theatres.find(t => t._id === show.theatreId);
    return {
      ...show,
      theatre,
      availableSeats: show.totalSeats - show.bookedSeats.length
    };
  });

  res.json({ success: true, shows: showsWithDetails });
});

// Show Routes
app.get('/api/shows/movie/:movieId', (req, res) => {
  const movieId = parseInt(req.params.movieId);
  const shows = db.shows.filter(s => s.movieId === movieId);
  
  const showsWithDetails = shows.map(show => {
    const theatre = db.theatres.find(t => t._id === show.theatreId);
    return {
      ...show,
      theatre,
      availableSeats: show.totalSeats - show.bookedSeats.length
    };
  });

  res.json({ success: true, shows: showsWithDetails });
});

app.get('/api/shows/:id', (req, res) => {
  const show = db.shows.find(s => s._id === parseInt(req.params.id));
  if (!show) {
    return res.status(404).json({ success: false, message: 'Show not found' });
  }

  const theatre = db.theatres.find(t => t._id === show.theatreId);
  const movie = db.movies.find(m => m._id === show.movieId);

  res.json({
    success: true,
    show: {
      ...show,
      theatre,
      movie,
      availableSeats: show.totalSeats - show.bookedSeats.length
    }
  });
});

// Booking Routes
app.post('/api/bookings', (req, res) => {
  try {
    console.log('📝 Booking request body:', req.body);
    const { userId, showId, seats, totalPrice } = req.body;
    console.log('📊 Parsed data:', { userId, showId, seats, totalPrice });

    if (!userId || !showId || !seats || seats.length === 0) {
      console.log('❌ Validation failed:', { userId, showId, seats: seats?.length });
      return res.status(400).json({ success: false, message: 'Invalid booking data' });
    }

    const show = db.shows.find(s => s._id === parseInt(showId));
    if (!show) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }

    // Check if seats are already booked
    const alreadyBooked = seats.filter(seat => show.bookedSeats.includes(seat));
    if (alreadyBooked.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Seats ${alreadyBooked.join(', ')} are already booked`
      });
    }

    // Add seats to booked seats
    show.bookedSeats.push(...seats);

    // Create booking
    const booking = {
      _id: bookingId++,
      userId: parseInt(userId),
      showId: parseInt(showId),
      seats,
      totalPrice,
      status: 'CONFIRMED',
      bookedAt: new Date()
    };

    db.bookings.push(booking);

    res.status(201).json({
      success: true,
      message: 'Booking confirmed',
      booking
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

app.get('/api/bookings/user/:userId', (req, res) => {
  const userId = parseInt(req.params.userId);
  const userBookings = db.bookings.filter(b => b.userId === userId);

  const bookingsWithDetails = userBookings.map(booking => {
    const show = db.shows.find(s => s._id === booking.showId);
    const movie = db.movies.find(m => m._id === show.movieId);
    const theatre = db.theatres.find(t => t._id === show.theatreId);

    return {
      ...booking,
      show: {
        ...show,
        movie,
        theatre
      }
    };
  });

  res.json({ success: true, bookings: bookingsWithDetails });
});

// Start server
seedDatabase();
app.listen(PORT, () => {
  console.log(`\n🚀 Server running on http://localhost:${PORT}`);
  console.log(`📊 In-memory database initialized`);
  console.log(`✅ Ready to accept requests\n`);
});
