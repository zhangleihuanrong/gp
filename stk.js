"use strict";

var redis = require('redis').createClient();

redis.on("error", function(err) {
    console.error('Redis client error:', err);
});

exports._idNames = {};

exports.getIdAndNames = function (db) {
    redis.hgetall("_stockId2Name", function(err, idNames) {
        if (!err) {
            db._idNames = idNames;
        } else {
            console.error('Can not read _stockId2Name. Error:', err);
        }
    });
};