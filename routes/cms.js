"use strict";

const debug=require('debug')('gp:cms');
debug(`++++Running js script ${__filename}...`);

const config=require('config');
const express=require('express');
const router=express.Router();

const moduleName='cms';

router.get('*', function (req, res, next) {
    debug(`  ~~CMS  ROUTE got ${req.url}  from ${req.originalUrl}`);
    next();
});

router.get('/', function (req, res, next) {
    debug(`  ~~Sending redirect ${req.url}  ${req.originalUrl}`);
    if (req.originalUrl.endsWith("/")) {
        res.redirect('docs/');
    }
    else {
        //ignore /cms without tailing /
        next('route');
    }
});

router.get('/docs/*', function (req, res, next) {
    debug(`  ~~Processing ${req.url}  ${req.originalUrl}`);
    res.render("cms/docs");
});

router.get('*', function (req, res, next) {
    debug(`  ~~CMS  ROUTE did not handles ${req.url}  from ${req.originalUrl}`);
    next();
});

module.exports = router;
