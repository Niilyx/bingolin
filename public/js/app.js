let TABLE = [];
let PSEUDO = localStorage.getItem("pseudo");
let HASBINGO = false;
const urlParams = new URLSearchParams(window.location.search);
const debug = urlParams.get("debug");
const noNameChoice = [
    "Bourricot obscur",
    "Goofy ahh",
];

async function getTable() {
    const response = await fetch("/table");
    let table = await response.json();
    table = shuffle(table);
    let parsedTable = [[],[],[],[],[]];
    for (let cell in table) {
        parsedTable[cell % 5].push(table[cell]);
    }
    return parsedTable;
}

function shuffle(array) {
    let currentIndex = array.length,  randomIndex;

    // While there remain elements to shuffle.
    while (currentIndex != 0) {

        // Pick a remaining element.
        randomIndex = Math.floor(Math.random() * currentIndex);
        currentIndex--;

        // And swap it with the current element.
        [array[currentIndex], array[randomIndex]] = [
            array[randomIndex], array[currentIndex]];
    }

    return array;
}

function renderTable() {
    console.log("Rendering table");
    for (let row of TABLE) {
        const tr = document.createElement("tr");
        for (let cell of row) {
            const td = document.createElement("td");
            td.textContent = cell;
            td.onclick = (e) => {
                if (td.className === "selected") {
                    td.className = "";
                    localStorage.setItem("status", JSON.stringify(getBingoStatus()));
                }
                else {
                    td.className = "selected";
                    localStorage.setItem("status", JSON.stringify(getBingoStatus()));
                    checkBingo();
                }
            }
            tr.appendChild(td);
        }
        document.querySelector("tbody").appendChild(tr);
    }
}

// resets page to default state if in debug mode
if (debug === "1") {
    localStorage.clear();
}

if (localStorage.getItem("table") === null) {
    getTable().then(table => {
        localStorage.setItem("table", JSON.stringify(table));
        TABLE = table;
        console.log("Table loaded from server");
        renderTable();
    });
}
else {
    TABLE = JSON.parse(localStorage.getItem("table"));
    console.log("Table loaded from local storage");
    renderTable();
    let status = JSON.parse(localStorage.getItem("status"));
    if (status !== null) {
        // On remet les cases cochées
        let i = 0;
        document.querySelectorAll("tr").forEach(row => {
            let j = 0;
            row.querySelectorAll("td").forEach(cell => {
                if (status[i][j] === 1) {
                    cell.className = "selected";
                }
                j++;
            });
            i++;
        });
    }
}


//Réplique de la fonction random.choice de Python: choisir un élément au hasard dans une liste et le retourner
function choice(choices) {
    /* Array -> any
    Hyp: liste non vide
    */
    let index = Math.floor(Math.random() * choices.length);
    return choices[index];
}

if (PSEUDO === null || PSEUDO.trim() === "") {
    PSEUDO = prompt("Quel est ton pseudo ?");
    if (PSEUDO === null || PSEUDO.trim() === "") {
        PSEUDO = choice(noNameChoice);
    }
    PSEUDO = PSEUDO.trim();
    localStorage.setItem("pseudo", PSEUDO);
}

function getBingoStatus() {
    let selected = [];
    document.querySelectorAll("tr").forEach(row => {
        selected.push([])
        row.querySelectorAll("td").forEach(cell => {
            if (cell.className === "selected") {
                selected[selected.length - 1].push(1);
            }
            else {
                selected[selected.length - 1].push(0);
            }
        })
    });
    return selected;
}

function checkBingo() {
    let cells = getBingoStatus();
    // selected est une matrice 5x5 contenant des 0 et des 1 selon si la case est cochée ou non

    for (let i=0;i<5;i++) {
        let line = [];
        for (let j of cells[i]) {
            if (j === 1) {
                line.push(j)
            }
        }
        if (new Set(line).size === 1 && line.length === 5) {
            win();
            return
        }
    }

    for (let i=0;i<5;i++) {
        let line = []
        for (let j=0;j<5;j++) {
            if (cells[j][i] === 1) {
                line.push(cells[j][i])
            }
        }
        if (new Set(line).size === 1 && line.length === 5) {
            win();
            return
        }
    }

    /*for (let i=0;i<5;i++) {
        let line = []
        for (let j=4; j>=0; j--) {
            if (cells[i][j] === 1) {
                line.push(cells[i][j])
            }
        }
        if (new Set(line).size === 1 && line.length === 5) {
            win();
            return
        }
    }*/

    for (let i=0;i<5;i++) {
        for (let j=0;j<5;j++) {
            if (i === j) {
                let line = []
                for (let k=0;k<5;k++) {
                    if (cells[k][k] === 1) {
                        line.push(cells[k][k])
                    }
                }
                if (new Set(line).size === 1 && line.length === 5) {
                    win();
                    return
                }
            }
            else if (i + j === 4) {
                let line = []
                for (let k=0;k<5;k++) {
                    if (cells[k][4-k] === 1) {
                        line.push(cells[k][4-k])
                    }
                }
                if (new Set(line).size === 1 && line.length === 5) {
                    win();
                    return
                }
            }
        }
    }
}

function win() {
    if (!HASBINGO) {
        console.log("You won!");
        HASBINGO = true;
        document.querySelector(".winDiv").classList.remove("hidden");
        socket.send(JSON.stringify({
            "type": "bingo",
            "pseudo": PSEUDO
        }));
    }
}

function notify(text) {
    console.log("Showing notification: " + text);
    document.querySelector(".newDiv").classList.remove("hidden");
    document.querySelector(".newDiv").textContent = text;
    setTimeout(() => {
        document.querySelector(".newDiv").classList.add("hidden");
    }, 5000);
}

let socketurl = "";
if (location.protocol === "https:") {
    socketurl = "wss://" + document.location.host + "/bingows";
}
else {
    socketurl = "ws://" + document.location.host + "/bingows";
}
let socket = new WebSocket(socketurl);
socket.onopen = () => {
    console.log("Connected to websocket");
    socket.send(JSON.stringify({
        "type": "join",
        "pseudo": PSEUDO
    }));
}
socket.onmessage = (e) => {
    let data = JSON.parse(e.data);
    if (data.type === "bingo") {
        notify(data.pseudo + " vient de faire un bingo !");
    }
    else if (data.type === "join") {
        notify(data.pseudo + " vient de rejoindre la partie !");
    }
    else if (data.type === "leave") {
        notify(data.pseudo + " vient de quitter la partie !");
    }
    else if (data.type === "notify") {
        notify(data.text);
    }
    else if (data.type === "newgame") {
        notify("Une nouvelle partie va commencer !");
        setTimeout(() => {
            localStorage.clear();
            document.location.reload();
        }, 1000);
    }
    else if (data.type === "reload") {
        window.location.href = window.location.href;
    }
    else {
        console.log(data);
    }
}
socket.onerror = (e) => {
    fetch("/log", {
        method: "POST",
        body: JSON.stringify({
            "message": e,
            "level": "error"
        }),
        headers: {
            "Content-Type": "application/json"
        }
    });
    notify("Une erreur est survenue, rechargement de la page...");
    setTimeout(() => {
        window.location.href = window.location.href;
    }, 1000);
}
socket.onclose = (e) => {
    notify("Le serveur a redémarré, rechargement de la page...");
    setTimeout(() => {
        window.location.href = window.location.href;
    }, 1000);
}

window.onblur = () => {
    document.title = "Présentation PowerPoint";
}

window.onfocus = () => {
    document.title = "Bingolin";
}


