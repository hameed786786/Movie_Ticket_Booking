const mongoose = require('mongoose');

const showSchema = new mongoose.Schema({
  movie: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Movie',
    required: [true, 'Movie is required']
  },
  theater: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Theater',
    required: [true, 'Theater is required']
  },
  screenNumber: {
    type: Number,
    required: [true, 'Screen number is required']
  },
  showTime: {
    type: Date,
    required: [true, 'Show time is required']
  },
  endTime: {
    type: Date
  },
  pricing: {
    regular: {
      type: Number,
      required: true,
      default: 150
    },
    premium: {
      type: Number,
      default: 250
    },
    vip: {
      type: Number,
      default: 400
    }
  },
  availableSeats: {
    type: Number,
    required: true
  },
  totalSeats: {
    type: Number,
    required: true
  },
  bookedSeats: [{
    visibleSeatLabel: String,
    odeonSeatId: String,
    odeonScreenId: String
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for querying shows
showSchema.index({ movie: 1, theater: 1, showTime: 1 });
showSchema.index({ showTime: 1 });

// Calculate end time before saving
showSchema.pre('save', async function(next) {
  if (this.isModified('showTime') && this.movie) {
    const Movie = mongoose.model('Movie');
    const movie = await Movie.findById(this.movie);
    if (movie) {
      this.endTime = new Date(this.showTime.getTime() + movie.duration * 60000);
    }
  }
  next();
});

module.exports = mongoose.model('Show', showSchema);
