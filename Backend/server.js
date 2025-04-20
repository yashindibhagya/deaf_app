// backend/server.js
const app = require('./app');
const http = require('http');
const server = http.createServer(app);

// Try ports starting at 5000 and increment until we find an available one
function startServer(port) {
    server.listen(port);
    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is busy, trying ${port + 1}...`);
            startServer(port + 1);
        } else {
            console.error('Server error:', err);
        }
    });

    server.on('listening', () => {
        const addr = server.address();
        console.log(`Server running on port ${addr.port}`);
    });
}

startServer(process.env.PORT || 5000);