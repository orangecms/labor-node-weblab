var conf = require('./config.js');

var express        = require('express');
var compress       = require('compression');
var methodOverride = require('method-override');
var app            = express();
    http    = require('http'),
    server  = http.createServer(app);

var oneDay = 86400000;

app.use(methodOverride());
app.use(compress());
app.use(express.static(__dirname + '/public', { maxAge: oneDay }));

// jade setup
app.set('views', __dirname + '/views')
app.set('view engine', 'jade'); // Set jade as default render engine
app.locals.pretty = true; // format output of jade

app.get('/', function(req, res) {
	res.render('desktop', {pagetitle: "Webinterface",
			       rooms: conf.rooms,
			      });
});

app.get('/mobile', function(req, res) {
	res.render('mobile', {pagetitle: "Webinterface",
			      rooms: conf.rooms,
			     });
});

server.listen(conf.global.httpport, '::');

exports.server = server;
