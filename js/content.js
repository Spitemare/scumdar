(function($, undefined) {
    const unstar = chrome.extension.getURL('img/unstar.png');
    const star = chrome.extension.getURL('img/star.png');
    const plus = chrome.extension.getURL('img/plus.png');
    const minus = chrome.extension.getURL('img/minus.png');
    const pin = chrome.extension.getURL('img/pin.png');
    const unpin = chrome.extension.getURL('img/unpin.png');

    var game;

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
        var ob = {};
        ob['scumdar-' + game.id] = game;
        chrome.storage.local.set(ob, function() {
            if (chrome.runtime.lastError) {
                console.log(chrome.runtime.lastError.message);
            }
        });
    }

    function load(id, callback) {
        chrome.storage.local.get('scumdar-' + id, callback);
    }

    function injectPosts(context) {
        context.find('table[id^="post"]').each(function() {
            var $post = $(this).addClass('post');
            var $tools = $post.find('tbody').filter(':first').append('<tr class="mafia-tools">' +
                '<td class="alt2"><img class="star-post pointer" src=' + unstar + '></img>' +
                    '<a href="#" class="note-link pointer">[Edit Post Note]</a>' +
                '</td>' +
                '<td class="alt1">' +
                    '<span class="post-note note"></span>' +
                    '<div class="note-input">' +
                        '<textarea></textarea><br/>' +
                        '<button class="note-button save-button">Save</button>' +
                        '<button class="note-button cancel-button">Cancel</button>' +
                    '</div>' +
                '</td>')
            $tools.find('.star-post').on('click.scumdar', function() {
                var id = $(this).closest('.post').attr('id');
                var post = game.posts[id] || {};
                post.id = id;
                post.star = !post.star;
                game.posts[id] = post;
                save();
                $(this).attr('src', post.star ? star : unstar).closest('.post')
                    .toggleClass('starred', post.star);
            });

            $tools.find('.note-link').on('click.scumdar', function(e) {
                e.preventDefault();
                var $note = $(this).closest('.mafia-tools').find('.note').hide();
                $note.next().show().find('textarea').val($note.text()).focus();
            });
            $tools.find('.save-button').on('click.scumdar', function() {
                var $tools = $(this).closest('.post');
                var $this = $(this);
                var id = $tools.attr('id');
                var post = game.posts[id] || {};
                post.id = id;
                var note = $(this).parent().find('textarea').val();
                post.note = note;
                $tools.toggleClass('noted', note.length > 0);
                game.posts[id] = post;
                save();
                $tools.find('.note-input').hide();
                $tools.find('.note').text(note).show();
            });
            $tools.find('.cancel-button').on('click.scumdar', function() {
                $tools.find('.note-input').hide();
                $tools.find('.note').show();
            });
        });
    }

    function createUser(id, context) {
        var user = {};
        user.id = id;
        user.points = 0;
        user.mark = 'unknown';
        user.name = context.closest('.user').find('.bigusername').text();
        $('#scumdar select.mafia-tools').append('<option value="' + user.name + '">' + user.name +
                '</option>');
        game.users['user' + id] = user;
        save();
        return user;
    }


    function addPoints(points, context) {
        var id = gup(context.closest('.user').find('.bigusername').attr('href'), 'u');
        var user = game.users['user' + id];
        if (user === undefined) {
            user = createUser(id, context);
        }
        if (user.points == 25 && points > 0) {
            return;
        }
        if (user.points == -25 && points < 0) {
            return;
        }
        user.points = user.points + points;
        game.users['user' + id] = user;
        save();
        $('.user-' + id).find('.tracker-total').each(function() {
            var $points = $(this);
            $points.text(user.points);
            colorizePoints(user.points, $points);
        });
    }

    function colorizePoints(points, context) {
        if (points == 0) {
            context.css('color', 'black');
            return;
        }
        var norm = (Math.abs(points) + 25) / 50;
        var rgb;
        var round = Math.round(norm * 255);
        if (points < 0) {
            rgb = 'rgb(' + round + ',0,0)';
        } else {
            rgb = 'rgb(0,0,' + round + ')';
        }
        context.css('color', rgb);
    }

    function changeMark(context) {
        var id = gup(context.closest('.user').find('.bigusername').attr('href'), 'u');
        var user = game.users['user' + id];
        if (user === undefined) {
            user = createUser(id, context);
        }
        user.mark = context.val();
        game.users['user' + id] = user;
        save();
        $('.user-' + id).find('.mark-user').each(function() {
            var $mark = $(this);
            $mark.val(user.mark);
            colorizeMark(user.mark, $mark);
        });
    }

    function colorizeMark(mark, context) {
        context.removeClass().addClass('mark-user mafia-tools');
        if (mark != 'unknown') {
            context.addClass('color-' + mark);
        }
    }

    function injectUsers(context) {
        context.find('table[id^="post"]').each(function() {
            var $post = $(this);
            var $user = $post.find('tr').filter(':eq(1)').find('td').filter(':eq(0)')
                .addClass('user');
            var $name = $user.find('.bigusername');
            var id = gup($name.attr('href'), 'u');
            $user.addClass('user-' + id);
            $post.addClass($name.text());
            $user.append('<div class="mafia-tools point-tracker">' +
                '<img class="plus-tracker pointer" src=' + plus + '></img>' +
                '<span class="tracker-total">0</span>' +
                '<img class="minus-tracker pointer" src=' + minus + '></img>');
            $user.find('.plus-tracker').on('click.scumdar', function() {
                addPoints(1, $(this));
            });
            $user.find('.minus-tracker').on('click.scumdar', function() {
                addPoints(-1, $(this))
            });

            $user.append('<select class="mark-user mafia-tools">' +
                '<option value="unknown">Unknown</option>' +
                '<option value="mod">Mod</option>' +
                '<option value="town">Town</option>' +
                '<option value="scum">Scum</option>' +
                '<option value="neutral">Neutral</option>' +
                '<option value="cult">Cult</option>' +
                '<option value="sk">Serial Killer</option>' +
                '<option value="other">Other</option>' +
            '</select>').find('.mark-user').on('change.scumdar', function() {
                changeMark($(this));
            });

            var $note = $user.append(
                '<div class="mafia-tools user-note">' +
                    '<a href="#">[Edit User Note]</a>' +
                    '<span class="note" />' +
                    '<div class="note-input">' +
                        '<textarea></textarea><br/>' +
                        '<button class="note-button save-button">Save</button>' +
                        '<button class="note-button cancel-button">Cancel</button>' +
                    '</div>' +
                '</div>').find('.user-note');
            $note.find('a').on('click.scumdar', function(e) {
                e.preventDefault();
                var $note = $(this).parent().find('.note').hide();
                $note.next().show().find('textarea').val($note.text()).focus();
            });
            $note.find('.save-button').on('click.scumdar', function() {
                var id = gup($note.closest('.user').find('.bigusername').attr('href'), 'u');
                var user = game.users['user' + id];
                if (user === undefined) {
                    user = createUser(id, $note)
                }

                var note = $note.find('textarea').val();
                user.note = note;
                game.users['user' + id] = user;
                save();
                $note.find('.note-input').hide();
                $note.find('.note').text(note).show();
                $('.user-' + id).find('.note').text(note);
            });
            $note.find('.cancel-button').on('click.scumdar', function() {
                $note.find('.note-input').hide();
                $note.find('.note').show();
            });
        });
    }

    function restorePosts(context) {
        for (var i in game.posts) {
            var post = game.posts[i];
            context.find('table[id="' + post.id + '"]').each(function() {
                var $post = $(this);
                $post.toggleClass('starred', post.star).find('.star-post')
                    .attr('src', post.star ? star : unstar);
                if (post.note && post.note.length > 0) {
                    $post.addClass('noted').find('.post-note').text(post.note);
                }
            });
        };
    }

    function restoreUsers(context) {
        for (var i in game.users) {
            var user = game.users[i];
            context.find('.user-' + user.id).each(function() {
                var $user = $(this);
                var $points = $user.find('.tracker-total');
                $points.text(user.points);
                colorizePoints(user.points, $points);
                var $mark = $user.find('.mark-user');
                $mark.val(user.mark);
                colorizeMark(user.mark, $mark);
                $user.find('.note').text(user.note);
            });
        }
    }

    var methods = {
        init : function(options) {
            var settings = $.extend({
            }, options);
            $.waypoints.settings.scrollThrottle = 30;
            var self = this,
                id = gup($('a[href^="printthread.php?t="]').attr('href'), 't');
            if (id != '') {
                load(id, function(item) {
                    game = item['scumdar-' + id];
                    if (!game) {
                        game = {};
                        game.posts = {};
                        game.users = {};
                        game.star = false;
                        game.pin = true;
                    }
                    game.id = id;
                    return self.scumdar('inject');
                });
            } else {
                var self = this;
                chrome.storage.local.get(null, function(items) {
                    self.scumdar('list', items);
                });
                return self;
            }
        },
        destroy : function() {
            $(window).off('.scumdar');
            $.waypoints().each(function() {
                this.waypoint('destroy');
            });
            return this;
        },
        list : function(games) {
            for (var i in games) {
                var id = games[i].id;
                var $game = $('td[id="td_threadtitle_' + id + '"]');
                if ($game.length > 0) {
                    var $span = $game.find('span[style="float:right"]');
                    if ($span.length == 0) {
                        $game.find('div').filter(':first').append('<span style="float:right"/>');
                        $span = $game.find('span[style="float:right"]');
                    }
                    $span.prepend('<img src="' + star + '"></img>');
                }
            }
            return this;
        },
        inject : function() {
            var $scumdar = $('#poststop ~ table').last().waypoint({
                handler : function(event, direction) {
                    $(this).toggleClass('sticky', game.star && game.pin && direction === 'down');
                    event.stopPropagation();
                },
                onlyOnScroll : true
            }).removeAttr('width').attr('id', 'scumdar');

            var $tools = $scumdar.last().find('tr');

            var $select = $tools.prepend('<td class="tcat mafia-tools">' +
                    '<select class="mafia-tools">' +
                        '<option value="all">All</option>' +
                        '<option value="starred">Starred</option>' +
                        '<option value="noted">Posts with notes</option>' +
                    '</select>' +
                '</td>').find('select.mafia-tools');
            for (var i in game.users) {
                var name = game.users[i].name;
                $select.append('<option value="' + name + '">' + name + '</option>');
            }
            $select.on('change.scumdar', function() {
                var option = $(this).find(':selected').val();
                if (option === 'all') {
                    $('.post tr').filter(':hidden').show();
                } else  {
                    $('.post').not('.' + option).each(function() {
                        $(this).find('tr').not(':first').hide();
                    });
                }
            });

            $tools.prepend('<td class="tcat mafia-tools"><img class="pin-game pointer" src=' + unpin + '></img></td>');
            $tools.find('img.pin-game').on('click.scumdar', function() {
                game.pin = !game.pin;
                $(this).attr('src', game.pin ? pin : unpin);
                if (!game.pin) {
                    $('#scumdar').removeClass('sticky');
                }
                save();
            });

            $tools.prepend('<td class="tcat"><img class="star-game pointer" src=' + unstar + '></img></td>');
            $tools.find('img.star-game').on('click', function() {
                if (!game.star) {
                    game.star = true;
                    $(this).attr('src', star);
                    $('#posts').last().prev().scumdar('waypoint', game);
                    $('.mafia-tools').show();
                    save();
                } else {
                    if (confirm('Unstarring this game will remove all data associated with it. Are you sure you want to unstar this game?')) {
                        $(this).attr('src', unstar);
                        $('.mafia-tools').hide();
                        chrome.storage.local.remove('scumdar-' + game.id);
                        location.reload();
                    }
                }
            });
            injectPosts(this);
            injectUsers(this);
            return this.scumdar('restore');
        },
        restore : function() {
            if (game.star) {
                $('img.star-game').attr('src', star);
                $('#lastpost').prev().scumdar('waypoint');
            } else {
                $('.mafia-tools').hide();
            }
            $('img.pin-game').attr('src', game.pin ? pin : unpin);

            restorePosts(this);
            restoreUsers(this);
            return this;
        },
        waypoint : function() {
            return this.waypoint({
                handler : function(event, direction) {
                    if (direction === 'down') {
                        var url = $(this).attr('next');
                        if (!url) {
                            url = $('div.pagenav td.alt2').next('td.alt1').find('a').attr('href');
                        }
                        if (url) {
                            $.ajax({
                                url : url,
                                dataType : 'html',
                                success : function(data) {
                                    var $data = $(data);
                                    var $posts = $($data.filter('#posts'));
                                    var newPosts = $posts.children('div');
                                    injectPosts(newPosts);
                                    injectUsers(newPosts);
                                    restorePosts(newPosts);
                                    restoreUsers(newPosts);
                                    var hide = $('select.mafia-tools').find(':selected').val();
                                    if (hide !== 'all') {
                                        newPosts.find('.post').filter(':not(.' + hide + ')').each(function() {
                                            $(this).find('tr').not(':first').hide();
                                        });
                                    }
                                    $('#posts').append(newPosts);
                                    var $page = $($data.find('div.page').filter(':first'));
                                    var next = $page.find('div.pagenav td.alt2').next('td.alt1')
                                        .find('a').attr('href');
                                    if (next) {
                                        newPosts.last().prev().attr('next', next)
                                            .scumdar('waypoint');
                                    }
                                }
                            });
                        }
                    }
                },
                triggerOnce : true,
                offset : 'bottom-in-view'
            });
        }
    };

    $.fn.scumdar = function(method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.splice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.scumdar');
        }
    }
})(jQuery);

$(document).ready(function() {
    $(document).scumdar();
});
