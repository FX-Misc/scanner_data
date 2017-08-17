var requestSync = require("sync-request"),
    fs = require("fs");

const dstPath = "../crypto.json";

var scanResp = requestSync("POST", "http://scanner.tradingview.com/crypto/scan2", {
    json: {
        sort: {
            sortBy: "volume",
            sortOrder: "desc"
        },
        filter: [
            {
                left: "volume",
                operation: "nempty"
            },
            {
                left: "name",
                operation: "match",
                right: "USD$|BTC$"
            }]
    }
});
if (scanResp.statusCode != 200) {
    throw Error(scanResp.statusCode);
}

var coinMktCapResp = requestSync("GET", "https://api.coinmarketcap.com/v1/ticker/");
if (coinMktCapResp.statusCode != 200) {
    throw Error(coinMktCapResp.statusCode);
}

function getFirstCurrency(ticker) {
    return ticker.substring(0, ticker.length - 3);
}

var tickers = {};
var selectedSymbols = {};
JSON.parse(scanResp.getBody()).symbols.forEach(function (s) {
    var ticker = s.s.split(':')[1];
    if (!tickers[ticker]) {
        tickers[ticker] = ticker;
        var token = getFirstCurrency(ticker);
        var ss = selectedSymbols[token] || [];
        ss.push(s.s);
        selectedSymbols[token] = ss;
    }
});

var currencyMapping = {
    "BTU": "BCU",
    "MIOTA": "IOT",
    "XLM": "STR",
    "USNBT": "NBT"
};

var dstSymbols = [];
JSON.parse(coinMktCapResp.getBody()).forEach(function (s) {
    var key = s.symbol;
    var sym = selectedSymbols[key];
    if (!sym) {
        key = currencyMapping[s.symbol];
        sym = selectedSymbols[key];
    }
    if (sym) {
        if (sym.length === 2) {
            sym.forEach(function (s1) {
                dstSymbols.push({
                    s: s1,
                    f: [s.name]
                });
            });
        }

        delete selectedSymbols[key];
    }
});

for (var s in selectedSymbols) {
    console.warn("Symbol " + s + " not mapped!");
}

fs.writeFileSync(dstPath, JSON.stringify({
    "time": new Date().toISOString() + '',
    "fields": ["sector"],
    "symbols": dstSymbols
}, null, 2));