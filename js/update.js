chrome.runtime.onInstalled.addListener(function (details) {
    if (details.reason !== 'update' && details.previousVersion.indexOf('2') !== 0) return;
    chrome.storage.local.get(null, function (games) {
        for (var i in games) {
            if (i.indexOf('scumdar-') !== 0) continue;
            var game = games[i];
            for (var j in game.users) {
                var user = game.users[j];
                if (j.indexOf('user') !== 0) continue;
                game.users[user.id] = user;
                delete game.users[j];
            }
            for (var k in game.posts) {
                var post = game.posts[k];
                if (k.indexOf('post') !== 0) continue;
                game.posts[post.id] = post;
                delete game.posts[k];
            }
            games[game.id] = game;
            delete games[i];
            chrome.storage.local.set(games);
        }
    });
});
