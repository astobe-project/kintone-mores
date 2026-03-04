
/*
* 対象アプリに更新追加処理
* return なし
*/
//function sleep(waitMsec) {
//  var startMsec = new Date();
// 
  // 指定ミリ秒間だけループさせる（CPUは常にビジー状態）
//  while (new Date() - startMsec < waitMsec);
//}

function doAsyncProcessApp(tag_app_id,tag_app_name, query, records_ins, records_up, processmsg) {
    return new Promise((resolve, reject) => {
//sleep(5000);
            if (records_up === '') {
                // insert のみ
                processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理開始";
                        console.log("アプリ-"+tag_app_name+"追加処理開始");
                // 新規追加
                var params_add = {
                    "app" : tag_app_id,
                    "record" : records_ins
                }

                kintone.api(kintone.api.url('/k/v1/record', true), 'POST', params_add,
                function(resp) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理成功！";},
                function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
            } else if (records_ins === '') {
                var jyoken = {
                    'app': tag_app_id,
                    'query': query
                }

                /* 会社、担当者が同一の既存データチェック */
                kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken, function(resp) {
                    if (resp.records.length ==0 ) {
                        processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理失敗！対象データがない！";
                    } else {
                        processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理開始";
                        console.log("アプリ-"+tag_app_name+"更新処理開始");
                        var params_update = {
                            "app" : tag_app_id,
                            "id" : resp.records[0].$id.value,
                            "record" : records_up
                        }

                        kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', params_update,
                        function(resp) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理成功！";},
                        function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
                    }
                }, function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"データチェック処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
            } else {

                var jyoken = {
                    'app': tag_app_id,
                    'query': query
                }

                /* 会社、担当者が同一の既存データチェック */
                kintone.api(kintone.api.url('/k/v1/records.json', true), 'GET', jyoken, function(resp) {
                    if (resp.records.length ==0 ) {
                        processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理開始";
                        console.log("アプリ-"+tag_app_name+"追加処理開始");

                        // 新規追加
                        var params_add = {
                            "app" : tag_app_id,
                            "record" : records_ins
                        }
console.log(params_add);
                        kintone.api(kintone.api.url('/k/v1/record', true), 'POST', params_add,
                        function(resp) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理成功！";},
                        function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
                    } else {
                        processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理開始";
                        console.log("アプリ-"+tag_app_name+"更新処理開始");
                        var params_update = {
                            "app" : tag_app_id,
                            "id" : resp.records[0].$id.value,
                            "record" : records_up
                        }
                 

                        kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', params_update,
                        function(resp) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理成功！";},
                        function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
                    }
                }, function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"データチェック処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
            }
      setTimeout(() => resolve(0), 1000);
    });
}