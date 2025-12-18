const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const Show = require('../models/Show');
const SeatLock = require('../models/SeatLock');
const { auth } = require('../middleware/auth');

// Get user's bookings
router.get('/', auth, async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate({
        path: 'show',
        populate: [
          { path: 'movie', select: 'title posterUrl duration' },
          { path: 'theater', select: 'name address' }
        ]
      })
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

// Get user's bookings by userId (public endpoint for compatibility)
router.get('/user/:userId', async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.params.userId })
      .populate({
        path: 'show',
        populate: [
          { path: 'movie', select: 'title posterUrl duration' },
          { path: 'theater', select: 'name address' }
        ]
      })
      .sort({ createdAt: -1 });

    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Get bookings error:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bookings' });
  }
});

// Get booking by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id)
      .populate({
        path: 'show',
        populate: [
          { path: 'movie' },
          { path: 'theater' }
        ]
      });

    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    // Only allow user to see their own bookings
    if (booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    res.json(booking);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch booking' });
  }
});

// Create a new booking (initiate)
router.post('/', async (req, res) => {
  try {
    const { userId, showId, seats, totalPrice } = req.body;
    
    console.log('📝 Booking request received:', { userId, showId, seats, totalPrice });

    // Validate input
    if (!userId || !showId || !seats || seats.length === 0) {
      return res.status(400).json({ success: false, message: 'Invalid booking data' });
    }

    // Get show details
    const show = await Show.findById(showId).populate('movie').populate('theater');
    if (!show) {
      return res.status(404).json({ success: false, message: 'Show not found' });
    }

    // Check if seats are already booked
    const bookedSeatLabels = show.bookedSeats.map(s => typeof s === 'string' ? s : s.visibleSeatLabel);
    const alreadyBooked = seats.filter(seat => bookedSeatLabels.includes(seat));
    
    if (alreadyBooked.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: `Seats ${alreadyBooked.join(', ')} are already booked` 
      });
    }

    // Create seat objects from simple labels
    const seatsWithDetails = seats.map(seatLabel => ({
      visibleSeatLabel: seatLabel,
      odeonSeatId: seatLabel,
      odeonScreenId: show.screenNumber?.toString() || '1',
      seatType: 'regular',
      price: 200 // Fixed price
    }));

    // Calculate amounts
    const totalAmount = seats.length * 200;
    const convenienceFee = Math.round(totalAmount * 0.05);
    const tax = Math.round(totalAmount * 0.18);
    const finalAmount = totalPrice || (totalAmount + convenienceFee + tax);

    // Create booking
    const booking = new Booking({
      user: userId,
      show: showId,
      seats: seatsWithDetails,
      totalAmount,
      convenienceFee,
      tax,
      finalAmount,
      bookingStatus: 'confirmed',
      paymentStatus: 'completed',
      bookingNumber: `BK${Date.now()}${Math.floor(Math.random() * 1000)}`
    });

    await booking.save();

    // Update show with booked seats
    show.bookedSeats.push(...seatsWithDetails);
    show.availableSeats = Math.max(0, show.availableSeats - seats.length);
    await show.save();

    console.log('✅ Booking created:', booking._id);
    console.log('🎫 Updated bookedSeats count:', show.bookedSeats.length);
    console.log('💺 Available seats remaining:', show.availableSeats);

    res.json({
      success: true,
      message: 'Booking confirmed',
      booking: {
        _id: booking._id,
        bookingNumber: booking.bookingNumber,
        seats: seats,
        totalAmount: finalAmount
      }
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ success: false, message: error.message || 'Booking failed' });
  }
});

// Confirm booking after payment
router.post('/:id/confirm', auth, async (req, res) => {
  try {
    const { paymentId, paymentMethod } = req.body;
    
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ message: 'Booking not found' });
    }

    if (booking.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    if (booking.bookingStatus !== 'pending') {
      return res.status(400).json({ message: 'Booking is no longer pending' });
    }

    // Check if booking expired
    if (new Date() > booking.expiresAt) {
      booking.bookingStatus = 'expired';
      await booking.save();
      return res.status(400).json({ message: 'Booking has expired' });
    }

    // Update booking
    booking.paymentStatus = 'completed';
    booking.paymentId = paymentId;
    booking.paymentMethod = paymentMethod || 'card';
    booking.bookingStatus = 'confirmed';
    booking.qrCode = `QR-${booking.bookingNumber}`;
    
    await booking.save();

    // Update show's booked seats
    const show = await Show.findById(booking.show);
    const newBookedSeats = booking.seats.map(seat => ({
      visibleSeatLabel: seat.visibleSeatLabel,
      odeonSeatId: seat.odeonSeatId,
      odeonScreenId: seat.odeonScreenId
    }));
    
    show.bookedSeats.push(...newBookedSeats);
    show.availableSeats -= booking.seats.length;
    await show.save();

    // Remove seat locks
    await SeatLock.deleteMany({
      show: booking.show,
      visibleSeatLabel: { $in: booking.seats.map(s => s.visibleSeatLabel) }
    });

    // Populate booking for response
    const populatedBooking = await Booking.findById(booking._id)
      .populate({
        path: 'show',
        populate: [
          { path: 'movie', select: 'title posterUrl' },
          { path: 'theater', select: 'name address' }
        ]
      });

    res.json({
      message: 'Booking confirmed',
      booking: populatedBooking
    });
  } catch (error) {
    console.error('Confirm booking error:', error);
    res.status(500).json({ message: 'Failed to confirm booking' });
  }
});

// Cancel booking
router.post('/:id/cancel', async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    
    if (!booking) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    // Optional: Check authorization if user is logged in
    // if (req.user && booking.user.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
    //   return res.status(403).json({ success: false, message: 'Not authorized' });
    // }

    if (booking.bookingStatus === 'cancelled') {
      return res.status(400).json({ message: 'Booking is already cancelled' });
    }

    // Update booking status
    booking.bookingStatus = 'cancelled';
    if (booking.paymentStatus === 'completed') {
      booking.paymentStatus = 'refunded';
    }
    await booking.save();

    // Remove seats from show's booked seats
    if (booking.paymentStatus === 'refunded' || booking.paymentStatus === 'completed') {
      const show = await Show.findById(booking.show);
      if (show) {
        const seatLabels = booking.seats.map(s => s.visibleSeatLabel);
        show.bookedSeats = show.bookedSeats.filter(s => !seatLabels.includes(s.visibleSeatLabel));
        show.availableSeats += booking.seats.length;
        await show.save();
      }
    }

    res.json({ success: true, message: 'Booking cancelled successfully', booking });
  } catch (error) {
    console.error('Cancel booking error:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

module.exports = router;
