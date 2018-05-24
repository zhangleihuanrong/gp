"use strict";

//#ssh -L 6379:localhost:6379 zhanglei@zhanghuanrong.southcentralus.cloudapp.azure.com

const debug = require('debug')('gp:app');
debug(`++++Running js script ${__filename}...`);

const path = require('path');
const config =require('config');
const createError = require('http-errors');
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const hbs = require('hbs')

for (let i = 0; i < config.initialUsers.length; i++) {
  debug(`  --User `, config.initialUsers[i]);
}

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

const indexRouter = require('./routes/index');
app.use('/', indexRouter);

const gpRoute = require('./routes/gp');
app.use('/gp/', gpRoute);

const cmsRoute = require('./routes/cms');
app.use('/cms/', cmsRoute);

const apiRoute = require('./routes/api');
app.use('/api/', apiRoute);

app.use(express.static(path.join(__dirname, 'public')));

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
