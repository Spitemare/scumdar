(function($, undefined) {
    var port;
    var popup = {};

    popup.load = function(msg) {
        var game = msg.game;
        console.log(game);
        $('#title>span.content').text(game.title);

        for (postId in game.posts) {
            var post = game.posts[postId];
            if (post.star) {
                $('#posts>span.content').append('<a href="http://forums.mtgsalvation.com/showpost.php?p=' +
                    post.id + '&postcount=' + post.number + '" target="_blank">#' + post.number +
                    '</a> by ' + post.author + '<br/>').parent().show();
            }
        }

        for (userId in game.users) {
            var user = game.users[userId];
            if (user.mark == 'town') {
                $('#town>span.content').append(user.name + '<br/>').parent().show();
            } else if (user.mark == 'scum') {
                $('#scum>span.content').append(user.name + '<br/>').parent().show();
            }
            if (user.dead) {
                $('#dead>span.content').append(user.name + '<br/>').parent().show();
            }
            if (user.replacement !== undefined && user.replacement.length > 0) {
                $('#replaced>span.content').append(user.name + ' replaced by ' + user.replacement + '<br/>').parent().show();
            }
        }
    }

    function init() {
        port = chrome.extension.connect({
            name: 'popup'
        });
        port.onMessage.addListener(function(msg) {
            if (popup[msg.type]) {
                popup[msg.type](msg);
            }
        });
        port.postMessage({
            type: 'load'
        });
    }

    $(document).ready(init);
}(jQuery));
