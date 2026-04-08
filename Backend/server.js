const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// DB connection
const db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "",
    database: "disaster_relief_db_final"
});

// TEST API
app.get("/test", (req, res) => {
    res.send("Backend working!");
});

// Example: Get all requests
app.get("/requests", (req, res) => {
    db.query("SELECT * FROM resource_request", (err, result) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(result);
        }
    });
});

app.listen(5000, () => {
    console.log("Server running on port 5000");
});