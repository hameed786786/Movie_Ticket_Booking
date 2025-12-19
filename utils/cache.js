const NodeCache = require('node-cache');

const movieCache = new NodeCache({ stdTTL: 600, checkperiod: 120 });
const showCache = new NodeCache({ stdTTL: 300, checkperiod: 60 });
const theaterCache = new NodeCache({ stdTTL: 3600, checkperiod: 600 });

class CacheManager {
  getMovies() {
    return movieCache.get('all_movies');
  }

  setMovies(data) {
    movieCache.set('all_movies', data);
  }

  getMovie(movieId) {
    return movieCache.get(`movie_${movieId}`);
  }

  setMovie(movieId, data) {
    movieCache.set(`movie_${movieId}`, data);
  }

  getShows(key) {
    return showCache.get(key);
  }

  setShows(key, data) {
    showCache.set(key, data);
  }

  getTheaters() {
    return theaterCache.get('all_theaters');
  }

  setTheaters(data) {
    theaterCache.set('all_theaters', data);
  }

  invalidateMovies() {
    movieCache.flushAll();
  }

  invalidateShows() {
    showCache.flushAll();
  }

  invalidateTheaters() {
    theaterCache.flushAll();
  }

  flushAll() {
    movieCache.flushAll();
    showCache.flushAll();
    theaterCache.flushAll();
  }

  getStats() {
    return {
      movies: movieCache.getStats(),
      shows: showCache.getStats(),
      theaters: theaterCache.getStats()
    };
  }
}

module.exports = new CacheManager();
