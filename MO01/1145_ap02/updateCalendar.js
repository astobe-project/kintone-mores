  // ==================================================
  // 設置予定日変更時：1204アプリへ反映（IIFE内、Promise返さない）
  // ==================================================

  (function () {
    'use strict';
    const TARGET_APP_ID = 1204;
    const FIELD_NO = '案件番号';

    function baseDate(field) {
      return field && field.value ? new Date(field.value) : null;
    }

    function formatDate(date) {
      return date ? date.toISOString().split('T')[0] : '';
    }
    // ...既存コード...

    // ここから追加

    kintone.events.on(
      ['app.record.edit.change.設置予定日'],
      function (event) {
        const record = event.record;
        const caseNo = record['案件No']?.value;
        const yoteibi = record['設置予定日']?.value;
        const kanryoubi = record['設置完了日']?.value;
        if (!caseNo || !yoteibi) {
          return event;
        }

        // 設置完了日が空 → 設置系
        if (!kanryoubi) {
          kintone.api(
            kintone.api.url('/k/v1/records', true),
            'GET',
            {
              app: TARGET_APP_ID,
              query: `${FIELD_NO} = "${caseNo}"`,
              fields: ['$id', 'タスク管理']
            }
          ).then(getResp => {
            if (getResp.records.length === 0) return;
            const target = getResp.records[0];
            let found = false;
            const updated = (target['タスク管理']?.value || []).map(row => {
              if (row.value['タスク']?.value === '3：設置予定') {
                found = true;
                return {
                  id: row.id,
                  value: {
                    ...row.value,
                    日付: { value: yoteibi }
                  }
                };
              }
              return row;
            });
            // 追加はしない（foundがfalseでもpushしない）
            if (found) {
              return kintone.api(
                kintone.api.url('/k/v1/record', true),
                'PUT',
                {
                  app: TARGET_APP_ID,
                  id: target.$id.value,
                  record: { タスク管理: { value: updated } }
                }
              );
            }
          }).catch(e => {
            console.error('🚨 設置予定日変更時の1204反映エラー', e);
            event.error = '設置予定日変更時の1204反映でエラーが発生しました';
          });
          return event;
        }

        // 設置完了日が入っている → 回収系
        const kaishuCaseNo = `回収_${caseNo}`;
        kintone.api(
          kintone.api.url('/k/v1/records', true),
          'GET',
          {
            app: TARGET_APP_ID,
            query: `${FIELD_NO} = "${kaishuCaseNo}"`,
            fields: ['$id', 'タスク管理']
          }
        ).then(getResp => {
          if (getResp.records.length === 0) return;
          const target = getResp.records[0];
          let found = false;
          const updated = (target['タスク管理']?.value || []).map(row => {
            if (row.value['タスク']?.value === '3：回収期限') {
              found = true;
              return {
                id: row.id,
                value: {
                  ...row.value,
                  日付: { value: yoteibi }
                }
              };
            }
            return row;
          });
          // 追加はしない（foundがfalseでもpushしない）
          if (found) {
            return kintone.api(
              kintone.api.url('/k/v1/record', true),
              'PUT',
              {
                app: TARGET_APP_ID,
                id: target.$id.value,
                record: { タスク管理: { value: updated } }
              }
            );
          }
        }).catch(e => {
          console.error('🚨 設置予定日変更時の1204回収系反映エラー', e);
          event.error = '設置予定日変更時の1204回収系反映でエラーが発生しました';
        });
        return event;
      }
    );

    // ...既存コード...
//
// 案件ステータスが変わったときに処理。
//  1. 案件ステータスが「回収_依頼受/回収日未定」の場合 → 必須チェック＆回収タスク追加
//  2. 案件ステータスが「受注_設置日未定(発注等)」の場合 → タスクバーの「未受注」を「調整中」に更新
//  3. 案件ステータスが「キャンセル」の場合 → タスク管理サブテーブルの調整状況を全て「完了」に更新
//
(function () {
  'use strict';

  const TARGET_APP_ID = 1204; // コピー・更新先アプリID
  const FIELD_NO = '案件番号'; // 反映先アプリの案件番号フィールドコード

  function baseDate(field) {
    return field && field.value ? new Date(field.value) : null;
  }

  function formatDate(date) {
    return date ? date.toISOString().split('T')[0] : '';
  }

  // ==================================================
  // ① 案件ステータス変更時：チェックのみ（保存前）
  // ==================================================
  kintone.events.on(
    ['app.record.edit.change.案件ステータス'],
    function (event) {

      const record = event.record;
      const status = record['案件ステータス'].value;

      if (status === '回収_依頼受/回収日未定') {
        if (!record['回収期限日'].value) {
          event.error = '「回収期限日」を入力してください。';
        }
      }

      if (status === '回収_回収日確定') {
        if (!record['回収日'].value) {
          event.error = '「回収日」を入力してください。';
        }
      }

      return event;
    }

  );

})();

  // ==================================================
  // ② 保存成功時：実処理（反映はここだけ）
  // ==================================================
  kintone.events.on(
    ['app.record.edit.submit'],
    async function (event) {

      const record = event.record;
      const status = record['案件ステータス'].value;
      const caseNo = record['案件No']?.value;

      if (!caseNo) {
        return event;
      }

      try {

        // =========================================
        // パターン1：回収系
        // =========================================
        if (status === '回収_依頼受/回収日未定' || status === '回収_回収日確定') {

          const isRequest = status === '回収_依頼受/回収日未定';
          const dateToUse = isRequest
            ? baseDate(record['回収期限日'])
            : baseDate(record['回収日']);

          // --- 既存確認 ---
          const getResp = await kintone.api(
            kintone.api.url('/k/v1/records', true),
            'GET',
            {
              app: TARGET_APP_ID,
              query: `${FIELD_NO} = "回収_${caseNo}"`
            }
          );

          const taskEntries = [
            {
              value: {
                タスク: { value: '3：回収期限' },
                日付: { value: formatDate(dateToUse) }
              }
            }
          ];
          const planNoRental = record['プランNo_ﾚﾝﾀﾙ']?.value;
          const sourceGenbaName = record['bukenmei']?.value || '';

          if (planNoRental && sourceGenbaName) {
            const planResp = await kintone.api(
              kintone.api.url('/k/v1/records', true),
              'GET',
              {
                app: 1142,
                query: `プラン_NO = "${planNoRental}"`,
                fields: ['案件No']
              }
            );

            const linkedCaseNo = planResp.records[0]?.['案件No']?.value || '';

            if (linkedCaseNo) {
              const collectField = '回収元現場名';
              const collectRespFixed = await kintone.api(
                kintone.api.url('/k/v1/records', true),
                'GET',
                {
                  app: TARGET_APP_ID,
                  query: `${FIELD_NO} = "${linkedCaseNo}"`,
                  fields: ['$id', collectField]
                }
              );

              if (collectRespFixed.records.length > 0) {
                const collectTargetFixed = collectRespFixed.records[0];
                const currentCollectFromFixed =
                  collectTargetFixed[collectField]?.value || '';

                if (currentCollectFromFixed !== sourceGenbaName) {
                  await kintone.api(
                    kintone.api.url('/k/v1/record', true),
                    'PUT',
                    {
                      app: TARGET_APP_ID,
                      id: collectTargetFixed.$id.value,
                      record: {
                        [collectField]: { value: sourceGenbaName }
                      }
                    }
                  );
                }
              }

            }
          }

          if (getResp.records.length > 0) {
            // 更新
            await kintone.api(
              kintone.api.url('/k/v1/record', true),
              'PUT',
              {
                app: TARGET_APP_ID,
                id: getResp.records[0].$id.value,
                record: { タスク管理: { value: taskEntries } }
              }
            );
          } else {
            // 新規
            await kintone.api(
              kintone.api.url('/k/v1/record', true),
              'POST',
              {
                app: TARGET_APP_ID,
                record: {
                  案件番号: { value: `回収_${caseNo}` },
                  案件種別: { value: record['案件種別'].value },
                  案件ステータス: { value: record['案件ステータス'].value },
                  営業担当: { value: record['営業担当'].value },
                  現場名: { value: record['bukenmei'].value },
                  得意先コード: { value: record['得意先コード'].value },
                  得意先名: { value: record['得意先名'].value },
                  タスク管理: { value: taskEntries }
                }
              }
            );
          }
        }

        // =========================================
        // パターン2：受注_設置日未定
        // =========================================
        if (status === '受注_設置日未定(発注等)') {

          const resp = await kintone.api(
            kintone.api.url('/k/v1/records', true),
            'GET',
            {
              app: TARGET_APP_ID,
              query: `${FIELD_NO} = "${caseNo}"`
            }
          );

          if (resp.records.length === 0) return event;

          const target = resp.records[0];
          const updated = target['タスク管理'].value.map(row => {
            if (row.value['調整状況'].value === '未受注') {
              row.value['調整状況'].value = '調整中';
            }
            return { id: row.id, value: row.value };
          });

          await kintone.api(
            kintone.api.url('/k/v1/record', true),
            'PUT',
            {
              app: TARGET_APP_ID,
              id: target.$id.value,
              record: { タスク管理: { value: updated } }
            }
          );
        }

        // =========================================
        // パターン3：キャンセル
        // =========================================
        if (status === 'キャンセル') {

          const resp = await kintone.api(
            kintone.api.url('/k/v1/records', true),
            'GET',
            {
              app: TARGET_APP_ID,
              query: `${FIELD_NO} = "${caseNo}"`
            }
          );

          if (resp.records.length === 0) return event;

          const target = resp.records[0];
          const updated = target['タスク管理'].value.map(row => ({
            id: row.id,
            value: {
              ...row.value,
              調整状況: { value: '完了' }
            }
          }));

          await kintone.api(
            kintone.api.url('/k/v1/record', true),
            'PUT',
            {
              app: TARGET_APP_ID,
              id: target.$id.value,
              record: { タスク管理: { value: updated } }
            }
          );
        }

      } catch (e) {
        console.error('🚨 案件ステータス連動処理エラー', e);
        event.error = '案件ステータス連動処理でエラーが発生しました';
      }

      return event;
    }
  );

  
  // ===============================
  // プランNo_ﾚﾝﾀﾙ 連動：移設元現場名略称 更新（安全版）
  // ===============================
  kintone.events.on(
    [
      'app.record.create.submit',
      'app.record.edit.submit'
    ],
    async function (event) {
      return event;
  
      const record = event.record;
  
      const planNoRental = record['プランNo_ﾚﾝﾀﾙ']?.value;
      const caseNo = record['案件No']?.value;
  
      if (!planNoRental || !caseNo) {
        return event;
      }
  
      try {
        /* =========================
           ① app1142 から取得
        ========================= */
        const PLAN_APP_ID = 1142;
  
        const planResp = await kintone.api(
          kintone.api.url('/k/v1/records', true),
          'GET',
          {
            app: PLAN_APP_ID,
            query: `プラン_NO = "${planNoRental}"`,
            fields: ['現場名_レンタル中']
          }
        );
  
        if (planResp.records.length === 0) {
          return event;
        }
  
        const rentalSiteName =
          planResp.records[0]['現場名_レンタル中']?.value || '';
  
        if (!rentalSiteName) {
          return event;
        }
  
        /* =========================
           ② app1204 現在値取得
        ========================= */
        const targetResp = await kintone.api(
          kintone.api.url('/k/v1/records', true),
          'GET',
          {
            app: TARGET_APP_ID,
            query: `${FIELD_NO} = "${caseNo}"`,
            fields: ['$id', '移設元現場名略称']
          }
        );
  
        if (targetResp.records.length === 0) {
          return event;
        }
  
        const target = targetResp.records[0];
        const targetId = target.$id.value;
        const currentValue = target['移設元現場名略称']?.value || '';
  
        // ★ 同じ値なら何もしない（重要）
        if (currentValue === rentalSiteName) {
          return event;
        }
  
        /* =========================
           ③ 更新
        ========================= */
        await kintone.api(
          kintone.api.url('/k/v1/record', true),
          'PUT',
          {
            app: TARGET_APP_ID,
            id: targetId,
            record: {
              '移設元現場名略称': { value: rentalSiteName }
            }
          }
        );
  
        console.log(
          `✅ 移設元現場名略称 更新: 案件No=${caseNo} ← ${rentalSiteName}`
        );
  
      } catch (error) {
        console.error('🚨 プランNo_ﾚﾝﾀﾙ 連動更新エラー:', error);
        event.error = 'プランNo_ﾚﾝﾀﾙ 連動処理でエラーが発生しました';
      }
  
      return event;
    }
  );

  
})();
