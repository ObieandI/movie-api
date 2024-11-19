const http = require('http');
const url = require('url');
const { getMovieData, searchMovie, getPoster, uploadPoster, getMovieReviews, getStreamingAvailability } = require('./api');
const dotenv = require('dotenv');

dotenv.config();

const hostname = '127.0.0.1';
const port = 5000;

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url, true); // Removed 'query' as it's not used
  const method = req.method;

  // Set CORS headers for cross-origin requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
  res.setHeader('Content-Type', 'application/json');

  // Handling GET and POST requests for the specified routes
  if (method === 'GET' && pathname.startsWith('/movies/search/')) {
    const title = pathname.split('/movies/search/')[1];
    searchMovie(title, res);
  } 
  else if (method === 'GET' && pathname.startsWith('/movies/data/')) {
    const imdbId = pathname.split('/movies/data/')[1];
    getMovieData(imdbId, res);
  }
  else if (method === 'GET' && pathname.startsWith('/movies/reviews/')) {
    const imdbId = pathname.split('/movies/reviews/')[1];
    getMovieReviews(imdbId, res);
  }
  else if (method === 'GET' && pathname.startsWith('/movies/streaming/')) {
    const imdbId = pathname.split('/movies/streaming/')[1];
    getStreamingAvailability(imdbId, res);
  }
  else if (method === 'GET' && pathname.startsWith('/posters/')) {
    const imdbId = pathname.split('/posters/')[1];
    getPoster(imdbId, res);
  }
  else if (method === 'POST' && pathname.startsWith('/posters/add/')) {
    const imdbId = pathname.split('/posters/add/')[1];
    uploadPoster(imdbId, req, res);
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
