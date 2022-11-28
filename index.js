const express = require("express");
const app = express();
const port = 80;
var expressWs = require('express-ws')(app);
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
    });
    ws.on("error", (e) => {
        console.error(e);
        ws.close();
    });
})

app.listen(port, () => {
    console.log(`Bingolin app listening at http://localhost:${port}`);
});
