const mongoose = require('mongoose');

const screenSchema = new mongoose.Schema({
  screenNumber: {
    type: Number,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  totalSeats: {
    type: Number,
    required: true
  },
  rows: {
    type: Number,
    required: true
  },
  seatsPerRow: {
    type: Number,
    required: true
  },
  seatLayout: [{
    row: String,
    seats: [{
      number: Number,
      type: {
        type: String,
        enum: ['regular', 'premium', 'vip', 'disabled'],
        default: 'regular'
      },
      isAvailable: {
        type: Boolean,
        default: true
      }
    }]
  }]
});

const theaterSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Theater name is required'],
    trim: true
  },
  address: {
    street: String,
    city: {
      type: String,
      required: [true, 'City is required']
    },
    state: String,
    zipCode: String
  },
  phone: {
    type: String
  },
  email: {
    type: String
  },
  screens: [screenSchema],
  amenities: [{
    type: String
  }],
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for location-based queries
theaterSchema.index({ 'address.city': 1 });

module.exports = mongoose.model('Theater', theaterSchema);
