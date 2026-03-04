// 2023.8.18
(function() {
    'use strict';
        kintone.events.on('app.record.detail.show',  function(event) {
    //    kintone.events.on('app.record.detail.show', function(event) {
            /* まずsessionStorageを綺麗にする */
            window.sessionStorage.clear();
    
            /* ボタン増殖バグ回避 */
            if (document.getElementById ('action_btn') !== null) {
                return event;
            }
            
            var record = event.record;
    
            /* アプリの番号 (※ここは変えてください) */
            var APP_ID = app_32_id;
    
            var header = kintone.app.record.getHeaderMenuSpaceElement()
    
            var spanarea = document.createElement('span'); 
    
            /* ボタン作成 */
            var actionbtn = document.createElement('button'); 
            actionbtn.id = 'actionbtn';
            actionbtn.innerHTML = '①プランNo更新(プラン側)';
            actionbtn.style.margin = '2% 0.5%';
            actionbtn.style.marginBottom = '0.1%';
            actionbtn.style.padding = '1% 3%';
            actionbtn.style.borderRadius= '0.5rem';
            actionbtn.style.color = 'white';
            actionbtn.style.background = '#363636';
            
    　      var actionbtn2 = document.createElement('button'); 
            actionbtn2.id = 'actionbtn';
            actionbtn2.innerHTML = '②発注リスト登録';
            actionbtn2.style.margin = '2% 0.5%';
            actionbtn2.style.marginBottom = '0.1%';
            actionbtn2.style.padding = '1% 3%';
            actionbtn2.style.borderRadius= '0.5rem';
            actionbtn2.style.color = 'white';
            actionbtn2.style.background = '#363636';
    
    　      var actionbtn3 = document.createElement('button'); 
            actionbtn3.id = 'actionbtn';
            actionbtn3.innerHTML = '③倉庫戻し(セット)';
            actionbtn3.style.margin = '2% 0.5%';
            actionbtn3.style.marginBottom = '0.1%';
            actionbtn3.style.padding = '1% 3%';
            actionbtn3.style.borderRadius= '0.5rem';
            actionbtn3.style.color = 'white';
            actionbtn3.style.background = '#363636';
    
    　      var actionbtn4 = document.createElement('button'); 
            actionbtn4.id = 'actionbtn';
            actionbtn4.innerHTML = '④セット在庫バラし)';
            actionbtn4.style.margin = '2% 0.5%';
            actionbtn4.style.marginBottom = '0.1%';
            actionbtn4.style.padding = '1% 3%';
            actionbtn4.style.borderRadius= '0.5rem';
            actionbtn4.style.color = 'white';
            actionbtn4.style.background = '#363636';
            
    　      var actionbtn5 = document.createElement('button'); 
            actionbtn5.id = 'actionbtn';
            actionbtn5.innerHTML = '⑤提案中をキャンセル';
            actionbtn5.style.margin = '2% 0.5%';
            actionbtn5.style.marginBottom = '0.1%';
            actionbtn5.style.padding = '1% 3%';
            actionbtn5.style.borderRadius= '0.5rem';
            actionbtn5.style.color = 'white';
            actionbtn5.style.background = '#363636';
    
    　      var actionbtn6 = document.createElement('button'); 
            actionbtn6.id = 'actionbtn';
            actionbtn6.innerHTML = '⑥家具情報クリア';
            actionbtn6.style.margin = '2% 0.5%';
            actionbtn6.style.marginBottom = '0.1%';
            actionbtn6.style.padding = '1% 3%';
            actionbtn6.style.borderRadius= '0.5rem';
            actionbtn6.style.color = 'white';
            actionbtn6.style.background = '#363636';
    
    　      var actionbtn7 = document.createElement('button'); 
            actionbtn7.id = 'actionbtn';
            actionbtn7.innerHTML = 'テスト：倉庫戻しセット)';
            actionbtn7.style.margin = '2% 0.5%';
            actionbtn7.style.marginBottom = '0.1%';
            actionbtn7.style.padding = '1% 3%';
            actionbtn7.style.borderRadius= '0.5rem';
            actionbtn7.style.color = 'white';
            actionbtn7.style.background = '#363636';
    
            var processmsg = document.createElement('p');
            processmsg.id = 'processmsg';
            processmsg.style.color = 'gray';
            processmsg.style.margin = '2%';
            processmsg.style.marginTop ='0';
            
            /* ヘッダーにボタン要素を付加 */
            header.appendChild(spanarea);
            spanarea.appendChild(actionbtn);
            spanarea.appendChild(actionbtn2);
            spanarea.appendChild(actionbtn3);
            spanarea.appendChild(actionbtn4);
            spanarea.appendChild(actionbtn5);
    //        spanarea.appendChild(actionbtn6);
            spanarea.appendChild(actionbtn7);
            header.appendChild(processmsg);
          
            /* 
             *   STEP01-31-家具[在庫・ストック]（APPID-666）　自アプリ更新
             *   Insert/Update
            */
            // 提案していたプランNoを使用プランNoとして更新
            // 提案プランNoは空欄にリセット
    
            // [プランNo更新(プラン集)]ボタンを押下
    //        actionbtn7.onclick = async function() {
            actionbtn.onclick = async function() {
    
              processmsg.innerHTML="";
              var record = event.record;
    
              if ((record['提案中状況'].value == "提案中" || record['提案中状況'].value == "受注(設置待ち)" || record['提案中状況'].value == "設置済(編集待ち)" ) && record['次回使用_案件NO_'].value !== "") {
                //alert("これから処理を開始します");
                try{
                  await f_record_update31(record);
                  await alert("個別在庫の情報の更新が完了しました。次に、プラン集の更新を行います。OKボタンを押してください。");
                  await f_record_update32(record);
                  await alert("プラン集の情報を更新が完了しました。OKボタンを押してください。");
                  await f_record_update31_2nd(record);
                  await alert("個別在庫の物件情報の更新が完了しました。OKボタンを押してください。");
                }catch(error){
                  console.log(error);
                  
                  alert("個別在庫の情報更新処理中にエラーが発生しました。処理を中止します。");
                }
              }else{
                alert("提案中状況が「提案中」「受注(設置待ち)」「設置済(編集待ち)」となっていないか、次回使用案件Noが空欄です。");
              }
            }
    
    async function f_record_update31(record){
    
            try{
    
    // 外し在庫NO
                var h_subTable = record.外しリスト.value;
                var k_subTable = ['record.table_01.value','record.table_02.value','record.table_03.value','record.table_04.value','record.table_05.value','record.table_06.value'];
                var matchingkeys = [];
                var keys1 = [];
    
                for (var iii =0 ; iii < h_subTable.length ; iii++){
                  keys1.push(h_subTable[iii].value.外し在庫NO.value);
                }
    //debugger;
                for(let i0 = 0 ; i0 < keys1.length; i0++){
                    record.外しリスト.value = record.外しリスト.value.filter(function(keys1){return});
                }
    //　登録されている在庫数分処理をループ
    
                var Num
                var sNum = 0
                //　サブテーブルをループ
                for (var itableNum=1;itableNum<7;itableNum++) {
                  var tableNum = String("table_0") + String(itableNum);
    
                  if (itableNum === 1) {
                      Num = "";
                  } else {
                      Num = "_"+String(sNum);
                      sNum ++;
                  }
    
                  //　サブテーブル内の在庫数分ループ
                  for (var i1=0; i1<record[tableNum].value.length; i1++) {
                     var hazushi_flg = "0";
                     var key2 = record[tableNum].value[i1].value["在庫NO"+Num].value;
                     if(key2 === ""){
                        console.log("在庫NOがないためBreak");
                        break;
                     }else if(keys1.includes(key2)){
                         matchingkeys.push(key2);
                         console.log("在庫NOが外し対象のため別処理");
                         hazushi_flg = "1";
                         console.log("hazushi_flg:"+hazushi_flg);
                  }
                     var query_31 ='在庫NO="'+record[tableNum].value[i1].value["在庫NO"+Num].value+'"';
                         console.log(query_31);
                     var jyoken = {
                       'app': app_31_id,
                       'query': query_31
                     };
                     const resp = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken);
    
                       if (resp.records.length > 0) {
                         var records_31 = resp.records[0];
                         var g_subTable = records_31.現場コードテーブル.value; // 2024.9.15
                  
    //debugger; // ブレークポイント
    
                         var now = formatDate(new Date()); 
                         var newRow = {
                           value:{
                               "現場コード": {"value": records_31['レンタル中現場コード'].value},
                               "プランNo_hist": {"value": records_31['レンタル中プランNO'].value},
                               "履歴登録日": { "value": now },                            
                               "現場名": {"value": records_31['_レンタル中_現場名'].value},
                               "得意先名": {"value": records_31['_レンタル中_得意先名'].value},
                               "営業担当": {"value": records_31['_レンタル中_営業担当'].value}
                           }
                         }
                         
                         var org_genba = records_31['_レンタル中_現場名'].value;
                         var org_torihiki = records_31['_レンタル中_得意先名'].value;
                         var org_eigyo = records_31['_レンタル中_営業担当'].value;
                         
                         if( records_31['個別状況'].value == "レンタル中"
                          || records_31['個別状況'].value == "外し(回収予定・提案中)" 
                          || records_31['個別状況'].value == "セット在庫(事務所)" 
                          || records_31['個別状況'].value == "在庫・提案中(事務所)" 
                          || records_31['個別状況'].value == "在庫(事務所)" 
                          || records_31['個別状況'].value == "新品・提案中(事務所)"
                          || records_31['個別状況'].value == "新品(事務所)"
                          || records_31['個別状況'].value == "発注予定"){
                          
                          var records_31_up;  // 2024.1.1 for warning
                          var  _query_31;
    
    
                          if(records_31['個別状況'].value == "レンタル中"){
    
                            if(hazushi_flg === "1"){
                              records_31._レンタル中_現場名.value="" 
                              records_31._レンタル中_得意先名.value="";
                              records_31._レンタル中_営業担当.value="";
                              records_31.レンタル中プランNO.value="";
                              records_31.個別状況.value="在庫(事務所)";
                              records_31.使用.value="使用";
                            }else{
                              records_31._レンタル中_現場名.value=record['_次回_現場名'].value; 
                              records_31._レンタル中_得意先名.value=record['_次回_得意先名1'].value;
                              records_31._レンタル中_営業担当.value=record['_次回_営業担当'].value;
                              records_31.個別状況.value="レンタル中";
                              records_31.保管場所.value="";
                              records_31.使用.value="使用";
                            }
                            records_31.提案する.value="未提案";
                            records_31.提案するプランNO.value="";
                            records_31.最終現場名.value=record['現場名'].value;
                            records_31.最終得意先.value=record['得意先名'].value;
    
                           g_subTable.push(newRow)
    
                          }else if(records_31['個別状況'].value == "外し(回収予定・提案中)"){
    
                           if(hazushi_flg === "1" ){
                             records_31.レンタル中プランNO.value="";
                             records_31.個別状況.value="在庫・提案中(事務所)";
    　                       records_31._レンタル中_現場名.value="";
                             records_31._レンタル中_得意先名.value="";
                             records_31._レンタル中_営業担当.value="";
                           }else{
                             records_31.レンタル中プランNO.value=records_31['提案するプランNO'].value;
                             records_31.個別状況.value="レンタル中";
                             records_31.保管場所.value="";
    　                       records_31._レンタル中_現場名.value=record['_次回_現場名'].value; 
                             records_31._レンタル中_得意先名.value=record['_次回_得意先名1'].value;
                             records_31._レンタル中_営業担当.value=record['_次回_営業担当'].value;
                           }
                           records_31.使用.value="使用";
                           records_31.提案する.value="未提案";
                           records_31.提案するプランNO.value="";
                           records_31.最終現場名.value=record['現場名'].value;
                           records_31.最終得意先.value=record['得意先名'].value;
    
                           g_subTable.push(newRow)
    
                          }else if(records_31['個別状況'].value == "外し(回収予定)" && hazushi_flg === "1"){
                           records_31._レンタル中_現場名.value="";
                           records_31._レンタル中_得意先名.value="";
                           records_31._レンタル中_営業担当.value="";
                           
                           records_31.レンタル中プランNO.value="";
                           records_31.個別状況.value="在庫(事務所)";
    
                           records_31.使用.value="使用";
                           records_31.提案する.value="未提案";
                           records_31.提案するプランNO.value="";
                           records_31.最終現場名.value=record['現場名'].value;
                           records_31.最終得意先.value=record['得意先名'].value;
    
                           g_subTable.push(newRow)
    
                          }else if(records_31['個別状況'].value == "在庫・提案中(事務所)" ||records_31['個別状況'].value == "新品・提案中(事務所)" ){
                           records_31.レンタル中プランNO.value=records_31['提案するプランNO'].value;
                           records_31._レンタル中_現場名.value=record['_次回_現場名'].value; 
                           records_31._レンタル中_得意先名.value=record['_次回_得意先名1'].value;
                           records_31._レンタル中_営業担当.value=record['_次回_営業担当'].value;
                           records_31.個別状況.value="レンタル中";
                           records_31.保管場所.value="";
                           records_31.使用.value="使用";
                           records_31.提案する.value="未提案";
                           records_31.提案するプランNO.value="";
    
                          }else if(records_31['個別状況'].value == "セット在庫(事務所)" ||records_31['個別状況'].value == "在庫(事務所)" ||records_31['個別状況'].value == "新品(事務所)" ||records_31['個別状況'].value == "発注予定" ){
                            records_31.レンタル中プランNO.value=records_31['レンタル中プランNO'].value;
                            records_31.個別状況.value="レンタル中";
                            records_31.保管場所.value="";
                            records_31._レンタル中_現場名.value=record['_次回_現場名'].value; 
                            records_31._レンタル中_得意先名.value=record['_次回_得意先名1'].value;
                            records_31._レンタル中_営業担当.value=record['_次回_営業担当'].value;
                            records_31.使用.value="使用";
                            records_31.提案する.value="未提案";
                            records_31.提案するプランNO.value="";
                          }
    
                    // 以下自動設定項目で更新できない項目のため、更新対象から除外
                          delete records_31.レコード番号;
                          delete records_31.作成者;
                          delete records_31.更新者;
                          delete records_31.作成日時;
                          delete records_31.更新日時;
    
                    // 以下ルックアップ項目でコピー元が重複不可にできないため、更新対象から除外
                          delete records_31.DATA;
                          delete records_31.サイズ;
                          delete records_31.プランNO_提案中;
                          delete records_31.レンタル中案件No;
                          delete records_31.レンタル中現場コード;
                          delete records_31.上代;
                          delete records_31.下代;
                          delete records_31.下代_2;
                          delete records_31.仕入先名;
                          delete records_31.使用開始日;
                          delete records_31.保管場所;
                          delete records_31.個数;
                          delete records_31.写真添付;
                          delete records_31.原価;
                          delete records_31.品番;
                          delete records_31.商品コード;
                          delete records_31.商品名;
                          delete records_31.外しあり;
                          delete records_31.掛率;
                          delete records_31.提案あり;
                          delete records_31.提案中;
                          delete records_31.添付ファイル;
                          delete records_31.特記事項あり;
                          delete records_31.状態;
                          delete records_31.状況_0;
                          delete records_31.種類_0;
                          delete records_31.種類_1;
                          delete records_31._レンタル中_提案現場と得意先名;
                          delete records_31._参考_下代;
                          delete records_31._次回_営業担当;
                          delete records_31._次回_得意先名;
                          delete records_31._次回_提案現場と得意先名;
                          delete records_31._次回_現場名;
    
    
                           _query_31 = '在庫NO="'+records_31['在庫NO'].value+'"';
                          //console.log(_query_31);
    //debugger;
                          await doAsyncProcessApp_r(app_31_id, "家具[在庫・ストック]（物件履歴）", _query_31 , "", records_31, processmsg)
                            .then(function(response){
                              if(hazushi_flg === "1"){
                                record[tableNum].value = record[tableNum].value.filter(function(key2){return});
                              }
    
                              console.log("OK");
                            })
                            .catch(function(error){
                              console.log("データベース処理でエラーが発生しました。");
                              throw error;
                            });
                         }
                      }
                   }
                }
    //          debugger;
                return;
            }catch(error){
    //          console.log("Error111");
                throw error;
            }
    }
    
    async function f_record_update32(record){
      return new Promise(function(resolve) {
            setTimeout(function() {
                var r_subTable = record.物件履歴.value;
                // 提案フィールド表示名は「プラン」
                
                console.log("32処理を開始します");
                
                if(record['提案'].value !== "倉庫" && record['提案'].value !== "ストック(新品)"){
                  var newRow = { 
                    value:{
                      "案件番号_hist": {"value": record['案件NO_レンタル中_'].value},
                      "現場名_hist": {"value": record['現場名'].value},
                      "得意先_hist": {"value": record['得意先名'].value},
                      "営業担当_hist": {"value": record['営業担当'].value},
                      "コメント_hist": {"value": record['コメント_レンタル中物件_'].value}
                    }
                  };
                  r_subTable.push(newRow)
                }
                record.提案中状況.value="未提案";
                record.案件NO_レンタル中_.value=record['次回使用_案件NO_'].value;
                record.次回使用_案件NO_.value="";
                record.提案.value="レンタル中";
                record.回収期限日.value="";
                record.コメント_レンタル中物件_.value=record['コメント_次回物件_'].value;
                record.コメント_次回物件_.value="";
                record.最終現場名.value=record['現場名'].value;
                record.最終得意先.value=record['得意先名'].value;
    
                // 以下自動設定項目で更新できない項目のため、更新対象から除外
                delete record.プランNO;
                delete record.作成者;
                delete record.更新者;
                delete record.作成日時;
                delete record.更新日時;
    
                // 以下ルックアップ項目でコピー元が重複不可にできないため、更新対象から除外
                delete record.プランNO_lu;
                delete record._01_ソファ個別在庫_提案_;
                delete record.プランNO_lu_0;
                delete record._01_ダイニングテーブル個別在庫_提案_;
                delete record.プランNO_lu_1;
                delete record._03_テレビボード個別在庫_提案_;
                delete record.プランNO_lu_2;
                delete record._04_センターテーブル_個別在庫_提案_;
                delete record.プランNO_lu_3;
                delete record._05_ラグ_個別在庫_提案_;
                delete record.プランNO_lu_4;
                delete record._06_その他_個別在庫_提案_;
                //更新対象は自レコード
                var query_32 = 'NO="'+record['NO'].value+'"';
                doAsyncProcessApp(app_32_id, "[レンタル・プラン集](物件履歴)", query_32,"", record, processmsg);  // 物件履歴反映版
                console.log('Async task completed');
                resolve();
            }, 1000); // 1秒後に処理を完了
        });
    }
    
    async function f_record_update31_2nd(record){
    
        try{
            var Num;
            var sNum = 0;
    //        var records_31 = record;
            
            //　サブテーブルをループ
            for (var itableNum=1;itableNum<7;itableNum++) {
              var tableNum = String("table_0") + String(itableNum);
              if (itableNum === 1) {
                  Num = "";
              } else {
                  Num = "_"+String(sNum);
                  sNum ++;
              }
    
              //　サブテーブル内の在庫数分ループ
              for (var i1=0; i1<record[tableNum].value.length; i1++) {
                 var query_31 ='在庫NO="'+record[tableNum].value[i1].value["在庫NO"+Num].value+'"';
                 var jyoken = {
                   'app': app_31_id,
                   'query': query_31
                 };
                 const resp = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken);
                 if (resp.records.length > 0) {
                    var records_31 = resp.records[0];
                    var _query_31 = '在庫NO="'+records_31['在庫NO'].value+'"';
                    // 以下自動設定項目で更新できない項目のため、更新対象から除外
                    delete records_31.レコード番号;
                    delete records_31.作成者;
                    delete records_31.更新者;
                    delete records_31.作成日時;
                    delete records_31.更新日時;
    //debugger;
                    await doAsyncProcessApp_r(app_31_id, "家具[在庫・ストック]（現場情報更新）", _query_31 , "", records_31, processmsg)
                      .then(function(response){
                      console.log("OK");
                      })
                      .catch(function(error){
                        console.log("データベース処理でエラーが発生しました。");
                        throw error;
                      });
                   }
               }
            }
            return;
        }catch(error){
            throw error;
        }
    }
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    
    /*
            // [プランNo更新(プラン集)]ボタンを押下
            actionbtn.onclick = function() {
    
                processmsg.innerHTML="";
    
              if ((record['提案中状況'].value == "提案中" || record['提案中状況'].value == "受注(設置待ち)" || record['提案中状況'].value == "設置済(編集待ち)" ) && record['次回使用_案件NO_'].value !== "") {
    
                    // 2024.1.22
                    var arrRireki32=[];
                    arrRireki32 = record;
                    
    // 2024.7.12 未テスト
                    if(record['提案'].value !== "倉庫" && record['提案'].value !== "ストック(新品)"){
                    
                    arrRireki32["物件履歴"].value.push({
                      "value":{
                        "案件番号_hist": {"value": record['案件NO_レンタル中_'].value},
                        "現場名_hist": {"value": record['現場名'].value},
                        "得意先_hist": {"value": record['得意先名'].value},
                        "営業担当_hist": {"value": record['営業担当'].value},
                        "コメント_hist": {"value": record['コメント_レンタル中物件_'].value}
                      }
                    });
                    
                      
                    }
                           delete arrRireki32['プランNO'];
                           var arrRireki322=[];
                           arrRireki322 = arrRireki32;
                           delete arrRireki322['更新者'];
                           var arrRireki323=[];
                           arrRireki323 = arrRireki322;
                           delete arrRireki323['作成者'];
                           var arrRireki324=[];
                           arrRireki324 = arrRireki323;
                           delete arrRireki324['更新日時'];
                           var arrRireki325=[];
                           arrRireki325 = arrRireki324;
                           delete arrRireki325['作成日時'];
                           var arrRireki326=[];
                           arrRireki326 = arrRireki325;
                           delete arrRireki326['プランNO_lu'];
                           var arrRireki327=[];
                           arrRireki327 = arrRireki326;
                           delete arrRireki327['プランNO_lu_0'];
                           var arrRireki328=[];
                           arrRireki328 = arrRireki327;
                           delete arrRireki328['プランNO_lu_1'];
                           var arrRireki329=[];
                           arrRireki329 = arrRireki328;
                           delete arrRireki329['プランNO_lu_2'];
                           var arrRireki330=[];
                           arrRireki330 = arrRireki329;
                           delete arrRireki330['プランNO_lu_3'];
                           var arrRireki331=[];
                           arrRireki331 = arrRireki330;
                           delete arrRireki331['プランNO_lu_4'];
                           var arrRireki332=[];
                           arrRireki332 = arrRireki331;
                           delete arrRireki332['_01_ソファ個別在庫_提案_'];
                           var arrRireki333=[];
                           arrRireki333 = arrRireki332;
                           delete arrRireki333['_01_ダイニングテーブル個別在庫_提案_'];
                           var arrRireki334=[];
                           arrRireki334 = arrRireki333;
                           delete arrRireki334['_03_テレビボード個別在庫_提案_'];
                           var arrRireki335=[];
                           arrRireki335 = arrRireki334;
                           delete arrRireki335['_04_センターテーブル_個別在庫_提案_'];
                           var arrRireki336=[];
                           arrRireki336 = arrRireki335;
                           delete arrRireki336['_05_ラグ_個別在庫_提案_'];
                           var arrRireki337=[];
                           arrRireki337 = arrRireki336;
                           delete arrRireki337['_06_その他_個別在庫_提案_'];
                           
                    arrRireki337.提案中状況.value="未提案";
                    arrRireki337.案件NO_レンタル中_.value=record['次回使用_案件NO_'].value;
                    arrRireki337.次回使用_案件NO_.value="";
                    arrRireki337.提案.value="レンタル中";
                    arrRireki337.回収期限日.value="";
                    arrRireki337.コメント_レンタル中物件_.value=record['コメント_次回物件_'].value;
                    arrRireki337.コメント_次回物件_.value="";
                    arrRireki337.最終現場名.value=record['現場名'].value;
                    arrRireki337.最終得意先.value=record['得意先名'].value;
    
    
                    // 2024.1.22
                    var query_32 = 'NO="'+record['NO'].value+'"';
                    doAsyncProcessApp(app_32_id, "[レンタル・プラン集](物件履歴)", query_32,"", arrRireki337, processmsg);  // 物件履歴反映版
    
    
                } else {
                    alert("次回使用案件Noが入力されておりません。または、提案中状況「提案中」「受注(設置待ち)」「設置済(編集待ち)」ではありません");
                    return false;
                }
    
                  var Num
                  var sNum = 0
                  for (var itableNum=1;itableNum<7;itableNum++) {
                  var tableNum = String("table_0") + String(itableNum);
    
                  if (itableNum === 1) {
                      Num = "";
                  } else {
                      Num = "_"+String(sNum);
                      sNum ++;
                  }
                  for (var i1=0; i1<record[tableNum].value.length; i1++) {
                     var query_31 ='在庫NO="'+record[tableNum].value[i1].value["在庫NO"+Num].value+'"';
                     var jyoken = {
                       'app': app_31_id,
                       'query': query_31
                     };
                     kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken, function(resp)
                     {
    
                       if (resp.records.length > 0) {
                         var records_31 = resp.records[0];
                         var org_genba = records_31['_レンタル中_現場名'].value;
                         var org_torihiki = records_31['_レンタル中_得意先名'].value;
                         var org_eigyo = records_31['_レンタル中_営業担当'].value;
                         
                         if( records_31['個別状況'].value == "レンタル中"
                          || records_31['個別状況'].value == "外し(回収予定・提案中)" 
                          || records_31['個別状況'].value == "セット在庫(事務所)" 
                          || records_31['個別状況'].value == "在庫・提案中(事務所)" 
                          || records_31['個別状況'].value == "在庫(事務所)" 
                          || records_31['個別状況'].value == "新品・提案中(事務所)"
                          || records_31['個別状況'].value == "新品(事務所)"
                          || records_31['個別状況'].value == "発注予定"){
                          
                          var records_31_up;  // 2024.1.1 for warning
                          var  _query_31;
                          var arrRireki=[];
                          var now = formatDate(new Date()); 
                          arrRireki = records_31;
    
                          
                          if(records_31['個別状況'].value == "レンタル中"){
    
                           arrRireki._レンタル中_現場名.value=org_genba;
                           arrRireki._レンタル中_得意先名.value=org_torihiki;
                           arrRireki._レンタル中_営業担当.value=org_eigyo;
                           arrRireki.個別状況.value="レンタル中";
                           arrRireki.使用.value="使用";
                           arrRireki.提案する.value="未提案";
                           arrRireki.提案するプランNO.value="";
                           arrRireki.最終現場名.value=record['現場名'].value;
                           arrRireki.最終得意先.value=record['得意先名'].value;
    
                          arrRireki["現場コードテーブル"].value.push({
                            "value":{
                                "現場コード": {"value": records_31['レンタル中現場コード'].value},
                                "プランNo_hist": {"value": records_31['レンタル中プランNO'].value},
                                "履歴登録日": { "value": now },                            
                                "現場名": {"value": records_31['_レンタル中_現場名'].value},
                                "得意先名": {"value": records_31['_レンタル中_得意先名'].value},
                                "営業担当": {"value": records_31['_レンタル中_営業担当'].value}
                             }
                          });
    
                          }else if(records_31['個別状況'].value == "外し(回収予定・提案中)"){
                           arrRireki.レンタル中プランNO.value=records_31['提案するプランNO'].value;
                           arrRireki._レンタル中_現場名.value=org_genba;
                           arrRireki._レンタル中_得意先名.value=org_torihiki;
                           arrRireki._レンタル中_営業担当.value=org_eigyo;
                           arrRireki.個別状況.value="レンタル中";
    //                       arrRireki.個別状況.value="在庫・提案中(事務所)";          // 2024.8.30 nagata-san 「レンタル中」→「在庫・提案中(事務所)」に変更
                           arrRireki.使用.value="使用";
                           arrRireki.提案する.value="未提案";
                           arrRireki.提案するプランNO.value="";
                           arrRireki.最終現場名.value=record['現場名'].value;
                           arrRireki.最終得意先.value=record['得意先名'].value;
    
                           arrRireki["現場コードテーブル"].value.push({
                             "value":{
                                "現場コード": {"value": records_31['レンタル中現場コード'].value},
                                "プランNo_hist": {"value": records_31['レンタル中プランNO'].value},
                                "履歴登録日": { "value": now },                            
                                "現場名": {"value": records_31['_レンタル中_現場名'].value},
                                "得意先名": {"value": records_31['_レンタル中_得意先名'].value},
                                 "営業担当": {"value": records_31['_レンタル中_営業担当'].value}
                             }
                           });
    
                          }else if(records_31['個別状況'].value == "在庫・提案中(事務所)" ||records_31['個別状況'].value == "新品・提案中(事務所)" ){
                           arrRireki.レンタル中プランNO.value=records_31['提案するプランNO'].value;
                           arrRireki._レンタル中_現場名.value=org_genba;
                           arrRireki._レンタル中_得意先名.value=org_torihiki;
                           arrRireki._レンタル中_営業担当.value=org_eigyo;
                           arrRireki.個別状況.value="レンタル中";
                           arrRireki.使用.value="使用";
                           arrRireki.提案する.value="未提案";
                           arrRireki.提案するプランNO.value="";
    
                          }else if(records_31['個別状況'].value == "セット在庫(事務所)" ||records_31['個別状況'].value == "在庫(事務所)" ||records_31['個別状況'].value == "新品(事務所)" ||records_31['個別状況'].value == "発注予定" ){
    //                        console.log("在庫・提案中です");
                            arrRireki.レンタル中プランNO.value=records_31['レンタル中プランNO'].value;
                            arrRireki.個別状況.value="レンタル中";
                            arrRireki.使用.value="使用";
                            arrRireki.提案する.value="未提案";
                            arrRireki.提案するプランNO.value="";
    //                      }else if(records_31['個別状況'].value == "新品・提案中(事務所)" ||records_31['個別状況'].value == "新品・提案中(コンテナ)" ||records_31['個別状況'].value == "発注予定" ){
    //                        arrRireki.レンタル中プランNO.value=records_31['提案するプランNO'].value;
    //                        arrRireki._レンタル中_現場名.value=org_genba;
    //                        arrRireki._レンタル中_得意先名.value=org_torihiki;
    //                        arrRireki._レンタル中_営業担当.value=org_eigyo;
    //                        arrRireki.個別状況.value="レンタル中";
    //                        arrRireki.提案する.value="未提案";
    //                        arrRireki.提案するプランNO.value="";
                          }
                           delete arrRireki['レコード番号'];
                           var arrRireki2=[];
                           arrRireki2 = arrRireki;
                           delete arrRireki2['更新者'];
                           var arrRireki3=[];
                           arrRireki3 = arrRireki2;
                           delete arrRireki3['作成者'];
                           var arrRireki4=[];
                           arrRireki4 = arrRireki3;
                           delete arrRireki4['更新日時'];
                           var arrRireki5=[];
                           arrRireki5 = arrRireki4;
                           delete arrRireki5['作成日時'];
                           _query_31 = '在庫NO="'+records_31['在庫NO'].value+'"';
    
                           doAsyncProcessApp(app_31_id, "家具[在庫・ストック]（物件履歴）", _query_31 , "", arrRireki5, processmsg);
    
                         }
                       }
                     }, function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-家具[在庫・ストック]取得処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error);return false;});
                  }
                }
    // 2023.9.12       
            };
     */
            
            /* 「発注リスト登録」ボタンをクリックイベント 2023.9.21 */
            actionbtn2.onclick = function() {
    
               processmsg.innerHTML="";
    
                var iCounts=0;
                var iFoundSiiresaki=0;
    
                // 在庫_総数
                var zaikoCounts=0;
                // 発注管理更新用Array
                var arrHacyuUp=[];
    
                var uprecordArr13=[];
    
                var uprecordArr14=[];
    
                var tableNum;
                var sNum = 0;
                var Num;
    
                setTimeout(function(){
    
                  for (var itableNum=1;itableNum<7;itableNum++) {
                    if (itableNum !=7 && itableNum !=8 && itableNum !=9 && itableNum !=10 && itableNum !=16) {
                        if (itableNum < 7) {
                            tableNum = String("table_0") + String(itableNum);
                        } else if (itableNum>10){
                            tableNum = String("table_") + String(itableNum);
                    }
    
                    if (itableNum === 1) {
                        Num = "";
                    } else {
                        Num = "_"+String(sNum);
                        sNum ++;
                    }
    
                    console.log("tableNum:"+tableNum);
                    console.log("Num:"+Num);
    
                      for (var i1=0; i1<record[tableNum].value.length; i1++) {
                        if (record[tableNum].value[i1].value["新規発注数"+Num].value > 0 ) {
                                        
                            console.log(record[tableNum].value[i1].value["新規発注数"+Num].value);
                                        
                            // 発注対象レコード（商品コード単位）
                            var recs_08_tbl_01 = record[tableNum].value[i1];
                            var hacyuCounts;
                            hacyuCounts = record[tableNum].value[i1].value["新規発注数"+Num].value
    
                            iFoundSiiresaki = 0;
    
                            var date = new Date();
                            var hacyu = getStringFromDate(date);
                             hacyu = "発注-" + hacyu + "_"+String(iCounts);
    
                             // 発注管理更新
                             if (arrHacyuUp.length === 0) {
                                 console.log("table:"+tableNum+"商品コード："+recs_08_tbl_01.value["商品コード"+Num].value+"_test1");
                                 console.log("record:");
                                 console.log(record);
                                 arrHacyuUp = setArrHacyuUp(arrHacyuUp, recs_08_tbl_01, Num, hacyu, record);
                                            
                              } else {
                                  for (var n=0; n<arrHacyuUp.length; n++) {
                                      if(arrHacyuUp[n]["仕入先名"].value === recs_08_tbl_01.value["メーカー_家具"+Num].value) {
                                          console.log("table:"+tableNum+"商品コード："+recs_08_tbl_01.value["商品コード"+Num].value+"_test2");
                                          iFoundSiiresaki ++;
                                          var hacyuUp = arrHacyuUp[n];
                                          hacyuUp = setArrHacyuUpMesai(hacyuUp, recs_08_tbl_01, Num, hacyu);
                                          arrHacyuUp[n] = hacyuUp;
                                      }
                                  }
    
                                  if (iFoundSiiresaki === 0) {
                                      console.log("table:"+tableNum+"商品コード："+recs_08_tbl_01.value["商品コード"+Num].value+"_test3");
                                      arrHacyuUp = setArrHacyuUp(arrHacyuUp, recs_08_tbl_01,  Num, hacyu, record);
                                  }
                              }
    
                              iCounts ++;
                        }
                              console.log("arrHacyuUp"+arrHacyuUp);
                      }
                    }
                  }
                  if (iCounts === 0) {
                    alert("発注対象はありません");
                    return false;
                  } else {
    
                  // 発注管理アプリへの追加（複数）
                  doProcessAppRecords(app_16_id,"発注管理", "", arrHacyuUp, "", processmsg);
    
                  }
    
                }, 1000);
            };
            // 2023.9.21 発注登録ボタン
    
    
    
    
            actionbtn3.onclick = async function() {
            processmsg.innerHTML="";
    //debugger;
              /* プラン集更新 */
              if (record['提案'].value == "回収予定" && record['提案中状況'].value == "未提案") {
                try{
              
                  await f_btn3_update32(record);
                  await f_btn3_update31(record);
                }catch(error){
                  console.log(error);
                  alert("個別在庫の情報更新処理中にエラーが発生しました。処理を中止します。");
                }
              }else {
                    alert("プラン状況が「回収予定」かつ、提案中状況が「未提案」ではありません");
                    return false;
              }
            }
    
    
    async function f_btn3_update32(record){
      try{
      var arrRireki32=[];
      arrRireki32 = record;
      var org_genba = record['現場名'].value;
      var org_torihiki= record['得意先名'].value;
      arrRireki32["物件履歴"].value.push({
         "value":{
           "案件番号_hist": {"value": record['案件NO_レンタル中_'].value},
           "現場名_hist": {"value": record['現場名'].value},
           "得意先_hist": {"value": record['得意先名'].value},
           "営業担当_hist": {"value": record['営業担当'].value},
           "コメント_hist": {"value": record['コメント_レンタル中物件_'].value}
         }
      });
        delete arrRireki32.プランNO;
        delete arrRireki32.更新者;
        delete arrRireki32.作成者;
        delete arrRireki32.更新日時;
        delete arrRireki32.作成日時;
        delete arrRireki32.プランNO_lu;
        delete arrRireki32.プランNO_lu_0;
        delete arrRireki32.プランNO_lu_1;
        delete arrRireki32.プランNO_lu_2;
        delete arrRireki32.プランNO_lu_3;
        delete arrRireki32.プランNO_lu_4;
        delete arrRireki32._01_ソファ個別在庫_提案_;
        delete arrRireki32._01_ダイニングテーブル個別在庫_提案_;
        delete arrRireki32._03_テレビボード個別在庫_提案_;
        delete arrRireki32._04_センターテーブル_個別在庫_提案_;
        delete arrRireki32._05_ラグ_個別在庫_提案_;
        delete arrRireki32._06_その他_個別在庫_提案_;
        arrRireki32.提案.value="倉庫";
        arrRireki32.案件NO_レンタル中_.value="";
        arrRireki32.コメント_レンタル中物件_.value="";
        arrRireki32.コメント_次回物件_.value="";
        arrRireki32.最終現場名.value=org_genba;
        arrRireki32.最終得意先.value=org_torihiki;
    
        // 2024.1.22
        var query_32 = 'NO="'+record['NO'].value+'"';
        await doAsyncProcessApp_r(app_32_id, "[レンタル・プラン集](物件履歴)", query_32,"", arrRireki32, processmsg)  // 物件履歴反映版
        .then(function(response){
          console.log("OK");
        })
        .catch(function(error){
          console.log("データベース処理でエラーが発生しました。");
          throw error;
        });
      }catch(error){
        throw error;
      }
    }
    
    
    async function f_btn3_update31(record){
    
        try{
            var Num;
            var sNum = 0;
    
            //　サブテーブルをループ
            for (var itableNum=1;itableNum<7;itableNum++) {
              var tableNum = String("table_0") + String(itableNum);
              if (itableNum === 1) {
                  Num = "";
              } else {
                  Num = "_"+String(sNum);
                  sNum ++;
              }
    
              //　サブテーブル内の在庫数分ループ
              for (var i1=0; i1<record[tableNum].value.length; i1++) {
                 var query_31 ='在庫NO="'+record[tableNum].value[i1].value["在庫NO"+Num].value+'"';
                 var jyoken = {
                   'app': app_31_id,
                   'query': query_31
                 };
                 const resp = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken);
                 if (resp.records.length > 0) {
                    var records_31 = resp.records[0];
                      var rirekiFlg=0;
                      var records_31_up;  // 2024.1.1 for warning
                      var  _query_31;
                      var arrRireki=[];
                      var now = formatDate(new Date());
                      var genba_code = records_31['レンタル中現場コード'].value;
                      var plan_no = records_31['レンタル中プランNO'].value;
                      var genba = records_31['_レンタル中_現場名'].value;
                      var tokuisaki = records_31['_レンタル中_得意先名'].value;
                      var eigyo = records_31['_レンタル中_営業担当'].value;
                      arrRireki = records_31;
    
                    if( records_31['個別状況'].value == "レンタル中"
                      || records_31['個別状況'].value == "外し(回収予定)"){
                       arrRireki._レンタル中_現場名.value=""
                       arrRireki._レンタル中_得意先名.value="";
                       arrRireki._レンタル中_営業担当.value="";
    //                   arrRireki.レンタル中プランNO.value="";
                       arrRireki.個別状況.value="セット在庫(事務所)";
                       arrRireki.使用.value="使用";
                       arrRireki.提案する.value="未提案";
                       arrRireki.提案するプランNO.value="";
                       arrRireki.最終現場名.value=record['現場名'].value;
                       arrRireki.最終得意先.value=record['得意先名'].value;
                       arrRireki["現場コードテーブル"].value.push({
                         "value":{
                            "現場コード": {"value": genba_code},
                            "プランNo_hist": {"value": plan_no},
                            "履歴登録日": { "value": now },                            
                            "現場名": {"value": genba},
                            "得意先名": {"value": tokuisaki},
                            "営業担当": {"value": eigyo}
                            }
                         });
    
                         delete arrRireki.レコード番号;
                         delete arrRireki.更新者;
                         delete arrRireki.作成者;
                         delete arrRireki.更新日時;
                         delete arrRireki.作成日時;
                    }
                    _query_31 = '在庫NO="'+records_31['在庫NO'].value+'"';
                    await doAsyncProcessApp_r(app_31_id, "家具[在庫・ストック](物件履歴)", _query_31 , "", arrRireki, processmsg)
                    .then(function(response){
                     console.log("OK");
                    })
                    .catch(function(error){
                       console.log("データベース処理でエラーが発生しました。");
                       throw error;
                    });                  
                  }
               }
            }
            return;
        }catch(error){
            throw error;
        }
    }
    
    /*
            actionbtn3.onclick = function() {
    
              processmsg.innerHTML="";
    
              // プラン集更新
              if (record['提案'].value == "回収予定" && record['提案中状況'].value == "未提案") {
                    // 2024.2.23
                    var arrRireki32=[];
    
                    arrRireki32 = record;
                    var org_genba = record['現場名'].value;
                    var org_torihiki= record['得意先名'].value;
                    arrRireki32["物件履歴"].value.push({
                      "value":{
                        "案件番号_hist": {"value": record['案件NO_レンタル中_'].value},
                        "現場名_hist": {"value": record['現場名'].value},
                        "得意先_hist": {"value": record['得意先名'].value},
                        "営業担当_hist": {"value": record['営業担当'].value},
                        "コメント_hist": {"value": record['コメント_レンタル中物件_'].value}
                      }
                    });
    
                           delete arrRireki32['プランNO'];
                           var arrRireki322=[];
                           arrRireki322 = arrRireki32;
                           delete arrRireki322['更新者'];
                           var arrRireki323=[];
                           arrRireki323 = arrRireki322;
                           delete arrRireki323['作成者'];
                           var arrRireki324=[];
                           arrRireki324 = arrRireki323;
                           delete arrRireki324['更新日時'];
                           var arrRireki325=[];
                           arrRireki325 = arrRireki324;
                           delete arrRireki325['作成日時'];
                           var arrRireki326=[];
                           arrRireki326 = arrRireki325;
                           delete arrRireki326['プランNO_lu'];
                           var arrRireki327=[];
                           arrRireki327 = arrRireki326;
                           delete arrRireki327['プランNO_lu_0'];
                           var arrRireki328=[];
                           arrRireki328 = arrRireki327;
                           delete arrRireki328['プランNO_lu_1'];
                           var arrRireki329=[];
                           arrRireki329 = arrRireki328;
                           delete arrRireki329['プランNO_lu_2'];
                           var arrRireki330=[];
                           arrRireki330 = arrRireki329;
                           delete arrRireki330['プランNO_lu_3'];
                           var arrRireki331=[];
                           arrRireki331 = arrRireki330;
                           delete arrRireki331['プランNO_lu_4'];
                           var arrRireki332=[];
                           arrRireki332 = arrRireki331;
                           delete arrRireki332['_01_ソファ個別在庫_提案_'];
                           var arrRireki333=[];
                           arrRireki333 = arrRireki332;
                           delete arrRireki333['_01_ダイニングテーブル個別在庫_提案_'];
                           var arrRireki334=[];
                           arrRireki334 = arrRireki333;
                           delete arrRireki334['_03_テレビボード個別在庫_提案_'];
                           var arrRireki335=[];
                           arrRireki335 = arrRireki334;
                           delete arrRireki335['_04_センターテーブル_個別在庫_提案_'];
                           var arrRireki336=[];
                           arrRireki336 = arrRireki335;
                           delete arrRireki336['_05_ラグ_個別在庫_提案_'];
                           var arrRireki337=[];
                           arrRireki337 = arrRireki336;
                           delete arrRireki337['_06_その他_個別在庫_提案_'];
                           
                    arrRireki337.提案.value="倉庫";
                    arrRireki337.案件NO_レンタル中_.value="";
                    arrRireki337.コメント_レンタル中物件_.value="";
                    arrRireki337.コメント_次回物件_.value="";
                    arrRireki337.最終現場名.value=org_genba;
                    arrRireki337.最終得意先.value=org_torihiki;
    
                    // 2024.1.22
                    var query_32 = 'NO="'+record['NO'].value+'"';
    
                    doAsyncProcessApp(app_32_id, "[レンタル・プラン集](物件履歴)", query_32,"", arrRireki337, processmsg);  // 物件履歴反映版
    
                } else {
                    alert("プラン状況が「回収予定」かつ、提案中状況が「未提案」ではありません");
                    return false;
                }
    
              // 個別在庫更新
                var Num
                var sNum = 0
                for (var itableNum=1;itableNum<7;itableNum++) {
                var tableNum = String("table_0") + String(itableNum);
    
                  if (itableNum === 1) {
                      Num = "";
                  } else {
                      Num = "_"+String(sNum);
                      sNum ++;
                  }
                  for (var i1=0; i1<record[tableNum].value.length; i1++) {
                    // 家具[在庫・ストック]からデータを取得
                     var query_31 ='在庫NO="'+record[tableNum].value[i1].value["在庫NO"+Num].value+'"';
                     var jyoken = {
                       'app': app_31_id,
                       'query': query_31
                     };
                     kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken, function(resp)
                     {
                       if (resp.records.length > 0) {
    
                         var records_31 = resp.records[0];
    
                         if( records_31['個別状況'].value == "レンタル中"
                          || records_31['個別状況'].value == "外し(回収予定)"){ 
                          
                          var rirekiFlg=0;
                          var records_31_up;  // 2024.1.1 for warning
                          var  _query_31;
                          var arrRireki=[];
                          var now = formatDate(new Date());
                          var genba_code = records_31['レンタル中現場コード'].value;
                          var plan_no = records_31['レンタル中プランNO'].value;
                          var genba = records_31['_レンタル中_現場名'].value;
                          var tokuisaki = records_31['_レンタル中_得意先名'].value;
                          var eigyo = records_31['_レンタル中_営業担当'].value;
                          arrRireki = records_31;
                          
                          if(records_31['個別状況'].value == "レンタル中" || records_31['個別状況'].value == "外し(回収予定)"){
    
                           arrRireki._レンタル中_現場名.value="";
                           arrRireki._レンタル中_得意先名.value="";
                           arrRireki._レンタル中_営業担当.value="";
                           arrRireki.個別状況.value="セット在庫(事務所)";
                           arrRireki.使用.value="使用";
                           arrRireki.提案する.value="未提案";
                           arrRireki.提案するプランNO.value="";
                           arrRireki.最終現場名.value=record['現場名'].value;
                           arrRireki.最終得意先.value=record['得意先名'].value;
                           
                           arrRireki["現場コードテーブル"].value.push({
                             "value":{
                                "現場コード": {"value": genba_code},
                                "プランNo_hist": {"value": plan_no},
                                "履歴登録日": { "value": now },
                                "現場名": {"value": genba},
                                "得意先名": {"value": tokuisaki},
                                 "営業担当": {"value": eigyo}
                             }
                           });
    
                          }
    
                           delete arrRireki['レコード番号'];
                           var arrRireki2=[];
                           arrRireki2 = arrRireki;
                           delete arrRireki2['更新者'];
                           var arrRireki3=[];
                           arrRireki3 = arrRireki2;
                           delete arrRireki3['作成者'];
                           var arrRireki4=[];
                           arrRireki4 = arrRireki3;
                           delete arrRireki4['更新日時'];
                           var arrRireki5=[];
                           arrRireki5 = arrRireki4;
                           delete arrRireki5['作成日時'];
    
                           _query_31 = '在庫NO="'+records_31['在庫NO'].value+'"';
    
                           doAsyncProcessApp(app_31_id, "家具[在庫・ストック](物件履歴)", _query_31 , "", arrRireki5, processmsg);
                         }
                       }
                     }, function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-家具[在庫・ストック]取得処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error);return false;});  
                  }
                }
    // 2023.9.12       
    
    
            };
     */
            // 2024.1.1 倉庫戻しボタン
    
           /* 「在庫戻し（バラ）」ボタンをクリックイベント 2024.10.13 */
            actionbtn4.onclick = async function() {
            processmsg.innerHTML="";
    //debugger;
              /* プラン集更新 */
              if ((record['提案'].value == "回収予定"||record['提案'].value == "倉庫"||record['提案'].value == "ストック(新品)" )&& record['提案中状況'].value == "未提案") {
                try{
              
                  await f_btn4_update31(record);
                  await f_btn4_update32(record);
                }catch(error){
                  console.log(error);
                  alert("個別在庫の情報更新処理中にエラーが発生しました。処理を中止します。");
                }
             }
            }
    
    
    async function f_btn4_update32(record){
      try{
      var arrRireki32=[];
      arrRireki32 = record;
      var org_genba = record['現場名'].value;
      var org_torihiki= record['得意先名'].value;
      if(record['提案'].value == "回収予定"){
        arrRireki32["物件履歴"].value.push({
         "value":{
           "案件番号_hist": {"value": record['案件NO_レンタル中_'].value},
           "現場名_hist": {"value": record['現場名'].value},
           "得意先_hist": {"value": record['得意先名'].value},
           "営業担当_hist": {"value": record['営業担当'].value},
           "コメント_hist": {"value": record['コメント_レンタル中物件_'].value}
         }
        });
        delete arrRireki32.プランNO;
        delete arrRireki32.更新者;
        delete arrRireki32.作成者;
        delete arrRireki32.更新日時;
        delete arrRireki32.作成日時;
        delete arrRireki32.プランNO_lu;
        delete arrRireki32.プランNO_lu_0;
        delete arrRireki32.プランNO_lu_1;
        delete arrRireki32.プランNO_lu_2;
        delete arrRireki32.プランNO_lu_3;
        delete arrRireki32.プランNO_lu_4;
        delete arrRireki32._01_ソファ個別在庫_提案_;
        delete arrRireki32._01_ダイニングテーブル個別在庫_提案_;
        delete arrRireki32._03_テレビボード個別在庫_提案_;
        delete arrRireki32._04_センターテーブル_個別在庫_提案_;
        delete arrRireki32._05_ラグ_個別在庫_提案_;
        delete arrRireki32._06_その他_個別在庫_提案_;
        arrRireki32.提案.value="欠番";
        arrRireki32.回収期限日.value="";               // 2024.7.1
        arrRireki32.案件NO_レンタル中_.value="";
        arrRireki32.コメント_レンタル中物件_.value="";
        arrRireki32.コメント_次回物件_.value="";
        arrRireki32.最終現場名.value=org_genba;
        arrRireki32.最終得意先.value=org_torihiki;
    
        // 2024.1.22
        var query_32 = 'NO="'+record['NO'].value+'"';
        await doAsyncProcessApp_r(app_32_id, "[レンタル・プラン集](物件履歴)", query_32,"", arrRireki32, processmsg)  // 物件履歴反映版
        .then(function(response){
          console.log("OK");
        })
        .catch(function(error){
          console.log("データベース処理でエラーが発生しました。");
          throw error;
        });
        }else{ // 倉庫、新品ストックの時は履歴を追加しない。
          var records_32_up = {
            "提案": { "value": "欠番"}
            }
            var query_32_2 = 'NO="'+record['NO'].value+'"';
            await doAsyncProcessApp_r(app_32_id, "[レンタル・プラン集]", query_32_2,"", records_32_up, processmsg);  // 物件履歴は追記しない
        }
      }catch(error){
        throw error;
      }
    }
    
    
    async function f_btn4_update31(record){
    
        try{
            var Num;
            var sNum = 0;
    //        var records_31 = record;
            
            //　サブテーブルをループ
            for (var itableNum=1;itableNum<7;itableNum++) {
              var tableNum = String("table_0") + String(itableNum);
              if (itableNum === 1) {
                  Num = "";
              } else {
                  Num = "_"+String(sNum);
                  sNum ++;
              }
    
              //　サブテーブル内の在庫数分ループ
              for (var i1=0; i1<record[tableNum].value.length; i1++) {
                 var query_31 ='在庫NO="'+record[tableNum].value[i1].value["在庫NO"+Num].value+'"';
                 var jyoken = {
                   'app': app_31_id,
                   'query': query_31
                 };
                 const resp = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken);
                 if (resp.records.length > 0) {
                    var records_31 = resp.records[0];
                      var rirekiFlg=0;
                      var records_31_up;  // 2024.1.1 for warning
                      var  _query_31;
                      var arrRireki=[];
                      var now = formatDate(new Date());
                      var genba_code = records_31['レンタル中現場コード'].value;
                      var plan_no = records_31['レンタル中プランNO'].value;
                      var genba = records_31['_レンタル中_現場名'].value;
                      var tokuisaki = records_31['_レンタル中_得意先名'].value;
                      var eigyo = records_31['_レンタル中_営業担当'].value;
                      arrRireki = records_31;
    
                    if( records_31['個別状況'].value == "レンタル中"
                      || records_31['個別状況'].value == "外し(回収予定)"){
                       arrRireki._レンタル中_現場名.value=""
                       arrRireki._レンタル中_得意先名.value="";
                       arrRireki._レンタル中_営業担当.value="";
                       arrRireki.レンタル中プランNO.value="";
                       arrRireki.個別状況.value="在庫(事務所)";
                       arrRireki.使用.value="使用";
                       arrRireki.提案する.value="未提案";
                       arrRireki.提案するプランNO.value="";
                       arrRireki.最終現場名.value=record['現場名'].value;
                       arrRireki.最終得意先.value=record['得意先名'].value;
                       arrRireki["現場コードテーブル"].value.push({
                         "value":{
                            "現場コード": {"value": genba_code},
                            "プランNo_hist": {"value": plan_no},
                            "履歴登録日": { "value": now },                            
                            "現場名": {"value": genba},
                            "得意先名": {"value": tokuisaki},
                            "営業担当": {"value": eigyo}
                            }
                         });
    
                         delete arrRireki.レコード番号;
                         delete arrRireki.更新者;
                         delete arrRireki.作成者;
                         delete arrRireki.更新日時;
                         delete arrRireki.作成日時;
                         
                    }else if(records_31['個別状況'].value == "セット在庫(事務所)"){
    
                         arrRireki._レンタル中_現場名.value=""
                         arrRireki._レンタル中_得意先名.value="";
                         arrRireki._レンタル中_営業担当.value="";
                         arrRireki.レンタル中プランNO.value="";
                         arrRireki.個別状況.value="在庫(事務所)";
                         arrRireki.使用.value="使用";
                         arrRireki.提案する.value="未提案";
                         arrRireki.提案するプランNO.value="";
                         arrRireki.最終現場名.value=record['現場名'].value;
                         arrRireki.最終得意先.value=record['得意先名'].value;
    
                         delete arrRireki.レコード番号;
                         delete arrRireki.更新者;
                         delete arrRireki.作成者;
                         delete arrRireki.更新日時;
                         delete arrRireki.作成日時;
    
                    }else{ // レンタル中、回収予定ではない、倉庫にあるものは物件履歴に追記しない
                         arrRireki = {
                           "レンタル中プランNO" : { "value" : "" }
                         }
    
                    }
                    _query_31 = '在庫NO="'+records_31['在庫NO'].value+'"';
                    await doAsyncProcessApp_r(app_31_id, "家具[在庫・ストック]", _query_31 , "", arrRireki, processmsg)
                    .then(function(response){
                     console.log("OK");
                    })
                    .catch(function(error){
                       console.log("データベース処理でエラーが発生しました。");
                       throw error;
                    });                  
                  }
               }
            }
            return;
        }catch(error){
            throw error;
        }
    }
    
    
           /* 「在庫戻し（バラ）」ボタンをクリックイベント 2024.1.22 */
    /*
            actionbtn4.onclick = function() {
    
              processmsg.innerHTML="";
    
              // プラン集更新 
              if ((record['提案'].value == "回収予定"||record['提案'].value == "倉庫"||record['提案'].value == "ストック(新品)" )&& record['提案中状況'].value == "未提案") {
    
                    // 2024.2.23
                    var arrRireki32=[];
                    arrRireki32 = record;
                    var org_genba = record['現場名'].value;
                    var org_torihiki= record['得意先名'].value;
                    if(record['提案'].value == "回収予定"){
                      arrRireki32["物件履歴"].value.push({
                        "value":{
                          "案件番号_hist": {"value": record['案件NO_レンタル中_'].value},
                          "現場名_hist": {"value": record['現場名'].value},
                          "得意先_hist": {"value": record['得意先名'].value},
                          "営業担当_hist": {"value": record['営業担当'].value},
                          "コメント_hist": {"value": record['コメント_レンタル中物件_'].value}
                        }
                      });
    
                           delete arrRireki32['プランNO'];
                           var arrRireki322=[];
                           arrRireki322 = arrRireki32;
                           delete arrRireki322['更新者'];
                           var arrRireki323=[];
                           arrRireki323 = arrRireki322;
                           delete arrRireki323['作成者'];
                           var arrRireki324=[];
                           arrRireki324 = arrRireki323;
                           delete arrRireki324['更新日時'];
                           var arrRireki325=[];
                           arrRireki325 = arrRireki324;
                           delete arrRireki325['作成日時'];
                           var arrRireki326=[];
                           arrRireki326 = arrRireki325;
                           delete arrRireki326['プランNO_lu'];
                           var arrRireki327=[];
                           arrRireki327 = arrRireki326;
                           delete arrRireki327['プランNO_lu_0'];
                           var arrRireki328=[];
                           arrRireki328 = arrRireki327;
                           delete arrRireki328['プランNO_lu_1'];
                           var arrRireki329=[];
                           arrRireki329 = arrRireki328;
                           delete arrRireki329['プランNO_lu_2'];
                           var arrRireki330=[];
                           arrRireki330 = arrRireki329;
                           delete arrRireki330['プランNO_lu_3'];
                           var arrRireki331=[];
                           arrRireki331 = arrRireki330;
                           delete arrRireki331['プランNO_lu_4'];
                           var arrRireki332=[];
                           arrRireki332 = arrRireki331;
                           delete arrRireki332['_01_ソファ個別在庫_提案_'];
                           var arrRireki333=[];
                           arrRireki333 = arrRireki332;
                           delete arrRireki333['_01_ダイニングテーブル個別在庫_提案_'];
                           var arrRireki334=[];
                           arrRireki334 = arrRireki333;
                           delete arrRireki334['_03_テレビボード個別在庫_提案_'];
                           var arrRireki335=[];
                           arrRireki335 = arrRireki334;
                           delete arrRireki335['_04_センターテーブル_個別在庫_提案_'];
                           var arrRireki336=[];
                           arrRireki336 = arrRireki335;
                           delete arrRireki336['_05_ラグ_個別在庫_提案_'];
                           var arrRireki337=[];
                           arrRireki337 = arrRireki336;
                           delete arrRireki337['_06_その他_個別在庫_提案_'];
                           
                    arrRireki337.提案.value="欠番";
                    arrRireki337.回収期限日.value="";               // 2024.7.1
                    arrRireki337.案件NO_レンタル中_.value="";
                    arrRireki337.コメント_レンタル中物件_.value="";
                    arrRireki337.コメント_次回物件_.value="";
                    arrRireki337.最終現場名.value=org_genba;
                    arrRireki337.最終得意先.value=org_torihiki;
    
    
                    // 2024.1.22
                    var query_32 = 'NO="'+record['NO'].value+'"';
                    doAsyncProcessApp(app_32_id, "[レンタル・プラン集](物件履歴)", query_32,"", arrRireki337, processmsg);  // 物件履歴反映版
                    }else{ // 倉庫、新品ストックの時は履歴を追加しない。
                      var records_32_up = {
                        "提案": { "value": "欠番"}
                      }
                      var query_32_2 = 'NO="'+record['NO'].value+'"';
                      doAsyncProcessApp(app_32_id, "[レンタル・プラン集]", query_32_2,"", records_32_up, processmsg);  // 物件履歴は追記しない
                    }
                    
                } else {
                    alert("プラン状況が「回収予定or倉庫orストック新品」かつ、提案中状況が「未提案」ではありません");
                    return false;
                }
    
              // 個別在庫更新
                var Num
                var sNum = 0
                for (var itableNum=1;itableNum<7;itableNum++) {
                var tableNum = String("table_0") + String(itableNum);
    
                  if (itableNum === 1) {
                      Num = "";
                  } else {
                      Num = "_"+String(sNum);
                      sNum ++;
                  }
                  for (var i1=0; i1<record[tableNum].value.length; i1++) {
                    // 家具[在庫・ストック]からデータを取得
                     var query_31 ='在庫NO="'+record[tableNum].value[i1].value["在庫NO"+Num].value+'"';
                     var jyoken = {
                       'app': app_31_id,
                       'query': query_31
                     };
                     kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken, function(resp)
                     {
                       if (resp.records.length > 0) {
    //                     console.log("個別データ取得");
                         var records_31 = resp.records[0];
    //                     console.log(records_31['個別状況'].value);
    
    
                          var rirekiFlg=0;
                          var records_31_up;  // 2024.1.1 for warning
                          var  _query_31;
                          var arrRireki=[];
                          var now = formatDate(new Date());
                          var genba_code = records_31['レンタル中現場コード'].value;
                          var plan_no = records_31['レンタル中プランNO'].value;
                          var genba = records_31['_レンタル中_現場名'].value;
                          var tokuisaki = records_31['_レンタル中_得意先名'].value;
                          var eigyo = records_31['_レンタル中_営業担当'].value;
                          arrRireki = records_31;
    
                           var arrRireki2=[];
                           var arrRireki3=[];
                           var arrRireki4=[];
                           var arrRireki5=[];
                           
                         if( records_31['個別状況'].value == "レンタル中"
                          || records_31['個別状況'].value == "外し(回収予定)"){
                           arrRireki._レンタル中_現場名.value=""
                           arrRireki._レンタル中_得意先名.value="";
                           arrRireki._レンタル中_営業担当.value="";
                           arrRireki.レンタル中プランNO.value="";
                           arrRireki.個別状況.value="在庫(事務所)";
                           arrRireki.使用.value="使用";
                           arrRireki.提案する.value="未提案";
                           arrRireki.提案するプランNO.value="";
                           arrRireki.最終現場名.value=record['現場名'].value;
                           arrRireki.最終得意先.value=record['得意先名'].value;
    
                           arrRireki["現場コードテーブル"].value.push({
                             "value":{
                                "現場コード": {"value": genba_code},
                                "プランNo_hist": {"value": plan_no},
                                "履歴登録日": { "value": now },                            
                                "現場名": {"value": genba},
                                "得意先名": {"value": tokuisaki},
                                 "営業担当": {"value": eigyo}
                             }
                           });
    
                           delete arrRireki['レコード番号'];
                           arrRireki2 = arrRireki;
                           delete arrRireki2['更新者'];
                           arrRireki3 = arrRireki2;
                           delete arrRireki3['作成者'];
                           arrRireki4 = arrRireki3;
                           delete arrRireki4['更新日時'];
                           arrRireki5 = arrRireki4;
                           delete arrRireki5['作成日時'];
    
                           _query_31 = '在庫NO="'+records_31['在庫NO'].value+'"';
                           doAsyncProcessApp(app_31_id, "家具[在庫・ストック](物件履歴)", _query_31 , "", arrRireki5, processmsg);
                           
                         }else if(records_31['個別状況'].value == "セット在庫(事務所)"){
    
                           arrRireki._レンタル中_現場名.value=""
                           arrRireki._レンタル中_得意先名.value="";
                           arrRireki._レンタル中_営業担当.value="";
                           arrRireki.レンタル中プランNO.value="";
                           arrRireki.個別状況.value="在庫(事務所)";
                           arrRireki.使用.value="使用";
                           arrRireki.提案する.value="未提案";
                           arrRireki.提案するプランNO.value="";
                           arrRireki.最終現場名.value=record['現場名'].value;
                           arrRireki.最終得意先.value=record['得意先名'].value;
    
                           delete arrRireki['レコード番号'];
                           arrRireki2 = arrRireki;
                           delete arrRireki2['更新者'];
                           arrRireki3 = arrRireki2;
                           delete arrRireki3['作成者'];
                           arrRireki4 = arrRireki3;
                           delete arrRireki4['更新日時'];
                           arrRireki5 = arrRireki4;
                           delete arrRireki5['作成日時'];
    
                           _query_31 = '在庫NO="'+records_31['在庫NO'].value+'"';
                           doAsyncProcessApp(app_31_id, "家具[在庫・ストック](物件履歴)", _query_31 , "", arrRireki5, processmsg);
                           
                         }else{ // レンタル中、回収予定ではない、倉庫にあるものは物件履歴に追記しない
                           var records_31_2_up = {
                             "レンタル中プランNO" : { "value" : "" }
                           }
                           _query_31 = '在庫NO="'+records_31['在庫NO'].value+'"';
                           doAsyncProcessApp(app_31_id, "家具[在庫・ストック]", _query_31 , "", records_31_2_up, processmsg);
                         }
                       }
                     }, function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-家具[在庫・ストック]取得処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error);return false;});  
                  }
                }
            }
     */
            // 2024.1.22 在庫戻し（バラ）ボタン
    
    
           /* 「提案中のキャンセル」ボタンをクリックイベント 2024.2.4 */
            actionbtn5.onclick = function() {
    
              processmsg.innerHTML="";
    
              /* プラン集更新 */
              if (record['提案中状況'].value == "提案中"||record['提案中状況'].value == "受注(設置待ち)") {
                    var records_32_up = {
                        "提案中状況": { "value": "未提案" },
                        "次回使用_案件NO_": { "value": ""}
                    }
                    var query_32 = 'NO="'+record['NO'].value+'"';
                    doProcessApp(app_32_id, "[レンタル・プラン集]", query_32,"", records_32_up, processmsg);
    
                } else {
                    alert("プラン状況が「回収予定」かつ、提案中状況が「未提案」ではありません");
                    return false;
                }
    
            }
            // 2024.2.4 「提案中のキャンセル」ボタン
    
    
           /* 「家具情報クリア」ボタンをクリックイベント (サブテーブルの家具情報をクリアします) 2024.7.11 */
            actionbtn6.onclick = function() {
    
              processmsg.innerHTML="";
    
              /* プラン集更新 */
              if (record['提案'].value == "欠番" && record['提案中状況'].value == "未提案") {
    
        var count = 0;
      count = record.table_01.value.length;
      for (var i = 0; i < count; i++) {
      record.table_01.value[i].value['在庫NO'].lookup = 'CLEAR';
      }
      console.log("CLEAR!!!");
              } else {
                  alert("プラン状況が「欠番」かつ、提案中状況が「未提案」ではありません");
                  return false;
              }
    
    
            }
            // 2024.2.4 「提案中のキャンセル」ボタン
    
            
            
        });
    })();
    
    // 2023.8.18