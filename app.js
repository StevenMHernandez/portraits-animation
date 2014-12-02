var express = require('express');
var app = require('express')();
var http = require('http');
var server = http.Server(app);
var io = require('socket.io')(server);
var formidable = require('formidable');
var util = require('util');
var fs = require('fs-extra');
var gm = require('gm').subClass({imageMagick: true});
var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('db/images.db');

db.serialize(function () {
    db.run("CREATE TABLE IF NOT EXISTS images (" +
    "id INTEGER PRIMARY KEY AUTOINCREMENT, " +
    "uri TEXT, " +
    "ip TEXT," +
    "location TEXT," +
    "timestamp DATE DEFAULT CURRENT_TIMESTAMP)");
});

var imageCounter;
imageCounter = 0;

db.each("SELECT * FROM images", function (err, row) {
    imageCounter++;
});

server.listen(3003);
var new_location = 'uploads/';
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/uploads', express.static(__dirname + '/uploads'));

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/views/index.html');
});

app.get('/animation', function (req, res) {
    res.sendfile(__dirname + '/views/animation.html');
});

app.get('/uploaded', function (req, res) {
    res.sendfile(__dirname + '/views/uploaded.html');
});

app.get('/map', function (req, res) {
    //based on
    res.sendfile(__dirname + '/views/map.html');
});

//app.get('/map_2', function (req, res) {
//    var markers = '';
//
//    db.each("SELECT * FROM images", function (err, row) {
//        if(row['ip'] != 'undefined'){
//            var url = 'http://freegeoip.net/json/' + row['ip'];
//            http.get(url, function(res) {
//                body = '';
//                res.on('data', function (chunk) {
//                    body += chunk;
//                });
//                res.on('end', function() {
//                    var location = JSON.parse(body);
//                    var lat = location.latitude;
//                    var lon = location.longitude;
//                    markers += "['<a href=\"" + row['uri'] + "\">" + row['id'] + "</a>', " + lat + ", " + lon + ", 4],";
//                    console.log('ttttiiii: ' + markers);
//                });
//            }).on('error', function(e) {
//                console.log("Got error: ", e);
//            });
//        }
//    },function() {
//        res.send(markers);
//    });
//});

app.get('/database', function (req, res) {
    var test = '';
    db.serialize(function () {
        db.each("SELECT * FROM images", function (err, row) {
            test = test + '<tr>' +
            '<td>' + row['id'] + '</td>' +
            '<td><a href="' + row['uri'] + '"><img src="' + row['uri'] + '"/></a></td>' +
            '<td><a target="_blank" href="http://freegeoip.net/xml/' + row['ip'] + '">' + row['ip'] + '</a></td>' +
            '<td>' + row['timestamp'] + '</td>' +
            '</tr>';
        },function(){
            res.send(
                '<!DOCTYPE html>' +
                '<html>' +
                '<head>' +
                '<title>Uploaded Images Database</title>' +
                '<style>' +
                '* {' +
                'padding: 9px;' +
                'box-sizing: border-box;' +
                '}' +
                'table {' +
                'width: 100%;' +
                'border-top: 1px solid black;' +
                'border-left: 1px solid black;' +
                'font-family: sans-serif' +
                '}' +
                'th, td {' +
                'border-bottom: 1px solid black;' +
                'border-right: 1px solid black;' +
                '}' +
                'img{' +
                'max-width:100%;' +
                '}' +
                '</style>' +
                '</head>' +
                '<body><table>' +
                '<tr><th>id</th><th>Images</th><th>User_IP</th><th>Timestamp</th></tr>' +
                '<tr>*any images not showing up have been removed.<br/>' +
                'Add an underscore "_" to the filename to view them ex: "_14.jpg</tr>' + test + '</table></body></html>'
            )
        });
    });
});

app.post('/upload', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        if (err) {
            console.log('formParseError::' + err);
        } else {
            var temp_path = files['upload'].path;
            var file_type = files['upload'].type;
            if (file_type == 'image/jpeg' || file_type == 'image/jpg' || file_type == 'image/png') {
                gm(temp_path).size(function (err, value) {
                    if (err) {
                        console.log('gm::' + err);
                    } else {
                        var max, min;
                        value.width > value.height ? (max = value.width, min = value.height) : (max = value.height, min = value.width);

                        gm(temp_path)
                            .crop(min, min, Math.round((value.width - min) / 2), Math.round((value.height - min) / 2))
                            .sample(999)
                            .resize(450, 450)
                            .setFormat("jpg")
                            .write(new_location + imageCounter + '.jpg', function (err) {
                                if (err) {
                                    console.error(err);
                                } else {
                                    res.redirect('/uploaded?img=' + imageCounter + '.jpg');
                                    //res.sendfile(new_location + imageCounter + '.jpg');
                                    animation.emit('newImage', {
                                        uri: new_location + imageCounter + '.jpg',
                                        imageCount: imageCounter
                                    });
                                    //add to db
                                    db.serialize(function () {
                                        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                                        db.run("INSERT INTO images ('uri', 'ip') VALUES ('" + new_location + imageCounter + ".jpg','" + ip + "')");
                                    });
                                    imageCounter++;
                                }
                            }
                        );
                    }
                });
            } else {
                res.sendfile(__dirname + '/views/error.html');
            }
        }
    });
});

var animation = io.of('/animation');
io.on('connection', function (socket) {
    socket.on('getImageCount', function () {
        imageCounter = 0;
        db.each("SELECT * FROM images", function (err, row) {
            console.log(row);
            imageCounter++;
            socket.emit('imageCount', {imageCount: imageCounter});
        });
    });
});