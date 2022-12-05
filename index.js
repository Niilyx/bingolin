const express = require("express");
const app = express();
const port = 80;
require('express-ws')(app);
const bodyParser = require("body-parser");

let SOCKETS = [];

app.use("/", express.static("public"));
app.use(bodyParser.json());

function broadcast(data) {
    SOCKETS.forEach((socket) => {
        socket.send(JSON.stringify(data));
    });
}

app.get("/table", (req, res) => {
    res.sendFile(__dirname + "/table.json");
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
            console.log(data.pseudo + " vient de rejoindre la partie !");
            broadcast({
                type: "join",
                pseudo: data.pseudo
            });
        }
        else {
            console.log("Unknown message type: " + data.type);
        }
    });
    ws.on("close", () => {
        SOCKETS = SOCKETS.filter((socket) => {
            return socket !== ws;
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
    else if (msg === "/help") {
        console.log("Available commands:");
        console.log("/newgame: starts a new game");
        console.log("/reload: reloads all clients");
        console.log("/notify <text>: sends a notification to all clients");
    }
    else {
        console.log("Unknown command: " + msg);
        console.log("Type /help to get a list of commands");
    }
});

app.listen(port, () => {
    console.log(`Bingolin app listening at http://localhost:${port}`);
});
