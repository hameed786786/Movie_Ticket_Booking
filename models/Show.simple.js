const mongoose = require('mongoose');

const showSchema = new mongoose.Schema({
  movieId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: true
  },
  theatreId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theatre',
    required: true
  },
  showTime: {
    type: Date,
    required: true
  },
  totalSeats: {
    type: Number,
    required: true,
    default: 100
  },
  bookedSeats: [{
    type: Number // Seat numbers from 1 to totalSeats
  }],
  price: {
    type: Number,
    required: true,
    default: 200
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Show', showSchema);
