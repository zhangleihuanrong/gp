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

db.getHistories(db);

app.get('/list', function(req, res) {
    var q = req.query.q || '';
    var histories = db._idHistories;
    if (q) {
        var idNames = {};
        for (var key in db._idNames) {
            var value = db._idNames[key];
            if (value && (key.includes(q) || value.includes(q))) {
                idNames[key] = value;
            }
        }
    }
    else {
        var idNames = db._idNames;
    }
    res.render('list', {  q : q, idNames: idNames, histories: histories, title: "Look look..."});
});


app.get('/history', function(req, res) {
    var id = req.query.id;
    if (id) {
        var name = db._idNames[id];
        var history = db._idHistories[id]
                    .map(x => [x[0], Number(x[5]), Number(x[1]), Number(x[2]), Number(x[6])])
                    .slice(0, 60).reverse();
        var histJson = JSON.stringify(history);
        res.render('history', {id : id, name: name, history : histJson});
    }
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
