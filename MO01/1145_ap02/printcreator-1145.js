var _pcreatorConfig;

_pcreatorConfig = _pcreatorConfig || {};

_pcreatorConfig = {
  baseUrl: "//print.kintoneapp.com",
  token: "f3b53300-f510-43d4-85bf-4e1cea885e76"
};

(function() {
  "use strict"
  var detailEvent = function (event) {
    var l, s, scr, styl;
    _pcreatorConfig.event = event;
    styl = document.createElement("link");
    styl.rel = "stylesheet";
    styl.type = "text/css";
    styl.href = "//print.kintoneapp.com/build/printcreator-kintone-lib.css";
    l = document.getElementsByTagName("link")[0];
    l.parentNode.insertBefore(styl, l);
    scr = document.createElement("script");
    scr.type = "text/javascript";
    scr.async = true;
    scr.src = "//print.kintoneapp.com/build/printcreator-kintone-lib.js";
    s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(scr, s);

    return event;
  };
  var indexEvent = function (event) {
    var l, s, scr, styl;
    _pcreatorConfig.event = event;
    styl = document.createElement("link");
    styl.rel = "stylesheet";
    styl.type = "text/css";
    styl.href = "//print.kintoneapp.com/build/printcreator-kintone-lib.css";
    l = document.getElementsByTagName("link")[0];
    l.parentNode.insertBefore(styl, l);
    scr = document.createElement("script");
    scr.type = "text/javascript";
    scr.async = true;
    scr.src = "//print.kintoneapp.com/build/printcreator-kintone-lib.js";
    s = document.getElementsByTagName("script")[0];
    s.parentNode.insertBefore(scr, s);

    return event;
  };

  kintone.events.on('app.record.detail.show', detailEvent);
  kintone.events.on('mobile.app.record.detail.show', detailEvent);
  kintone.events.on('app.record.index.show', indexEvent);
  kintone.events.on('mobile.app.record.index.show', indexEvent);
})();
