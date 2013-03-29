var ports = [];

chrome.extension.onConnect.addListener(function (port) {
    ports.push(port);
    port.onDisconnect.addListener(function () {
        var index = ports.indexOf(port);
        if (index != -1) ports.splice(index, 1);
    });
});

chrome.extension.onMessage.addListener(function (request, sender, callback) {
    var game = request.game;
    switch (request.type) {
        case 'save':
            var o = {};
            o[game.id] = game;
            chrome.storage.local.set(o, function () {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                } else if (callback) {
                    for (var i in ports) {
                        var port = ports[i];
                        if (port.name === game.id && 
                            port.sender.tab.id !== sender.tab.id) {
                            port.postMessage(game);
                        }
                    }
                    callback(game);
                }
            });
            break;
        case 'load':
            chrome.storage.local.get(game, function (item) {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                } else if (callback) {
                    callback(item);
                }
            });
            break;
        case 'remove':
            chrome.storage.local.remove(game.id, function () {
                if (chrome.runtime.lastError) {
                    console.log(chrome.runtime.lastError.message);
                } else if (callback) {
                    for (var i in ports) {
                        var port = ports[i];
                        if (port.name === game.id && 
                            port.sender.tab.id !== sender.tab.id) {
                            port.postMessage({});
                        }
                    }
                    callback(game);
                }
            });
            break;
        default: return false;
    }
    return true;
});
