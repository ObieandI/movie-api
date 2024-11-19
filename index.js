const http = require('http');
const url = require('url');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');
const multiparty = require('multiparty');
const fileType = require('file-type');
require('dotenv').config();


const OMDB_API_KEY = process.env.OMDB_API_KEY;
const RAPID_API_KEY = process.env.RAPID_API_KEY;

// Create server
const server = http.createServer((req, res) => {
    const reqUrl = url.parse(req.url, true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');


    if (method == "OPTIONS") {
        res.writeHead(200, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS, DELETE",
          });
          res.end();
        }
    
        if (reqUrl.pathname.startsWith('/movies/search/') && req.method === 'GET') {
            const title = reqUrl.pathname.split('/').pop();
            getStreamingAvailability(title, res);
        } else if (reqUrl.pathname.startsWith('/movies/data/') && req.method === 'GET') {
            const imdbId = reqUrl.pathname.split('/').pop();
            getMovieReview(imdbId, res);  
        } else if (reqUrl.pathname.startsWith('/posters/') && req.method === 'GET') {
            const imdbId = reqUrl.pathname.split('/').pop();
            getPoster(res, imdbId);
        } else if (reqUrl.pathname.startsWith('/posters/add/') && req.method === 'POST') {
            const imdbId = reqUrl.pathname.split('/').pop();
            console.log("Received request to upload poster for IMDb ID:", imdbId);
            uploadPoster(req, res, imdbId);
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
async function getMovieReview(imdbId, res) {
    try {
        console.log(`Fetching movie review for ID: ${imdbId}`);
        const response = await axios.get(`http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
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
                'X-RapidAPI-Key': RAPID_API_KEY,
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
async function getPoster(res, imdbId) {
    try {
        // Validate IMDb ID format
        if (!/^tt\d{7}$/.test(imdbId)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: true, message: 'Invalid IMDb ID format. Must be like tt1234567.' }));
        }

        console.log(`Fetching poster for IMDb ID: ${imdbId}`);

        // Fetch movie details from OMDb API
        const response = await axios.get(`http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);

        // Check if a poster URL is available
        const posterUrl = response.data.Poster;
        if (!posterUrl || posterUrl === 'N/A') {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: true, message: 'Poster not available for this IMDb ID.' }));
        }

        console.log(`Poster URL: ${posterUrl}`);

        // Fetch the poster image from the poster URL
        const imageResponse = await axios.get(posterUrl, { responseType: 'stream' });

        // Set the appropriate headers and pipe the image to the response
        res.writeHead(200, { 'Content-Type': 'image/png' });
        imageResponse.data.pipe(res);

    } catch (error) {
        console.error('Error fetching poster:', error.message);
        res.statusCode = 500;
        res.end(JSON.stringify({ error: true, message: 'Failed to fetch the poster.' }));
    }
}


async function uploadPoster(req, res, imdbId) {
    console.log("Received request to upload poster for IMDb ID:", imdbId);


    const uploadsDir = path.join(__dirname, 'uploads');


    // Ensure 'uploads' directory exists
    if (!fs.existsSync(uploadsDir)) {
        console.log("Creating uploads directory...");
        fs.mkdirSync(uploadsDir);
    }


    const form = new multiparty.Form({ uploadDir: uploadsDir });
    form.parse(req, async (err, fields, files) => {
        if (err) {
            console.error("Error parsing form:", err);
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: true, message: 'Failed to process file upload' }));
        }


        const uploadedFile = files.file ? files.file[0] : null;
        if (!uploadedFile) {
            console.error("No file uploaded");
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: true, message: 'No file uploaded' }));
        }


        // Ensure the file is a PNG
        const buffer = await fs.promises.readFile(uploadedFile.path);
        const type = await fileType.fromBuffer(buffer);


        console.log("Detected file type:", type);


        if (!type || type.mime !== 'image/png') {
            console.log("File is not a PNG. Deleting...");
            fs.unlinkSync(uploadedFile.path);
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: true, message: 'Only PNG files are supported' }));
        }


        // Check if a poster already exists for this IMDb ID and delete it
        const newFilePath = path.join(uploadsDir, `poster_${imdbId}.png`);
        if (fs.existsSync(newFilePath)) {
            console.log(`Existing poster found for IMDb ID ${imdbId}. Deleting...`);
            fs.unlinkSync(newFilePath);
        }


        // Save the uploaded file with the IMDb ID in the filename
        try {
            fs.renameSync(uploadedFile.path, newFilePath);
            console.log("File saved as:", newFilePath);
            res.statusCode = 200;
            res.end(JSON.stringify({ message: 'Poster uploaded successfully' }));
        } catch (renameError) {
            console.error("Error renaming file:", renameError);
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: true, message: 'Failed to rename uploaded file' }));
        }
    });
}
    
