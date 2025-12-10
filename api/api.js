const http = require('http');
const fs = require('fs');
const path = require('path');
const port = 3001;

//TODO: Save data of different lifting groups.
//Ranking of categories needs to be calculated correctly even in the case where athletes of same category are in different groups.
let competition_data = {};

const server = http.createServer((req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204, {
            'Access-Control-Allow-Methods': 'GET,POST,OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
        });
        res.end();
        return;
    }

    //TODO: Limit POST rights to Openlifter client.
    else if (req.method === 'POST') {
        let data = '';
        req.on('data', chunk => {
            data += chunk.toString();
        });
        req.on('end', () => {
            try {
                competition_data = JSON.parse(data);
                console.log('POST data success:', competition_data);
                res.writeHead(200);
                res.end(JSON.stringify({ status: 'success' }));
            } catch (err) {
                res.writeHead(400);
                res.end(JSON.stringify({ status: 'error', message: err }));
            }
        });

    }

    else if (req.method === 'GET' && req.url === '/leaderboard') {
        fs.readFile(path.resolve('../streaming/leaderboard/leaderboard.html'), function (error, htmlPage) {
            res.writeHead(200, { 'Content-Type': 'text/html' });
            res.end(htmlPage);
        });
    }

    else if (req.method === 'GET' && req.url === '/leaderboard.js') {
        fs.readFile(path.resolve('../streaming/leaderboard/leaderboard.js'), function (error, js) {
            res.writeHead(200, { 'Content-Type': 'text/javascript' });
            res.end(js);
        });
    }

    else if (req.method === 'GET' && req.url === '/leaderboard.css') {
        fs.readFile(path.resolve('../streaming/leaderboard/leaderboard.css'), function (error, css) {
            res.writeHead(200, { 'Content-Type': 'text/css' });
            res.end(css);
        });
    }

    else if (req.method === 'GET' && req.url === '/hkaanto.png') {
        fs.readFile(path.resolve('../streaming/hkaanto.png'), function (error, img) {
            res.writeHead(200, { 'Content-Type': 'image/png' });
            res.end(img);
        });
    }

    else if (req.method === 'GET') {
        res.writeHead(200);
        res.end(JSON.stringify(competition_data));
    }

    else {
        res.writeHead(405);
        res.end(JSON.stringify({ status: 'error', message: 'kys' }));
    }
});

if (require.main === module) {
    server.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}

module.exports = server;