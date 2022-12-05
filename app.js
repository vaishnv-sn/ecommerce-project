var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('express-handlebars');
var session = require('express-session');
var bodyParser = require('body-parser')

var db = require('./config/connection');

var app = express();

// exporting routes
var adminsRouter = require('./routes/admin');
var usersRouter = require('./routes/user');


// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// setting default layout in hbs
app.engine('hbs', hbs.engine({
  extname: 'hbs',
  defaultLayout: 'layout',
  layoutsDir: __dirname + '/views/layout/',
  partialsDir: __dirname + '/views/layout/partials/',
  helpers: {
    inc: function (value) {
      return parseInt(value) + 1;
    },
    multiply: function (item1, item2) {
      return item1 * item2
    }
  }

}))


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// setting cookie and session
app.use(session({
  secret: 'key',
  cookie: {
    maxAge: 600000
  },
  saveUninitialized: true,
  resave: true
}));

db.connect((err) => {
  if (err) console.log(`DB connection failed ${err}`);
  else console.log(`DB connection successful`);
})

app.use('/', usersRouter);
app.use('/admin', adminsRouter);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  next(createError(404));
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
