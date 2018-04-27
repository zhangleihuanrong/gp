"use strict";

var redis = require('redis').createClient();

redis.on("error", function(err) {
    console.error('Redis client error:', err);
});

exports._idNames = {};
exports._idHistories = {};

// used by the eval(reply) on redis retrun
function historySearchHandler(info) {
    return info;
}

function getHistory(keys, i, db) {
    if (i < keys.length) {
        var stockId = keys[i];
        redis.get(stockId, function (err, reply) {
            if (!err) {
                try {
                    var evo = eval(reply);
                    db._idHistories[stockId] = evo[0].hq;
                }
                catch (ex) {
                    console.log(stockId, " ", ex, " when parsing ", reply);
                    db._idHistories[stockId] = null;
                }
            }
            else {
                console.error("Error get history from redis on:" + stockId);
            }
            getHistory(keys, i+1, db);
        });
    }
}

function getHistories(db) {
    var keys = [];
    for (var stockId in db._idNames) {
        keys.push(stockId);
    }
    getHistory(keys, 0, db);
}

exports.getIdAndNames = function (db) {
    redis.hgetall("_stockId2Name", function(err, idNames) {
        if (idNames) {
            db._idNames = idNames;
            getHistories(db);
        } else {
            console.error('Can not read _stockId2Name. Error:', err);
        }
    });
};


