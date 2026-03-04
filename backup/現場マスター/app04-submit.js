(function(){
    'use strict';
     kintone.events.on(['app.record.create.submit', 'app.record.edit.submit'], function(event) {
       console.log("開始");
  
       var record = event.record;
       var false_flg;
       
       if (record['案件種別'].value == undefined ){
         alert("「案件種別」が入力されておりません。");
         false_flg = 1;
       } else if (record['現場名DATA'].value == undefined){
         alert("「現場名」が入力されておりません。");
         false_flg = 1;
       } else if (record['現場住所'].value == undefined){
         alert("「現場住所」が入力されておりません。");
         false_flg = 1;
       } else if (record['得意先'].value == undefined){
         alert("「得意先」が設定されておりません。");
         false_flg = 1;
       } else if (record['基本料金r'].value == undefined){
         alert("「基本料金」が入力されておりません。");
         false_flg = 1;
       }
       
       if( false_flg == 1 ){
         console.log("エラー");
         return false;
       }
       
     return event;
    });
  })();