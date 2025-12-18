const express = require('express');
const router = express.Router();
const Show = require('../models/Show');
const Movie = require('../models/Movie');
const Theater = require('../models/Theater');
const Booking = require('../models/Booking');
const SeatLock = require('../models/SeatLock');
const { auth, theaterAuth, optionalAuth } = require('../middleware/auth');

// Get all shows (with filters)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { movie, theater, date } = req.query;
    
    let query = { isActive: true, showTime: { $gte: new Date() } };
    
    if (movie) query.movie = movie;
    if (theater) query.theater = theater;
    
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      query.showTime = { $gte: startDate, $lte: endDate };
    }

    const shows = await Show.find(query)
      .populate('movie', 'title duration posterUrl')
      .populate('theater', 'name address')
      .sort({ showTime: 1 });

    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch shows' });
  }
});

// Get shows by movie ID (public)
router.get('/movie/:movieId', async (req, res) => {
  try {
    const { date } = req.query;
    
    let dateQuery = {};
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      dateQuery = { showTime: { $gte: startDate, $lte: endDate } };
    } else {
      dateQuery = { showTime: { $gte: new Date() } };
    }

    const shows = await Show.find({
      movie: req.params.movieId,
      isActive: true,
      ...dateQuery
    })
      .populate('theater', 'name address screens')
      .sort({ showTime: 1 });

    res.json({ success: true, shows });
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shows' });
  }
});

// Get show by ID with seat availability
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const show = await Show.findById(req.params.id)
      .populate('movie')
      .populate('theater');
    
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Get locked seats
    const lockedSeats = await SeatLock.find({
      show: show._id,
      expiresAt: { $gt: new Date() }
    });

    // Get the screen for this show
    const screen = show.theater.screens.find(s => s.screenNumber === show.screenNumber);

    res.json({
      success: true,
      show,
      screen,
      lockedSeats: lockedSeats.map(lock => ({
        visibleSeatLabel: lock.visibleSeatLabel,
        lockedBy: lock.lockedBy
      })),
      bookedSeats: show.bookedSeats
    });
  } catch (error) {
    console.error('Error fetching show:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch show' });
  }
});

// Create a new show (theater owners)
router.post('/', theaterAuth, async (req, res) => {
  try {
    const { movieId, theaterId, screenNumber, showTime, pricing } = req.body;

    // Validate movie
    const movie = await Movie.findById(movieId);
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Validate theater
    const theater = await Theater.findById(theaterId);
    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    // Check authorization (only theater owner or admin)
    if (theater.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to add shows to this theater' });
    }

    // Find the screen
    const screen = theater.screens.find(s => s.screenNumber === screenNumber);
    if (!screen) {
      return res.status(400).json({ message: 'Screen not found in this theater' });
    }

    // Check for conflicting shows
    const showStart = new Date(showTime);
    const showEnd = new Date(showStart.getTime() + movie.duration * 60000 + 30 * 60000); // Add 30 min buffer

    const conflictingShow = await Show.findOne({
      theater: theaterId,
      screenNumber,
      isActive: true,
      $or: [
        { showTime: { $gte: showStart, $lt: showEnd } },
        { endTime: { $gt: showStart, $lte: showEnd } }
      ]
    });

    if (conflictingShow) {
      return res.status(400).json({ message: 'This screen has a conflicting show at this time' });
    }

    const show = new Show({
      movie: movieId,
      theater: theaterId,
      screenNumber,
      showTime: showStart,
      endTime: showEnd,
      pricing: pricing || { regular: 150, premium: 250, vip: 400 },
      totalSeats: screen.totalSeats,
      availableSeats: screen.totalSeats
    });

    await show.save();

    const populatedShow = await Show.findById(show._id)
      .populate('movie', 'title duration')
      .populate('theater', 'name');

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('showAdded', populatedShow);

    res.status(201).json({
      message: 'Show created successfully',
      show: populatedShow
    });
  } catch (error) {
    console.error('Error creating show:', error);
    res.status(500).json({ message: error.message || 'Failed to create show' });
  }
});

// Update show (theater owners)
router.put('/:id', theaterAuth, async (req, res) => {
  try {
    const show = await Show.findById(req.params.id).populate('theater');
    
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Check authorization
    if (show.theater.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const updates = req.body;
    const updatedShow = await Show.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    ).populate('movie theater');

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('showUpdated', updatedShow);

    res.json({
      message: 'Show updated successfully',
      show: updatedShow
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update show' });
  }
});

// Delete show (theater owners)
router.delete('/:id', theaterAuth, async (req, res) => {
  try {
    const show = await Show.findById(req.params.id).populate('theater');
    
    if (!show) {
      return res.status(404).json({ message: 'Show not found' });
    }

    // Check authorization
    if (show.theater.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Check if there are bookings
    const bookings = await Booking.countDocuments({ show: show._id, bookingStatus: 'confirmed' });
    if (bookings > 0) {
      return res.status(400).json({ message: 'Cannot delete show with confirmed bookings' });
    }

    await Show.findByIdAndUpdate(req.params.id, { isActive: false });

    res.json({ message: 'Show deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete show' });
  }
});

// Get shows by theater (for theater dashboard)
router.get('/theater/:theaterId', theaterAuth, async (req, res) => {
  try {
    const shows = await Show.find({
      theater: req.params.theaterId,
      isActive: true
    })
      .populate('movie', 'title duration posterUrl')
      .sort({ showTime: 1 });

    res.json(shows);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch shows' });
  }
});

module.exports = router;
