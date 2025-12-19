const express = require('express');
const router = express.Router();
const Movie = require('../models/Movie');
const Show = require('../models/Show');
const { auth, theaterAuth, optionalAuth } = require('../middleware/auth');
const cache = require('../utils/cache');

// Get all movies (public)
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { genre, language, search, nowShowing } = req.query;
    
    const cacheKey = `movies_${genre || 'all'}_${language || 'all'}_${search || 'none'}_${nowShowing || 'false'}`;
    const cachedMovies = cache.getMovies(cacheKey);
    
    if (cachedMovies) {
      return res.json({ success: true, movies: cachedMovies, cached: true });
    }
    
    let query = { isActive: true };
    
    if (genre) {
      query.genre = { $in: [genre] };
    }
    
    if (language) {
      query.language = language;
    }
    
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (nowShowing === 'true') {
      query.releaseDate = { $lte: new Date() };
    }

    const movies = await Movie.find(query)
      .sort({ releaseDate: -1 })
      .limit(50);

    cache.setMovies(cacheKey, movies);

    res.json({ success: true, movies });
  } catch (error) {
    console.error('Error fetching movies:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch movies' });
  }
});

// Get movie by ID (public)
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const cachedMovie = cache.getMovie(req.params.id);
    
    if (cachedMovie) {
      return res.json({ success: true, movie: cachedMovie, cached: true });
    }
    
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ success: false, message: 'Movie not found' });
    }

    cache.setMovie(req.params.id, movie);

    res.json({ success: true, movie });
  } catch (error) {
    console.error('Error fetching movie:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch movie' });
  }
});

// Get shows for a movie (public)
router.get('/:id/shows', optionalAuth, async (req, res) => {
  try {
    const { date } = req.query;
    
    const cacheKey = `shows_${req.params.id}_${date || 'today'}`;
    const cachedShows = cache.getShows(cacheKey);
    
    if (cachedShows) {
      return res.json({ success: true, shows: cachedShows, cached: true });
    }
    
    let dateQuery = {};
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      dateQuery = { showTime: { $gte: startDate, $lte: endDate } };
    } else {
      dateQuery = { showTime: { $gte: new Date() } };
    }

    const shows = await Show.find({
      movie: req.params.id,
      isActive: true,
      ...dateQuery
    })
      .populate('theater', 'name address screens')
      .sort({ showTime: 1 });

    // Group shows by theater
    const groupedShows = shows.reduce((acc, show) => {
      const theaterId = show.theater._id.toString();
      if (!acc[theaterId]) {
        acc[theaterId] = {
          theater: show.theater,
          shows: []
        };
      }
      acc[theaterId].shows.push(show);
      return acc;
    }, {});

    const result = Object.values(groupedShows);
    cache.setShows(cacheKey, result);

    res.json({ success: true, shows: result });
  } catch (error) {
    console.error('Error fetching shows:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch shows' });
  }
});

// Add a new movie (theater owners and admin)
router.post('/', theaterAuth, async (req, res) => {
  try {
    const {
      title,
      description,
      duration,
      genre,
      language,
      releaseDate,
      posterUrl,
      bannerUrl,
      trailerUrl,
      cast,
      director,
      certificate,
      rating
    } = req.body;

    const movie = new Movie({
      title,
      description,
      duration,
      genre: Array.isArray(genre) ? genre : [genre],
      language,
      releaseDate,
      posterUrl,
      bannerUrl,
      trailerUrl,
      cast,
      director,
      certificate,
      rating,
      addedBy: req.user._id
    });

    await movie.save();

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('movieAdded', movie);

    res.status(201).json({
      message: 'Movie added successfully',
      movie
    });
  } catch (error) {
    console.error('Error adding movie:', error);
    res.status(500).json({ message: error.message || 'Failed to add movie' });
  }
});

// Update a movie (theater owners and admin)
router.put('/:id', theaterAuth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Only allow update by creator or admin
    if (movie.addedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to update this movie' });
    }

    const updates = req.body;
    if (updates.genre && !Array.isArray(updates.genre)) {
      updates.genre = [updates.genre];
    }

    const updatedMovie = await Movie.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('movieUpdated', updatedMovie);

    res.json({
      message: 'Movie updated successfully',
      movie: updatedMovie
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update movie' });
  }
});

// Delete a movie (theater owners and admin)
router.delete('/:id', theaterAuth, async (req, res) => {
  try {
    const movie = await Movie.findById(req.params.id);
    
    if (!movie) {
      return res.status(404).json({ message: 'Movie not found' });
    }

    // Only allow delete by creator or admin
    if (movie.addedBy.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this movie' });
    }

    // Soft delete
    await Movie.findByIdAndUpdate(req.params.id, { isActive: false });

    // Also deactivate all shows for this movie
    await Show.updateMany({ movie: req.params.id }, { isActive: false });

    // Emit real-time event
    const io = req.app.get('io');
    io.emit('movieDeleted', req.params.id);

    res.json({ message: 'Movie deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete movie' });
  }
});

module.exports = router;
