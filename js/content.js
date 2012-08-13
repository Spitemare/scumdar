(function($, undefined) {
    var port;
    var game;
    var unstar = chrome.extension.getURL('img/unstar.gif');
    var star = chrome.extension.getURL('img/star.gif');

    function gup(url, name) {
        name = name.replace(/[\[]/, "\\\[").replace(/[\]]/, "\\\]");
        var regexS = '[\\?&]' + name + '=([^&#]*)';
        var regex = new RegExp(regexS);
        var results = regex.exec(url);
        if (results === null) {
            return '';
        } else {
            return results[1];
        }
    }

    function save() {
        port.postMessage({
            type: 'save',
            game: game
        });
    }

    function toggleStar($obj) {
        if ($obj.attr('star') == 'false') {
            $obj.attr('star', 'true').attr('src', star);
        } else {
            $obj.attr('star', 'false').attr('src', unstar);
        }
        save();
    }

    function toggleGameStar($game) {
        game.star = ($game.attr('star') == 'false') ? true : false;
        if (game.star) {
            $('.mafia-tools').show();
        } else {
            $('.mafia-tools').hide();
        }
        toggleStar($game);
    }

    function togglePostStar($post, postId) {
        var post = game.posts[postId] || {};
        post.id = postId;
        post.star = ($post.attr('star') == 'false') ? true : false;
        if (!post.star) {
            delete post.star;
        }
        game.posts[postId] = post;
        toggleStar($post);
    }

    function changeUserMark(mark, userId) {
        var user = game.users[userId] || {};
        user.id = userId;
        user.mark = mark;
        if (mark == 'unknown') {
            delete user.mark;
        }
        game.users[userId] = user;
        save();
        $('select.mark-user[userId="' + userId + '"]').val(mark);
    }

    function changeNote($note, postId) {
        var post = game.posts[postId] || {};
        post.id = postId;
        var note = $note.val();
        post.note = note;
        if (note.length == 0) {
            delete post.note;
            note = 'Type here to add a note';
        }
        game.posts[postId] = post;
        save();
        $note.parent().find('div.post-note').html('<i><small>' + note + '</small></i>').attr('default', 'false').show();
        $note.hide();
    }

    function inject() {
        $('td.navbar>strong').append('<img class="star-game" star="false" src=' + unstar + '></img>');
        $('img.star-game').click(function() {
            toggleGameStar($(this));
        });
        $('a[name][rel="nofollow"]').each(function(index) {
            var postId = gup($(this).attr('href'), 'p');
            var $parent = $(this).parent();
            $parent.append('<img postId="' + postId + '" class="star-post mafia-tools" star="false" src=' + unstar + '></img>');
            $parent.find('img.star-post').click(function() {
                togglePostStar($(this), postId);
            });

            var $table = $parent.parentsUntil('div[id^="edit' + postId + '"]', 'table');
            var note = '<tr class="mafia-tools">';
            if ($table.find('tr').filter(':first').find('td').length > 1) {
                note = note + '<td class="alt2" style="border: 1px solid #D1D1E1; border-top: 0px"></td>';
                $table.find('tr').filter(':last').find('td').filter(':first').css('border-bottom', '0px');
            }
            note = note + '<td class="alt1" style="border: 1px solid #D1D1E1; border-left: 0px; border-top: 0px">' +
                            '<div class="post-note" default="true" id="' + postId + '"><i><small>Type here to add a note</small></i>' +
                          '</td>';
            $table.append(note);
        });
        $('div.post-note').click(function(index) {
            var $div = $(this);
            var input = '<input type="text" class="note-input"></input>';
            $div.parent().append(input);
            $div.hide();
            var $input = $div.parent().find('input.note-input');
            if ($div.attr('default') != 'true') {
                $input.val($div.text());
            }
            $input.keyup(function(e) {
                if (e.which == 27) {
                    e.preventDefault();
                    $input.hide();
                    $div.show();
                }
            });
            $input.focus();
            $input.change(function() {
                changeNote($(this), $div.attr('id'));
            });
        });
        $('div[id^="postmenu_"]').remove('.vbmenu_popup').parent().each(function(index) {
            var $this = $(this);
            var userId = gup($this.find('a.bigusername').attr('href'), 'u');
            var userOptions = '<select userId="' + userId + '" type="select" class="mark-user mafia-tools">' +
                                '<option value="unknown">Unknown</option>' +
                                '<option value="mod">Mod</option>' +
                                '<option value="town">Town</option>' +
                                '<option value="scum">Scum</option>' +
                              '</select>';
            $this.append(userOptions);
            $this.find('select.mark-user').change(function() {
                changeUserMark($(this).val(), userId);
            });
        });
                $('table[id^="post"]>tbody').each
        if (!game.star) {
            $('.mafia-tools').hide();
        }
    }

    function restore() {
        $('img.star-game').attr('star', 'true').attr('src', star);
        for (postId in game.posts) {
            var post = game.posts[postId];
            if (post.star) {
                var $post = $('img.star-post[postId="' + post.id + '"]');
                if ($post.length > 0) {
                    $post.attr('star', 'true').attr('src', star);
                }
            }
            if (post.note) {
                $('div.post-note[id="' + post.id + '"]').html('<i><small>' + post.note + '</small></i>').attr('default', 'false');
            }
        }
        for (userId in game.users) {
            var user = game.users[userId];
            var $user = $('select.mark-user[userId="' + user.id + '"]');
            $user.each(function(index) {
                $(this).val(user.mark);
            });
        }
    }

    function list(msg) {
        $(msg.games).each(function(index, gameId) {
            var $game = $('td[id="td_threadtitle_' + gameId + '"]');
            if ($game.length > 0) {
                $game.find('span[style="float:right"]').prepend('<img src="' + star + '"></img>');
            }
        });
    }

    function init() {
        var gameId = gup($('a[href^="printthread.php?t="]').attr('href'), 't');
        port = chrome.extension.connect();
        port.onMessage.addListener(function(msg) {
            if (msg.type == 'load') {
                game = msg.game;
                inject();
                restore();
            } else if (msg.type == 'list') {
                list(msg);
            }
        });
        if (gameId != '') {
            port.postMessage({
                type: 'load',
                gameId: gameId
            });
        } else {
            port.postMessage({
                type: 'list'
            });
        }
    }

    $(document).ready(init);
}(jQuery));
