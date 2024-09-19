const express = require("express");
const httpProxy = require("http-proxy");
const zlib = require("zlib"); // For decompression if needed
const app = express();
const dotenv = require("dotenv");
// const https = require('https');
// const fs = require('fs');

// const options = {
//   key: fs.readFileSync('C:/Users/nitis/localhost.key'),   // Absolute path to localhost.key
//   cert: fs.readFileSync('C:/Users/nitis/localhost.crt')   // Absolute path to localhost.crt
// };

dotenv.config();
const geoserverUrl = process.env.GEOSERVER_URL;

const proxy = httpProxy.createProxyServer({
  secure: false, // Disable SSL certificate validation
});

proxy.on("proxyRes", (proxyRes, req, res) => {
  let body = [];

  // Handle response only if lowercase `username` is provided
  if (req.query.username) {
    // Collect chunks of data from the proxy response
    proxyRes.on("data", (chunk) => {
      body.push(chunk); // Collect Buffer chunks
    });

    // After the response is fully received
    proxyRes.on("end", () => {
      body = Buffer.concat(body);

      // Check if the response is compressed (gzip or deflate)
      const encoding = proxyRes.headers["content-encoding"];

      if (encoding === "gzip") {
        zlib.gunzip(body, (err, decompressedBody) => {
          if (err) return res.status(500).send("Error decompressing response");
          handleModifiedResponse(decompressedBody.toString());
        });
      } else if (encoding === "deflate") {
        zlib.inflate(body, (err, decompressedBody) => {
          if (err) return res.status(500).send("Error decompressing response");
          handleModifiedResponse(decompressedBody.toString());
        });
      } else {
        handleModifiedResponse(body.toString());
      }

      function handleModifiedResponse(bodyText) {

        const queryUsername = req.query.username || "";
        const queryPassword = req.query.password || "";

        // Replace 'gis.siriuspower.co.za' with 'localhost:3000' in the response body
        let modifiedBody = bodyText.replace(
          /https:\/\/gis\.siriuspower\.co\.za\/geoserver/g,
          "https://geoserver-porxy.onrender.com/geoserver"
        );
        modifiedBody = modifiedBody.replace(
          /geoserver\/openlayers3\/ol\.css/g,
          `geoserver/openlayers3/ol.css?username=${queryUsername}&password=${queryPassword}`
        );
        modifiedBody = modifiedBody.replace(
          /geoserver\/openlayers3\/ol\.js/g,
          `geoserver/openlayers3/ol.js?username=${queryUsername}&password=${queryPassword}`
        );
        modifiedBody = modifiedBody.replace(
          /gis\.siriuspower\.co\.za/g,
          `geoserver-porxy.onrender.com`
        );

        // Set the correct content type for XML/JSON based on the GeoServer response
        res.setHeader(
          "Content-Type",
          proxyRes.headers["content-type"] || "text/xml"
        );
        res.setHeader("Content-Length", Buffer.byteLength(modifiedBody));

        // Send the modified response to the client
        res.writeHead(proxyRes.statusCode || 200);
        res.end(modifiedBody);
      }
    });
  }
});

app.use("/", (req, res) => {
  const username = req.query.username || req.query.USERNAME;
  const password = req.query.password || req.query.PASSWORD;


  // Determine if selfHandleResponse should be true or false
  const selfHandleResponse = req.query.format==="application/openlayers"; // true if lowercase `username` is present, false if `USERNAME` is provided
  console.log(selfHandleResponse)
  console.log(req.path, req.query)

  proxy.web(req, res, {
    target: "https://gis.siriuspower.co.za",
    selfHandleResponse: selfHandleResponse, // Handle response only for lowercase `username`
    changeOrigin: true, // This ensures the target hostname is used in the request
    auth: `${username}:${password}`,
  });
});

app.listen(3000, () => {
  console.log("Proxy server is running on port 3000");
});

// Start the HTTPS server
// https.createServer(options, app).listen(3000, () => {
//   console.log('HTTPS Server is running on https://localhost:3000');
// });