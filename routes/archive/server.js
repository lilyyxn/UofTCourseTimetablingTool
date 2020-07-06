/*
var http = require('http');
var fs = require('fs');

const PORT=8080; 

fs.readFile('./index.html', function (err, html) {

    if (err) throw err;    

    http.createServer(function(request, response) {  
        response.writeHeader(200, {"Content-Type": "text/html"});  
        response.write(html);  
        response.end();  
    }).listen(PORT);
});
*/
var express = require('express');
var app = express();
app.use(express.static(__dirname));
var port = 8000; // any
app.listen(port);
console.log('server on' + port);