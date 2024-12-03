const axios = require('axios');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const multiparty = require('multiparty'); // Adding multiparty for handling form data (addPoster)

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
    res.end(imageResponse.data);
  } catch (error) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: 'Failed to fetch poster' }));
  }
}

// Handle file uploads manually using multiparty
function uploadPoster(req, res) {
    const imdbId = req.params?.imdbId || req.url.split('/')[3];

    // Ensure imdbId is provided
    if (!imdbId) {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: 'IMDb ID is required.' }));
    }

    // Handle multipart form data (file upload)
    const form = new multiparty.Form();

    form.parse(req, (err, fields, files) => {
        if (err) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: 'Failed to process the file upload.' }));
        }

        const file = files.file[0];
        if (!file) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'No file uploaded.' }));
        }

        const extname = path.extname(file.originalFilename).toLowerCase();
        const allowedExtensions = ['.png'];
        if (!allowedExtensions.includes(extname)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: 'Invalid file type. Only .png files are allowed.' }));
        }

        // Save the file as .png (this helped with testing)
        const filePath = path.join(__dirname, 'uploads', `${imdbId}_poster.png`);
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }

        fs.rename(file.path, filePath, (err) => {
            if (err) {
                res.statusCode = 500;
                return res.end(JSON.stringify({ error: 'Failed to save the file.' }));
            }

            res.statusCode = 200;
            res.setHeader('Content-Type', 'text/html');
            res.end(`
                <html>
                    <body>
                        <h1>Poster uploaded successfully!</h1>
                        <p>File saved at: ${filePath}</p>
                        <img src="file://${filePath}" alt="Uploaded Poster" style="max-width: 100%; height: auto;">
                    </body>
                </html>
            `);
        });
    });
}

module.exports = {
  searchMovie,
  getMovieData,
  getPoster,
  uploadPoster,
};