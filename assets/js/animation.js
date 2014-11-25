var $canvas = $('canvas')[0];
var ctx = $canvas.getContext("2d");

setInterval(function () {
    var randomImage = Math.round(Math.random() * imageCount);
    var img = $('img')[randomImage];
    var x = Math.random()*450;
    var width = Math.random() * (450 - x);
    ctx.drawImage(img,x,0,width,450,x+(Math.random()*99)-45,0,width+(Math.random()*99)-45,450);
}, 9);