var express = require('express');
var app = express();
app.use(express.json({ type: '*/*' }));

// Database Connection
var MongoClient = require('mongodb').MongoClient;
var url = 'mongodb://localhost:27017/';

let dbo;
MongoClient.connect(url, function (err, db) {
  if (err) throw err;
  dbo = db.db('skyline');
  // dbo.createCollection('customers', function (err, res) {
  //   if (err) throw err;
  //   console.log('Collection created!');
  //   db.close();
  // });
});

//Define port
var port = 3000;

//Define POST request root URL (/)
app.post('/', function (req, res) {
  let errors = [];
  const data = req.body;
  let doc = [];
  console.log('POST: ', data);
  // Data validation
  if (!data?.timestamp) {
    res.status(428).send('No timestamp was provided!');
    return;
  }
  Object.keys(data).map((value) => {
    // I Don't want to query the timestamp
    if (value != 'timestamp') {
      // Data validation
      if (data[value] < -1) {
        errors.push(value);
        return;
      }
      // Handle correct data
      doc.push({ id: value, alerts: data[value], timestamp: data.timestamp });
      // Im not using _id in order to allow multiple reports for each id on the same timestamp (lets say crash and alert?)
    }
  });
  // Check for error during parsing and return desired status and message
  if (errors.length > 0) {
    res.status(428).send(`Invalid alerts number for ID ${errors}`);
    return;
  }

  try {
    dbo.collection('Robots').insertMany(doc, function (err, res) {
      if (err) throw err;
      console.log('1 document inserted');
    });
  } catch (error) {
    console.error('Error inserting to DB: ', error);
  }

  res.status(200).send('got it');
});

//Define GET request at URL (/statistics)
app.get('/statistics', async function (req, res) {
  res.send('Hello Statistics!');
});

//Launch listening server on port 3000
app.listen(port, function () {
  console.log(`app listening on port ${port}!`);
});
