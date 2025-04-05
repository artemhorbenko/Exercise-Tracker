const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
require('dotenv').config()


mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  dbName: 'tracker',
});


const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true
  }
});

const User = mongoose.model('User', userSchema);

const createAndSaveUser = (username, done) => {
  let user = new User({
    username: username
  });

  user.save(function(err, data) {
    if (err) return console.error(err);
    // if (err) return done(err);
    done(null, data)
  });
};

const findUserById = (userId, done) => {
  User.findById({_id: userId}, function(err, userFound) {
    if (err) return console.log(err);
    done(null, userFound);
  });
};

const findAllUsers = (done) => {
  User.find({}, function(err, users) {
    if (err) return console.log(err);
    done(null, users);
  });
}

// createAndSaveUser('artem', (err, data) => {
//   console.log('User added', data)
// });

// findUserById('67f19dfd3c92e006ad6bae59', (err, data) => {
//   console.log('User found', data)
// });


const exerciseSchema = new mongoose.Schema({
  user_id: {
    type: String,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  duration: {
    type: Number,
    required: true
  },
  date: Date,
});

const Exercise = mongoose.model('Exercise', exerciseSchema);

const createAndSaveExercise = (data, done) => {
  let exercise = new Exercise(data);

  exercise.save(function(err, data) {
    if (err) return console.error(err);
    // if (err) return done(err);
    done(null, data)
  });
};

const findExercisesByUserId = (userId, done) => {
  Exercise.find({user_id: userId}, function(err, exercisesFound) {
    // if (err) return console.log(err);
    if (err) return done(err);
    done(null, exercisesFound);
  });
};

// createAndSaveExercise({
//   user_id: '67f19dfd3c92e006ad6bae59',
//   description: 'Yoga',
//   duration: 30
// }, (err, data) => {
//   console.log('Exercise added', data)
// });

// createAndSaveExercise({
//   user_id: '67f19dfd3c92e006ad6bae59',
//   description: 'Code',
//   duration: 60
// }, (err, data) => {
//   console.log('Exercise added', data)
// });

// findExercisesByUserId('67f19dfd3c92e006ad6bae59', (err, data) => {
//   console.log('Exercises found', data)
// });


app.use(cors())
app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});


app.use(bodyParser.urlencoded({extended: false}));

app.post('/api/users', (req, res) => {
  createAndSaveUser(req.body.username, (err, data) => {
    if ( err ) {
      res.send(`Error: ${err}`);
      return;
    }

    res.json({
      username: data.username,
      _id: data._id
    });
  });
});

app.get('/api/users', (req, res) => {
  findAllUsers((err, data) => {
    if ( err ) {
      res.send(`Error: ${err}`);
      return;
    }

    res.json(data);
  });
});

app.post('/api/users/:_id/exercises', (req, res) => {
  findUserById(req.params._id, (err, user_data) => {
    if ( err ) {
      res.send(`Error: ${err}`);
      return;
    }

    if ( !user_data ) {
      res.send(`Error: User with _id ${req.params._id} not found`);
      return;
    }

    console.log('User found', user_data)

    createAndSaveExercise({
      user_id: req.params._id,
      description: req.body.description,
      duration: req.body.duration,
      date: req.body.date ? req.body.date : new Date().toDateString()
    }, (err, exercise_data) => {
      console.log('Exercise added', exercise_data);

      res.json({
        username: user_data.username,
        description: exercise_data.description,
        duration: exercise_data.duration,
        date: new Date(exercise_data.date).toDateString(),
        _id: user_data._id
      });
    });

    
  });
});

// https://3000-freecodecam-boilerplate-z04j5vo6ijf.ws-eu118.gitpod.io/api/users/67f1a11b0df2a80bbfe4e457/logs
app.get('/api/users/:_id/logs', (req, res) => {
  findUserById(req.params._id, (err, user_data) => {
    if ( err ) {
      res.send(`Error: ${err}`);
      return;
    }

    if ( !user_data ) {
      res.send(`Error: User with _id ${req.params._id} not found`);
      return;
    }

    console.log('User found', user_data);

    // findExercisesByUserId(req.params._id, (err, exercises_data) => {
    //   console.log('Exercises found', exercises_data)

    //   let output_exercises_data = [];

    //   exercises_data.forEach(function(exercise) {
    //     output_exercises_data.push({
    //       description: exercise.description,
    //       duration: exercise.duration,
    //       date: new Date(exercise.date).toDateString()
    //     });
    //   });

    //   res.json({
    //     username: user_data.username,
    //     count: exercises_data.length,
    //     _id: user_data._id,
    //     log: output_exercises_data
    //   });
      
    // });

    let from = req.query.from ? new Date(req.query.from) : undefined;
    let to = req.query.to ? new Date(req.query.to) : undefined;
    let limit = req.query.limit ? parseInt(req.query.limit) : 0;

    queryChain(req.params._id, from, to, limit, (err, exercises_data) => {

      let output_exercises_data = [];

      exercises_data.forEach(function(exercise) {
        output_exercises_data.push({
          description: exercise.description,
          duration: exercise.duration,
          date: new Date(exercise.date).toDateString()
        });
      });
      
      res.json({
        username: user_data.username,
        count: exercises_data.length,
        _id: user_data._id,
        log: output_exercises_data
      });
      
    });

  });
});

const queryChain = (userId, from, to, limit, done) => {

  let find_params = { user_id: userId };

  if ( from ){
    find_params = { user_id: userId, date: { $gte: from} };
  }
  if ( to ){
    find_params = { user_id: userId, date: { $lte: to } };
  }
  if ( from && to ){
    find_params = { user_id: userId, date: { $gte: from, $lte: to } };
  }

  Exercise.find(find_params)
    .sort({ date: 1 })
    .limit(limit)
    .select({ _id: 0, user_id: 0, __v: 0})
    .exec(function(err, people) {
      if (err) return console.log('ERROR', err);

      done(null, people);
    });
};


const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
