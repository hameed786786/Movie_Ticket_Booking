const express = require('express');
const router = express.Router();
const Show = require('../models/Show.simple');
const Booking = require('../models/Booking.simple');

// Get shows for a movie
router.get('/movie/:movieId', async (req, res) => {
  try {
    const shows = await Show.find({ movieId: req.params.movieId })
      .populate('theatreId')
      .populate('movieId')
      .sort('showTime');
    res.json({ success: true, shows });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get show by ID with seat availability
router.get('/:id', async (req, res) => {
  try {
    const show = await Show.findById(req.params.id)
      .populate('theatreId')
      .populate('movieId');
    
    if (!show) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }

    res.json({ 
      success: true, 
      show,
      availableSeats: show.totalSeats - show.bookedSeats.length
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Book tickets
router.post('/:id/book', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Please login to book tickets' });
    }

    const { seats } = req.body; // Array of seat numbers
    const showId = req.params.id;

    // Get show
    const show = await Show.findById(showId);
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

    // Calculate total price
    const totalPrice = seats.length * show.price;

    // Create booking
    const booking = new Booking({
      userId: req.session.userId,
      showId: showId,
      seats: seats,
      totalPrice: totalPrice,
      status: 'CONFIRMED'
    });

    await booking.save();

    // Update show with booked seats
    show.bookedSeats.push(...seats);
    await show.save();

    res.json({ 
      success: true, 
      message: 'Booking confirmed!',
      booking: {
        id: booking._id,
        seats: booking.seats,
        totalPrice: booking.totalPrice,
        status: booking.status
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
