document.addEventListener('DOMContentLoaded', () => {
    const API_KEY = '17bb8342bff5717c23c85b661d8bb512';
    const BASE_URL = 'https://api.themoviedb.org/3';
    const IMG_URL = 'https://image.tmdb.org/t/p/w500';
    const BACKDROP_URL = 'https://image.tmdb.org/t/p/original';

    const heroSection = document.getElementById('hero-section');
    const carouselsSection = document.getElementById('carousels');
    const searchInput = document.getElementById('search-input');
    const modalElement = new bootstrap.Modal(document.getElementById('movie-modal'));
    const modalContent = document.querySelector('#movie-modal .modal-content');

    // --- Cargar contenido inicial (héroe y carruseles) ---
    async function loadContent() {
        try {
            const popularMovies = await fetchMovies('/movie/popular');
            const topRatedMovies = await fetchMovies('/movie/top_rated');
            const upcomingMovies = await fetchMovies('/movie/upcoming');

            if (popularMovies && popularMovies.length > 0) {
                displayHero(popularMovies[0]);
                displayCarousel('Populares', popularMovies, 'popular-carousel');
            }
            if (topRatedMovies && topRatedMovies.length > 0) {
                displayCarousel('Mejor Valoradas', topRatedMovies, 'top-rated-carousel');
            }
            if (upcomingMovies && upcomingMovies.length > 0) {
                displayCarousel('Próximamente', upcomingMovies, 'upcoming-carousel');
            }
        } catch (error) {
            console.error('Error al cargar el contenido inicial:', error);
        }
    }

    // --- Inicializar la App y cargar contenido ---
    if (window.Telegram && window.Telegram.WebApp) {
        window.Telegram.WebApp.ready();
        console.log('Telegram WebApp SDK inicializado.');
    }
    loadContent();

    // --- Event Listener para la búsqueda ---
    let searchTimeout;
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            const query = searchInput.value.trim();
            if (query) {
                searchMovies(query);
            } else {
                // Si la búsqueda está vacía, recargar el contenido inicial
                heroSection.style.display = 'flex';
                carouselsSection.innerHTML = ''; // Limpiar carruseles para evitar duplicados
                loadContent();
            }
        }, 300); // Pequeño delay para no hacer peticiones en cada tecla
    });

    // --- Función de búsqueda ---
    async function searchMovies(query) {
        const results = await fetchMovies('/search/movie', `&query=${encodeURIComponent(query)}`);
        heroSection.style.display = 'none'; // Ocultar el héroe
        carouselsSection.innerHTML = ''; // Limpiar carruseles existentes

        const searchResultsContainer = document.createElement('div');
        searchResultsContainer.className = 'search-results';

        if (results && results.length > 0) {
            let postersHTML = results.map(movie => {
                if (!movie.poster_path) return ''; // Omitir películas sin póster
                return `<img src="${IMG_URL}${movie.poster_path}" alt="${movie.title}" class="movie-poster" onclick="showMovieDetails(${movie.id})">`;
            }).join('');

            searchResultsContainer.innerHTML = `
                <h3 class="carousel-title">Resultados para "${query}"</h3>
                <div class="movie-grid">${postersHTML}</div>
            `;
        } else {
            searchResultsContainer.innerHTML = `<p>No se encontraron resultados para "${query}".</p>`;
        }
        carouselsSection.appendChild(searchResultsContainer);
    }

    // --- Fetching de datos ---
    async function fetchMovies(endpoint, params = '') {
        try {
            const url = `${BASE_URL}${endpoint}?api_key=${API_KEY}&language=es-MX${params}`;
            const response = await fetch(url);
            if (!response.ok) throw new Error('Error al obtener datos.');
            const data = await response.json();
            return data.results;
        } catch (error) {
            console.error(error);
            return [];
        }
    }

    // --- Renderizado en el DOM ---
    function displayHero(movie) {
        heroSection.style.backgroundImage = `linear-gradient(to top, #141414, transparent 50%), url(${BACKDROP_URL}${movie.backdrop_path})`;
        heroSection.innerHTML = `
            <h2 class="hero-title">${movie.title}</h2>
            <p class="hero-overview">${movie.overview}</p>
            <button class="btn btn-danger" onclick="showMovieDetails(${movie.id})">Más información</button>
        `;
    }

    function displayCarousel(title, movies, id) {
        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'mb-4';
        
        let postersHTML = movies.map(movie => {
            if (!movie.poster_path) return ''; // Omitir películas sin póster
            return `<img src="${IMG_URL}${movie.poster_path}" alt="${movie.title}" class="movie-poster" onclick="showMovieDetails(${movie.id})">`;
        }).join('');

        carouselContainer.innerHTML = `
            <h3 class="carousel-title">${title}</h3>
            <div class="movie-carousel" id="${id}">
                ${postersHTML}
            </div>
        `;
        carouselsSection.appendChild(carouselContainer);
    }

    // --- Funciones para clicks y fetch (dentro del scope) ---
    async function showMovieDetails(movieId) {
        const modalContent = document.querySelector('#movie-modal .modal-content');
        const modalElement = new bootstrap.Modal(document.getElementById('movie-modal'));

        try {
            // Obtener detalles y créditos de la película
            const movie = await fetchMovieDetails(movieId);
            const credits = await fetchMovieCredits(movieId);

            const director = credits.crew.find(member => member.job === 'Director');
            const cast = credits.cast.slice(0, 5).map(member => member.name).join(', ');

            modalContent.innerHTML = `
                <div class="modal-header">
                    <h5 class="modal-title">${movie.title}</h5>
                    <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <div class="col-md-4">
                            <img src="${IMG_URL}${movie.poster_path}" class="img-fluid rounded">
                        </div>
                        <div class="col-md-8">
                            <p><strong>Sinopsis:</strong> ${movie.overview}</p>
                            <p><strong>Fecha de estreno:</strong> ${movie.release_date}</p>
                            <p><strong>Géneros:</strong> ${movie.genres.map(g => g.name).join(', ')}</p>
                            <p><strong>Duración:</strong> ${movie.runtime} minutos</p>
                            <p><strong>Calificación:</strong> ${movie.vote_average.toFixed(1)} / 10</p>
                            <p><strong>Director:</strong> ${director ? director.name : 'No disponible'}</p>
                            <p><strong>Reparto:</strong> ${cast}</p>
                        </div>
                    </div>
                </div>
            `;
            modalElement.show();
        } catch (error) {
            console.error('Error al mostrar detalles:', error);
            modalContent.innerHTML = '<p>No se pudieron cargar los detalles. Inténtalo de nuevo.</p>';
            modalElement.show();
        }
    }

    async function fetchMovieDetails(movieId) {
        const url = `${BASE_URL}/movie/${movieId}?api_key=${API_KEY}&language=es-MX`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener detalles de la película.');
        return await response.json();
    }

    async function fetchMovieCredits(movieId) {
        const url = `${BASE_URL}/movie/${movieId}/credits?api_key=${API_KEY}&language=es-MX`;
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener créditos de la película.');
        return await response.json();
    }

        window.showMovieDetails = showMovieDetails;
    });
