var express = require('express');
var app = express();
app.use(express.json({ type: '*/*' }));

//Define port
var port = 3000;

//Define request response in root URL (/)
app.post('/', function (req, res) {
  const data = req.body;
  console.log('POST: ', data);
  if (!data?.timestamp) {
    res.send('No timestamp was provided!');
    return;
  }

  res.send('Hello World!');
});

app.get('/statistics', function (req, res) {
  res.send('Hello Statistics!');
});

//Launch listening server on port 3000
app.listen(port, function () {
  console.log(`app listening on port ${port}!`);
});
