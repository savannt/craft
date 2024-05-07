const chokidar = require("chokidar");
const express = require("express");
const ws = require("ws");
const app = express();
const port = 3000;

app.use(express.static("app"));

app.listen(port, () => {
    console.log(`App is running at http://localhost:${port}`);
});

const wss = new ws.Server({ port: (port + 1) });
wss.on("connection", (ws) => { console.log("+1 Connection"); });

// watch changes to app directory, only watch for .js, .css, .html, .glsl
const watcher = chokidar.watch("app", {
    ignored: /(^|[\/\\])\../,
    persistent: true
});

watcher.on("change", (path) => {
    console.log(`File ${path} has been updated. Reloading...`);
    wss.clients.forEach((client) => {
        client.send("reload");
    });
});

