const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');

dotenv.config();

// OMDb API and Streaming API keys
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

// Get streaming availability for a movie by IMDb ID
async function getStreamingAvailability(imdbId, res) {
  try {
    const response = await axios.get('https://streaming-availability.p.rapidapi.com/v2/get/basic', {
      headers: {
        'X-RapidAPI-Key': STREAM_API_KEY,
        'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com',
      },
      params: { imdb_id: imdbId },
    });
    res.statusCode = 200;
    res.end(JSON.stringify(response.data));
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to fetch streaming availability' }));
  }
}

// Get poster for a movie by IMDb ID
async function getPoster(imdbId, res) {
  try {
    // Fetch movie data from OMDb API
    const response = await axios.get(`http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
    const posterUrl = response.data.Poster;

    // Fetch the image using the posterUrl
    const imageResponse = await axios.get(posterUrl, { responseType: 'arraybuffer' });

    // Set the appropriate headers for the image
    res.setHeader('Content-Type', 'image/jpeg');
    res.statusCode = 200;
    res.end(imageResponse.data);  // Send image data as response
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to fetch poster' }));
  }
}

// Handle file uploads manually (without formidable)
function uploadPoster(req, res, imdbId) {
  const boundary = req.headers['content-type'].split('boundary=')[1];
  const chunks = [];

  req.on('data', chunk => {
    chunks.push(chunk); // Collect the incoming data chunks
  });

  req.on('end', () => {
    // Convert the buffer data into a UTF-8 string (this was the issue before!)
    const body = Buffer.concat(chunks).toString('utf8'); 

    // Split the body by the boundary delimiter
    const delimiter = `--${boundary}`;
    const parts = body.split(delimiter);

    const filePart = parts[1];  // The second part is the file data

    // Extract file headers and data from the file part
    const fileHeaders = filePart.slice(0, filePart.indexOf('\r\n\r\n')).toString();
    const fileData = filePart.slice(filePart.indexOf('\r\n\r\n') + 4, filePart.length - 2); // Extract file content

    // Extract the file name from the headers
    const fileName = fileHeaders.match(/filename="(.+)"/)[1];

    // Define the directory to store the uploaded files
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir);  // Create the directory if it doesn't exist
    }

    // Save the file with the IMDb ID to avoid name collisions
    const filePath = path.join(uploadDir, `${imdbId}_${fileName}`);
    fs.writeFileSync(filePath, fileData);  // Save the file

    // Send back a success response with the file URL
    res.statusCode = 200;
    res.end(JSON.stringify({
      message: `Poster uploaded for movie with IMDb ID ${imdbId}`,
      posterUrl: `http://127.0.0.1:5000/uploads/${imdbId}_${fileName}`,
    }));
  });

  req.on('error', err => {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to process upload' }));
  });
}

module.exports = { 
  searchMovie, 
  getMovieData, 
  getStreamingAvailability, 
  getPoster, 
  uploadPoster 
};
