var Ractive = require('ractive');
var requireHtml = require('html-requirer');

module.exports = function (tpl, data) {
    var rac = new Ractive({
        template: requireHtml(tpl),
        data: data
    });
    return rac.toHtml();
};
