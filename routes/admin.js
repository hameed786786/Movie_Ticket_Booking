const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Theater = require('../models/Theater');
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const Booking = require('../models/Booking');
const bcrypt = require('bcrypt');
const { adminAuth } = require('../middleware/auth');

// Get dashboard stats
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const [
      totalUsers,
      totalTheaters,
      totalMovies,
      totalBookings,
      totalRevenue
    ] = await Promise.all([
      User.countDocuments({ role: { $ne: 'admin' } }),
      Theater.countDocuments({ isActive: true }),
      Movie.countDocuments({ isActive: true }),
      Booking.countDocuments({ bookingStatus: 'confirmed' }),
      Booking.aggregate([
        { $match: { bookingStatus: 'confirmed' } },
        { $group: { _id: null, total: { $sum: '$finalAmount' } } }
      ])
    ]);

    res.json({
      totalUsers,
      totalTheaters,
      totalMovies,
      totalBookings,
      totalRevenue: totalRevenue[0]?.total || 0
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
});

// Get all users
router.get('/users', adminAuth, async (req, res) => {
  try {
    const { role, search } = req.query;
    
    let query = {};
    if (role) query.role = role;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .populate('theater', 'name')
      .sort({ createdAt: -1 });

    res.json(users);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate('theater')
      .populate('bookingHistory');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch user' });
  }
});

// Create user (admin can create any role)
router.post('/users', adminAuth, async (req, res) => {
  try {
    const { name, email, phone, password, role } = req.body;

    // Check if email exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    const user = new User({
      name,
      email,
      phone,
      password,
      role: role || 'user'
    });

    await user.save();

    // If theater role, create an empty theater
    if (user.role === 'theater') {
      const theater = new Theater({
        name: `${name}'s Theater`,
        address: { city: 'Not Set' },
        owner: user._id,
        screens: []
      });
      await theater.save();
      await User.updateOne({ _id: user._id }, { theater: theater._id });
    }

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create user' });
  }
});

// Update user
router.put('/users/:id', adminAuth, async (req, res) => {
  try {
    const { name, phone, role, isActive } = req.body;
    
    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;
    if (role) updates.role = role;
    if (typeof isActive === 'boolean') updates.isActive = isActive;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json({ message: 'User updated', user });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update user' });
  }
});

// Delete user
router.delete('/users/:id', adminAuth, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role === 'admin') {
      return res.status(400).json({ message: 'Cannot delete admin user' });
    }

    // Soft delete
    await User.findByIdAndUpdate(req.params.id, { isActive: false });

    // If theater owner, deactivate their theater
    if (user.theater) {
      await Theater.findByIdAndUpdate(user.theater, { isActive: false });
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete user' });
  }
});

// Get all theaters
router.get('/theaters', adminAuth, async (req, res) => {
  try {
    const theaters = await Theater.find()
      .populate('owner', 'name email')
      .sort({ createdAt: -1 });

    res.json(theaters);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch theaters' });
  }
});

// Create theater with owner
router.post('/theaters', adminAuth, async (req, res) => {
  try {
    const { name, address, phone, email, ownerId, screens } = req.body;

    // Verify owner exists
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(400).json({ message: 'Owner not found' });
    }

    const theater = new Theater({
      name,
      address,
      phone,
      email,
      owner: ownerId,
      screens: screens || []
    });

    await theater.save();

    // Update owner's role and theater reference
    await User.updateOne(
      { _id: ownerId },
      { role: 'theater', theater: theater._id }
    );

    res.status(201).json({
      message: 'Theater created successfully',
      theater
    });
  } catch (error) {
    res.status(500).json({ message: error.message || 'Failed to create theater' });
  }
});

// Update theater
router.put('/theaters/:id', adminAuth, async (req, res) => {
  try {
    const updates = req.body;
    
    const theater = await Theater.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true }
    ).populate('owner', 'name email');

    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    res.json({ message: 'Theater updated', theater });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update theater' });
  }
});

// Delete theater
router.delete('/theaters/:id', adminAuth, async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id);
    
    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    // Soft delete
    await Theater.findByIdAndUpdate(req.params.id, { isActive: false });

    // Deactivate all shows for this theater
    await Show.updateMany({ theater: req.params.id }, { isActive: false });

    res.json({ message: 'Theater deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete theater' });
  }
});

// Get all movies
router.get('/movies', adminAuth, async (req, res) => {
  try {
    const movies = await Movie.find()
      .populate('addedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json(movies);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch movies' });
  }
});

// Delete movie
router.delete('/movies/:id', adminAuth, async (req, res) => {
  try {
    await Movie.findByIdAndUpdate(req.params.id, { isActive: false });
    await Show.updateMany({ movie: req.params.id }, { isActive: false });

    res.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete movie' });
  }
});

// Get all bookings
router.get('/bookings', adminAuth, async (req, res) => {
  try {
    const bookings = await Booking.find()
      .populate('user', 'name email')
      .populate({
        path: 'show',
        populate: [
          { path: 'movie', select: 'title' },
          { path: 'theater', select: 'name' }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch bookings' });
  }
});

module.exports = router;
