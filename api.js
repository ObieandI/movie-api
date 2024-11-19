const axios = require('axios');
const dotenv = require('dotenv');

dotenv.config();

// Example of using OMDb API for movie data
const OMDB_API_KEY = process.env.OMDB_API_KEY;
const STREAM_API_KEY = process.env.STREAM_API_KEY;

// Search movie by title
async function searchMovie(title, res) {
  try {
    const response = await axios.get(`http://www.omdbapi.com/?s=${title}&apikey=${OMDB_API_KEY}`);
    res.statusCode = 200;
    res.end(JSON.stringify(response.data));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to fetch movie data' }));
  }
}

// Get movie data by IMDb ID
async function getMovieData(imdbId, res) {
  try {
    const response = await axios.get(`http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
    res.statusCode = 200;
    res.end(JSON.stringify(response.data));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to fetch movie data' }));
  }
}


async function getStreamingAvailability(imdbId) {
    try {
      const response = await axios.get('https://streaming-availability.p.rapidapi.com/v2/get/basic', {
        headers: {
          'X-RapidAPI-Key': STREAM_API_KEY,
          'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
        },
        params: { imdb_id: imdbId }
      });
      return response.data;
    } catch (error) {
      return { error: 'Failed to fetch streaming availability' };
    }
  }

// Get poster for a movie by IMDb ID
async function getPoster(imdbId, res) {
  try {
    const response = await axios.get(`http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
    const posterUrl = response.data.Poster;
    res.statusCode = 200;
    res.end(JSON.stringify({ posterUrl }));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to fetch poster' }));
  }
}

// Upload a poster (stubbed, would need file upload logic)
function uploadPoster(imdbId, req, res) {
  // Placeholder logic to simulate poster upload
  res.statusCode = 200;
  res.end(JSON.stringify({ message: `Poster uploaded for movie with IMDb ID ${imdbId}` }));
}

  

module.exports = { searchMovie, getMovieData, getPoster, uploadPoster };
