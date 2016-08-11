'use strict';
var Server = require('./lib/server');

Server({
    staticRoot: __dirname + '/assets',
    port: 4001
});
