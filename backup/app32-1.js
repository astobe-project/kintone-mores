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
//            spanarea.appendChild(actionbtn2);
            spanarea.appendChild(actionbtn3);
            spanarea.appendChild(actionbtn4);
            spanarea.appendChild(actionbtn5);
    //        spanarea.appendChild(actionbtn6);
            spanarea.appendChild(actionbtn7);
            header.appendChild(processmsg);
          

// 提案していたプランNoを使用プランNoとして更新
// 提案プランNoは空欄にリセット
actionbtn.onclick = async function() {
    processmsg.innerHTML="";
    var record = event.record;
    if ((record['提案中状況'].value == "提案中" || record['提案中状況'].value == "受注(設置待ち)" || record['提案中状況'].value == "設置済(編集待ち)" ) && record['次回使用_案件NO_'].value !== "") {
        try{
          await f_record_update32(record);
          await alert("プラン集の情報を更新が完了しました。OKボタンを押してください。");
          await f_record_update31(record);
          await alert("個別在庫の情報の更新が完了しました。次に、プラン集の更新を行います。OKボタンを押してください。");
//                  await f_record_update31_2nd(record);
//                  await alert("個別在庫の物件情報の更新が完了しました。OKボタンを押してください。");
        }catch(error){
          console.log(error);
          alert("個別在庫の情報更新処理中にエラーが発生しました。処理を中止します。");
        }
    }else{
        alert("提案中状況が「提案中」「受注(設置待ち)」「設置済(編集待ち)」となっていないか、次回使用案件Noが空欄です。");
    }
}
    
async function f_record_update31(record32){
    try{
        var query_31 ='レンタル中プランNO="'+record32.NO.value+'"';
        var jyoken = {
            'app': app_31_id,
            'query': query_31
        };

        var now = formatDate(new Date()); 
        const resp = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken);

        const records_31 = resp.records;

        records_31.forEach(async record31 => {
            // 各レコードに対する処理をここに記述します
            var g_subTable = record31.現場コードテーブル.value; // 2024.9.15
            console.log(record);
                var newRow = {
                    value:{
                      "現場コード": {"value": record31['レンタル中現場コード'].value},
                      "プランNo_hist": {"value": record31['レンタル中プランNO'].value},
                      "履歴登録日": { "value": now },                            
                      "現場名": {"value": record31['_レンタル中_現場名'].value},
                      "得意先名": {"value": record31['_レンタル中_得意先名'].value},
                      "営業担当": {"value": record31['_レンタル中_営業担当'].value}
                    }
                };

                var records_31_up;  // 2024.1.1 for warning
                var  _query_31;

                if(record31['個別状況'].value == "レンタル中"){
                    record31._レンタル中_現場名_0.value=record['_次回_現場名'].value; 
                    record31._レンタル中_得意先名.value=record['_次回_得意先名1'].value;
                    record31._レンタル中_営業担当.value=record['_次回_営業担当'].value;
                    record31.個別状況.value="レンタル中";
                    record31.保管場所.value="";
                    record31.使用.value="使用";
                    record31.提案する.value="未提案";
                    record31.提案するプランNO.value="";
                    record31.最終現場名.value=record['現場名'].value;
                    record31.最終得意先.value=record['得意先名'].value;
                    g_subTable.push(newRow);
                }else if(record31['個別状況'].value == "外し(回収予定・提案中)"){
                    record31.レンタル中プランNO.value=record31['提案するプランNO'].value;
                    record31.個別状況.value="レンタル中";
                    record31.保管場所.value="";
                    record31._レンタル中_現場名.value=record['_次回_現場名'].value; 
                    record31._レンタル中_得意先名.value=record['_次回_得意先名1'].value;
                    record31._レンタル中_営業担当.value=record['_次回_営業担当'].value;
                    record31.使用.value="使用";
                    record31.提案する.value="未提案";
                    record31.提案するプランNO.value="";
                    record31.最終現場名.value=record['現場名'].value;
                    record31.最終得意先.value=record['得意先名'].value;
                    g_subTable.push(newRow);
                }else if(record31['個別状況'].value == "外し(回収予定)" && hazushi_flg === "1"){
                    record31._レンタル中_現場名.value="";
                    record31._レンタル中_得意先名.value="";
                    record31._レンタル中_営業担当.value="";
                    record31.レンタル中プランNO.value="";
                    record31.個別状況.value="在庫(事務所)";
                    record31.使用.value="使用";
                    record31.提案する.value="未提案";
                    record31.提案するプランNO.value="";
                    record31.最終現場名.value=record['現場名'].value;
                    record31.最終得意先.value=record['得意先名'].value;
                    g_subTable.push(newRow);
                }else if(record31['個別状況'].value == "在庫・提案中(事務所)" ||record31['個別状況'].value == "新品・提案中(事務所)" ){
                    record31.レンタル中プランNO.value=records_31['提案するプランNO'].value;
                    record31._レンタル中_現場名.value=record['_次回_現場名'].value; 
                    record31._レンタル中_得意先名.value=record['_次回_得意先名1'].value;
                    record31._レンタル中_営業担当.value=record['_次回_営業担当'].value;
                    record31.個別状況.value="レンタル中";
                    record31.保管場所.value="";
                    record31.使用.value="使用";
                    record31.提案する.value="未提案";
                    record31.提案するプランNO.value="";
    
                }else if(record31['個別状況'].value == "セット在庫(事務所)" ||record31['個別状況'].value == "在庫(事務所)" ||record31['個別状況'].value == "新品(事務所)" ||record31['個別状況'].value == "発注予定" ){
                    record31.レンタル中プランNO.value=record31['レンタル中プランNO'].value;
                    record31.個別状況.value="レンタル中";
                    record31.保管場所.value="";
                    record31._レンタル中_現場名.value=record['_次回_現場名'].value; 
                    record31._レンタル中_得意先名.value=record['_次回_得意先名1'].value;
                    record31._レンタル中_営業担当.value=record['_次回_営業担当'].value;
                    record31.使用.value="使用";
                    record31.提案する.value="未提案";
                    record31.提案するプランNO.value="";
                }
    
                // 以下自動設定項目で更新できない項目のため、更新対象から除外
                    delete record31.レコード番号;
                    delete record31.作成者;
                    delete record31.更新者;
                    delete record31.作成日時;
                    delete record31.更新日時;
    
                // 以下ルックアップ項目でコピー元が重複不可にできないため、更新対象から除外
                    delete record31.DATA;
                    delete record31.サイズ;
                    delete record31.プランNO_提案中;
                    delete record31.レンタル中案件No;
                    delete record31.レンタル中現場コード;
                    delete record31.上代;
                    delete record31.下代;
                    delete record31.下代_2;
                    delete record31.仕入先名;
                    delete record31.使用開始日;
                    delete record31.保管場所;
                    delete record31.個数;
                    delete record31.写真添付;
                    delete record31.原価;
                    delete record31.品番;
                    delete record31.商品コード;
                    delete record31.商品名;
                    delete record31.外しあり;
                    delete record31.掛率;
                    delete record31.提案あり;
                    delete record31.提案中;
                    delete record31.添付ファイル;
                    delete record31.特記事項あり;
                    delete record31.状態;
                    delete record31.状況_0;
                    delete record31.種類_0;
                    delete record31.種類_1;
                    delete record31._レンタル中_提案現場と得意先名;
                    delete record31._参考_下代;
                    delete record31._次回_営業担当;
                    delete record31._次回_得意先名;
                    delete record31._次回_提案現場と得意先名;
                    delete record31._次回_現場名;

                    _query_31 = '在庫NO="'+record31['在庫NO'].value+'"';
    
                    await doAsyncProcessApp_r(app_31_id, "家具[在庫・ストック]（物件履歴）", _query_31 , "", record31, processmsg)
                    .then(function(response){
                        console.log("OK");
                    })
                    .catch(function(error){
                        console.log("データベース処理でエラーが発生しました。");
                        throw error;
                    });
            }
        );
        return;
    }catch(error){
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
        }
    );
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
    };  // 2023.9.21 発注登録ボタン
    
    
    
    
actionbtn3.onclick = async function() {
processmsg.innerHTML="";
debugger;
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
            var query_31 ='レンタル中プランNO="'+record32.NO.value+'"';
            var jyoken = {
              'app': app_31_id,
              'query': query_31
            };
            var now = formatDate(new Date()); 
            const resp = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken);
            const records_31 = resp.records;
            
            records_31.forEach(async record31 => {
                var g_subTable = record31.現場コードテーブル.value; // 2024.9.15
                console.log(record);
                if( records_31['個別状況'].value == "レンタル中"
                  || records_31['個別状況'].value == "外し(回収予定)"){
                  arrRireki._レンタル中_現場名.value=""
                  arrRireki._レンタル中_得意先名.value="";
                  arrRireki._レンタル中_営業担当.value="";
                  arrRireki.個別状況.value="セット在庫(事務所)";
                  arrRireki.使用.value="使用";
                  arrRireki.提案する.value="未提案";
                  arrRireki.提案するプランNO.value="";
                  arrRireki.最終現場名.value=record['現場名'].value;
                  arrRireki.最終得意先.value=record['得意先名'].value;
                  arrRireki["現場コードテーブル"].value.push({
                    value:{
                      "現場コード": {"value": record31['レンタル中現場コード'].value},
                      "プランNo_hist": {"value": record31['レンタル中プランNO'].value},
                      "履歴登録日": { "value": now },                            
                      "現場名": {"value": record31['_レンタル中_現場名'].value},
                      "得意先名": {"value": record31['_レンタル中_得意先名'].value},
                      "営業担当": {"value": record31['_レンタル中_営業担当'].value}
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
            );
            return;
        }catch(error){
            throw error;
        }
    }
    
            // 2024.1.1 倉庫戻しボタン
    
    /* 「在庫戻し（バラ）」ボタンをクリックイベント 2024.10.13 */
actionbtn4.onclick = async function() {
    processmsg.innerHTML="";
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
debugger;    
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
        arrRireki32.家具色.value="";
        arrRireki32.ドロップダウン.value="";
        arrRireki32.ダイニングテーブル_W_.value="";
        arrRireki32.ソファ種類.value="";
        //arrRireki32.写真全体.value="";
        

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
        var query_31 ='レンタル中プランNO="'+record.NO.value+'"';
        var jyoken = {
            'app': app_31_id,
            'query': query_31
        };
        const resp = await kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken);

        const records_31 = resp.records;
        var now = formatDate(new Date());
        records_31.forEach(async record => {

        var g_subTable = record.現場コードテーブル.value; // 2024.9.15
        var records_31_up;  // 2024.1.1 for warning
        var  _query_31;
        var arrRireki=[];
        var genba_code = record['レンタル中現場コード'].value;
        var plan_no = record['レンタル中プランNO'].value;
        var genba = record['_レンタル中_現場名'].value;
        var tokuisaki = record['_レンタル中_得意先名'].value;
        var eigyo = record['_レンタル中_営業担当'].value;
        arrRireki = record;

        if( record['個別状況'].value == "レンタル中"
              || record['個別状況'].value == "外し(回収予定)"){
               arrRireki._レンタル中_現場名.value="";
               arrRireki._レンタル中_得意先名.value="";
               arrRireki._レンタル中_営業担当.value="";
               arrRireki.レンタル中プランNO.value="";
               arrRireki.個別状況.value="在庫(事務所)";
               arrRireki.使用.value="使用";
               arrRireki.提案する.value="未提案";
               arrRireki.提案するプランNO.value="";
               arrRireki.最終現場名.value=record['_レンタル中_現場名'].value;
               arrRireki.最終得意先.value=record['_レンタル中_得意先名'].value;
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
                 
            }else if(record['個別状況'].value == "セット在庫(事務所)"){

                 arrRireki._レンタル中_現場名.value="";
                 arrRireki._レンタル中_得意先名.value="";
                 arrRireki._レンタル中_営業担当.value="";
                 arrRireki.レンタル中プランNO.value="";
                 arrRireki.個別状況.value="在庫(事務所)";
                 arrRireki.使用.value="使用";
                 arrRireki.提案する.value="未提案";
                 arrRireki.提案するプランNO.value="";
                 arrRireki.最終現場名.value=record['_レンタル中_現場名'].value;
                 arrRireki.最終得意先.value=record['_レンタル中_得意先名'].value;

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
            _query_31 = '在庫NO="'+record['在庫NO'].value+'"';
            await doAsyncProcessApp_r(app_31_id, "家具[在庫・ストック]", _query_31 , "", arrRireki, processmsg)
            .then(function(response){
             console.log("OK");
            })
            .catch(function(error){
               console.log("データベース処理でエラーが発生しました。");
               throw error;
            });                  

        })
        return;
    }catch(error){
        throw error;
    }
}
    
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