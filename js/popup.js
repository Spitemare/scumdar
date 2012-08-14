(function($, undefined) {
    var port;
    var popup = {};

    function init() {
        port = chrome.extension.connect({
            name: 'popup',
            type: 'load'
        });
        port.onMessage.addListener(function(msg) {
            if (popup[msg.type]) {
                popup[msg.type](msg);
            }
        });
    }

    $(document).ready(init);
}(jQuery));
