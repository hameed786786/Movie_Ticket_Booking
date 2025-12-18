// Movies page functionality

let moviesCache = [];

// Real-time handlers for movies
window.handleMovieAdded = (movie) => {
  moviesCache.push(movie);
  renderMovies();
  UI.showAlert('New movie added!', 'success');
};

window.handleMovieUpdated = (movie) => {
  const index = moviesCache.findIndex(m => m._id === movie._id);
  if (index !== -1) {
    moviesCache[index] = movie;
    renderMovies();
    UI.showAlert('Movie updated!', 'info');
  }
};

window.handleMovieDeleted = (movieId) => {
  moviesCache = moviesCache.filter(m => m._id !== movieId);
  renderMovies();
  UI.showAlert('Movie removed!', 'info');
};

function renderMovies() {
  const container = document.getElementById('moviesContainer');
  if (!container) return;
  
  // Ensure moviesCache is an array
  if (!Array.isArray(moviesCache) || moviesCache.length === 0) {
    container.innerHTML = '<p class="loading">No movies available at the moment.</p>';
    return;
  }
  
  container.innerHTML = `
    <div class="movies-grid">
      ${moviesCache.map(movie => {
        // Safely handle genre - convert to array if needed
        const genres = Array.isArray(movie.genre) 
          ? movie.genre.join(', ') 
          : (typeof movie.genre === 'string' ? movie.genre : 'N/A');
        
        return `
        <div class="card" onclick="window.location.href='/movie.html?id=${movie._id}'">
          <img src="${movie.posterUrl || '/images/default-poster.svg'}" alt="${movie.title}" class="card-img" 
               onerror="this.src='/images/default-poster.svg'">
          <div class="card-body">
            <h3 class="card-title">${movie.title}</h3>
            <p class="card-text">
              ${genres} • ${movie.duration || 'N/A'} min
            </p>
            <p class="card-text">
              ⭐ ${movie.rating || 'N/A'}/10 • ${movie.certificate || 'N/A'}
            </p>
          </div>
        </div>
      `}).join('')}
    </div>
  `;
}

// Fetch and display movies
async function loadMovies() {
  const container = document.getElementById('moviesContainer');
  if (!container) return;
  
  UI.showLoading(container);
  
  try {
    const response = await api.get('/movies?nowShowing=true');
    
    // Ensure response is an array
    moviesCache = Array.isArray(response) ? response : (response.movies || []);
    
    if (moviesCache.length === 0) {
      container.innerHTML = '<p class="loading">No movies available at the moment.</p>';
      return;
    }
    
    renderMovies();
  } catch (error) {
    console.error('Error loading movies:', error);
    container.innerHTML = `<p class="alert alert-error">${error.message}</p>`;
  }
}

// Load movie details
async function loadMovieDetails() {
  const container = document.getElementById('movieDetails');
  if (!container) return;
  
  const urlParams = new URLSearchParams(window.location.search);
  const movieId = urlParams.get('id');
  
  if (!movieId) {
    container.innerHTML = '<p class="alert alert-error">Movie not found</p>';
    return;
  }
  
  try {
    const response = await api.get(`/movies/${movieId}`);
    
    // Extract movie from response (handles both {movie} and direct movie object)
    const movie = response.movie || response;
    
    // Safely handle genre
    const genres = Array.isArray(movie.genre) 
      ? movie.genre 
      : (typeof movie.genre === 'string' ? [movie.genre] : []);
    
    // Safely handle cast
    const cast = Array.isArray(movie.cast) 
      ? movie.cast 
      : [];
    
    container.innerHTML = `
      <div class="movie-banner" style="background-image: url('${movie.bannerUrl || movie.posterUrl || '/images/default-banner.svg'}')">
        <div class="movie-overlay">
          <div class="container">
            <div class="movie-header">
              <img src="${movie.posterUrl || '/images/default-poster.svg'}" alt="${movie.title}" class="movie-poster"
                   onerror="this.src='/images/default-poster.svg'">
              <div class="movie-content">
                <h1>${movie.title}</h1>
                <div class="movie-meta-info">
                  <span>⭐ ${movie.rating || 'N/A'}/10</span>
                  <span>•</span>
                  <span>${movie.duration || 'N/A'} min</span>
                  <span>•</span>
                  <span>${movie.certificate || 'N/A'}</span>
                  <span>•</span>
                  <span>${movie.language || 'N/A'}</span>
                </div>
                <div class="genres">
                  ${genres.map(g => `<span class="genre-badge">${g}</span>`).join('')}
                </div>
                <p class="description">${movie.description || 'No description available.'}</p>
                ${movie.director ? `<p class="cast-info"><strong>Director:</strong> ${movie.director}</p>` : ''}
                ${cast.length > 0 ? `
                  <p class="cast-info"><strong>Cast:</strong> ${cast.map(c => c.name || c).join(', ')}</p>
                ` : ''}
              </div>
            </div>
          </div>
        </div>
      </div>
    `;
    
    // Load shows for this movie
    loadMovieShows(movieId);
  } catch (error) {
    container.innerHTML = `<p class="alert alert-error">${error.message}</p>`;
  }
}

// Load shows for a movie
async function loadMovieShows(movieId) {
  const container = document.getElementById('showsContainer');
  if (!container) return;
  
  container.innerHTML = '<h2 class="section-title">Select Show Time</h2><div class="loading">Loading shows...</div>';
  
  try {
    console.log('🎬 Fetching shows for movie:', movieId);
    const response = await api.get(`/movies/${movieId}/shows`);
    console.log('📥 Shows response:', response);
    
    // Handle response - extract shows array
    let showsData = [];
    if (response.success && response.shows) {
      showsData = response.shows;
    } else if (Array.isArray(response)) {
      showsData = response;
    } else if (response.shows) {
      showsData = response.shows;
    }
    
    console.log('📊 Processed shows data:', showsData);
    
    if (showsData.length === 0) {
      container.innerHTML = `
        <h2 class="section-title">Select Show Time</h2>
        <p style="text-align: center; padding: 2rem; color: var(--text-muted);">No shows available for this movie yet.</p>
      `;
      return;
    }
    
    // Each item in showsData is already grouped by theater
    const theatreGroups = showsData;
    
    container.innerHTML = `
      <h2 class="section-title">Select Show Time</h2>
      <div class="shows-list">
        ${theatreGroups.map(group => {
          const theatre = group.theater || group.theatre;
          const shows = group.shows || [];
          
          if (!theatre || shows.length === 0) return '';
          
          return `
          <div class="theater-shows">
            <div class="theater-info">
              <h4>${theatre.name || 'Theater'}</h4>
              <p class="card-text">${theatre.address?.city || theatre.address?.street || 'Location not available'}</p>
            </div>
            <div class="show-times">
              ${shows.map(show => {
                const showTime = new Date(show.showTime);
                const availableSeats = show.availableSeats || (show.totalSeats - (show.bookedSeats?.length || 0));
                
                return `
                <button class="show-time-btn" onclick="selectShow('${show._id}')">
                  ${showTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  <br><small>${availableSeats} seats available</small>
                </button>
              `}).join('')}
            </div>
          </div>
        `}).filter(html => html).join('')}
      </div>
    `;
  } catch (error) {
    console.error('❌ Error loading shows:', error);
    container.innerHTML = `
      <h2 class="section-title">Select Show Time</h2>
      <p class="alert alert-error">Error loading shows: ${error.message}</p>
    `;
  }
}

// Select a show and go to seat selection
function selectShow(showId) {
  if (!Auth.isLoggedIn()) {
    localStorage.setItem('redirectAfterLogin', `/seats.html?show=${showId}`);
    window.location.href = '/login.html';
    return;
  }
  window.location.href = `/seats.html?show=${showId}`;
}

// Initialize based on page
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('moviesContainer')) {
    loadMovies();
  }
  
  if (document.getElementById('movieDetails')) {
    loadMovieDetails();
  }
});

// Expose functions globally
window.selectShow = selectShow;
window.loadMovies = loadMovies;
