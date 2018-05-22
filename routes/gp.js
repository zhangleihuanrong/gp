const express=require('express');
const db = require("../stk.js");

const debug=require('debug')('gp:gp');
const router=express.Router();

const moduleName='gp';

router.get('/', function (req, res, next) {
  console.log(`====Sending redirect ${req.url}  ${req.originalUrl}`);
  if (req.originalUrl.endsWith("/")) {
    res.redirect('list');
  }
  else {
    //ignore /gp such case
    next('route');
  }
});


const tableTitle = ["id", "Name", "Close", "%Chg", "Open", "Low", "Hight", "VOL(手)", "AMOUNT(万元)", "%Turnover"].map(
        function(name) { var obj = new Object(); obj.title = name; return obj;} 
    );
const tableTitleStr = JSON.stringify(tableTitle);

router.get(`/list`, function(req, res, next) {
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
    res.render(`${moduleName}/list`, {q, tableTitle: tableTitleStr, tableData: tableDataStr, title: "Look look..."});
});

router.get(`/history`, function(req, res, next) {
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
        res.render(`${moduleName}/history`, {id : id, name: name, history : histJson, win: win});
    }
});

module.exports = router;
