(function() {
    'use strict';
          kintone.events.on('app.record.detail.show', async function (event) {
    //    kintone.events.on('app.record.detail.show', function(event) {
    
            /* まずsessionStorageを綺麗にする */
            window.sessionStorage.clear();
    
            /* ボタン増殖バグ回避 */
            if (document.getElementById ('action_btn') !== null) {
                return event;
            }
    
            var record = event.record;
    
            /* アプリの番号 (※ここは変えてください) */
            var APP_ID = app_04_id;
    
            var header = kintone.app.record.getHeaderMenuSpaceElement()
    
            /* ボタン作成 */
            var actionbtn = document.createElement('button'); 
            actionbtn.id = 'action_btn';
            actionbtn.innerHTML = '案件化';
            actionbtn.style.margin = '2%';
            actionbtn.style.marginBottom = '0.5%';
            actionbtn.style.padding = '1% 5%';
            actionbtn.style.borderRadius= '0.5rem';
            actionbtn.style.color = 'white';
            actionbtn.style.background = '#363636';
    
            var processmsg = document.createElement('p');
            processmsg.style.color = 'grey';
            processmsg.style.margin = '2%';
            processmsg.style.marginTop ='0';
    
    
            /* ヘッダーにボタン要素を付加 */
            header.appendChild(actionbtn);
            header.appendChild(processmsg);
    
            /* ボタンをクリックイベント */
    //        actionbtn.onclick = function () {
            actionbtn.onclick = async function () {
    
                processmsg.innerHTML="";       
              if(record['案件化更新フラグ'].value == "OK"){
                if (record['案件種別'].value == "" || record['基本料金r'].value == "" || record['現場名DATA'].value == "" || record['現場住所'].value == "" || record['得意先'].value == "" || record['得意先名'].value == "") {
                    alert("①案件種別、②基本料金(税抜)、③現場名、④現場住所、⑤得意先コード、⑥得意先名」のいずれかが入力されておりません。");
                    return false;
                } else {
    
    
                /* 
                 *   STEP01-06-案件管理（APPID-366）
                 *   Insert/Update
                */
                var rent_op
                if (record['案件種別'].value != "レンタル延長" ) {
                    if (record['案件種別'].value == "家具移設" || record['案件種別'].value == "レンタル移設" || record['案件種別'].value == "(エス・プラン)移設" ) {
                        if (record['移設元現場コード'].value === "" || record['移設元レンタル開始日'].value === "" ) {
                            alert("「移設元現場コード」の設定がない、または移設元の設置完了日が未入力です。");
                            return false;
                        }
                      if (record['案件種別'].value == "レンタル移設" || record['案件種別'].value == "(エス・プラン)移設" ){
    　　　　　　　　    rent_op = record['移設元レンタル期間'].value
                      }else{
                        rent_op = record['レンタルオプション期間'].value
                      }
                    }
                    var records_06_up = {
                        "予定設置日": { "value": record['設置日'].value},
                        "現調日": { "value": record['現調日'].value },
                        "現場コード": { "value": record['現場コード'].value },
                        "現場名": { "value": record['現場名DATA'].value },
                        "現場住所": { "value": record['現場住所'].value },
                        "備考_設置指示_": { "value": record['特記事項_連絡_'].value },
                        "案件種別": { "value": record['案件種別'].value },
                        "買取オプション": { "value": record['買取オプション'].value },
                        "レンタルオプション": { "value": rent_op },
                        "レンタルステータス": { "value": "レンタル中" },
                        "移設延長前案件No": { "value": record['移設延長前案件No'].value },
                        "移設元現場コード01": { "value": record['移設元現場コード'].value },
                        "移設元現場名": { "value": record['移設元現場名'].value },
                        "設置完了日": { "value": record['移設元レンタル開始日'].value },
                        "レンタル満了日_計算": { "value": record['移設元レンタル満了日'].value },
                        "設置日or延長開始日": { "value": record['移設元1か月延長開始日'].value },
                        "レンタル延長参考価格": { "value": record['移設元レンタル延長料金'].value },
                        "期間_FROM": { "value": record['移設元期間_FROM'].value },
                        "期間_TO": { "value": record['移設元期間_TO'].value },
                        "担当営業": { "value": record['営業担当'].value },
                        "営業フォロー": { "value": record['営業フォロー'].value },
                        "物件担当メールアドレス": { "value": record['物件担当メールアドレス'].value },
                        "得意先": { "value": record['得意先'].value },
                        "得意先コード": { "value": record['得意先'].value },
                        "得意先名1": { "value": record['得意先名'].value },
                        "得意先名2": { "value": record['得意先名2'].value },
                        "得意先電話番号": { "value": record['連絡先電話番号'].value },
                        "得意先担当者": { "value": record['担当者'].value },
                        "得意先メールアドレス": { "value": record['メールアドレス'].value },
                        "CCアドレス": { "value": record['CCアドレス'].value },
                        "延長見積時添付書類フラグ": { "value": record['延長見積時添付書類フラグ'].value },
                        "入金予定日": { "value": record['見積り支払日_マスター'].value },    // 2023.4.20
                        "見積支払日": { "value": record['見積り支払日'].value },    // 2023.4.20
                        "キーボックスの位置": { "value": record['キーボックスの位置'].value },    // 2023.12.26
                        "キーボックス番号": { "value": record['キーボックス暗証番号'].value },    // 2023.12.26
                        "お客様予算": { "value": record['基本料金r'].value },
                        "案件No": { "value": record['案件No'].value }
                    }
    
                    var records_06_ins = records_06_up;
    //                records_06_ins["案件ステータス"]= { "value": "引合" };
    
    //                var query_04_06 = '現場コード="'+record['現場コード'].value+'" and 案件ステータス not in ("失注", "入金済")';
                    var query_04_06 = '案件No="'+record['案件No'].value +'"';
    
    //                doProcessApp(app_06_id, "案件管理", query_04_06, records_06_i records_06_up, processmsg);
                    await doAsyncProcessApp(app_06_id, "案件管理", query_04_06, records_06_ins, records_06_up, processmsg);
                 
                } else {
                    alert("レンタル延長は案件管理から行ってください");
                    return false;
                }
    
    
                /* 
                 *   STEP-家具設置チェック表（APPID-221）
                 *   Insert/Update
                 */
    
                if (record['案件種別'].value == "買取コーディネート" || record['案件種別'].value == "カーテン・照明設置" || record['案件種別'].value == "カーテン設置" || record['案件種別'].value == "レンタカグ(ライト)" || record['案件種別'].value == "レンタカグ(スタンダード)" || record['案件種別'].value == "レンタカグ(プレミアム)" || record['案件種別'].value == "家具移設" || record['案件種別'].value == "レンタル移設"|| record['案件種別'].value == "エス・プラン"|| record['案件種別'].value == "(エス・プラン)移設" ) {
    
    //                var filename071, filename072, downloadFileKey071, downloadFileKey072, downloadFileUrl071, downloadFileUrl072, uploadFileUrl07;
                    if (record['案件種別'].value == "買取コーディネート"){
                      work_kind = "買取設置" ;
                    }else if (record['案件種別'].value == "カーテン・照明設置"){
                      work_kind = "レースカーテン・照明設置" ;            
                    }else if (record['案件種別'].value == "カーテン設置"){
                      work_kind = "レースカーテン設置" ; 
                    }else if (record['案件種別'].value == "レンタカグ(ライト)" || record['案件種別'].value == "レンタカグ(スタンダード)"  || record['案件種別'].value == "レンタカグ(プレミアム)" || record['案件種別'].value == "エス・プラン"){
                      work_kind = "レンタル設置" ; 
                    }else if (record['案件種別'].value == "レンタル移設"|| record['案件種別'].value == "家具移設"|| record['案件種別'].value == "(エス・プラン)移設"){
                      work_kind = "移設(設置)" ; 
                    }
                    var records_23_up = {
                        "案件種別": { "value": record['案件種別'].value },
                        "現場名": { "value": record['現場名DATA'].value },
                        "得意先名": { "value": record['得意先名'].value },
                        "現場コード": { "value": record['現場コード'].value },
                        "作業": { "value": work_kind },
                        "営業担当": { "value": record['営業担当'].value }
                    };
    
                    var records_23_ins = records_23_up;
                    records_23_ins["案件No"]= { "value": record['案件No'].value };
    
                    var query_04_23 = '案件No="' + record['案件No'].value + '"'
                    await doAsyncProcessApp(app_23_id, "家具設置チェック表", query_04_23, records_23_ins, records_23_up, processmsg);
    
                    if(record['案件種別'].value == "家具移設" || record['案件種別'].value == "レンタル移設"|| record['案件種別'].value == "(エス・プラン)移設"){
                      var records_23_up2 = {
                        "案件種別": { "value": record['案件種別'].value },
                        "現場名": { "value": record['現場名DATA'].value },
                        "得意先名": { "value": record['得意先名'].value },
                        "得意先担当者": { "value": record['担当者'].value },                   // 2024.9.1追加
                        "得意先メールアドレス": { "value": record['メールアドレス'].value },   // 2024.9.1追加
                        "CCアドレス": { "value": record['CCアドレス'].value },                 // 2024.9.1追加
                        "現場コード": { "value": record['現場コード'].value },
                        "作業": { "value": "移設(回収)" },                              // 移設元の回収日はどうするか？？？
                        "営業担当": { "value": record['営業担当'].value }
                      };
    
                      var records_23_ins2 = records_23_up2;
                      records_23_ins2["案件No"]= { "value": record['移設延長前案件No'].value };
    
                      var query_04_23_2 = '案件No="' + record['移設延長前案件No'].value + '"'
                      await doAsyncProcessApp(app_23_id, "家具設置チェック表", query_04_23_2, records_23_ins2, records_23_up2, processmsg);
                    }
    
                }
    
    
                /* 
                 *   STEP02-07-プラン作成依頼（APPID-255）
                 *   Insert/Update
                 */
    //            if (record['案件種別'].value == "買取コーディネート" || record['案件種別'].value == "カーテン・照明設置" || record['案件種別'].value == "カーテン設置" || record['案件種別'].value == "レンタカグ(カスタマイズ)" || record['案件種別'].value == "レンタル(パッケージ)" ) {
    //            if (record['案件種別'].value == "買取コーディネート" || record['案件種別'].value == "カーテン・照明設置" || record['案件種別'].value == "カーテン設置" || record['案件種別'].value == "レンタカグ(ライト)" || record['案件種別'].value == "レンタカグ(スタンダード)" || record['案件種別'].value == "レンタカグ(プレミアム)"  ) {
                if (record['案件種別'].value == "買取コーディネート" || record['案件種別'].value == "レンタカグ(ライト)" || record['案件種別'].value == "レンタカグ(スタンダード)" || record['案件種別'].value == "レンタカグ(プレミアム)" || record['案件種別'].value == "エス・プラン" ) {
    
                    var filename071, filename072, downloadFileKey071, downloadFileKey072, downloadFileUrl071, downloadFileUrl072, uploadFileUrl07;
    
                    var records_07_up = {
                        "設置希望日": { "value": record['設置日'].value },
                        "見積提示予定日": { "value": record['見積日'].value },
                        "見積提出日": { "value": record['見積日'].value },
                        "現場コード": { "value": record['現場コード'].value },
                        "案件種別": { "value": record['案件種別'].value },
                        "カーテン設置": { "value": record['レースカーテン設置'].value },
                        "現場名": { "value": record['現場名DATA'].value },
                        "案件No_map": { "value": record['案件No'].value },
                        "現場住所": { "value": record['現場住所'].value },
                        "要望_コメント_": { "value": record['要望_コメント_'].value },
                        "家具色_0": { "value": record['家具色'].value },
                        "得意先名": { "value": record['得意先名'].value }
                    };
    
                    var records_07_ins = records_07_up;
                    records_07_ins["案件No"]= { "value": record['案件No'].value };
    //                records_07_ins["案件ステータス"]= { "value": "引合" };
    
                    var query_04_07 = '案件No="' + record['案件No'].value + '"'
    
                    if (record["マイソク"]['value'].length === 0) {
                        if (record["間取図"]['value'].length === 0) {
                            // マイソクなし・間取り図なし
    //                        doProcessApp(app_07_id, "プラン作成依頼", query_04_07, records_07_ins, records_07_up, processmsg);
                          await doAsyncProcessApp(app_07_id, "プラン作成依頼", query_04_07, records_07_ins, records_07_up, processmsg);
                        } else {
                            // マイソクなし・間取図あり
                            filename072 = event.record["間取図"].value[0].name;
                            downloadFileKey072 = event.record["間取図"].value[0].fileKey;
                            downloadFileUrl072 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey072;
                            uploadFileUrl07 = kintone.api.url('/k/v1/file', true);
    
                            var xhr = new XMLHttpRequest();
    
                            xhr.open('GET', downloadFileUrl072);
                            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr.responseType = 'blob';
    
                            xhr.send();
    
                            xhr.onload = async function() {
                              if (xhr.status === 200) {
                                // success
                                var blob = new Blob([xhr.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename072);
    
                                var xhr2 = new XMLHttpRequest();
    
                                xhr2.open('POST', uploadFileUrl07);
                                xhr2.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr2.send(formData);
                                xhr2.onload = async function() {
                                  if (xhr2.status === 200) {
                                    var key2 = JSON.parse(xhr2.responseText).fileKey;
    
                                    records_07_ins["間取図"] = { "value": [{fileKey: key2}] };
                                    records_07_up["間取図"] = { "value": [{fileKey: key2}] };
    //                                doProcessApp(app_07_id, "プラン作成依頼", query_04_07, records_07_ins, records_07_up, processmsg);
                                    await doAsyncProcessApp(app_07_id, "プラン作成依頼", query_04_07, records_07_ins, records_07_up, processmsg);
                                }};
                            }};
                            
                        }
    
                    } else {
                        if (record["間取図"]['value'].length === 0) {
                            // マイソクあり・間取図なし
                            filename071 = event.record["マイソク"].value[0].name;
                            downloadFileKey071 = event.record["マイソク"].value[0].fileKey;
                            downloadFileUrl071 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey071;
                            uploadFileUrl07 = kintone.api.url('/k/v1/file', true);
    
                            xhr = new XMLHttpRequest();
    
                            xhr.open('GET', downloadFileUrl071);
                            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr.responseType = 'blob';
    
                            xhr.send();
    
                            xhr.onload = async function() {
                              if (xhr.status === 200) {
                                // success
                                var blob = new Blob([xhr.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename071);
    
                                var xhr2 = new XMLHttpRequest();
    
                                xhr2.open('POST', uploadFileUrl07);
                                xhr2.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr2.send(formData);
                                xhr2.onload = async function() {
                                  if (xhr2.status === 200) {
                                    var key1 = JSON.parse(xhr2.responseText).fileKey;
    
                                    records_07_ins["マイソク"] = { "value": [{fileKey: key1}] };
                                    records_07_up["マイソク"] = { "value": [{fileKey: key1}] };
    //                                doProcessApp(app_07_id, "プラン作成依頼", query_04_07, records_07_ins, records_07_up, processmsg);
                                    await doAsyncProcessApp(app_07_id, "プラン作成依頼", query_04_07, records_07_ins, records_07_up, processmsg);
                                }};
                            }};
                        } else {
                            // マイソクあり・間取図あり
                            filename071 = event.record["マイソク"].value[0].name;
                            downloadFileKey071 = event.record["マイソク"].value[0].fileKey;
                            downloadFileUrl071 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey071;
    
                            filename072 = event.record["間取図"].value[0].name;
                            downloadFileKey072 = event.record["間取図"].value[0].fileKey;
                            downloadFileUrl072 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey072;
                            uploadFileUrl07 = kintone.api.url('/k/v1/file', true);
    
                            xhr = new XMLHttpRequest();
    
                            xhr.open('GET', downloadFileUrl071);
                            xhr.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr.responseType = 'blob';
    
                            xhr.send();
                            xhr.onload = async function() {
                              if (xhr.status === 200) {
                                // success
                                var blob = new Blob([xhr.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename071);
    
                                var xhr2 = new XMLHttpRequest();
    
                                xhr2.open('POST', uploadFileUrl07);
                                xhr2.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr2.send(formData);
                                xhr2.onload = async function() {
                                  if (xhr2.status === 200) {
                                    var key1 = JSON.parse(xhr2.responseText).fileKey;
    
    
                                    var xhr3 = new XMLHttpRequest();
                                    xhr3.open('GET', downloadFileUrl072);
                                    xhr3.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                                    xhr3.responseType = 'blob';
    
                                    xhr3.send();
                                    xhr3.onload = async function() {
                                        if (xhr3.status === 200) {
                                            // success
                                            var blob = new Blob([xhr3.response]);
                                            var url = window.URL || window.webkitURL;
                                            var blobUrl = url.createObjectURL(blob);
    
                                            var formData2 = new FormData();
                                            formData2.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                            formData2.append('file', blob, filename072);
    
                                            var xhr4 = new XMLHttpRequest();
    
                                            xhr4.open('POST', uploadFileUrl07);
                                            xhr4.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                            xhr4.send(formData2);
                                            xhr4.onload = async function() {
                                                if (xhr4.status === 200) {
    
                                                    var key2 = JSON.parse(xhr4.responseText).fileKey;
    
                                                    records_07_ins["マイソク"] = { "value": [{fileKey: key1}] };
                                                    records_07_up["マイソク"] = { "value": [{fileKey: key1}] };
                                                    records_07_ins["間取図"] = { "value": [{fileKey: key2}] };
                                                    records_07_up["間取図"] = { "value": [{fileKey: key2}] };
    //                                                doProcessApp(app_07_id, "プラン作成依頼", query_04_07, records_07_ins, records_07_up, processmsg);
                                                    await doAsyncProcessApp(app_07_id, "プラン作成依頼", query_04_07, records_07_ins, records_07_up, processmsg);
                                                }
                                            };
                                        }
                                    };
                                }};
                            }};
                        }
                    }
                }
    
                /* 
                 *   STEP03-08-見積管理（APPID-235）
                 *   Insert/Update
                 */
                 
    //            if (record['案件種別'].value != "買取コーディネート" && record['案件種別'].value != "レンタカグ(カスタマイズ)" && record['案件種別'].value != "レンタカグ(パッケージ)" && record['案件種別'].value != "レンタル延長" ) {
    
                if (record['案件種別'].value != "買取コーディネート" && record['案件種別'].value != "レンタカグ(ライト)" && record['案件種別'].value != "レンタカグ(スタンダード)" && record['案件種別'].value != "レンタカグ(プレミアム)" && record['案件種別'].value != "エス・プラン" && record['案件種別'].value != "レンタル延長" ) {
                    console.log("案件種別と移設元現場情報判断開始");
                    if (record['案件種別'].value == "家具移設" || record['案件種別'].value == "レンタル移設"|| record['案件種別'].value == "レンタル移設" || record['案件種別'].value == "(エス・プラン)移設" ) {
                        if (record['移設元現場名'].value == "" || record['移設元現場住所'].value == "") {
                            alert("「移設元現場コード」「移設元現場住所」の設定がない");
                            return false;
                        }
                    }
                        var records_08_up = {
                                "現場_0": { "value": record['現場コード'].value },
                                "案件種別": { "value": record['案件種別'].value },
                                "買取オプション": { "value": record['買取オプション'].value },
                                "レンタルオプション期間": { "value": record['レンタルオプション期間'].value },
                                "レンタルステータス": { "value": "レンタル中" },  // 2023.4.20 
                                "移設延長前案件No": { "value": record['移設延長前案件No'].value },
                                "営業担当": { "value": record['営業担当'].value },
                                "営業フォロー": { "value": record['営業フォロー'].value },
                                "物件担当メールアドレス": { "value": record['物件担当メールアドレス'].value },
                                "現場名1": { "value": record['現場名DATA'].value },
                                "現場住所": { "value": record['現場住所'].value },
                                "パシオン_品番_": { "value": record['パシオン_品番_'].value },            // 2024.2.11
                                "キーボックス番号": { "value": record['キーボックス暗証番号'].value },
                                "カーテン設置": { "value": record['レースカーテン設置'].value },
                                "得意先": { "value": record['得意先'].value },
                                "得意先1": { "value": record['得意先名'].value },
                                "得意先2": { "value": record['得意先名2'].value },
                                "担当者": { "value": record['担当者'].value },
                                "メールアドレス2": { "value": record['メールアドレス'].value },
                                "電話番号": { "value": record['連絡先電話番号'].value },
                                "設置希望日": { "value": record['設置日'].value },
                                "見積り支払日": { "value": record['見積り支払日'].value },
                                "税抜基本料金": { "value": record['基本料金r'].value },
                                "税抜金額_現地調査": { "value": record['現場調査費r'].value },
                                "税抜金額_プラン追加作成": { "value": record['プラン追加作成r'].value },
                                "税抜金額_玄関": { "value": record['玄関回り装飾費用r'].value },
                                "税抜金額_写真撮影": { "value": record['一眼レフカメラ撮影費用r'].value }
                        }
                        var records_08_ins = records_08_up;
    
    //                    if (resp.records.length ==0 ) {
                                records_08_ins["案件No"]= { "value": record['案件No'].value };
    //                            records_08_ins["案件ステータス"]= { "value": "引合" };
                                records_08_ins["見積No"]= { "value": 1 };
    //                    }
    console.log(records_08_up);
    console.log(records_08_ins);
                        var query_04_08 = '案件No="'+record['案件No'].value+'"';
                        var filename081, filename082, downloadFileKey081, downloadFileKey082, downloadFileUrl081, downloadFileUrl082, uploadFileUrl08;
                   
                        if (record["マイソク"]['value'].length === 0) {
                          if (record["間取図"]['value'].length === 0) {
                            // マイソクなし・間取り図なし
                                await doAsyncProcessApp(app_08_id, "見積管理", query_04_08, records_08_ins, records_08_up, processmsg);
                          } else {
                            // マイソクなし・間取図あり
                            filename082 = event.record["間取図"].value[0].name;
                            downloadFileKey082 = event.record["間取図"].value[0].fileKey;
                            downloadFileUrl082 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey082;
                            uploadFileUrl08 = kintone.api.url('/k/v1/file', true);
    
                            var xhr08 = new XMLHttpRequest();
    
                            xhr08.open('GET', downloadFileUrl082);
                            xhr08.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr08.responseType = 'blob';
    
                            xhr08.send();
    
                            xhr08.onload = async function() {
                              if (xhr08.status === 200) {
                                // success
                                var blob = new Blob([xhr08.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename082);
    
                                var xhr082 = new XMLHttpRequest();
    
                                xhr082.open('POST', uploadFileUrl08);
                                xhr082.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr082.send(formData);
                                xhr082.onload = async function() {
                                  if (xhr082.status === 200) {
                                    var key2 = JSON.parse(xhr082.responseText).fileKey;
    
                                    records_08_ins["間取図"] = { "value": [{fileKey: key2}] };
                                    records_08_up["間取図"] = { "value": [{fileKey: key2}] };
                                    await doAsyncProcessApp(app_08_id, "見積管理", query_04_08, records_08_ins, records_08_up, processmsg);
                                }};
                            }};
                            
                        }
    
                    } else {
                        if (record["間取図"]['value'].length === 0) {
                            // マイソクあり・採寸シートなし
                            filename081 = event.record["マイソク"].value[0].name;
                            downloadFileKey081 = event.record["マイソク"].value[0].fileKey;
                            downloadFileUrl081 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey081;
                            uploadFileUrl08 = kintone.api.url('/k/v1/file', true);
    
                            xhr08 = new XMLHttpRequest();
    
                            xhr08.open('GET', downloadFileUrl081);
                            xhr08.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr08.responseType = 'blob';
    
                            xhr08.send();
    
                            xhr08.onload = async function() {
                              if (xhr08.status === 200) {
                                // success
                                var blob = new Blob([xhr08.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename081);
    
                                var xhr082 = new XMLHttpRequest();
    
                                xhr082.open('POST', uploadFileUrl08);
                                xhr082.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr082.send(formData);
                                xhr082.onload = async function() {
                                  if (xhr082.status === 200) {
                                    var key1 = JSON.parse(xhr082.responseText).fileKey;
    
                                    records_08_ins["マイソク"] = { "value": [{fileKey: key1}] };
                                    records_08_up["マイソク"] = { "value": [{fileKey: key1}] };
                                    await doAsyncProcessApp(app_08_id, "見積管理", query_04_08, records_08_ins, records_08_up, processmsg);
                                }};
                            }};
                        } else {
                            // マイソクあり・採寸シートあり
                            filename081 = event.record["マイソク"].value[0].name;
                            downloadFileKey081 = event.record["マイソク"].value[0].fileKey;
                            downloadFileUrl081 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey081;
    
                            filename082 = event.record["間取図"].value[0].name;
                            downloadFileKey082 = event.record["間取図"].value[0].fileKey;
                            downloadFileUrl082 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey082;
                            uploadFileUrl08 = kintone.api.url('/k/v1/file', true);
    
                            xhr08 = new XMLHttpRequest();
    
                            xhr08.open('GET', downloadFileUrl081);
                            xhr08.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr08.responseType = 'blob';
    
                            xhr08.send();
                            xhr08.onload = async function() {
                              if (xhr08.status === 200) {
                                // success
                                var blob = new Blob([xhr08.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename081);
    
                                var xhr082 = new XMLHttpRequest();
    
                                xhr082.open('POST', uploadFileUrl08);
                                xhr082.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr082.send(formData);
                                xhr082.onload = async function() {
                                  if (xhr082.status === 200) {
                                    var key1 = JSON.parse(xhr082.responseText).fileKey;
    
    
                                    var xhr083 = new XMLHttpRequest();
                                    xhr083.open('GET', downloadFileUrl082);
                                    xhr083.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                                    xhr083.responseType = 'blob';
    
                                    xhr083.send();
                                    xhr083.onload = async function() {
                                        if (xhr083.status === 200) {
                                            // success
                                            var blob = new Blob([xhr083.response]);
                                            var url = window.URL || window.webkitURL;
                                            var blobUrl = url.createObjectURL(blob);
    
                                            var formData2 = new FormData();
                                            formData2.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                            formData2.append('file', blob, filename082);
    
                                            var xhr084 = new XMLHttpRequest();
    
                                            xhr084.open('POST', uploadFileUrl08);
                                            xhr084.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                            xhr084.send(formData2);
                                            xhr084.onload = async function() {
                                                if (xhr084.status === 200) {
    
                                                    var key2 = JSON.parse(xhr084.responseText).fileKey;
    
                                                    records_08_ins["マイソク"] = { "value": [{fileKey: key1}] };
                                                    records_08_up["マイソク"] = { "value": [{fileKey: key1}] };
                                                    records_08_ins["間取図"] = { "value": [{fileKey: key2}] };
                                                    records_08_up["間取図"] = { "value": [{fileKey: key2}] };
                                                    await doAsyncProcessApp(app_08_id, "見積管理", query_04_08, records_08_ins, records_08_up, processmsg);
                                                }
                                            };
                                        }
                                    };
                                }};
                            }};
                        }
                    }  
                }
    
    
    
                /* 
                 *   STEP04-05-現地調査（APPID-254）
                 *   Insert/Update
                 */
    //            if ((record['案件種別'].value == "買取コーディネート" || record['案件種別'].value == "カーテン・照明設置" || record['案件種別'].value == "カーテン設置" || record['案件種別'].value == "レンタカグ(カスタマイズ)" || record['案件種別'].value == "レンタカグ(パッケージ)" ) && (record['現調'].value == "あり")) {
                if ((record['案件種別'].value == "買取コーディネート" || record['案件種別'].value == "カーテン・照明設置" || record['案件種別'].value == "カーテン設置" || record['案件種別'].value == "レンタカグ(ライト)" || record['案件種別'].value == "レンタカグ(スタンダード)"  || record['案件種別'].value == "レンタカグ(プレミアム)") && (record['現調'].value == "あり")) {
    
                    var filename051, filename052, downloadFileKey051, downloadFileKey052, downloadFileUrl051, downloadFileUrl052, uploadFileUrl05;
                    
                    var records_05_up = {
                        "現場コード": { "value": record['現場コード'].value },
                        "案件種別": { "value": record['案件種別'].value },
                        "営業担当": { "value": record['営業担当'].value },
                        "得意先": { "value": record['得意先名'].value },
                        "現調日": { "value": record['現調日'].value },
                        "カーテン設置": { "value": record['レースカーテン設置'].value },
                        "現場名": { "value": record['現場名DATA'].value },
                        "設置現場住所": { "value": record['現場住所'].value },
                        "キーボックスの位置": { "value": record['キーボックスの位置'].value },
                        "確認・注意事項等": { "value": record['特記事項_連絡_'].value },
                        "キーボックス暗証番号": { "value": record['キーボックス暗証番号'].value }
                    } 
    
                    var records_05_ins = records_05_up;
                    records_05_ins["案件No"]= { "value": record['案件No'].value };
    //                records_05_ins["案件ステータス"]= { "value": "引合" };
    
                    var query_04_05 = '案件No="'+record['案件No'].value+'"';
    
                    //ここから
                    if (record["マイソク"]['value'].length === 0) {
                        if (record["採寸シート"]['value'].length === 0) {
                            // マイソクなし・採寸シートなし
                            await doAsyncProcessApp(app_05_id, "現地調査", query_04_05, records_05_ins, records_05_up, processmsg);
                        } else {
                            // マイソクなし・間取図あり
                            filename052 = event.record["採寸シート"].value[0].name;
                            downloadFileKey052 = event.record["採寸シート"].value[0].fileKey;
                            downloadFileUrl052 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey052;
                            uploadFileUrl05 = kintone.api.url('/k/v1/file', true);
    
                            var xhr05 = new XMLHttpRequest();
    
                            xhr05.open('GET', downloadFileUrl052);
                            xhr05.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr05.responseType = 'blob';
    
                            xhr05.send();
    
                            xhr05.onload = async function() {
                              if (xhr05.status === 200) {
                                // success
                                var blob = new Blob([xhr05.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename052);
    
                                var xhr052 = new XMLHttpRequest();
    
                                xhr052.open('POST', uploadFileUrl05);
                                xhr052.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr052.send(formData);
                                xhr052.onload = async function() {
                                  if (xhr052.status === 200) {
                                    var key2 = JSON.parse(xhr052.responseText).fileKey;
    
                                    records_05_ins["採寸シート"] = { "value": [{fileKey: key2}] };
                                    records_05_up["採寸シート"] = { "value": [{fileKey: key2}] };
    //                                records_05_ins["採寸シート2"] = { "value": [{fileKey: key2}] };
    //                                records_05_up["採寸シート2"] = { "value": [{fileKey: key2}] };
                                    await doAsyncProcessApp(app_05_id, "現地調査", query_04_05, records_05_ins, records_05_up, processmsg);
                                }};
                            }};
                            
                        }
    
                    } else {
                        if (record["採寸シート"]['value'].length === 0) {
                            // マイソクあり・採寸シートなし
                            filename051 = event.record["マイソク"].value[0].name;
                            downloadFileKey051 = event.record["マイソク"].value[0].fileKey;
                            downloadFileUrl051 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey051;
                            uploadFileUrl05 = kintone.api.url('/k/v1/file', true);
    
                            xhr05 = new XMLHttpRequest();
    
                            xhr05.open('GET', downloadFileUrl051);
                            xhr05.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr05.responseType = 'blob';
    
                            xhr05.send();
    
                            xhr05.onload = async function() {
                              if (xhr05.status === 200) {
                                // success
                                var blob = new Blob([xhr05.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename051);
    
                                var xhr052 = new XMLHttpRequest();
    
                                xhr052.open('POST', uploadFileUrl05);
                                xhr052.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr052.send(formData);
                                xhr052.onload = async function() {
                                  if (xhr052.status === 200) {
                                    var key1 = JSON.parse(xhr052.responseText).fileKey;
    
                                    records_05_ins["マイソク_0"] = { "value": [{fileKey: key1}] };
                                    records_05_up["マイソク_0"] = { "value": [{fileKey: key1}] };
                                    await doAsyncProcessApp(app_05_id, "現地調査", query_04_05, records_05_ins, records_05_up, processmsg);
                                }};
                            }};
                        } else {
                            // マイソクあり・採寸シートあり
    
                            filename051 = event.record["マイソク"].value[0].name;
                            downloadFileKey051 = event.record["マイソク"].value[0].fileKey;
                            downloadFileUrl051 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey051;
    
                            filename052 = event.record["採寸シート"].value[0].name;
                            downloadFileKey052 = event.record["採寸シート"].value[0].fileKey;
                            downloadFileUrl052 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey052;
                            uploadFileUrl05 = kintone.api.url('/k/v1/file', true);
    
                            xhr05 = new XMLHttpRequest();
    
                            xhr05.open('GET', downloadFileUrl051);
                            xhr05.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr05.responseType = 'blob';
    
                            xhr05.send();
                            xhr05.onload = async function() {
                              if (xhr05.status === 200) {
                                // success
                                var blob = new Blob([xhr05.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename051);
    
                                var xhr052 = new XMLHttpRequest();
    
                                xhr052.open('POST', uploadFileUrl05);
                                xhr052.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr052.send(formData);
                                xhr052.onload = async function() {
                                  if (xhr052.status === 200) {
                                    var key1 = JSON.parse(xhr052.responseText).fileKey;
    
    
                                    var xhr053 = new XMLHttpRequest();
                                    xhr053.open('GET', downloadFileUrl052);
                                    xhr053.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                                    xhr053.responseType = 'blob';
    
                                    xhr053.send();
                                    xhr053.onload = async function() {
                                        if (xhr053.status === 200) {
                                            // success
                                            var blob = new Blob([xhr053.response]);
                                            var url = window.URL || window.webkitURL;
                                            var blobUrl = url.createObjectURL(blob);
    
                                            var formData2 = new FormData();
                                            formData2.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                            formData2.append('file', blob, filename052);
    
                                            var xhr054 = new XMLHttpRequest();
    
                                            xhr054.open('POST', uploadFileUrl05);
                                            xhr054.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                            xhr054.send(formData2);
                                            xhr054.onload = async function() {
                                                if (xhr054.status === 200) {
    
                                                    var key2 = JSON.parse(xhr054.responseText).fileKey;
    
                                                    records_05_ins["マイソク_0"] = { "value": [{fileKey: key1}] };
                                                    records_05_up["マイソク_0"] = { "value": [{fileKey: key1}] };
                                                    records_05_ins["採寸シート"] = { "value": [{fileKey: key2}] };
                                                    records_05_up["採寸シート"] = { "value": [{fileKey: key2}] };
    //                                                records_05_ins["採寸シート2"] = { "value": [{fileKey: key2}] };
    //                                                records_05_up["採寸シート2"] = { "value": [{fileKey: key2}] };
                                                    await doAsyncProcessApp(app_05_id, "現地調査", query_04_05, records_05_ins, records_05_up, processmsg);
                                                }
                                            };
                                        }
                                    };
                                }};
                            }};
                        }
                    }
                }
    //                doProcessApp(app_05_id, "現地調査", query_04_05, records_05_ins, records_05_up, processmsg);
    ////                await doAsyncProcessApp(app_05_id, "現地調査", query_04_05, records_05_ins, records_05_up, processmsg);
    
    
    
    
                /* 
                 *   STEP04-09-作業指示・書類保管
                 *   Insert/Update
                 */
    //              if (record['案件種別'].value == "買取コーディネート" || record['案件種別'].value == "カーテン・照明設置" || record['案件種別'].value == "カーテン設置" || record['案件種別'].value == "レンタカグ(ライト)" || record['案件種別'].value == "レンタカグ(スタンダード)"  || record['案件種別'].value == "レンタカグ(プレミアム)") {
                  if (record['案件種別'].value == "買取コーディネート" || record['案件種別'].value == "カーテン・照明設置" || record['案件種別'].value == "カーテン設置" || record['案件種別'].value == "レンタカグ(ライト)" || record['案件種別'].value == "レンタカグ(スタンダード)"  || record['案件種別'].value == "レンタカグ(プレミアム)" || record['案件種別'].value == "レンタル移設"|| record['案件種別'].value == "家具移設"|| record['案件種別'].value == "エス・プラン"|| record['案件種別'].value == "(エス・プラン)移設" ) {
    
                  var filename091, filename092, downloadFileKey091, downloadFileKey092, downloadFileUrl091, downloadFileUrl092, uploadFileUrl09;   
                 
                  var records_09_up = {
                        "現場コード": { "value": record['現場コード'].value },
                        "現場名": { "value": record['現場名DATA'].value },
    　                  "案件種別": { "value": record['案件種別'].value },
    　                  "現場住所_0": { "value": record['現場住所'].value },
                        "営業担当": { "value": record['営業担当'].value },
                        "得意先名1": { "value": record['得意先名'].value },
                        "得意先名2": { "value": record['得意先名2'].value },
                        "キーボックスの位置": { "value": record['キーボックスの位置'].value },
                        "キーボックス番号": { "value": record['キーボックス暗証番号'].value },
                        "撮影方法": { "value": record['撮影方法d'].value },
                        "カーテン設置": { "value": record['レースカーテン設置'].value },
                        "備考設置指示": { "value": record['特記事項_連絡_'].value },
                        "DATA09": { "value": record['DATA'].value }
                    } 
    
                    var records_09_ins = records_09_up;
    
                    records_09_ins["案件No"]= { "value": record['案件No'].value };
    
                    var query_04_09 = '案件No="'+record['案件No'].value+'"';
                    if (record["マイソク"]['value'].length === 0) {
                        if (record["間取図"]['value'].length === 0) {
                            // マイソクなし・採寸シートなし
    //                        doProcessApp(app_09_id, "作業指示・書類保管", query_04_09, records_09_ins, records_09_up, processmsg);
                            await doAsyncProcessApp(app_09_id, "作業指示・書類保管", query_04_09, records_09_ins, records_09_up, processmsg);
                        } else {
                            // マイソクなし・間取図あり
                            filename092 = event.record["間取図"].value[0].name;
                            downloadFileKey092 = event.record["間取図"].value[0].fileKey;
                            downloadFileUrl092 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey092;
                            uploadFileUrl09 = kintone.api.url('/k/v1/file', true);
    
                            var xhr09 = new XMLHttpRequest();
    
                            xhr09.open('GET', downloadFileUrl092);
                            xhr09.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr09.responseType = 'blob';
    
                            xhr09.send();
    
                            xhr09.onload = async function() {
                              if (xhr09.status === 200) {
                                // success
                                var blob = new Blob([xhr09.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename092);
    
                                var xhr092 = new XMLHttpRequest();
    
                                xhr092.open('POST', uploadFileUrl09);
                                xhr092.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr092.send(formData);
                                xhr092.onload = async function() {
                                  if (xhr092.status === 200) {
                                    var key2 = JSON.parse(xhr092.responseText).fileKey;
    
                                    records_09_ins["間取図"] = { "value": [{fileKey: key2}] };
                                    records_09_up["間取図"] = { "value": [{fileKey: key2}] };
                                    await doAsyncProcessApp(app_09_id, "作業指示・書類保管", query_04_09, records_09_ins, records_09_up, processmsg);
                                }};
                            }};
                            
                        }
    
                    } else {
                        if (record["間取図"]['value'].length === 0) {
                            // マイソクあり・採寸シートなし
                            filename091 = event.record["マイソク"].value[0].name;
                            downloadFileKey091 = event.record["マイソク"].value[0].fileKey;
                            downloadFileUrl091 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey091;
                            uploadFileUrl09 = kintone.api.url('/k/v1/file', true);
    
                            xhr09 = new XMLHttpRequest();
    
                            xhr09.open('GET', downloadFileUrl091);
                            xhr09.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr09.responseType = 'blob';
    
                            xhr09.send();
    
                            xhr09.onload = async function() {
                              if (xhr09.status === 200) {
                                // success
                                var blob = new Blob([xhr09.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename091);
    
                                var xhr092 = new XMLHttpRequest();
    
                                xhr092.open('POST', uploadFileUrl09);
                                xhr092.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr092.send(formData);
                                xhr092.onload = async function() {
                                  if (xhr092.status === 200) {
                                    var key1 = JSON.parse(xhr092.responseText).fileKey;
    
                                    records_09_ins["マイソク"] = { "value": [{fileKey: key1}] };
                                    records_09_up["マイソク"] = { "value": [{fileKey: key1}] };
                                    await doAsyncProcessApp(app_09_id, "作業指示・書類保管", query_04_09, records_09_ins, records_09_up, processmsg);
                                }};
                            }};
                        } else {
                            // マイソクあり・採寸シートあり
                            filename091 = event.record["マイソク"].value[0].name;
                            downloadFileKey091 = event.record["マイソク"].value[0].fileKey;
                            downloadFileUrl091 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey091;
    
                            filename092 = event.record["間取図"].value[0].name;
                            downloadFileKey092 = event.record["間取図"].value[0].fileKey;
                            downloadFileUrl092 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey092;
                            uploadFileUrl09 = kintone.api.url('/k/v1/file', true);
    
                            xhr09 = new XMLHttpRequest();
    
                            xhr09.open('GET', downloadFileUrl091);
                            xhr09.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr09.responseType = 'blob';
    
                            xhr09.send();
                            xhr09.onload = async function() {
                              if (xhr09.status === 200) {
                                // success
                                var blob = new Blob([xhr09.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename091);
    
                                var xhr092 = new XMLHttpRequest();
    
                                xhr092.open('POST', uploadFileUrl09);
                                xhr092.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr092.send(formData);
                                xhr092.onload = async function() {
                                  if (xhr092.status === 200) {
                                    var key1 = JSON.parse(xhr092.responseText).fileKey;
    
    
                                    var xhr093 = new XMLHttpRequest();
                                    xhr093.open('GET', downloadFileUrl092);
                                    xhr093.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                                    xhr093.responseType = 'blob';
    
                                    xhr093.send();
                                    xhr093.onload = async function() {
                                        if (xhr093.status === 200) {
                                            // success
                                            var blob = new Blob([xhr093.response]);
                                            var url = window.URL || window.webkitURL;
                                            var blobUrl = url.createObjectURL(blob);
    
                                            var formData2 = new FormData();
                                            formData2.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                            formData2.append('file', blob, filename092);
    
                                            var xhr094 = new XMLHttpRequest();
    
                                            xhr094.open('POST', uploadFileUrl09);
                                            xhr094.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                            xhr094.send(formData2);
                                            xhr094.onload = async function() {
                                                if (xhr094.status === 200) {
    
                                                    var key2 = JSON.parse(xhr094.responseText).fileKey;
    
                                                    records_09_ins["マイソク"] = { "value": [{fileKey: key1}] };
                                                    records_09_up["マイソク"] = { "value": [{fileKey: key1}] };
                                                    records_09_ins["間取図"] = { "value": [{fileKey: key2}] };
                                                    records_09_up["間取図"] = { "value": [{fileKey: key2}] };
                                                    await doAsyncProcessApp(app_09_id, "作業指示・書類保管", query_04_09, records_09_ins, records_09_up, processmsg);
                                                }
                                            };
                                        }
                                    };
                                }};
                            }};
                        }
                    }
    // test              
                /*
                    var sechinichiji = new Date();
                    sechinichiji.setHours(0);
                    sechinichiji.setMinutes(0);
                    sechinichiji.setSeconds(0);
                    sechinichiji.setMilliseconds(0);
    
                    sechinichiji = sechinichiji.toISOString();
    
                    var query_09 = '案件No="'+record['案件No'].value+'"';
    
                    var jyoken_09 = {
                        'app': app_09_id,
                        'query': query_09
                    }
    
                    //console.log(jyoken_09);
    
                    kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken_09, function(resp) {
                        if (resp.records.length ==0 ) {
                            var records_09_ins = {
                                "案件No": { "value": record['案件No'].value },
                                "案件種別1": { "value": record['案件種別'].value },
                                "現場名1": { "value": record['現場名DATA'].value },
                                "現場住所1": { "value": record['現場住所'].value },
                                "作業種別": { "value": "現調" },
                                "作業調整ステータス": { "value": "現調：調整中" },
                                "設置日時": { "value": sechinichiji }
                            } 
    
                            doProcessApp(app_09_id, "作業カレンダー", "", records_09_ins, "", processmsg);
                        }
    
                    }, function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-作業カレンダー取得処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
                */
                  }
                  
                /* 
                 *   STEP05-04 現場マスター更新
                 *   Insert/Update
                 */              
                var query_04 = '案件No ="'+record['案件No'].value+'"';
                var records_04_up = {
                    "案件化フラグ": { "value": "済" }
                }
                await doProcessApp(app_04_id, "現場マスター[案件化フラグ]", query_04, "", records_04_up, processmsg);              
    
              }
            }else {
              
              /// NGの時は、一部のみ更新する。
            alert("作業指示の「キーボックス位置／番号」「マイソク／間取り図」および案件管理の「担当者名／メールアドレス」のみ更新します。");
                /* 
                 *   STEP01-06-案件管理（APPID-366）
                 *   Insert/Update
                */
                var rent_op
                if (record['案件種別'].value != "レンタル延長" ) {
                    if (record['案件種別'].value == "家具移設" || record['案件種別'].value == "レンタル移設" || record['案件種別'].value == "(エス・プラン)移設") {
                        if (record['移設元現場コード'].value === "") {
                            alert("「移設元現場コード」の設定がない");
                            return false;
                        }
                      if (record['案件種別'].value == "レンタル移設"){
    　　　　　　　　    rent_op = record['移設元レンタル期間'].value
                      }else{
                        rent_op = record['レンタルオプション期間'].value
                      }
                    }
                    var records_06_up = {
                        "案件No": { "value": record['案件No'].value },
                        "得意先担当者": { "value": record['担当者'].value },
                        "得意先メールアドレス": { "value": record['メールアドレス'].value },
                        "CCアドレス": { "value": record['CCアドレス'].value }
                    }
    
                    var records_06_ins = records_06_up;
                    var query_04_06 = '案件No="'+record['案件No'].value +'"';
    
                    await doAsyncProcessApp(app_06_id, "案件管理", query_04_06, records_06_ins, records_06_up, processmsg);
                 
                } else {
                    alert("レンタル延長は案件管理から行ってください");
                    return false;
                }
              
                /* 
                 *   STEP04-09-作業指示・書類保管
                 *   Insert/Update
                 */         
              
                  if (record['案件種別'].value == "買取コーディネート" || record['案件種別'].value == "カーテン・照明設置" || record['案件種別'].value == "カーテン設置" || record['案件種別'].value == "レンタカグ(ライト)" || record['案件種別'].value == "レンタカグ(スタンダード)"  || record['案件種別'].value == "レンタカグ(プレミアム)" || record['案件種別'].value == "レンタル移設"|| record['案件種別'].value == "家具移設" || record['案件種別'].value == "エス・プラン"|| record['案件種別'].value == "(エス・プラン)移設" ) {
    
                  var filename091, filename092, downloadFileKey091, downloadFileKey092, downloadFileUrl091, downloadFileUrl092, uploadFileUrl09;   
    
    
                  var work_kind;  //2023.12.10
                  var isetu_flg;  //2023.12.10
                    if(record['現場調査DATA'].value == "あり" ||record['カーテンDATA'].value == "あり" ){  //2023.12.10
                      work_kind = "現調" ;
                    }else if (record['案件種別'].value == "買取コーディネート"){
                      work_kind = "買取設置" ;
                    }else if (record['案件種別'].value == "カーテン・照明設置"){
                      work_kind = "レースカーテン・照明設置" ;            
                    }else if (record['案件種別'].value == "カーテン設置"){
                      work_kind = "レースカーテン設置" ; 
                    }else if (record['案件種別'].value == "レンタカグ(ライト)" || record['案件種別'].value == "レンタカグ(スタンダード)"  || record['案件種別'].value == "レンタカグ(プレミアム)" || record['案件種別'].value == "エス・プラン"){
                      work_kind = "レンタル設置" ; 
                    }else if (record['案件種別'].value == "レンタル移設"|| record['案件種別'].value == "家具移設" || record['案件種別'].value == "(エス・プラン)移設"){
                      work_kind = "移設(設置)" ; 
                      isetu_flg = 1;
                    }  //2023.12.10
                  
                  if(isetu_flg == 1){ // 2023.12.10 移設の回収情報を登録
                    //work_kind = "移設(回収)";
                    var records_09_i_up = {
                        "作業種別": { "value": "移設(回収)" }  //2023.12.10 // 2024.3.9
                    }
                    var records_09_i_ins = records_09_i_up;
                    records_09_i_ins["案件No"]= { "value": record['移設延長前案件No'].value };
                    var query_i_04_09 = '案件No="'+record['移設延長前案件No'].value+'"';
    
                    await doAsyncProcessApp(app_09_id, "作業指示・書類保管", query_i_04_09, records_09_i_ins, records_09_i_up, processmsg);
                  } // 2023.12.10 移設の回収情報を登録
                  
                  var records_09_up = {
                        "現場名": { "value": record['現場名'].value },
                        "キーボックスの位置": { "value": record['キーボックスの位置'].value },
                        "キーボックス番号": { "value": record['キーボックス暗証番号'].value },
                        "作業種別": { "value": work_kind },  //2023.12.10
                        "DATA09": { "value": record['DATA'].value }
                    } 
    
                    var records_09_ins = records_09_up;
                    records_09_ins["案件No"]= { "value": record['案件No'].value }
    
                    var query_04_09 = '案件No="'+record['案件No'].value+'"';
                    if (record["マイソク"]['value'].length === 0) {
                        if (record["間取図"]['value'].length === 0) {
                            // マイソクなし・採寸シートなし
    //                        doProcessApp(app_09_id, "作業指示・書類保管", query_04_09, records_09_ins, records_09_up, processmsg);
                            await doAsyncProcessApp(app_09_id, "作業指示・書類保管", query_04_09, records_09_ins, records_09_up, processmsg);
                        } else {
                            // マイソクなし・間取図あり
                            filename092 = event.record["間取図"].value[0].name;
                            downloadFileKey092 = event.record["間取図"].value[0].fileKey;
                            downloadFileUrl092 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey092;
                            uploadFileUrl09 = kintone.api.url('/k/v1/file', true);
    
                            var xhr09 = new XMLHttpRequest();
    
                            xhr09.open('GET', downloadFileUrl092);
                            xhr09.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr09.responseType = 'blob';
    
                            xhr09.send();
    
                            xhr09.onload = async function() {
                              if (xhr09.status === 200) {
                                // success
                                var blob = new Blob([xhr09.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename092);
    
                                var xhr092 = new XMLHttpRequest();
    
                                xhr092.open('POST', uploadFileUrl09);
                                xhr092.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr092.send(formData);
                                xhr092.onload = async function() {
                                  if (xhr092.status === 200) {
                                    var key2 = JSON.parse(xhr092.responseText).fileKey;
    
                                    records_09_ins["間取図"] = { "value": [{fileKey: key2}] };
                                    records_09_up["間取図"] = { "value": [{fileKey: key2}] };
                                    await doAsyncProcessApp(app_09_id, "作業指示・書類保管", query_04_09, records_09_ins, records_09_up, processmsg);
                                }};
                            }};
                            
                        }
    
                    } else {
                        if (record["間取図"]['value'].length === 0) {
                            // マイソクあり・採寸シートなし
                            filename091 = event.record["マイソク"].value[0].name;
                            downloadFileKey091 = event.record["マイソク"].value[0].fileKey;
                            downloadFileUrl091 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey091;
                            uploadFileUrl09 = kintone.api.url('/k/v1/file', true);
    
                            xhr09 = new XMLHttpRequest();
    
                            xhr09.open('GET', downloadFileUrl091);
                            xhr09.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr09.responseType = 'blob';
    
                            xhr09.send();
    
                            xhr09.onload = async function() {
                              if (xhr09.status === 200) {
                                // success
                                var blob = new Blob([xhr09.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename091);
    
                                var xhr092 = new XMLHttpRequest();
    
                                xhr092.open('POST', uploadFileUrl09);
                                xhr092.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr092.send(formData);
                                xhr092.onload = async function() {
                                  if (xhr092.status === 200) {
                                    var key1 = JSON.parse(xhr092.responseText).fileKey;
    
                                    records_09_ins["マイソク"] = { "value": [{fileKey: key1}] };
                                    records_09_up["マイソク"] = { "value": [{fileKey: key1}] };
                                    await doAsyncProcessApp(app_09_id, "作業指示・書類保管", query_04_09, records_09_ins, records_09_up, processmsg);
                                }};
                            }};
                        } else {
                            // マイソクあり・採寸シートあり
                            filename091 = event.record["マイソク"].value[0].name;
                            downloadFileKey091 = event.record["マイソク"].value[0].fileKey;
                            downloadFileUrl091 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey091;
    
                            filename092 = event.record["間取図"].value[0].name;
                            downloadFileKey092 = event.record["間取図"].value[0].fileKey;
                            downloadFileUrl092 = kintone.api.url('/k/v1/file', true) + '?fileKey=' + downloadFileKey092;
                            uploadFileUrl09 = kintone.api.url('/k/v1/file', true);
    
                            xhr09 = new XMLHttpRequest();
    
                            xhr09.open('GET', downloadFileUrl091);
                            xhr09.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                            xhr09.responseType = 'blob';
    
                            xhr09.send();
                            xhr09.onload = async function() {
                              if (xhr09.status === 200) {
                                // success
                                var blob = new Blob([xhr09.response]);
                                var url = window.URL || window.webkitURL;
                                var blobUrl = url.createObjectURL(blob);
    
                                var formData = new FormData();
                                formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                formData.append('file', blob, filename091);
    
                                var xhr092 = new XMLHttpRequest();
    
                                xhr092.open('POST', uploadFileUrl09);
                                xhr092.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                xhr092.send(formData);
                                xhr092.onload = async function() {
                                  if (xhr092.status === 200) {
                                    var key1 = JSON.parse(xhr092.responseText).fileKey;
    
    
                                    var xhr093 = new XMLHttpRequest();
                                    xhr093.open('GET', downloadFileUrl092);
                                    xhr093.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                                    xhr093.responseType = 'blob';
    
                                    xhr093.send();
                                    xhr093.onload = async function() {
                                        if (xhr093.status === 200) {
                                            // success
                                            var blob = new Blob([xhr093.response]);
                                            var url = window.URL || window.webkitURL;
                                            var blobUrl = url.createObjectURL(blob);
    
                                            var formData2 = new FormData();
                                            formData2.append('__REQUEST_TOKEN__', kintone.getRequestToken());
                                            formData2.append('file', blob, filename092);
    
                                            var xhr094 = new XMLHttpRequest();
    
                                            xhr094.open('POST', uploadFileUrl09);
                                            xhr094.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    
                                            xhr094.send(formData2);
                                            xhr094.onload = async function() {
                                                if (xhr094.status === 200) {
    
                                                    var key2 = JSON.parse(xhr094.responseText).fileKey;
    
                                                    records_09_ins["マイソク"] = { "value": [{fileKey: key1}] };
                                                    records_09_up["マイソク"] = { "value": [{fileKey: key1}] };
                                                    records_09_ins["間取図"] = { "value": [{fileKey: key2}] };
                                                    records_09_up["間取図"] = { "value": [{fileKey: key2}] };
                                                    await doAsyncProcessApp(app_09_id, "作業指示・書類保管", query_04_09, records_09_ins, records_09_up, processmsg);
                                                }
                                            };
                                        }
                                    };
                                }};
                            }};
                        }
                    } 
                  } // 09-作業指示・書類保管
            }
          }
        });
    })();
    
    