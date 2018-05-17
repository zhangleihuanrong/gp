"use strict";

//#ssh -L 6379:localhost:6379 zhanglei@zhanghuanrong.southcentralus.cloudapp.azure.com

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var hbs = require('hbs')

var indexRouter = require('./routes/index');

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

var db = require("./stk.js");

db.getIdAndNames(db);

//db.getHistories(db);

var tableTitle = ["id", "Name", "Close", "%Chg", "Open", "Low", "Hight", "VOL(Hands)", "AMOUNT(￥10K)", "%Turnover"].map(
        function(name) { var obj = new Object(); obj.title = name; return obj;} 
    );
var tableTitleStr = JSON.stringify(tableTitle);

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
    var tableData=[];
    for (var gpid in idNames) {
        if (histories[gpid] && histories[gpid][0]) {
            var info = histories[gpid][0];
            tableData.push([gpid, idNames[gpid], Number(info[2]), info[4], Number(info[1]), Number(info[5]), Number(info[6]), Number(info[7]), Number(info[8]), info[9]]);
        }
        else {
            tableData.push([gpid, idNames[gpid], "", "", "", "", "", "", "", ""]);
        }
    }
    var tableDataStr = JSON.stringify(tableData);
    res.render('list', {  q : q, tableTitle: tableTitleStr, tableData: tableDataStr, title: "Look look..."});
});


app.get('/history', function(req, res) {
    var id = req.query.id;
    var win = 30;
    if (req.query.win) {
        win = req.query.win;
    }
    if (id) {
        var name = db._idNames[id];
        if (win <= 0) {
            win = db._idHistories[id].length;
        }
        var history = db._idHistories[id]
                    .map(x => [x[0], Number(x[5]), Number(x[1]), Number(x[2]), Number(x[6])])
                    .slice(0, win).reverse();
        var histJson = JSON.stringify(history);
        res.render('history', {id : id, name: name, history : histJson, win: win});
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
