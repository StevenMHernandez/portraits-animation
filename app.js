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

server.listen(3003);
var new_location = 'uploads/';
app.use('/assets', express.static(__dirname + '/assets'));
app.use('/uploads', express.static(__dirname + '/uploads'));

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/views/index.html');
});

app.get('/animation', function (req, res) {
    imageCounter = 0;
    db.each("SELECT * FROM images", function (err, row) {
        console.log(row);
        imageCounter++;
    });
    res.sendfile(__dirname + '/views/animation.html');
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
                                    res.sendfile(new_location + imageCounter + '.jpg');
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
                                    //TODO send user to Thank you location? or animation?
                                }
                            }
                        );
                    }
                });
            } else {
                res.sendfile(__dirname + '/views/error.html');
                //TODO send back to /
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
        });
        socket.emit('imageCount', {imageCount: imageCounter});
    });
});