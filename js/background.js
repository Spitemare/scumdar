(function($, undefined) {
    var background = {};
    background.content = {};
    background.content.games = {};

    function saveGame(game) {
        localStorage[game.id] = JSON.stringify(game);
    }

    function loadGame(id) {
        if (localStorage[id]) {
            return JSON.parse(localStorage[id]);
        } else {
            var game = {};
            game.id = id;
            game.posts = {};
            game.users = {};
            return game;
        }
    }

    background.content.load = function(msg, port) {
        var tabId = port.sender.tab.id;
        var game = loadGame(msg.gameId);
        background.content.games[tabId] = game.id;
        // Disable this for now.
        if (false && game.star) {
            chrome.pageAction.show(tabId);
        }
        port.postMessage({
            type: 'load',
            game: game
        });
    }

    background.content.save = function(msg, port) {
        saveGame(msg.game);
        port.postMessage({
            type: 'save',
            game: msg.game
        });
    }

    background.content.list = function(msg, port) {
        var games = [];
        for (gameId in localStorage) {
            var game = loadGame(gameId);
            if (game.star) {
                games.push(game.id);
            }
        }
        port.postMessage({
            type: 'list',
            games: games
        });
    }

    background.content.disconnect = function(port) {
        delete background.content.games[port.sender.tab.id];
    }

    chrome.extension.onConnect.addListener(function(port) {
        port.onMessage.addListener(function(msg) {
            if (background[port.name][msg.type]) {
                background[port.name][msg.type](msg, port);
            }
        });
        port.onDisconnect.addListener(function() {
            if (background[port.name].disconnect) {
                background[port.name].disconnect(port);
            }
        });
    });
}(jQuery));
