(function(){
    'use strict';
    kintone.events.on(['app.record.edit.show', 'app.record.create.show'], function(event){
      event.record["撮影方法"].disabled = false;
      event.record["担当者"].disabled = false;
      event.record["連絡先電話番号"].disabled = false;
      event.record["移設延長前案件No"].disabled = false;
      console.log(event.record);
      return event;
    });
  })();