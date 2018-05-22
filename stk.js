"use strict";

var redis = require('redis').createClient();

redis.on("error", function(err) {
    console.error('Redis client error:', err);
});

const _idNames = {};
const _idHistories = {};

// used by the eval(reply) on redis retrun
function historySearchHandler(info) {
    return info;
}

function getHistory(keys, i) {
    if (i < keys.length) {
        var stockId = keys[i];
        redis.get(stockId, function (err, reply) {
            if (!err) {
                try {
                    var evo = eval(reply);
                    _idHistories[stockId] = evo[0].hq;
                }
                catch (ex) {
                    console.log(stockId, " ", ex, " when parsing ", reply);
                    _idHistories[stockId] = null;
                }
            }
            else {
                console.error("Error get history from redis on:" + stockId);
            }
            getHistory(keys, i+1);
        });
    }
}

function getHistories() {
    var keys = [];
    for (let stockId in _idNames) {
        keys.push(stockId);
    }
    getHistory(keys, 0);
}

function getIdAndNames() {
    redis.hgetall("_stockId2Name", function(err, idNames) {
        if (idNames) {
            for (let k in idNames) {
                _idNames[k] = idNames[k];
            }
            getHistories();
        } else {
            console.error('Can not read _stockId2Name. Error:', err);
        }
    });
};

getIdAndNames();

exports._idNames = _idNames;
exports._idHistories = _idHistories;
