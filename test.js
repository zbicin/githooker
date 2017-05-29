var http = require('http');
var config = require('./config.json');

var postData = {
    'head_commit': {
        message: 'Top of the world'
    },
    pusher: {
        name: 'John Doe'
    },
    secret: config.secret    
};

var options = {
  hostname: config.ip || 'localhost',
  port: config.port || 3000,
  path: config.url || '/update',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

http.request(options, (response) => {
  var isOk = response.statusCode === 200;
  if(isOk) {
      console.log('Received 200, everything seems ok.');
      process.exit(0);
  }
  else {
      console.log('Test failed. Received ' + response.statusCode + '.');
      process.exit(1);
  }
}).end(JSON.stringify(postData));