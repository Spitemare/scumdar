(function($, undefined) {
    var port;
    var game;
    const unstar = chrome.extension.getURL('img/unstar.png');
    const star = chrome.extension.getURL('img/star.png');
    const downArrow = chrome.extension.getURL('img/arrow_down.png');
    const plus = chrome.extension.getURL('img/plus.png');
    const minus = chrome.extension.getURL('img/minus.png');
    var content = {};

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
        port.postMessage({
            type: 'togglePageAction',
            star: $obj.attr('star') == 'true'
        });
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

    function getPostNumber($post, postId) {
        return $post.parent().find('a[id="postcount' + postId + '"]>strong').text();
    }

    function getPostAuthor($post) {
        return $post.parentsUntil('table', 'tbody').find('a.bigusername').text();
    }

    function togglePostStar($post, postId) {
        var post = game.posts[postId] || {};
        post.id = postId;
        post.number = getPostNumber($post, postId);
        post.author = getPostAuthor($post);
        post.star = ($post.attr('star') == 'false') ? true : false;
        if (!post.star) {
            delete post.star;
        }
        game.posts[postId] = post;
        toggleStar($post);
    }

    function getUserName(userId) {
        return $('a.bigusername[userId="' + userId + '"]').filter(':first').text();
    }

    function changeUserMark(mark, userId) {
        var user = game.users[userId] || {};
        user.id = userId;
        user.name = getUserName(userId);
        user.mark = mark;
        if (mark == 'unknown') {
            delete user.mark;
        }
        game.users[userId] = user;
        save();
        $user = $('select.mark-user[userId="' + userId + '"]');
        $user.val(mark);
        colorizeUserMark(mark, $user);
    }

    function colorizeUserMark(mark, $user) {
        $user.removeClass().addClass('mark-user mafia-tools');
        if (mark == 'unknown') {
            return;
        }
        $user.addClass('color-' + mark)
    }

    function changePostNote($note, postId) {
        var post = game.posts[postId] || {};
        post.id = postId;
        var note = $note.val();
        post.note = note;
        if (note.length == 0) {
            delete post.note;
            note = 'Post note';
        }
        game.posts[postId] = post;
        save();
        $note.parent().find('div.post-note').html('<i><small>' + note + '</small></i>').attr('default', post.note ? 'false' : 'true').show();
        $note.remove();
    }

    function changeUserNote($note, userId) {
        var user = game.users[userId] || {};
        user.id = userId;
        user.name = getUserName(userId);
        var note = $note.val();
        user.note = note;
        if (note.length == 0) {
            delete user.note;
            note = 'User note';
        }
        game.users[userId] = user;
        save();
        $('div.user-note[userId="' + userId + '"]').html('<i><small>' + note + '</small></i>').attr('default', user.note ? 'false' : 'true').show();
        $note.remove();
    }

    function addPoints(points, userId) {
        var user = game.users[userId] || {};
        if (user.points === undefined) {
            user.points = 0;
        }
        if (user.points == 25 && points > 0) {
            return;
        }
        if (user.points == -25 && points < 0) {
            return;
        }
        user.id = userId;
        user.name = getUserName(userId);
        user.points = user.points + points;
        game.users[userId] = user;
        save();
        $('span.tracker-total[userId="' + userId + '"]').each(function(index) {
            var $this = $(this);
            $this.text(user.points);
            colorizePoints($this);
        });
    }

    function colorizePoints($points) {
        var val = $points.text();
        if (val == 0) {
            $points.css('color', 'black');
            return;
        }
        var norm = (Math.abs(val) + 25) / 50;
        var rgb;
        var round = Math.round(norm * 255);
        if (val < 0) {
            rgb = 'rgb('+round+',0,0)';
        } else {
            rgb = 'rgb(0,0,'+round+')';
        }
        $points.css('color', rgb);
    }

    function replaceUser(name, userId) {
        var user = game.users[userId] || {};
        user.id = userId;
        user.name = getUserName(userId);
        var $parent = $('a.bigusername[userId="' + userId + '"]').parent();
        var $replacement = $parent.parent().find('div.replacement');
        var replacement = prompt('Who replaced ' + name + '?');
        if (replacement != null && replacement.length > 0) {
            user.replacement = replacement;
        } else {
            delete user.replacement;
            $replacement.remove();
            return;
        }
        game.users[userId] = user;
        save();
        if ($replacement.length == 0) {
            var text = '<div class="mafia-tools smallfont replacement">Replaced by ' + replacement + '</div>';
            $parent.after(text);
        } else {
            $replacement.text('Replaced by ' + replacement);
        }
    }

    function toggleDeadUser(userId) {
        var user = game.users[userId] || {};
        user.dead = !user.dead;
        user.id = userId;
        user.name = getUserName(userId);
        game.users[userId] = user;
        save();
        if (user.dead) {
            $('a.bigusername[userId="' + userId + '"]').addClass('dead');
        } else {
            $('a.bigusername[userId="' + userId + '"]').removeClass('dead');
        }
    }

    function inject() {
        var $title = $('td.navbar>strong');
        game.title = $title.text();
        $title.append('<img class="star-game pointer" star="false" src=' + unstar + '></img>');
        $('img.star-game').click(function() {
            toggleGameStar($(this));
        });
        $('a[name][rel="nofollow"]').each(function(index) {
            var postId = gup($(this).attr('href'), 'p');
            var $parent = $(this).parent();
            $parent.append('<img postId="' + postId + '" class="star-post mafia-tools pointer" star="false" src=' + unstar + '></img>');
            $parent.find('img.star-post').click(function() {
                togglePostStar($(this), postId);
            });

            $parent.parentsUntil('table', 'tbody').find('a[href^="editpost.php"]').click(function(e) {
                if (game.star) {
                    alert('Editing posts in mafia is forbidden. Be careful.');
                }
            });

            var $table = $parent.parentsUntil('div[id^="edit' + postId + '"]', 'table');
            var note = '<tr class="mafia-tools">';
            if ($table.find('tr').filter(':first').find('td').length > 1) {
                note = note + '<td class="alt2" style="border: 1px solid #D1D1E1; border-top: 0px"></td>';
                $table.find('tr').filter(':last').find('td').filter(':first').css('border-bottom', '0px');
            }
            note = note + '<td class="alt1" style="border: 1px solid #D1D1E1; border-left: 0px; border-top: 0px">' +
                            '<div class="post-note" default="true" id="' + postId + '"><i><small>Post note</small></i>' +
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
                changePostNote($(this), $div.attr('id'));
            });
        });
        $('div[id^="postmenu_"]').filter(':not(.vbmenu_popup)').parent().each(function(index) {
            var $this = $(this);
            var $user = $this.find('a.bigusername');
            var userId = gup($user.attr('href'), 'u');
            $user.attr('userId', userId);

            var pointTracker = '<div class="mafia-tools point-tracker">' +
                                    '<img class="plus-tracker pointer" src="' + plus + '"></img> ' +
                                    '<span class="tracker-total" userId="' + userId + '">0</span> ' +
                                    '<img class="minus-tracker pointer" src="' + minus + '"></img>' +
                               '</div>';
            $this.append(pointTracker);
            $this.find('.plus-tracker').click(function() {
                addPoints(1, userId);
            });
            $this.find('.minus-tracker').click(function() {
                addPoints(-1, userId);
            });

            var userOptions = '<select userId="' + userId + '" type="select" class="mark-user mafia-tools">' +
                                '<option value="unknown">Unknown</option>' +
                                '<option value="mod">Mod</option>' +
                                '<option value="town">Town</option>' +
                                '<option value="scum">Scum</option>' +
                                '<option value="neutral">Neutral</option>' +
                                '<option value="cult">Cult</option>' +
                                '<option value="sk">Serial Killer</option>' +
                                '<option value="other">Other</option>' +
                              '</select>';
            $this.append(userOptions);
            $this.find('select.mark-user').change(function() {
                changeUserMark($(this).val(), userId);
            });

            $this.find('select.mark-user[userId="' + userId + '"]').after('<div class="mafia-tools user-note" userId="' + userId +'"><i><small>User note</small></i>');
            $this.find('div.user-note').click(function(index) {
                var $div = $(this);
                var input = '<textarea rows="5" class="user-note" placeholder="Ctrl+Enter to save" default="true" userId="' + userId + '"></textarea>';
                $div.after(input);
                $div.hide();
                var $input = $div.parent().find('textarea.user-note');
                if ($div.attr('default') != 'true') {
                    $input.val($div.text());
                }
                $input.keyup(function(e) {
                    if (e.which == 27) {
                        e.preventDefault();
                        $input.hide();
                        $div.show();
                    } else if (e.which == 13 && event.ctrlKey) {
                        changeUserNote($(this), $div.attr('userId'));
                    }
                });
                $input.change(function() {
                    changeUserNote($(this), $div.attr('userId'));
                });
                $input.focus();
            });

            $this.find('select.mark-user[userId="' + userId + '"]').after('<span class="mafia-tools"><img class="menu-arrow pointer" src="' + downArrow + '"></img></span>');
            $this.find('img.menu-arrow').click(function(e) {
                var $menu = $this.find('div.user-menu');
                if ($this.find('div.user-menu').length == 0) {
                    var menu = '<div class="mafia-tools user-menu vbmenu_popup" style="display: none">' +
                                '<table cellpadding="4" cellspacing="1" border="0">' +
                                    '<tbody>' +
                                        '<tr>' +
                                            '<td class="thead">Scumdar</td>' +
                                        '</tr>' +
                                        '<tr>' +
                                            '<td class="vbmenu_option vbmenu_option_alink">' +
                                                '<a href="#" class="replacement-link">Replace User</a>' +
                                            '</td>' +
                                        '</tr>' +
                                        '<tr>' +
                                            '<td class="vbmenu_option vbmenu_option_alink">' +
                                                '<a href="#" class="kill-link">Kill/Unkill User</a>' +
                                            '</td>' +
                                        '</tr>' +
                                    '</tbody>' +
                                '</table>' +
                               '</div>';
                    $this.append(menu);
                    $menu = $this.find('div.user-menu');
                    $menu.find('td').filter(':not(.thead)').hover(function() {
                        $(this).removeClass('vbmenu_option vbmenu_option_alink').addClass('vbmenu_hilite vbmenu_hilite_alink');
                    }, function() {
                        $(this).removeClass('vbmenu_hilite vbmenu_hilite_alink').addClass('vbmenu_option vbmenu_option_alink');
                    });
                    $menu.find('a.replacement-link').click(function(e) {
                        e.preventDefault();
                        replaceUser($user.text(), userId);
                        $menu.hide();
                    });
                    $menu.find('a.kill-link').click(function(e) {
                        e.preventDefault();
                        toggleDeadUser(userId);
                        $menu.hide();
                    });
                    var pos = $(this).position();
                    $menu.css({
                        'left': pos.left + 5,
                        'top': pos.top + 15
                    });
                }
                $menu.toggle();
            });
        });

        if (!game.star) {
            $('.mafia-tools').hide();
        }

        $(document).mouseup(function(e) {
            var container = $('div.user-menu');
            if (container.has(e.target).length === 0) {
                container.hide();
            }
        });
    }

    function restore() {
        if (game.star) {
            $('img.star-game').attr('star', 'true').attr('src', star);
        }
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
                var $this = $(this);
                $this.val(user.mark);
                colorizeUserMark(user.mark, $this);
            });
            $user = $('span.tracker-total[userId="' + user.id + '"]');
            $user.each(function(index) {
                var $this = $(this);
                $this.text(user.points);
                colorizePoints($this);
            });
            if (user.dead) {
                $('a.bigusername[userId="' + user.id + '"]').addClass('dead');
            }
            if (user.replacement !== undefined && user.replacement.length > 0) {
                var text = '<div class="mafia-tools smallfont replacement">Replaced by ' + user.replacement + '</div>';
                $('a.bigusername[userId="' + user.id + '"]').parent().after(text);
            }
            if (user.note) {
                $('div.user-note[userId="' + user.id + '"]').html('<i><small>' + user.note + '</small></i>').attr('default', 'false');
            }
        }
    }

    content.load = function(msg) {
        game = msg.game;
        inject();
        restore();
    }

    content.list = function(msg) {
        $(msg.games).each(function(index, gameId) {
            var $game = $('td[id="td_threadtitle_' + gameId + '"]');
            if ($game.length > 0) {
                var $span = $game.find('span[style="float:right"]');
                if ($span.length == 0) {
                    $game.find('div').filter(':first').append('<span style="float:right"/>');
                    $span = $game.find('span[style="float:right"]');
                }
                $span.prepend('<img src="' + star + '"></img>');
            }
        });
    }

    function init() {
        port = chrome.extension.connect({
            name: 'content'
        });
        port.onMessage.addListener(function(msg) {
            if (content[msg.type]) {
                content[msg.type](msg);
            }
        });
        var gameId = gup($('a[href^="printthread.php?t="]').attr('href'), 't');
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
