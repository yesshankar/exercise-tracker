require('dotenv').config()
const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose')
const shortid = require('shortid')

mongoose.connect(process.env.FCC_MONGO_URI, { useNewUrlParser: true })
mongoose.set('useFindAndModify', false);  // to aviod deprecation warning

app.use(cors())
app.use(express.urlencoded({extended: false}))
// app.use(express.json())
app.use(express.static('public'))

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


var userSchema = new mongoose.Schema({
  _id: String,
  username: String,
  count: { type: Number, default: 0 },
  log: [{description: String, duration: Number, date: String}]
});

var User = mongoose.model('User', userSchema);

app.post('/api/exercise/new-user', (req, res) => {

  User.find({username: req.body.username}, (err, data) => {
    if(err){
      res.json({"errorInUser-find": err});
    }else{
      
      if(data.length == 0){
        let newId = shortid.generate();
        new User({ username: req.body.username, _id: newId}).save();
        res.json({_id: newId, username: req.body.username});
      }else{
        res.json([`username ${req.body.username} already exists, please choose other username`]);
      }
    }

  });

})

app.get('/api/exercise/users', (req, res) => {

  User.find({}, '_id username', (err, data) => {
    if(err) res.json({"error": err});

    res.json(data);
  });
})

app.post('/api/exercise/add', (req, res) => {

  let userId = req.body.userId;
  let description = req.body.description;
  let duration = req.body.duration;
  let date = new Date(req.body.date.replace(/-/g, '\/')).toDateString();

  User.findOneAndUpdate({ _id: userId },
    { 
      $inc: { count: 1 },
      $push: {
        log: { description, duration, date }
      }
    }, (err, data) => {
      if(err) res.json({ "error": err });

      if(data){
        res.json({ _id: userId, username: data.username, description, duration, date });
      }else{
        res.json(["Invalid userId"]);
      }

    });

})

app.get('/api/exercise/log', (req, res) => {

  let userId = req.query.userId;
  let from = req.query.from;
  let to= req.query.to;
  let limit = parseInt(req.query.limit);

  if(!userId) res.json(["userId required in query parameter!"]);

  /* let query = { _id: userId };

  if(from && to){
    query.log = { $elemMatch: { date: { $get: new Date(from).toDateString(), $lt: new Date(from).toDateString() } } }
  }else{

    if(from) query.log = { $elemMatch: { date: { $get: new Date(from).toDateString() } } }
    if(to) query.log = { $elemMatch: { date: { $lt: new Date(from).toDateString() } } }
  }
  console.log(`query: ${query}`); */

  User.find({ _id: userId }, (err, data) => {
    if(err) res.json({ "error": err });

    if(data.length == 0){
      res.json(["userId not found!"]);
    }else{

      if(from){
        data[0].log = data[0].log.filter((item) => { return new Date(item.date).getTime() > new Date(from).getTime() });
      }
      if(to){
        data[0].log = data[0].log.filter((item) => { return new Date(item.date).getTime() < new Date(from).getTime() });
      }
      if(limit){
        data[0].log = data[0].log.slice(0, limit);
      }

      res.json(data);
    } 

  });

})


// Not found middleware
app.use((req, res, next) => {
  return next({status: 404, message: 'not found'})
})

// Error Handling middleware
app.use((err, req, res, next) => {
  let errCode, errMessage

  if (err.errors) {
    // mongoose validation error
    errCode = 400 // bad request
    const keys = Object.keys(err.errors)
    // report the first validation error
    errMessage = err.errors[keys[0]].message
  } else {
    // generic or custom error
    errCode = err.status || 500
    errMessage = err.message || 'Internal Server Error'
  }
  res.status(errCode).type('txt')
    .send(errMessage)
})

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
