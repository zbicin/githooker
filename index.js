var crypto = require('crypto');
var http = require('http');
var exec = require('child_process').exec;
var config = require('./config.json');

var hostname = config.hostname || '0.0.0.0';
var port = config.port || 3000;
var url = config.url || '/update';

var isPending = false;
var server = http.createServer();

server.on('request', onRequest);

server.listen(port, hostname, function onListen() {
    log('Githooker is listening on port ' + port + '...');
});

function doUpdate(githubMessage) {
    log(githubMessage.pusher.name + ' triggered update. Head will be at "' + githubMessage.head_commit.message + '" now.');

    for (var i = 0; i < config.steps.length; i++) {
        var step = config.steps[i];
        log('Executing step #' + i + ' - ' + step);
        exec(step, execCallback);
    }

    log('Update done.');
}

function execCallback(error, stdout, stderr) {
    if (stdout) log(stdout);
    if (stderr) log(stderr);
    if (error) log(error);
}

function handleError(errorMessage, response) {
    if (response) {
        response.status = 400;
        response.end();
        log('400 - ' + errorMessage + '.');
    } else {
        log(errorMessage);
    }
}

function log(what) {
    console.log(new Date().toJSON() + ' ' + what);
}

function onRequest(request, response) {
    log('Incoming request ' + request.method + ' ' + request.url + '.');

    try {
        if (request.url !== config.url) throw 'Incorrect url';
        if (request.method !== 'POST') throw 'Incorrect method';

        var body = [];
        request
            .on('data', function onData(chunk) { body.push(chunk); })
            .on('end', function onDataEnd() {
                try {
                    var githubMessage = JSON.parse(Buffer.concat(body).toString());

                    if (!validateSecret(request, githubMessage)) throw 'Incorrect secret';
                    if (isPending) throw 'Update already pending';

                    isPending = true;
                    doUpdate(githubMessage);
                    isPending = false;

                    response.end('👌');
                }
                catch (errorMessage) {
                    handleError(errorMessage, response);
                }
            });
    }
    catch (errorMessage) {
        handleError(errorMessage, response);
    }
}

function validateSecret(request, githubMessage) {
    var blob = JSON.stringify(githubMessage);
    var hmac = crypto.createHmac('sha1', config.secret);
    var ourSignature = 'sha1=' + hmac.update(blob).digest('hex');
    var theirSignature = request.headers['x-hub-signature'];
    var bufferA = Buffer.from(ourSignature, 'utf8');
    var bufferB = Buffer.from(theirSignature, 'utf8');

    return crypto.timingSafeEqual(bufferA, bufferB);
}
