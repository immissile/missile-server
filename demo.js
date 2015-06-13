'use strict';
var Server = require('./lib/server');

Server({
    staticRoot: './assets',
    port: 4000
});