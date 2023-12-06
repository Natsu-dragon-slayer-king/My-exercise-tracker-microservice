const express = require("express");
const app = express();
require("dotenv").config();

const cors = require("cors");
app.use(cors());

app.use("/public", express.static(__dirname + "/public"));

const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({extended:false}));

const secret = process.env["MONGO_URI_GLOBAL"];

const mongoose = require("mongoose");
mongoose.connect(secret)
.then(()=>{
  console.log("Database is up!");
})
.catch((error)=> console.error(error));

const usernameSchema = mongoose.Schema({
  username:{
    type:String,
    required:true
  }
})
const usernameModel = mongoose.model("username", usernameSchema);

const exerciseSchema = mongoose.Schema({
  description:{
    type:String,
    required:true
  },
  duration:{
    type:Number,
    required:true
  },
  date:{
    type:String,
    required:true
  }
})
const exerciseModel = mongoose.model("exercise",exerciseSchema);

const logSchema = mongoose.Schema({
  username:{
    type:String,
    required:true
  },
  count:{
    type:Number,
    required:true
  },
  _id:{
    type:String,
    required:true
  },
  log:[{
    description:{
      type:String,
      required:true
    },
    duration:{
      type:Number,
      required:true
    },
    date:{
      type:String,
      required:true
    }
  }]
})
const logModel = mongoose.model("log", logSchema);

app.get("/",(req,res)=>{
  res.sendFile(__dirname + "/views/index.html");
})

app.get("/api/users",async (req,res)=>{
  let users;
  try{
    users = await usernameModel.find({});
  }catch(e){
    console.error(e);
  }
  if(!users.length){
    res.json({
      "error":"No users found"
    })
  }else{
    res.json(users);
  }
})
app.post("/api/users",async (req,res)=>{
  const found = await usernameModel.findOne({username:req.body.username});
  if(!found){
    const usernameResult = await new usernameModel({username:req.body.username}).save();
    console.log("usernameResult",usernameResult);
    res.json(usernameResult);
    const logResult = await new logModel({
      username:usernameResult.username,
      count:0,
      _id:usernameResult._id,
      log:[]
    }).save();
    console.log("logResult",logResult);
  }else{
    res.json(found);
  }
})

app.post("/api/users/:_id/exercises", async (req,res)=>{
  const id = req.params._id;
  const date = req.body.date ? new Date(req.body.date).toDateString() : new Date().toDateString();
  if(validateProperty({date:req.body.date}) && validateProperty({id:id})){
    const foundLog = await logModel.findById(id);
    console.log("foundLog",foundLog);
    if(foundLog){
      const savedExercise = await new exerciseModel({
        description:req.body.description,
        duration:Number.parseInt(req.body.duration, 10),
        date
      }).save();
      await logModel.findByIdAndUpdate(id,{
        count:++foundLog.count,
        log:[...foundLog.log, savedExercise]
      });
      res.json({
        username:foundLog.username,
        _id:foundLog._id,
        description:savedExercise.description,
        duration:savedExercise.duration,
        date:savedExercise.date
      })
    }else{
      res.json({"error":"No username with that ID found"})
    }
  }else{
    res.json({"error":"You have entered a date in the wrong format yyyy-mm-dd"})
  }
})
function compareDates(log,marker,measure){
  if(marker === "to"){
    return log.filter((logItem)=>{
      return new Date(logItem.date).getTime() <= new Date(measure).getTime();
    })
  }else if(marker === "from"){
    return  log.filter((logItem)=>{
      return new Date(logItem.date).getTime() >= new Date(measure).getTime();
    }) 
  }else if(marker === "limit"){
    return log.slice(0, measure);
  }
}
function validateProperty({date:dateValue,limit:limitValue,id:idValue}){
  let isDate;
  if(dateValue){
    isDate = Date.parse(dateValue);
  }
  let isNumber;
  if(limitValue){
    isNumber = /\d+/.test(limitValue);
  }
  let isId;
  if(idValue){
    isID = /[a-z0-9]+/.test(idValue)
  }
  if(isDate || isNumber || isID){
    return true;
  }
  return false;
}
app.get("/api/users/:_id/logs",async (req,res)=>{
  const id = req.params._id;
  const {from,to,limit} = req.query;
  if(validateProperty({id:id})){
  const foundById = await logModel.findById(id)
    console.log("Found by ID: ", foundById);
    if(foundById){
      if(from){
        foundById.log = compareDates(foundById.log, "from", from);
      }
      if(to){
        foundById.log = compareDates(foundById.log, "to", to);
      }
      if(limit){
        foundById.log = compareDates(foundById.log, "limit", limit)
      }
      const {username,count,_id} = foundById;
      res.json({
        username,
        count,
        _id,
        log:foundById.log
      })
    }else{
      res.json({
        error:"No username found with that ID"
      })
    }
  }else{
    res.json({
      error:"You have input an invalid ID"
    })
  }
})

app.listen(3000 || process.env["PORT"],()=>{
  console.log("Server is up!");
})
