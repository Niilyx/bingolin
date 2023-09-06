const express = require("express");
const app = express();
const fs = require("fs");
const port = 80;
require('express-ws')(app);
const bodyParser = require("body-parser");

let SOCKETS = [];

let USERS = [];

// force no cache
app.use("/", (req, res, next) => {
    res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    next();
}, express.static("public"));
app.use(bodyParser.json());

function broadcast(data) {
    SOCKETS.forEach((socket) => {
        socket.send(JSON.stringify(data));
    });
}

function randomizeArray(arr) {
    let res = [];
    while (arr.length > 0) {
        let i = Math.floor(Math.random() * arr.length);
        res.push(arr[i]);
        arr.splice(i, 1);
    }
    return res;
}

function takeOnly25Firsts(arr) {
    let res = [];
    for (let i = 0; i < 25; i++) {
        res.push(arr[i]);
    }
    return res;
}

app.get("/table", (req, res) => {
    const table = JSON.parse(fs.readFileSync("table.json"));
    res.json(takeOnly25Firsts(randomizeArray(table)));
});

app.post("/log", (req, res) => {
    if (req.body.level === "error") {
        console.error(req.body.message);
    }
    else {
        console.log(req.body.message);
    }
});

app.ws("/bingows", (ws, req) => {
    SOCKETS.push(ws);
    let pseudo = "";
    ws.on("message", (msg) => {
        let data = JSON.parse(msg);
        if (data.type === "bingo") {
            console.log(data.pseudo + " vient de faire un bingo !");
            broadcast({
                type: "bingo",
                pseudo: data.pseudo
            });
        }
        else if (data.type === "join") {
            pseudo = data.pseudo;
            console.log("\033[92m" + data.pseudo + " vient de rejoindre la partie !\033[0m");
            USERS.push({
                pseudo: data.pseudo,
                ip: req.headers["cf-connecting-ip"]
            });
            broadcast({
                type: "join",
                pseudo: data.pseudo
            });
        }
        else if (data.type === "hide") {
            if (data.password === process.env.ADMIN_PASSWORD) {
                broadcast({
                    type: "hide",
                    value: data.value
                });
            }
            else {
                ws.send(JSON.stringify({
                    type: "notify",
                    text: "Mot de passe incorrect"
                }));
            }
        }
        else {
            console.log("Unknown message type: " + data.type);
        }
    });
    ws.on("close", () => {
        SOCKETS = SOCKETS.filter((socket) => {
            return socket !== ws;
        });
        console.log("\033[91m" + pseudo + " vient de quitter la partie !\033[0m");
        USERS = USERS.filter((user) => {
            return user.pseudo !== pseudo;
        });
        broadcast({
            type: "leave",
            pseudo: pseudo
        })
    });
    ws.on("error", (e) => {
        console.error(e);
        ws.close();
    });
})

process.stdin.on("data", (data) => {
    let msg = data.toString().trim();
    if (msg === "/newgame") {
        console.log("Une nouvelle partie va commencer !");
        broadcast({
            type: "newgame"
        });
    }
    else if (msg === "/reload") {
        console.log("Reloading all clients...");
        broadcast({
            type: "reload"
        });
    }
    else if (msg.startsWith("/notify ")) {
        console.log("Sending notification: " + msg.substring(8));
        broadcast({
            type: "notify",
            text: msg.substring(8)
        });
    }
    else if (msg === "/hide true") {
        console.log("Hiding all clients...");
        broadcast({
            type: "hide",
            value: true
        });
    }
    else if (msg === "/hide false") {
        console.log("Showing all clients...");
        broadcast({
            type: "hide",
            value: false
        });
    }
    else if (msg === "/list") {
        console.log("Connected users:");
        console.log("Pseudo" + " ".repeat(30 - "Pseudo".length) + " | IP");
        console.log("-".repeat(30) + "-|-" + "-".repeat(15));
        USERS.forEach((user) => {
            console.log(user.pseudo + " ".repeat(30 - user.pseudo.length) + " | " + user.ip);
        });
    }
    else if (msg === "/help") {
        console.log("Available commands:");
        console.log("/newgame: starts a new game");
        console.log("/reload: reloads all clients");
        console.log("/hide <true|false>: hides or shows all clients");
        console.log("/notify <text>: sends a notification to all clients");
        console.log("/list: lists all connected users");
    }
    else {
        console.log("Unknown command: " + msg);
        console.log("Type /help to get a list of commands");
    }
});

app.listen(port, () => {
    console.log(`Bingolin app listening at http://localhost:${port}`);
});
