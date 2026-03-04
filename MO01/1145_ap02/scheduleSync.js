/*
(function () {
  'use strict';

  var TARGET_APP_ID = 1204; // スケジュール管理アプリID
  var FIELD_NO = '案件No'; // 案件番号フィールドコード

  // フィールド変更イベント（編集画面のみ）
  kintone.events.on([
    'app.record.edit.change.現調日',
    'app.record.edit.change.プラン作成日',
    'app.record.edit.change.設置予定日',
    'app.record.edit.change.撮影日'
  ], function (event) {
    var record = event.record;
    var caseNo = record[FIELD_NO].value;
    var changedField = event.changes.field;

    // 変更されたフィールドごとにタスク名を判定
    var taskName = null;
    var newDate = null;

    if (changedField.code === '現調日') {
      taskName = '1：現調';
      newDate = record['現調日'].value;
    } else if (changedField.code === 'プラン作成日') {
      taskName = '2：プラン作成';
      newDate = record['プラン作成日'].value;
    } else if (changedField.code === '設置予定日') {
      taskName = '3：設置予定';
      newDate = record['設置予定日'].value;
    } else if (changedField.code === '撮影日') {
      taskName = '4：撮影';
      newDate = record['撮影日'].value;
    }

    if (!taskName || !newDate) {
      return event; // 変更なしなら何もしない
    }

    // スケジュール管理アプリを検索
    return kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
      app: TARGET_APP_ID,
      query: '案件番号 = "' + caseNo + '"'
    }).then(function (getResp) {
      if (getResp.records.length === 0) {
        console.log('対象案件なし → スキップ');
        return event;
      }

      var targetRec = getResp.records[0];
      var recId = targetRec.$id.value;

      // サブテーブル更新
      var updatedSub = targetRec['タスク管理'].value.map(function (row) {
        if (row.value['タスク'].value === taskName) {
          row.value['日付'].value = newDate;
        }
        return row;
      });

      var putBody = {
        app: TARGET_APP_ID,
        id: recId,
        record: {
          'タスク管理': { value: updatedSub }
        }
      };

      return kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', putBody).then(function () {
        console.log('スケジュール更新完了：' + taskName);
        return event;
      });
    }).catch(function (err) {
      console.error(err);
      alert('スケジュール更新でエラーが発生しました');
      return false;
    });
  });
})();
*/