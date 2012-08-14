(function($, undefined) {
    var background = {};

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

    background.load = function(msg, port) {
        var game = loadGame(msg.gameId);
        port.postMessage({
            type: 'load',
            game: game
        });
    }

    background.save = function(msg, port) {
        saveGame(msg.game);
        port.postMessage({
            type: 'save',
            game: msg.game
        });
    }

    background.list = function(msg, port) {
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

    chrome.extension.onConnect.addListener(function(port) {
        port.onMessage.addListener(function(msg) {
            background[msg.type](msg, port);
         });
    });
}(jQuery));
