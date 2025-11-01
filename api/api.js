const https = require('https');
const fs = require('fs');
const port = 3001;

//Create key and cert for usage on a single computer:
//openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
//  -keyout private-key.pem -out certificate.pem 
//TODO: create key and cert for ip and test
const options = {
    key: fs.readFileSync('key.pem'),
    cert: fs.readFileSync('cert.pem'),
};

//TODO: Save data of different lifting groups.
//Ranking of categories needs to be calculated correctly even in the case where athletes of same category are in different groups.
let competition_data = {};

const server = https.createServer(options, (req, res) => {
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
    if(req.method === 'POST'){
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
    } else if(req.method === 'GET'){
        res.writeHead(200);
        res.end(JSON.stringify(competition_data));
    } else {
        res.writeHead(405);
        res.end(JSON.stringify({ status: 'error', message: 'kys' }));
    }
});

if (require.main === module) {
    server.listen(port, () => {
        console.log(`Server is running on https://localhost:${port}`);
    });
}

module.exports = server;
