
(function() {
'use strict';
    kintone.events.on('app.record.detail.show',  function(event) {
        /* まずsessionStorageを綺麗にする */
        window.sessionStorage.clear();

        /* ボタン増殖バグ回避 */
        if (document.getElementById ('action_btn') !== null) {
            return event;
        }
        
        var record = event.record;

        /* アプリの番号 (※ここは変えてください) */
        var APP_ID = app_54_id;

        var header = kintone.app.record.getHeaderMenuSpaceElement()

        var spanarea = document.createElement('span'); 

        /* ボタン作成 */
        var actionbtn = document.createElement('button'); 
        actionbtn.id = 'actionbtn';
        actionbtn.innerHTML = 'マイソクJPG登録チェック';
        actionbtn.style.margin = '1% 0.5%';
        actionbtn.style.marginBottom = '0.1%';
        actionbtn.style.padding = '0.5% 0.5%';
        actionbtn.style.borderRadius= '0.2rem';
        actionbtn.style.color = 'white';
        actionbtn.style.background = '#363636';
        

        var processmsg = document.createElement('p');
        processmsg.id = 'processmsg';
        processmsg.style.color = 'gray';
        processmsg.style.margin = '2%';
        processmsg.style.marginTop ='0';
        
        /* ヘッダーにボタン要素を付加 */
        header.appendChild(spanarea);
        spanarea.appendChild(actionbtn);
        header.appendChild(processmsg);
      
        /* 
         *   STEP01-JPGファイルチェック
         *   
        */
        // マイソクJPGファイルの存在有無チェック


        
      /* 「JPGファイルチェック」ボタンをクリックイベント */
      actionbtn.onclick = function() {

           processmsg.innerHTML="";
//debugger;    
        var fileField = record['マイソク_JPG_']; // フィールドコードを指定
        if (fileField.value.length > 0) {
      
            var isJpg = fileField.value.some(function(file) {
                return file.contentType === 'image/jpeg';
            });
            if (isJpg) {
              
             var records_54_up = {
               "ファイルチェック": { "value": "あり" }
             }

             var query_54 = 'レコード番号="'+record['レコード番号'].value+'"';
            console.log(records_54_up);
            doProcessApp(app_54_id, "JPGファイルチェック", query_54, "", records_54_up, processmsg);

              
              
                console.log('JPEGファイルが存在します');
            } else {
             records_54_up = {
               "ファイルチェック": { "value": "なし" }
             }

             query_54 = 'レコード番号="'+record['レコード番号'].value+'"';
            console.log("aaa"+records_54_up);
            doProcessApp(app_54_id, "JPGファイルチェック", query_54, "", records_54_up, processmsg);

                console.log('JPEGファイルは存在しません');
            }
        } else {
             records_54_up = {
               "ファイルチェック": { "value": "なし" }
             }

             query_54 = 'レコード番号="'+record['レコード番号'].value+'"';
            console.log("aaa"+records_54_up);
            doProcessApp(app_54_id, "JPGファイルチェック", query_54, "", records_54_up, processmsg);
            console.log('ファイルが存在しません');
        }
        return event;


      };
    });
})();