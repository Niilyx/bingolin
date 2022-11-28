const express = require("express");
const app = express();
const port = 80;

app.use("/", express.static("public"));

app.get("/table", (req, res) => {
    res.sendFile(__dirname + "/table.json");
});

app.listen(port, () => {
    console.log(`Bingolin app listening at http://localhost:${port}`);
});
