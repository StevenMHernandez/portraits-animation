var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var formidable = require('formidable');
var util = require('util');
var fs = require('fs-extra');
var gm = require('gm').subClass({ imageMagick: true });

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database(':memory:');
//TODO change from :memory: ??

//db.serialize(function () {
//    db.run("CREATE TABLE lorem (info TEXT)");
//
//    var stmt = db.prepare("INSERT INTO lorem VALUES (?)");
//    for (var i = 0; i < 10; i++) {
//        stmt.run("dd " + i);
//    }
//    stmt.finalize();
//
//    db.each("SELECT rowid AS id, info FROM lorem", function (err, row) {
//        console.log(row.id + ": " + row.info);
//    });
//});
//
//db.close();
var imageCounter = 0;
//TODO replace with db count

server.listen(3003);
var new_location = 'uploads/';
app.use('/uploads', express.static(__dirname + '/uploads'));

app.get('/', function (req, res) {

    res.sendfile(__dirname + '/views/index.html');
});

app.get('/animation', function (req, res) {
    res.sendfile(__dirname + '/views/animation.html');
    //TODO add counter number some how.
});

app.post('/upload', function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, files) {
        if(err){
            console.log('formParseError::' + err);
        }
        var temp_path = files['upload'].path;
        var file_type = files['upload'].type;

        if (file_type == 'image/jpeg' || file_type == 'image/jpg' || file_type == 'image/png') {
            if (file_type == 'image/jpeg' || file_type == 'image/jpg') {
                file_type = '.jpg';
            }
            else {
                file_type = '.png';
            }
            gm(temp_path).size(function (err, value) {
                if(err){
                    console.log('gm::' + err);
                }
                console.log(value);
                var max, min;
                value.width > value.height ? (max = value.width, min = value.height) : (max = value.height, min = value.width);
                gm(temp_path)
                    .crop(min, min, Math.round((value.width - min) / 2), Math.round((value.height - min) / 2))
                    .sample(999)
                    .resize(450, 450)
                    .write(new_location + imageCounter + file_type, function (err) {
                        if (err) {
                            console.error(err);
                        } else {
                            imageCounter++;
                            console.log(files['upload']);
                            res.sendfile(new_location + imageCounter + file_type);
                            animation.emit('news', {image: new_location + files['upload']['name']})
                        }
                    }
                );
            });
        }
        else {
            res.end('only jpeg, jpg and png');
            //TODO send back to /
        }
    });
});


var animation = io.of('/animation');
io.on('connection', function (socket) {
    socket.emit('news', {hello: 'world'});
    socket.on('my other event', function (data) {
        console.log(data);
    });

    animation.on('connection', function (socket) {
        console.log('someone connected');
    });
    animation.emit('hi', 'everyone!');
});

