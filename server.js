const http = require('http');
const url = require('url');
const { uploadPoster, searchMovie, getMovieData, getPoster} = require('./api');
const hostname = '127.0.0.1';
const port = 5000;

const server = http.createServer((req, res) => {
  const { pathname } = url.parse(req.url, true);
  const method = req.method;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  if (method === 'GET' && pathname.startsWith('/movies/search/')) {
    const title = pathname.split('/movies/search/')[1];
    searchMovie(title, res);
  } else if (method === 'GET' && pathname.startsWith('/movies/data/')) {
    const imdbId = pathname.split('/movies/data/')[1];
    getMovieData(imdbId, res);
  } else if (method === 'GET' && pathname.startsWith('/posters/')) {
    const imdbId = pathname.split('/posters/')[1];
    getPoster(imdbId, res);
  } else if (method === 'POST' && pathname.startsWith('/posters/add/')) {
    const imdbId = pathname.split('/posters/add/')[1];
    uploadPoster(req, res, imdbId); // Correct file upload
  } else {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: 'Not Found' }));
  }
});

server.listen(port, hostname, () => {
  console.log(`Server running at http://${hostname}:${port}/`);
});
