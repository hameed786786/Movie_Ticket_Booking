const express = require('express');
const router = express.Router();
const Theater = require('../models/Theater');
const User = require('../models/User');
const { auth, adminAuth, theaterAuth } = require('../middleware/auth');

// Get all theaters (public)
router.get('/', async (req, res) => {
  try {
    const { city } = req.query;
    
    let query = { isActive: true };
    if (city) {
      query['address.city'] = { $regex: city, $options: 'i' };
    }

    const theaters = await Theater.find(query)
      .populate('owner', 'name email')
      .sort({ name: 1 });

    res.json(theaters);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch theaters' });
  }
});

// Get theater by ID (public)
router.get('/:id', async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id)
      .populate('owner', 'name email');
    
    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    res.json(theater);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch theater' });
  }
});

// Get current theater owner's theater
router.get('/my/theater', theaterAuth, async (req, res) => {
  try {
    const theater = await Theater.findOne({ owner: req.user._id });
    
    if (!theater) {
      return res.status(404).json({ message: 'No theater found for this owner' });
    }

    res.json(theater);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch theater' });
  }
});

// Create theater (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, address, phone, email, amenities, ownerId, screens } = req.body;

    // Check if owner exists
    const owner = await User.findById(ownerId);
    if (!owner) {
      return res.status(400).json({ message: 'Owner not found' });
    }

    const theater = new Theater({
      name,
      address,
      phone,
      email,
      amenities,
      owner: ownerId,
      screens: screens || []
    });

    await theater.save();

    // Update owner's theater reference
    await User.updateOne({ _id: ownerId }, { theater: theater._id, role: 'theater' });

    res.status(201).json({
      message: 'Theater created successfully',
      theater
    });
  } catch (error) {
    console.error('Error creating theater:', error);
    res.status(500).json({ message: error.message || 'Failed to create theater' });
  }
});

// Update theater (owner or admin)
router.put('/:id', theaterAuth, async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id);
    
    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    // Check authorization
    if (theater.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this theater' });
    }

    const updates = req.body;
    const updatedTheater = await Theater.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    res.json({
      message: 'Theater updated successfully',
      theater: updatedTheater
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update theater' });
  }
});

// Add screen to theater
router.post('/:id/screens', theaterAuth, async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id);
    
    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    // Check authorization
    if (theater.owner.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    const { name, rows, seatsPerRow } = req.body;
    
    // Generate seat layout
    const seatLayout = [];
    const rowLabels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    
    for (let i = 0; i < rows; i++) {
      const rowSeats = [];
      for (let j = 1; j <= seatsPerRow; j++) {
        rowSeats.push({
          number: j,
          type: i < 2 ? 'vip' : (i < 5 ? 'premium' : 'regular'),
          isAvailable: true
        });
      }
      seatLayout.push({
        row: rowLabels[i],
        seats: rowSeats
      });
    }

    const newScreen = {
      screenNumber: theater.screens.length + 1,
      name: name || `Screen ${theater.screens.length + 1}`,
      totalSeats: rows * seatsPerRow,
      rows,
      seatsPerRow,
      seatLayout
    };

    theater.screens.push(newScreen);
    await theater.save();

    res.status(201).json({
      message: 'Screen added successfully',
      screen: theater.screens[theater.screens.length - 1]
    });
  } catch (error) {
    console.error('Error adding screen:', error);
    res.status(500).json({ message: 'Failed to add screen' });
  }
});

// Delete theater (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const theater = await Theater.findById(req.params.id);
    
    if (!theater) {
      return res.status(404).json({ message: 'Theater not found' });
    }

    // Soft delete
    await Theater.findByIdAndUpdate(req.params.id, { isActive: false });

    res.json({ message: 'Theater deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete theater' });
  }
});

module.exports = router;
