require("dotenv").config();
const mongoose = require("mongoose");

const mongoURI = process.env.MDB_URLS || "mongodb://localhost:27017/dbAdlam";
//la connexion à la base de donne
mongoose.connect(mongoURI)
.then(res => console.log("connexion db reuissi!"))
.catch(e => console.log("connexion db echoué"));


module.exports = mongoose;