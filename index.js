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

const server = http.createServer((req, res) => {
    const reqUrl = url.parse(req.url, true);
    console.log("Request URL:", reqUrl.pathname); // Log the full URL path

    // Set CORS headers for all requests
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'OPTIONS, GET, POST');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    // Handle OPTIONS request (CORS Preflight)
    if (req.method === "OPTIONS") {
        res.writeHead(200, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "OPTIONS, GET, POST",
            "Access-Control-Allow-Headers": "Content-Type"
        });
        return res.end();
    }

    // Routing logic (GET/POST requests)
    if (reqUrl.pathname === '/movies/search' && req.method === 'GET') {
        const title = reqUrl.query.title;
        getStreamingAvailability(title, res);
    } else if (reqUrl.pathname === '/movies/data' && req.method === 'GET') {
        const imdbId = reqUrl.query.id;
        getMovieReview(imdbId, res);
    } else if (reqUrl.pathname.startsWith('/posters/') && req.method === 'GET') {
        const imdbId = reqUrl.pathname.split('/').pop(); // Extract IMDb ID from URL
        console.log("Received IMDb ID:", imdbId);
        getPoster(res, imdbId);
    } else if (reqUrl.pathname.startsWith('/posters/add/') && req.method === 'POST') {
        const imdbId = reqUrl.pathname.split('/').pop(); // Extract IMDb ID from URL
        console.log("Received request to upload poster for IMDb ID:", imdbId);
        uploadPoster(req, res, imdbId);
    } else {
        res.statusCode = 404;
        res.end(JSON.stringify({ message: 'Endpoint not found' }));
    }
});

server.listen(5000, () => {
    console.log('Server is listening on port 5000');
});


async function getPoster(res, imdbId) {
    try {
        // Validate IMDb ID format (e.g., tt1234567)
        if (!/^tt\d{7}$/.test(imdbId)) {
            res.statusCode = 400;
            return res.end(JSON.stringify({ error: true, message: 'Invalid IMDb ID format. Must be like tt1234567.' }));
        }

        console.log(`Fetching poster for IMDb ID: ${imdbId}`);

        // Fetch movie details from OMDb API using the IMDb ID
        const omdbResponse = await axios.get(`http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
        
        // Check if OMDb returned a valid response
        if (omdbResponse.data.Response === "False") {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: true, message: 'Movie not found or invalid IMDb ID.' }));
        }

        // Extract the poster URL from the OMDb response
        const posterUrl = omdbResponse.data.Poster;
        if (!posterUrl || posterUrl === 'N/A') {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: true, message: 'Poster not available for this IMDb ID.' }));
        }

        console.log(`Poster URL: ${posterUrl}`);

        // Fetch the poster image from the URL
        const imageResponse = await axios.get(posterUrl, { responseType: 'arraybuffer' });

        // Check if we successfully fetched the image
        if (imageResponse.status !== 200) {
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: true, message: 'Failed to fetch the poster image.' }));
        }

        // Set the correct content type based on the image format
        const contentType = imageResponse.headers['content-type'] || 'image/jpeg'; // Default to JPEG if not available

        // Set the response headers and send the image data
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(imageResponse.data);

    } catch (error) {
        console.error('Error fetching poster:', error.message);
        if (error.response) {
            console.error('Error response:', error.response.data);
        }
        res.statusCode = 500;
        res.end(JSON.stringify({ error: true, message: 'Failed to fetch the poster.' }));
    }
}
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
// async function getPoster(res, imdbId) {
//     try {
//         if (!/^tt\d{7}$/.test(imdbId)) {
//             res.statusCode = 400;
//             return res.end(JSON.stringify({ error: true, message: 'Invalid IMDb ID format. Must be like tt1234567.' }));
//         }

//         console.log(`Fetching poster for IMDb ID: ${imdbId}`);

//         // Fetch movie details from OMDb API
//         const response = await axios.get(`http://www.omdbapi.com/?i=${imdbId}&apikey=${OMDB_API_KEY}`);
//         console.log('OMDb API Response:', response.data);

//         // Check if a poster URL is available
//         const posterUrl = response.data.Poster;
//         if (!posterUrl || posterUrl === 'N/A') {
//             res.statusCode = 404;
//             return res.end(JSON.stringify({ error: true, message: 'Poster not available for this IMDb ID.' }));
//         }

//         console.log(`Poster URL found: ${posterUrl}`);

//         // Fetch the poster image from the poster URL
//         const imageResponse = await axios.get(posterUrl, { responseType: 'arraybuffer' });
//         console.log('Image Response Headers:', imageResponse.headers);

//         // Determine the image content type
//         const contentType = imageResponse.headers['content-type'] || 'image/jpeg'; // Default to 'image/jpeg' if not specified

//         // Send the image as the response
//         res.writeHead(200, { 'Content-Type': contentType });
//         res.end(imageResponse.data);

//     } catch (error) {
//         console.error('Error fetching poster:', error.message);
//         if (error.response) {
//             console.error('Error Response:', error.response.data);
//         }
//         res.statusCode = 500;
//         res.end(JSON.stringify({ error: true, message: 'Failed to fetch the poster.' }));
//     }
// }

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
    
