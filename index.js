const express = require('express');
const cors = require('cors');
const { default: mongoose } = require("mongoose");

const app = express();
const PORT = 3000;

// Connection URLs
const mainConnect = require("./connections/mainConnect");
const testConnect = require("./connections/testConnect");

// Import routes for collection mapping to API
const playerRoutes = require("./routes/playerRoutes");
const compatabilityRoutes = require("./routes/compatabilityRoutes");
const transferRoutes = require("./routes/transferRoutes");
const positionRoutes = require("./routes/positionRoutes");
const playstyleRoutes = require("./routes/playstyleRoutes");

app.use(cors());

// Use main URL instead of test URL
mongoose.connect(mainConnect.url)

const server = app.listen(PORT, (error) =>{
    if(!error)
        console.log("Server is Successfully Running and App is listening on port " + PORT)
    else
        console.log("Error occurred, server could not start", error)
});

app.use((req, res, next) => {
    console.log(req.method, req.url, new Date());
    return next();
  });

app.get('/', (req, res) =>{
    res.status(200);
    res.send("Welcome to root URL");
})

// Route Configuration
app.use("/players", playerRoutes);
app.use("/compatability", compatabilityRoutes);
app.use("/transfers", transferRoutes);
app.use("/positions", positionRoutes);
app.use("/playstyles", playstyleRoutes);

module.exports = server;