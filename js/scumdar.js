String.prototype.gup = function (s) {
    var t = s.replace(/[\[]/, '\\\[').replace(/[\]]/, '\\\]');
    var r = new RegExp('[\\?&]' + t + '=([^&#]*)').exec(this);
    return r === null ? '' : r[1];
};

String.prototype.format = function () {
    var args = arguments;
    return this.replace(/\{(\d+)\}/g, function (m, n) { return args[n]; });
};

(function ($, undefined) {

    var port;

    function load(id, callback) {
        chrome.extension.sendMessage({
            type : 'load',
            game : id
        }, function (item) {
            var game = item[id] || {
                id : id,
                posts : {},
                users : {},
                star : false,
                pin : true,
                marks : [ 'unknown', 'town', 'scum', 'mod', 'replaced' ]
            };
            port = chrome.extension.connect({ name : id });
            port.onMessage.addListener(function (g) {
                var oldGame = $('#scumdar').data('game');
                $('#scumdar').data('game', g);
                if (!g.star) {
                    location.reload();
                } else if (g.star !== oldGame.star) {
                    $('.scumdar-star').toggleClass('ui-state-active ui-state-default');
                    $('#posts').last().prev().scumdar('infinite');
                    $('.scumdar-tools').show();
                }
                if (g.pin !== oldGame.pin) {
                    if (!g.pin) $('#scumdar').removeClass('scumdar-sticky');
                    $('.scumdar-pin').find('span').toggleClass('ui-icon-pin-s ui-icon-pin-w');
                }
                for (var i in g.posts) {
                    var post = g.posts[i],
                        $post = $('.scumdar-post[post={0}]'.format(post.id));
                    $post.data('post', post).find('.scumdar-post-note').text(post.note);
                    if (post.star) {
                        $post.find('.scumdar-post-star').removeClass('ui-state-default').addClass('ui-state-active');
                    } else {
                        $post.find('.scumdar-post-star').removeClass('ui-state-active').addClass('ui-state-default');
                    }
                }
                for (var i in g.users) {
                    var user = g.users[i];
                    $('.scumdar-post[user={0}]'.format(user.id)).each(function (index, el) {
                        $(el).data('user', user)
                            .find('.scumdar-user-slider').slider('value', user.points)
                            .find('.scumdar-user-mark').val(user.mark);
                    });
                }
            });
            callback(game);
        });
    };
    
    function list(callback) {
        chrome.extension.sendMessage({
            type : 'load',
            game : null
        }, function (items) {
            callback(items);
        });
    }

    function save(game, callback) {
        chrome.extension.sendMessage({
            type : 'save',
            game : game
        }, function (g) {
            $('#scumdar').data('game', g);
            if (callback) callback(g);
        });
    };

    function remove(game, callback) {
        chrome.extension.sendMessage({
            type : 'remove',
            game : game
        }, callback);
    };

    function linkPost(post, link) {
        link.on('click.scumdar', function (e) {
            var $post = $('#post{0}'.format(post.id));
            if ($post.length > 0) {
                $('html, body').animate({
                    scrollTop : $post.offset().top
                }, 500);
                $('#scumdar-info-dialog').dialog('close');
                e.preventDefault();
            }
        });
    }

    function populatePanel(panel, game) {
        panel.empty();
        switch(panel.attr('id')) {
            case 'scumdar-info-tabs-users':
                var users = [];
                for (var i in game.users) {
                    users.push(game.users[i]);
                }
                users.sort(function (a, b) {
                    if (a.order == undefined || b.order == undefined) return 0;
                    return a.order - b.order;
                });
                for (var i in users) {
                    var user = users[i],
                        $userInfo = $('<div class="scumdar-user-info"></div>').data('user', user);
                    $userInfo.append('<span class="scumdar-user-info-name">{0}</span>'.format(user.name))
                        .append('<span class="scumdar-user-info-mark">{0}</span>'.format(user.mark))
                        .append('<div class="scumdar-user-info-points"></div>')
                        .append('<div class="scumdar-info-note scumdar-user-info-note">{0}</div>'
                                .format((user.note ? user.note : '' )));
                    $userInfo.find('.scumdar-user-info-points').slider({
                        range : 'min',
                        min : -5,
                        max : 5,
                        value : user.points,
                        slide : function (e, ui) {
                            e.preventDefault();
                        }
                    });
                    panel.append($userInfo);
                }
                $('#scumdar-info-tabs-users').sortable({
                    axis : 'y',
                    handle : '.scumdar-user-info-name',
                    helper : function (e, el) {
                        var clone = el.clone();
                        clone.find('.scumdar-info-note').hide();
                        return clone;
                    },
                    stop : function (e, ui) {
                        panel.find('.scumdar-user-info').each(function (index) {
                            $(this).data('user').order = index;
                        });
                        save(game);
                    }
                });
                break;
            case 'scumdar-info-tabs-stars':
                for (var i in game.posts) {
                    var post = game.posts[i],
                        $postInfo;
                    if (post.star) {
                        $postInfo = $('<div class="scumdar-post-info"></div>')
                            .append('<span class="scumdar-user-info-name">{0}</span>'.format(post.user.name))
                            .append('<a href="/showthread.php?p={0}" class="scumdar-post-info-num">{1}</a>'
                                    .format(post.id, post.num));
                        linkPost(post, $postInfo.find('.scumdar-post-info-num'));
                        panel.append($postInfo);
                    }
                }
                break;
            case'scumdar-info-tabs-notes':
                for (var i in game.posts) {
                    var post = game.posts[i],
                        $postInfo;
                    if (post.note) {
                        $postInfo = $('<div class="scumdar-post-info"></div>')
                            .append('<span class="scumdar-user-info-name">{0}</span>'.format(post.user.name))
                            .append('<a href="/showthread.php?p={0}" class="scumdar-post-info-num">{1}</a>'
                                    .format(post.id, post.num))
                            .append('<div class="scumdar-info-note scumdar-post-info-note">{0}</div>'.format(post.note));
                        linkPost(post, $postInfo.find('.scumdar-post-info-num'));
                        panel.append($postInfo);

                    }
                }
                break;
        }
    }

    var User = function (id, name) {
        this.id = id;
        this.name = name;
        this.points = 0;
        this.mark = 'unknown';
        this.order = 0;
    };

    var Post = function (id, num, user) {
        this.id = id;
        this.num = num;
        this.user = user;
    };

    var methods = {
        init : function (ops) {
            ops = $.extend({}, ops);
            var self = this, id = $('a[href^="printthread.php?t="]').attr('href');
            if (id) {
                load(id.gup('t'), function (game) {
                    $('body').scumdar('dialogs');
                    $('#poststop ~ table').last().scumdar('controls', game);
                    $('table[id^="post"]').scumdar('posts', game);
                    $('.scumdar-tools').toggleClass('scumdar-hidden', !game.star);
                    if (game.star) $('#lastpost').prev().scumdar('infinite');
                });
            } else {
                list(function (games) {
                    $('td[id^="td_threadtitle_"]').scumdar('list', games);
                });
            }
            return this;
        },
        list : function (games) {
            for (var i in games) {
                var game = games[i],
                    $row = $('td[id="td_threadtitle_{0}"]'.format(game.id)),
                    $inlines = $row.find('span[style="float:right"]');
                if ($inlines.length == 0) {
                    $inlines = $('<span style="float:right"/>');
                    $row.find('div').filter(':first').append($inlines);
                }
                $inlines.prepend('<span class="ui-icon ui-icon-star"></span>');
            }
        },
        destroy : function () {
            $(window).off('.scumdar');
            $.waypoints('destroy');
            return this;
        },
        dialogs : function () {
            this.append('<div id="scumdar-unstar-dialog" title="Unstar Game?"><p>' +
                    'Unstarring this game will remove all data assoicated with it. Are you sure you want to unstar this game?' +
                    '</p></div>');
            this.append('<div id="scumdar-info-dialog" title="Scumdar Game Info">' +
                    '<div id="scumdar-info-tabs">' +
                        '<ul>' +
                            '<li><a href="#scumdar-info-tabs-users">Users</a></li>' +
                            '<li><a href="#scumdar-info-tabs-stars">Starred Posts</a></li>' +
                            '<li><a href="#scumdar-info-tabs-notes">Posts With Notes</a></li>' +
                        '</ul>' +
                        '<div id="scumdar-info-tabs-users"></div>' +
                        '<div id="scumdar-info-tabs-stars"></div>' +
                        '<div id="scumdar-info-tabs-notes"></div>' +
                    '</div>');
            this.append('<div id="scumdar-user-note-dialog"><textarea class="scumdar-textarea"></textarea></div>');
            this.append('<div id="scumdar-post-note-dialog"><textarea class="scumdar-textarea"></textarea></div>');
            $('#scumdar-unstar-dialog').dialog({
                autoOpen : false,
                resizable : false,
                modal : true,
                buttons : {
                    Yes : function () {
                        remove($('#scumdar').data('game'), function () {;
                            location.reload();
                        });
                    },
                    No : function () {
                        $(this).dialog('close');
                    }
                }
            });
            $('#scumdar-info-dialog').dialog({
                autoOpen : false,
                resizable : false,
                modal : true,
                width: 500,
                height: 500,
                buttons : {
                    Close : function () {
                        $(this).dialog('close');
                    }
                },
                open : function () {
                    var panel;
                    $('body').addClass('scumdar-frozen');
                    switch ($('#scumdar-info-tabs').tabs('option', 'active')) {
                        case 1: panel = 'stars'; break;
                        case 2: panel = 'notes'; break;
                        default: panel = 'users'; break;
                    }
                    populatePanel($('#scumdar-info-tabs-{0}'.format(panel)), $('#scumdar').data('game'));
                },
                close : function () {
                    $('body').removeClass('scumdar-frozen');
                }
            });
            $('#scumdar-info-tabs').tabs({
                beforeActivate : function (e, ui) {
                    populatePanel(ui.newPanel, $('#scumdar').data('game'));
                }
            });
            $('#scumdar-user-note-dialog').dialog({
                autoOpen : false,
                resizable : false,
                modal : true,
                height : 500,
                width : 500,
                buttons : {
                    Save : function () {
                        var $this = $(this),
                            game = $('#scumdar').data('game'),
                            user = $this.data('user');
                        user.note = $this.find('textarea').val();
                        game.users[user.id] = user;
                        save(game, function () {
                            $('.scumdar-post[user="{0}"]'.format(user.id)).data('user', user);
                        });
                        $this.dialog('close');
                    },
                    Cancel : function () {
                        $(this).dialog('close');
                    }
                },
                open : function () {
                    var $this = $(this),
                        user = $this.data('user');
                    $this.dialog('option', 'title', 'Notes on {0}'.format(user.name)).find('textarea').val(user.note);
                },
                close : function () {
                    $(this).removeData('user');
                }
            });
            $('#scumdar-post-note-dialog').dialog({
                autoOpen : false,
                resizable : false,
                modal : true,
                height : 500,
                width : 500,
                buttons : {
                    Save : function () {
                        var $this = $(this),
                            game = $('#scumdar').data('game'),
                            post = $this.data('post');
                        post.note = $this.find('textarea').val();
                        game.posts[post.id] = post;
                        save(game, function () {
                            $('.scumdar-post[post="{0}"]'.format(post.id)).data('post', post)
                                .find('.scumdar-post-note').html(post.note);
                        });
                        $this.dialog('close');
                    },
                    Cancel : function () {
                        $(this).dialog('close');
                    }
                },
                open : function () {
                    var $this = $(this),
                        post = $this.data('post');
                    $this.dialog('option', 'title', 'Notes on Post {0}'.format(post.num)).find('textarea').val(post.note);
                },
                close : function () {
                    $(this).removeData('post');
                }
            });
            return this;
        },
        controls : function (game) {
            var $star = $('<td class="scumdar-star tcat ' + (game.star ? 'ui-state-active' : 'ui-state-default') + '">' +
                    '<span class="scumdar-pointer ui-icon ui-icon-star"></span></td>')
                .on('click.scumdar', function () {
                    var game = $('#scumdar').data('game');
                    if (!game.star) {
                        game.star = true;
                        save(game, function() {
                            $star.toggleClass('ui-state-active ui-state-default');
                            $('#posts').last().prev().scumdar('infinite');
                            $('.scumdar-tools').show();
                        });
                    } else {
                        $('#scumdar-unstar-dialog').dialog('open');
                    }
                });

            var $pin = $('<td class="tcat scumdar-tools scumdar-pin">' +
                    '<span class="scumdar-pointer ui-icon ui-icon-pin-{0}"></span></td>'.format((game.pin ? 's' : 'w')))
                .on('click.scumdar', function () {
                    var game = $('#scumdar').data('game');
                    game.pin = !game.pin;
                    if (!game.pin) $('#scumdar').removeClass('scumdar-sticky');
                    $pin.find('span').toggleClass('ui-icon-pin-s ui-icon-pin-w');
                    save(game);
                });

            var $info = $('<td class="tcat scumdar-tools">' +
                    '<span class="scumdar-pointer ui-icon ui-icon-info"></span></td>')
                .on('click.scumdar', function () {
                    $('#scumdar-info-dialog').dialog('open');
                });

            this.find('tr').prepend($star, $pin, $info);
            return this.data('game', game).removeAttr('width').attr('id', 'scumdar').waypoint({
                handler : function (direction) {
                    var game = $('#scumdar').data('game');
                    $(this).toggleClass('scumdar-sticky', game.star && game.pin && direction === 'down');
                }
            });
        },
        posts : function (game) {
            return this.each(function () {
                var $post = $(this).addClass('scumdar-post'),
                    id = $post.attr('id').substring(4),
                    num = $post.find('a[id^="postcount"]').attr('name'),
                    $user = $post.find('.bigusername'),
                    userId = $user.attr('href').gup('u'),
                    user = game.users[userId] || new User(userId, $user.text()),
                    post = game.posts[id] || new Post(id, num, user);
                $post.attr('post', id).attr('user', userId).data('post', post).data('user', user);

                $post.find('tbody').filter(':first').append('<tr class="scumdar-tools">' +
                    '<td class="alt2"><div class="scumdar-user-slider"></div></td>' +
                    '<td rowspan="3" class="alt1" style="vertical-align:top"><div class="scumdar-post-note">' + (post.note ? post.note : '' ) + '</div></td></tr>');
                $post.find('.scumdar-user-slider').slider({
                    range : 'min',
                    min : -5,
                    max : 5,
                    value : user.points,
                    stop : function (e, ui) {
                        var game = $('#scumdar').data('game'),
                            user = $post.data('user');
                        user.points = ui.value;
                        game.users[user.id] = user;
                        save(game, function () {
                            $('.scumdar-post[user={0}]'.format(user.id)).find('.scumdar-user-slider')
                                .not(this).slider('value', ui.value);
                        });
                    }
                });

                $post.find('tbody').filter(':first').append('<tr class="scumdar-tools">' +
                    '<td class="alt2">' + 
                        '<button class="scumdar-user-note-button"></button>' +
                        '<input class="scumdar-user-mark"></input>' + 
                    '</td></tr>');
                $post.find('.scumdar-user-note-button').on('click.scumdar', function () {
                    var game = $('#scumdar').data('game'),
                        user = $post.data('user');
                    $('#scumdar-user-note-dialog').data('user', user).dialog('open');
                }).button({
                    icons : { primary : 'ui-icon-person' }
                });
                $post.find('.scumdar-user-mark').val(user.mark)
                    .on('focus.scumdar', function () {
                        $(this).autocomplete('search', '');
                    }).autocomplete({
                    source : game.marks,
                    minLength : 0,
                    delay : 0,
                    response : function (e, ui) {
                        var val = $(this).val();
                        for (var i in ui.content) {
                            if (ui.content[i].value == val) return;
                        }
                        ui.content.push({ label : val, value : val });
                    },
                    change : function (e, ui) {
                        if (!ui.item) return;
                        var game = $('#scumdar').data('game'),
                            user = $post.data('user'),
                            mark = ui.item.value;
                        if ($.inArray(mark, game.marks) === -1) game.marks.push(mark);
                        user.mark = mark;
                        game.users[user.id] = user;
                        save(game, function () {
                            $('.scumdar-post[user={0}]'.format(user.id)).find('.scumdar-user-mark').val(mark);
                        });
                    }
                });

                $post.find('tbody').filter(':first').append('<tr class="scumdar-tools">' +
                    '<td class="alt2 scumdar-post-tools">' + 
                        '<button class="scumdar-post-note-button"></button>' +
                        '<span class="alt2 scumdar-post-star scumdar-pointer ' + (post.star ? 'ui-state-active' : 'ui-state-default') + '">' +
                            '<span class="ui-icon ui-icon-star"></span>' +
                        '</span>' +
                     '</td>');
                $post.find('.scumdar-post-star').on('click.scumdar', function () {
                    var game = $('#scumdar').data('game'),
                        post = $post.data('post'),
                        $this = $(this);
                    post.star = !post.star;
                    game.posts[post.id] = post;
                    save(game, function () {
                        $this.toggleClass('ui-state-active ui-state-default');
                    });
                });
                $post.find('.scumdar-post-note-button').on('click.scumdar', function () {
                    var game = $('#scumdar').data('game'),
                        post = $post.data('post');
                    $('#scumdar-post-note-dialog').data('post', post).dialog('open');
                }).button({
                    icons : { primary : 'ui-icon-document' }
                });
            }).tooltip({
                items : '.scumdar-user-note-button',
                tooltipClass: 'scumdar-info-note',
                content : function () {
                    return $(this).closest('.scumdar-post').data('user').note;
                }
            });
        },
        infinite : function () {
            return this.waypoint({
                triggerOnce : true,
                offset : 'bottom-in-view',
                handler : function (direction) {
                    var $this, url;
                    if (direction !== 'down') return;
                    $this = $(this);
                    url = $this.attr('next') || $('div.pagenav td.alt2').next('td.alt1').find('a').attr('href');
                    if (!url) return;
                    $('#lastpost').append('<div class="scumdar-loading"></div>');
                    $.ajax({
                        url : url,
                        dataType : 'html',
                        success : function (data) {
                            var $d = $(data),
                                $p = $d.filter('#posts').children('div'),
                                $q,
                                next;
                            $p.find('table[id^="post"]').scumdar('posts', $('#scumdar').data('game'));
                            try { $('#posts').append($p); } catch (e) { }
                            $.waypoints('refresh');
                            $('#scumdar').toggleClass('scumdar-sticky', $('#scumdar').data('game').pin);
                            $q = $d.find('div.page').filter(':first');
                            next = $q.find('div.pagenav td.alt2').next('td.alt1').find('a').prop('href');
                            if (next) {
                                $p.last().prev().attr('next', next).scumdar('infinite');
                            }
                            $('#lastpost').filter(':first').remove();
                        }
                    });
                }
            });
        }
    };

    $.fn.scumdar = function (method) {
        if (methods[method]) {
            return methods[method].apply(this, Array.prototype.splice.call(arguments, 1));
        } else if (typeof method === 'object' || !method) {
            return methods.init.apply(this, arguments);
        } else {
            $.error('Method ' + method + ' does not exist on jQuery.scumdar');
        }
    }

})(jQuery);

jQuery(function ($) {
    $(document).scumdar();
});
