'use strict';

var _ = require('lodash-node');
var http = require('http');
var url = require('url');
var fs = require('fs');
var path = require('path');
var mime = require('./mine').types;
var zlib = require('zlib');
var clc = require('cli-color');
var renderHtml = require('./rac');

module.exports = function(options){
    var defaults = {
        staticRoot: '.',
        port: 3333,
        defaultFile: 'index.html',
        showCache: false,
        expires: {
            fileMatch: /^(gif|png|jpg|js|css)$/ig,
            maxAge: 60*60*24*365
        },
        compress: {
            match: /css|js|html/ig
        },
        debug: false
    };

    var op = _.extend(defaults, options);

    var server = http.createServer(function (request, response) {
        var obj = url.parse(request.url);
        response.setHeader('Server', 'Node/V8');

        if (op.debug) {
            console.log(clc.yellow(obj));
        }

        var pathname = obj.pathname;
        if (pathname.slice(-1) === "/") {
            pathname = pathname + op.defaultFile;
        }
        var realPath = path.join(op.staticRoot, path.normalize(pathname.replace(/\.\./g, '')));
        console.log(clc.magenta('load file: ', realPath));
        var pathHandle = function (realPath) {
            // 获取文件
            fs.stat(realPath, function (err, stats) {
                if (err) {
                    renderList(op, request, response, function(){
                        response.writeHead(404, 'not found', {
                            'Content-Type': 'text/plain'
                        });
                        response.write('the request ' + realPath + ' is not found');
                        console.log(clc.red(clc.bold('Error: ') + realPath + ' is not found'));
                        return response.end();
                    });
                } else {
                    if (stats.isDirectory()) {
                        renderList(op, request, response)
                    } else {
                        var ext = path.extname(realPath);
                        ext = ext ? ext.slice(1) : 'unknown';
                        var contentType = mime[ext] || 'text/plain';
                        response.setHeader('Content-Type', contentType);

                        var lastModified = stats.mtime.toUTCString();
                        var ifModifiedSince = 'If-Modified-Since'.toLowerCase();
                        response.setHeader('Last-Modified', lastModified);

                        if (ext.match(op.expires.fileMatch)) {
                            var expires = new Date();
                            expires.setTime(expires.getTime() + op.expires.maxAge * 1000);
                            response.setHeader("Expires", expires.toUTCString());
                            response.setHeader('Cache-Control', 'max-age=' + op.expires.maxAge);
                        }

                        if (request.headers[ifModifiedSince] && lastModified == request.headers[ifModifiedSince]) {
                            if (op.showCache) {
                                console.log(clc.cyan('get data form brower cache'));
                            }
                            response.writeHead(304, 'Not Modified');
                            response.end();
                        } else {
                            var raw = fs.createReadStream(realPath);
                            var acceptEncoding = request.headers['accept-encoding'] || '';
                            var matched = ext.match(op.compress.match);

                            if (matched && acceptEncoding.match(/\bgzip\b/)) {
                                response.writeHead(200, 'Ok', {
                                    'Content-Encoding': 'gzip'
                                });
                                raw.pipe(zlib.createGzip())
                                    .pipe(response);
                            } else if (matched && acceptEncoding.match(/\bdeflate\b/)) {
                                response.writeHead(200, 'Ok', {
                                    'Content-Encoding': 'deflate'
                                });
                                raw.pipe(zlib.createDeflate())
                                    .pipe(response);
                            } else {
                                response.writeHead(200, 'Ok');
                                raw.pipe(response);
                            }
                        }
                    }
                }
            });

        };
        pathHandle(realPath);
    });
    server.listen(op.port);
    console.log(clc.green('missile static server runing in port:' + op.port));
};

function replaceUrl(str){
    return str.replace(/\/$/gi, '');
}
function render(res, code, html){
    var text = 'unknown';
    switch(code) {
        case 200:
            text = 'Ok';
            break;
        case 404:
            text = 'Not Found';
            break;
        case 500:
            text = 'Internal Server Error';
            break;
        default:
    }
    res.writeHead(code, text, {
        'Content-Type': code==200 ? 'text/html':'text/plain'
    });
    res.write(html);
    return res.end();
}

function renderList (op, req, res, cb) {
    var _current_dir = op.staticRoot + req.url;
    fs.readdir(_current_dir, function(er, list){
        if (er) {
            console.log(er);
            return;
        }
        if (list.length) {
            var html = renderHtml('template.html', {
                list: list,
                url: replaceUrl(req.url)
            });
            return render(res, 200, html);
        } else {
            cb && cb();
        }
    });
}
