var express = require('express');
var app = express();
app.use(express.json({ type: '*/*' }));

//Define server port
const serverPort = 3000;

// Database Connection
const mongoClient = require('mongodb').MongoClient;
const MongoURL = 'mongodb://mongodb:27017/';
let dbConnection;
mongoClient.connect(MongoURL, function (err, db) {
  if (err) throw err;
  dbConnection = db.db('skyline');
});

// serverPort, MongoURL should be in .env or .yml file

//Define POST request root URL (/)
// Request Body will contain list of robots with alerts/crashes and timestamp
app.post('/', function (req, res) {
  let errors = [];
  const data = req.body;
  let doc = [];
  console.log('POST: ', data);
  // Data validation - contains timestamp
  if (!data?.timestamp) {
    res.status(428).send('No timestamp was provided!');
    return;
  }
  Object.keys(data).map((value) => {
    // I Don't want to query the timestamp
    if (value != 'timestamp') {
      // Data validation - invalid
      if (data[value] < -1 || value.length != 4) {
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
    res.status(428).send(`Error with ID ${errors}`);
    return;
  }

  try {
    dbConnection.collection('Robots').insertMany(doc, function (err, res) {
      if (err) throw err;
      console.log('1 document inserted');
    });
  } catch (error) {
    console.error('Error inserting to DB: ', error);
  }

  res.status(200).send('Data received successfully');
});

//Define GET request at URL (/statistics)
app.get('/statistics', async function (req, res) {
  const timestampInSeconds = Math.floor(Date.now() / 1000);

  const secInMin = 60;
  const secInHour = 60 * 60;
  const secInDay = 60 * 60 * 24;

  console.log('timestampInSeconds: ', timestampInSeconds);

  // Map for each required data
  let crashMap = new Map();
  let alertMinuteMap = new Map();
  let alertHourMap = new Map();

  // Getting all info for the last 24 hours
  const query = { timestamp: { $gt: timestampInSeconds - secInDay } };
  const options = {
    sort: { id: 1 },
  };
  const dataList = await dbConnection.collection('Robots').find(query, options);

  if ((await dataList.count()) === 0) {
    console.log('No documents found!');
  }

  // Iterating over received document
  await dataList.forEach((data) => {
    // last minute and only alerts -> add to alertMinuteMap
    if (data.timestamp > timestampInSeconds - secInMin && data.alerts != -1) {
      if (alertMinuteMap.has(data.id)) {
        alertMinuteMap.set(
          data.id,
          parseInt(alertMinuteMap.get(data.id)) + parseInt(data.alerts)
        );
      } else {
        alertMinuteMap.set(data.id, data.alerts);
      }
    }

    // last hour and only alerts -> add to alertHourMap
    if (data.timestamp > timestampInSeconds - secInHour && data.alerts != -1) {
      if (alertHourMap.has(data.id)) {
        alertHourMap.set(
          data.id,
          parseInt(alertHourMap.get(data.id)) + parseInt(data.alerts)
        );
      } else {
        alertHourMap.set(data.id, parseInt(data.alerts));
      }
    }

    // last day and only crashes -> add to crashMap
    if (data.timestamp > timestampInSeconds - secInDay && data.alerts == '-1') {
      if (crashMap.has(data.id)) {
        crashMap.set(data.id, parseInt(crashMap.get(data.id)) + 1);
      } else {
        crashMap.set(data.id, 1);
      }
    }
  });

  // sorting map to get top results
  crashMap = new Map([...crashMap.entries()].sort((a, b) => b[1] - a[1]));
  alertMinuteMap = new Map(
    [...alertMinuteMap.entries()].sort((a, b) => b[1] - a[1])
  );
  alertHourMap = new Map(
    [...alertHourMap.entries()].sort((a, b) => b[1] - a[1])
  );

  let response = {
    results: {
      crashes_last_day: Object.fromEntries(crashMap),
      alerts_last_minute: Object.fromEntries(
        [...alertMinuteMap].filter((obj, indx) => indx < 10 ?? obj.id)
      ),
      alerts_last_hour: Object.fromEntries(
        [...alertHourMap].filter((obj, indx) => indx < 10 ?? obj.id)
      ),
    },
  };

  res.status(200).send(response);
});

//Launch listening server on port 3000
app.listen(serverPort, function () {
  console.log(`app listening on port ${serverPort}!`);
});
