var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
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
    "ip TEXT)");
});

var imageCounter = 0;
db.each("SELECT id, uri FROM images", function (err, row) {
    imageCounter++;
});
//db.close();

server.listen(3003);
var new_location = 'uploads/';
app.use('/uploads', express.static(__dirname + '/uploads'));

app.get('/', function (req, res) {
    res.sendfile(__dirname + '/views/index.html');
});

app.get('/animation', function (req, res) {
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
                if (file_type == 'image/jpeg' || file_type == 'image/jpg') {
                    file_type = '.jpg';
                } else {
                    file_type = '.png';
                }
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
                            //.setFormat("jpg")
                            .write(new_location + imageCounter + file_type, function (err) {
                                if (err) {
                                    console.error(err);
                                } else {
                                    res.sendfile(new_location + imageCounter + file_type);
                                    animation.emit('newImage', {image: new_location + imageCounter + file_type});
                                    //add to db
                                    db.serialize(function () {
                                        var ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
                                        db.run("INSERT INTO images ('uri', 'ip') VALUES ('" + new_location + imageCounter + file_type + "','" + ip + "')");
                                    });
                                    //TODO no need to send this information though. It could be image: "added"
                                    imageCounter++;
                                    //TODO send file to
                                }
                            }
                        );
                    }
                });
            } else {
                res.end('only .jpeg, .jpg and .png.');
                //TODO send back to /
            }
        }
    });
});


var animation = io.of('/animation');
io.on('connection', function (socket) {
    console.log('There were ' + imageCounter + ' images already available in the database.');
    socket.on('getImageCount', function () {
        console.log('getImageCount ran');
        socket.emit('imageCount', {imageCount: imageCounter});
    });
    socket.on('getRandom', function (data) {
        db.each("SELECT * FROM images WHERE id=" + Math.round(Math.random()*imageCounter), function (err, row) {
            animation.emit('newImage', {id: row.id, uri: row.uri});
        });
    });

    socket.on('connection', function (socket) {
        console.log('someone connected');
    });
});