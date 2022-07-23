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
  const dataList = await dbo.collection('Robots').find(query, options);

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
  crashMapSort = new Map([...crashMap.entries()].sort((a, b) => b[1] - a[1]));
  alertMinuteMapSort = new Map(
    [...alertMinuteMap.entries()].sort((a, b) => b[1] - a[1])
  );

  alertHourMapSort = new Map(
    [...alertHourMap.entries()].sort((a, b) => b[1] - a[1])
  );

  let response = {
    results: {
      crashes_last_day: Object.fromEntries(crashMapSort),
      alerts_last_minute: Object.fromEntries(
        [...alertMinuteMapSort].filter((obj, indx) => indx < 10 ?? obj.id)
      ),
      alerts_last_hour: Object.fromEntries(
        [...alertHourMapSort].filter((obj, indx) => indx < 10 ?? obj.id)
      ),
    },
  };

  res.status(200).send(response);
});

//Launch listening server on port 3000
app.listen(port, function () {
  console.log(`app listening on port ${port}!`);
});
