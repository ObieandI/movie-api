const http = require('http');
const url = require('url');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
require('dotenv').config(); // Load API keys from .env

// Create server
const server = http.createServer((req, res) => {
    const reqUrl = url.parse(req.url, true);

    // Setting up CORS Headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST');
    res.setHeader('Content-Type', 'application/json');

    // Routing the requests
    if (reqUrl.pathname === '/movie/review' && req.method === 'GET') {
        getMovieReview(reqUrl.query.id, res);
    } else if (reqUrl.pathname === '/movie/streaming' && req.method === 'GET') {
        getStreamingAvailability(reqUrl.query.title, res);
    } else if (reqUrl.pathname === '/movie/poster' && req.method === 'POST') {
        uploadPoster(req, res);
    } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ message: 'Endpoint not found' }));
    }
});

// Listen on port 5000
server.listen(5000, () => {
    console.log('Server is listening on port 5000');
});

// Function to get movie review from OMDb API
async function getMovieReview(movieId, res) {
    try {
        console.log(`Fetching movie review for ID: ${movieId}`);
        const response = await axios.get(`http://www.omdbapi.com/?i=${movieId}&apikey=${process.env.OMDB_API_KEY}`);
        console.log("Received response from OMDb:", response.data);
        res.statusCode = 200;
        res.end(JSON.stringify(response.data));
    } catch (error) {
        console.error("Error fetching movie review:", error);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to fetch movie review' }));
    }
}

// Function to get streaming availability from RapidAPI
async function getStreamingAvailability(title, res) {
    try {
        const response = await axios.get(`https://streaming-availability.p.rapidapi.com/search/basic`, {
            params: { title: title, country: 'us', type: 'movie' },
            headers: {
                'X-RapidAPI-Key': process.env.RAPID_API_KEY,
                'X-RapidAPI-Host': 'streaming-availability.p.rapidapi.com'
            }
        });
        res.statusCode = 200;
        res.end(JSON.stringify(response.data));
    } catch (error) {
        res.statusCode = 500;
        res.end(JSON.stringify({ error: 'Failed to fetch streaming availability' }));
    }
}

// Function to upload a poster
async function uploadPoster(req, res) {
    const uploadsDir = path.join(__dirname, 'uploads');
    
    // Ensure 'uploads' directory exists
    if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir);
    }

    // Validate MIME type
    const contentType = req.headers['content-type'];

    if (contentType !== 'image/png') {
        res.statusCode = 400;
        return res.end(JSON.stringify({ error: true, message: 'Only PNG is supported at this time' }));
    }

    const filePath = path.join(uploadsDir, `poster.png`); // Save the file as .png
    const writeStream = fs.createWriteStream(filePath);

    req.pipe(writeStream);

    req.on('end', () => {
        res.statusCode = 200;
        res.end(JSON.stringify({ message: 'Poster uploaded successfully' }));
    });

    req.on('error', () => {
        res.statusCode = 500;
        res.end(JSON.stringify({ message: 'Failed to upload poster' }));
    });
}
