const mongoose = require('mongoose');

const seatLockSchema = new mongoose.Schema({
  show: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Show',
    required: true
  },
  visibleSeatLabel: {
    type: String,
    required: true
  },
  odeonSeatId: {
    type: String
  },
  odeonScreenId: {
    type: String
  },
  lockedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  socketId: {
    type: String
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 }
  }
}, {
  timestamps: true
});

// Compound index for unique seat locks per show
seatLockSchema.index({ show: 1, visibleSeatLabel: 1 }, { unique: true });

module.exports = mongoose.model('SeatLock', seatLockSchema);
