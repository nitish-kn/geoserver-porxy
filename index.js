const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

const app = express();

// Define the GeoServer URL and credentials
const geoserverUrl = process.env.GEOSERVER_URL;
const geoserverUsername = process.env.GEOSERVER_USERNAME;
const geoserverPassword = process.env.GEOSERVER_PASSWORD;

// Create a proxy middleware
app.use('/geoserver', createProxyMiddleware({
  target: geoserverUrl,
  changeOrigin: true,
  auth: `${geoserverUsername}:${geoserverPassword}`,  // Basic Auth
  pathRewrite: {
    '^/geoserver': '',  // Remove '/geoserver' from the proxy path
  },
  onProxyReq(proxyReq, req, res) {
    // Set the headers for Basic Authentication
    proxyReq.setHeader(
      'Authorization',
      'Basic ' + Buffer.from(`${geoserverUsername}:${geoserverPassword}`).toString('base64')
    );
  },
  logLevel: 'debug', // For debugging purposes, can be removed in production
}));

// Set up the server to listen on port 3000
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy server running on port ${PORT}`);
});
