(function(){
  'use strict';
//  kintone.events.on(['app.record.create.submit', 'app.record.edit.submit'], function(event) {
  kintone.events.on(['app.record.edit.submit'], function(event) {
    console.log("開始");

    var processmsg = document.createElement('p');
    processmsg.id = 'processmsg';
    processmsg.style.color = 'gray';
    processmsg.style.margin = '1%';
    processmsg.style.marginTop ='0';

    var records_54_up = {};
    var record = event.record;
    

    if(!record['案件No'].value){
        var ankenno = getStringFromDate(new Date());
        ankenno = "案件FL-"+ankenno;

        records_54_up = {
            "案件No": { "value": ankenno }
        }

        var query_54 = 'レコード番号="'+record['レコード番号'].value+'"';
        doProcessApp(app_54_id, "エフステージ入力フォーム", query_54, "", records_54_up, processmsg);

    }
   return event;
  });
})();