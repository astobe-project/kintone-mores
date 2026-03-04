/*
* 対象アプリに更新追加処理
* return なし
*/
function doProcessApp(tag_app_id,tag_app_name, query, records_ins, records_up, processmsg) {
console.log("aaa"+records_up);
    if (records_up === '') {
        // insert のみ
        processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理開始";
        console.log("アプリ-"+tag_app_name+"追加処理開始");
        // 新規追加
        var params_add = {
            "app" : tag_app_id,
            "record" : records_ins
        }
        console.log("アプリ-"+records_ins+"追加項目");
        kintone.api(kintone.api.url('/k/v1/record', true), 'POST', params_add,
        function(resp) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理成功！";},
        function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
    } else if (records_ins === '') {

        var jyoken = {
            'app': tag_app_id,
            'query': query
        }
console.log("aaa"+records_up);

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
};


/*
* 対象アプリに更新追加処理（一括）
* return なし
*/
function doProcessAppRecords(tag_app_id,tag_app_name, query, records_ins, records_up, processmsg) {
    if (records_up === '') {
        // insert のみ
        processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理開始";
        console.log("アプリ-"+tag_app_name+"追加処理開始");
        // 新規追加
        var params_add = {
            "app" : tag_app_id,
            "records" : records_ins
        }

        kintone.api(kintone.api.url('/k/v1/records', true), 'POST', params_add,
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
                var uprecordArr =[];
                for (var n=0; n<resp.records.length; n++) {
                    console.log(uprecordArr);
                    console.log(n);
                    uprecordArr.push({"id": resp.records[n].$id.value,"record" : records_up});
                }
                processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理開始";
                var params_update = {
                    "app" : tag_app_id,
                    "records" : uprecordArr
                }

                kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', params_update,
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
                    "records" : records_ins
                }

                kintone.api(kintone.api.url('/k/v1/records', true), 'POST', params_add,
                function(resp) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理成功！";},
                function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"追加処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
            } else {
                var uprecordArr =[];
                for (n=0;n++;n<resp.records.length) {
                    uprecordArr.push({"id": resp.records[n].$id.value,"record" : records_up});
                }
                processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理開始";
                console.log("アプリ-"+tag_app_name+"更新処理開始");
                var params_update = {
                    "app" : tag_app_id,
                    "records" : uprecordArr
                }

                kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', params_update,
                function(resp) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理成功！";},
                function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
            }
        }, function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"データチェック処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
    }
};

/*
* 対象アプリに更新処理（一括）
* return なし
*/
function doProcessUpRecords(tag_app_id,tag_app_name, records_up, processmsg) {
    processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理開始";
    console.log("アプリ-"+tag_app_name+"更新処理開始");
    var params_update = {
        "app" : tag_app_id,
        "records" : records_up
    }

    kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', params_update,
    function(resp) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理成功！";},
    function(error) {processmsg.innerHTML = processmsg.innerHTML+"<br>アプリ-"+tag_app_name+"更新処理失敗！<br><font color='red'>errCode:["+error.code+"]／errmessage:["+error.message+"]</font>";console.log(error)});
}



function getStringFromDate(date) {
    var year_str = date.getFullYear();
    //月だけ+1すること
    var month_str = 1 + date.getMonth();
    var day_str = date.getDate();
    var hour_str = date.getHours();
    var minute_str = date.getMinutes();
    var second_str = date.getSeconds();

    month_str = ('0' + month_str).slice(-2);
    day_str = ('0' + day_str).slice(-2);
    hour_str = ('0' + hour_str).slice(-2);
    minute_str = ('0' + minute_str).slice(-2);
    second_str = ('0' + second_str).slice(-2);

    format_str = 'YYYYMMDDhhmmss';
    format_str = format_str.replace(/YYYY/g, year_str);
    format_str = format_str.replace(/MM/g, month_str);
    format_str = format_str.replace(/DD/g, day_str);
    format_str = format_str.replace(/hh/g, hour_str);
    format_str = format_str.replace(/mm/g, minute_str);
    format_str = format_str.replace(/ss/g, second_str);

    return format_str;
}

function getLstDate(date) {
    var lstDate = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    var rtnLstDate = formatDate(lstDate);

    return rtnLstDate;
}

function formatDate(date) {
    var y = date.getFullYear();
    var m = ('00' + (date.getMonth()+1)).slice(-2);
    var d = ('00' + date.getDate()).slice(-2);
    return (y + '-' + m + '-' + d);
}

