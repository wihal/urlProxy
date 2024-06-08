const http = require('http');
const https = require('https');
const url = require('url');
const querystring = require('querystring');
const config = require('./config');

const domainQueues = {};
let isProcessing = {};

const server = http.createServer((req, res) => {
    const parsedUrl = url.parse(req.url);
    const query = querystring.parse(parsedUrl.query);

    if (query.url) {
        try {
            const targetUrl = new URL(query.url); // Verwende URL-Klasse zur Validierung
            const domain = targetUrl.hostname;

            // Überprüfung der Whitelist und Blacklist
            if (config.domainBlacklist.includes(domain)) {
                res.statusCode = 403;
                res.end('This domain is blocked');
                return;
            }

            if (config.domainWhitelist.length > 0 && !config.domainWhitelist.includes(domain)) {
                res.statusCode = 403;
                res.end('This domain is not in the whitelist');
                return;
            }

            const protocol = targetUrl.protocol === 'https:' ? https : http;

            const options = {
                method: req.method,
                headers: req.headers,
                rejectUnauthorized: false // Deaktiviert die Zertifikatsprüfung
            };

            const handleRequest = () => {
                const proxyReq = protocol.request(targetUrl, options, (response) => {
                    res.writeHead(response.statusCode, response.headers);
                    response.pipe(res);
                });

                // Fehlerbehandlung für die Proxy-Anfrage
                proxyReq.on('error', (e) => {
                    console.error(`Got error: ${e.message}`);
                    res.statusCode = 500;
                    res.end('Error occurred while fetching the URL');
                });

                // Daten vom Client an den Zielserver weiterleiten (für POST, PUT etc.)
                req.pipe(proxyReq);
            };

            // Anfrage in die Warteschlange der jeweiligen Domain stellen
            if (!domainQueues[domain]) {
                domainQueues[domain] = [];
                isProcessing[domain] = false;
            }
            domainQueues[domain].push({ req, res, handleRequest });

            // Verarbeitungszyklus starten, wenn er nicht läuft
            if (!isProcessing[domain]) {
                isProcessing[domain] = true;
                processQueue(domain);
            }

        } catch (err) {
            console.error(`Invalid URL: ${err.message}`);
            res.statusCode = 400;
            res.end('Invalid URL');
        }
    } else {
        res.statusCode = 400;
        res.end('No url provided');
    }
});

const processQueue = (domain) => {
    if (domainQueues[domain].length > 0) {
        const { req, res, handleRequest } = domainQueues[domain].shift();
        handleRequest();
        setTimeout(() => processQueue(domain), config.requestInterval); // Wartezeit aus der Konfigurationsdatei
        console.log(`Request sent to ${domain}`);
    } else {
        isProcessing[domain] = false;
    }
};

console.log(`Server listening on port ${config.port}. Test with http://localhost:${config.port}/?url=https://google.com`);
server.listen(config.port);
