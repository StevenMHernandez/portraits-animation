var express = require('express');
var app = require('express')();
var server = require('http').Server(app);
var io = require('socket.io')(server);

var formidable = require('formidable');
var util = require('util');
var fs = require('fs-extra');
var gm = require('gm');

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
        var temp_path = files['upload'].path;
        var file_name = files['upload'].name;

        gm(temp_path).size(function (err, value) {
            console.log(value);
            var max, min;
            value.width > value.height ? (max=value.width, min=value.height) : (max=value.height, min=value.width);


            console.log((value.width - min)/2);
            console.log((value.height - min)/2);
            console.log(min +'.'+ max);
            gm(temp_path)
                .crop(min, min , Math.round((value.width - min)/2), Math.round((value.height - min)/2))
                .sample(999)
                .resize(450, 450)
                .write(new_location + file_name, function (err) {
                    if (err) {
                        console.error(err);
                    } else {
                        console.log(new_location + file_name);
                        res.sendfile(new_location + files['upload']['name']);
                        animation.emit('news', {image: new_location + files['upload']['name']})
                    }
                }
            );
        });
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

