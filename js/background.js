(function($, undefined) {
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

    function load(port, msg) {
        var game = loadGame(msg.gameId);
        port.postMessage({
            type: 'load',
            game: game
        });
    }

    function save(port, msg) {
        saveGame(msg.game);
        port.postMessage({
            type: 'save',
            game: msg.game
        });
    }

    function list(port, msg) {
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
            if (msg.type == 'load') {
                load(port, msg);
            } else if (msg.type == 'save') {
                save(port, msg);
            } else if (msg.type == 'list') {
                list(port, msg);
            }
        });
    });
}(jQuery));
