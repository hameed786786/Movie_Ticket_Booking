const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking.simple');

// Get user's bookings
router.get('/my-bookings', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Please login' });
    }

    const bookings = await Booking.find({ userId: req.session.userId })
      .populate({
        path: 'showId',
        populate: [
          { path: 'movieId' },
          { path: 'theatreId' }
        ]
      })
      .sort('-bookedAt');

    res.json({ success: true, bookings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Cancel booking
router.post('/:id/cancel', async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ success: false, message: 'Please login' });
    }

    const booking = await Booking.findOne({ 
      _id: req.params.id, 
      userId: req.session.userId 
    }).populate('showId');

    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking.status === 'CANCELLED') {
      return res.status(400).json({ success: false, message: 'Booking already cancelled' });
    }

    // Update booking status
    booking.status = 'CANCELLED';
    await booking.save();

    // Remove seats from show's booked seats
    const Show = require('../models/Show.simple');
    await Show.findByIdAndUpdate(booking.showId._id, {
      $pull: { bookedSeats: { $in: booking.seats } }
    });

    res.json({ success: true, message: 'Booking cancelled successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
