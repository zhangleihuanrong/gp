"use strict";

//#ssh -L 6379:localhost:6379 zhanglei@zhanghuanrong.southcentralus.cloudapp.azure.com

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('hbs')

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

var db = require("./stk.js");

db.getIdAndNames(db);

app.get('/list/:query?', function(req, res) {
  var idNames = db._idNames;
  if (req.params.query) {
        var query = req.params.query;
        var filteredIdNames = {};
        for (var key in idNames) {
            var value = idNames[key];
            if (value && (key.includes(query) || value.includes(query))) {
                filteredIdNames[key] = value;
            }
        }
    }
    else {
        var filteredIdNames = idNames;
    }
    res.render('list', { idNames: filteredIdNames});
});

app.get('/history/:id', function(req, res) {
  res.send('id=' + req.params.id);
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
