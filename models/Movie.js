const mongoose = require('mongoose');

const movieSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Movie title is required'],
    trim: true
  },
  description: {
    type: String,
    required: [true, 'Description is required']
  },
  duration: {
    type: Number,
    required: [true, 'Duration is required'],
    min: [1, 'Duration must be at least 1 minute']
  },
  genre: [{
    type: String,
    required: true
  }],
  language: {
    type: String,
    required: [true, 'Language is required']
  },
  releaseDate: {
    type: Date,
    required: [true, 'Release date is required']
  },
  rating: {
    type: Number,
    min: 0,
    max: 10,
    default: 0
  },
  posterUrl: {
    type: String,
    default: '/images/default-poster.jpg'
  },
  bannerUrl: {
    type: String,
    default: '/images/default-banner.jpg'
  },
  trailerUrl: {
    type: String
  },
  cast: [{
    name: String,
    role: String
  }],
  director: {
    type: String
  },
  certificate: {
    type: String,
    enum: ['U', 'UA', 'A', 'S'],
    default: 'UA'
  },
  addedBy: {
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

// Index for search (regular index instead of text for better compatibility)
movieSchema.index({ title: 1 });

module.exports = mongoose.model('Movie', movieSchema);
