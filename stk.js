"use strict";

var redis = require('redis').createClient();

redis.on("error", function(err) {
    console.error('Redis client error:', err);
});

exports._idNames = {};
exports._idHistories = {};

exports.getIdAndNames = function (db) {
    redis.hgetall("_stockId2Name", function(err, idNames) {
        if (!err) {
            db._idNames = idNames;
        } else {
            console.error('Can not read _stockId2Name. Error:', err);
        }
    });
};

function historySearchHandler(info) {
    return info;
}

exports.getHistories = function (db) {
    var keys = ['sz002669', 'sh601669', 'sz000669'];
    keys.forEach(function (stockId) {
        redis.get(stockId, function (err, reply) {
            var evo = eval(reply);
            db._idHistories[stockId] = evo[0].hq;
            console.log(stockId, " ==> ", db._idHistories[stockId][0].join(','));
        });
    });
}