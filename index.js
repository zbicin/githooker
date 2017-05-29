var http = require('http');
var exec = require('child_process').exec;
var config = require('./config.json');

var hostname = config.hostname || '0.0.0.0';
var port = config.port || 3000;
var url = config.url || '/update';

var isPending = false;
var server = http.createServer();

server.on('listen', onListen);
server.on('request', onRequest);

server.listen(port, hostname);

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

function onListen() {
    log('Githooker is listening on port ' + port + '...');
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

                    if (githubMessage.secret !== config.secret) throw 'Incorrect secret';
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