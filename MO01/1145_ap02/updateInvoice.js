(function () {
  'use strict';

  // ================= 設定 ================= //
  const APP_SEIKYU_KAKUNIN = 1084; // 請求確認アプリ
  const APP_SEIKYU_KANRI   = 633;  // 請求管理アプリ

  // 他APP反映のチェックボックス判定に使うラベル
  const FLAG_HIKA   = '引合';
  const FLAG_JUCHU  = '受注';
  const FLAG_SEIKYU = '請求';

  // ================ ヘルパ ================ //

  // Date文字列(YYYY-MM-DD)をその月末(YYYY-MM-DD)にする
  function toEndOfMonth(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    const eom = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const y = eom.getFullYear();
    const m = String(eom.getMonth() + 1).padStart(2, '0');
    const day = String(eom.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  // Kintoneクエリ用の文字列エスケープ（ダブルクォートを二重に）
  function q(str) {
    return (str ?? '').replace(/"/g, '\\"');
  }

  // レコード1件だけ取得（存在確認用）
  async function findOne(appId, query) {
    const params = { app: appId, query: `${query} limit 1` };
    const res = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', params);
    return (res.records && res.records.length > 0) ? res.records[0] : null;
  }

  // 1件追加
  async function addOne(appId, record) {
    const params = { app: appId, record };
    return await kintone.api(kintone.api.url('/k/v1/record', true), 'POST', params);
  }

  // 1件更新（レコードID指定）
  async function updateOne(appId, recordId, record) {
    const params = { app: appId, id: recordId, record };
    return await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', params);
  }

  // チェックボックス配列に特定ラベルが含まれるか
  function hasFlag(arr, label) {
    return Array.isArray(arr) && arr.includes(label);
  }

  // 値が空かどうか簡易チェック
  function isBlank(v) {
    return v === null || v === undefined || v === '';
  }

  // 自アプリの他APP反映に「請求」を付ける（重複回避）
  async function markSeikyuChecked(event, currentFlags) {
    const appId = kintone.app.getId();
    const recId = event.recordId; // submit.success で利用可
    const next = Array.isArray(currentFlags) ? [...currentFlags] : [];
    if (!next.includes(FLAG_SEIKYU)) next.push(FLAG_SEIKYU);

    const params = {
      app: appId,
      id: recId,
      record: {
        '他APP反映': { value: next }
      }
    };
    await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', params);
  }

  // =============== メイン処理 =============== //

  // 保存後に連携（作成・編集の双方）
  const afterSaveEvents = [
    'app.record.create.submit.success',
    'app.record.edit.submit.success'
  ];

  kintone.events.on(afterSaveEvents, async (event) => {
    const record = event.record;

    try {
      // 0) 設置完了日の末日算出
      const setti = record['設置完了日']?.value; // YYYY-MM-DD 想定
      const seikyugetu = toEndOfMonth(setti);
      if (isBlank(seikyugetu)) {
        console.warn('設置完了日が未入力のため、請求連携はスキップします。');
        return event;
      }

      // 1) フラグ判定（両アプリ反映の前にチェック）
      const flags = record['他APP反映']?.value || [];
      // 「請求確認」フィールドにチェックが入っているか確認
　　　const seikyuKakuninChecked = hasFlag(record['請求確認']?.value, 'OK');
//      const okToReflect = hasFlag(flags, FLAG_HIKA) && hasFlag(flags, FLAG_JUCHU) && !hasFlag(flags, FLAG_SEIKYU);
      const okToReflect = seikyuKakuninChecked && !hasFlag(flags, FLAG_SEIKYU);
      if (!okToReflect) {
        console.info('他APP反映と請求確認フラグの条件を満たさないため、両アプリへの反映をスキップ。');
        return event;
      }

      // 2) 請求確認アプリ(1084) Insert-only（3項目複合キー：得意先1/得意先2/請求月末日）
      const toku1 = record['得意先名']?.value ?? record['得意先名1']?.value ?? record['得意先1']?.value ?? '';
      const toku2 = record['得意先名2']?.value ?? record['得意先2']?.value ?? '';

      const q1 = `得意先名1 = "${q(toku1)}" and 得意先名2 = "${q(toku2)}" and 請求月末日 = "${q(seikyugetu)}"`;
      const exists1084 = await findOne(APP_SEIKYU_KAKUNIN, q1);
      if (!exists1084) {
        const rec1084 = {
          "請求月末日":           { "value": seikyugetu },
          "営業担当":             { "value": record['営業担当']?.value ?? '' },
          "得意先コード":           { "value": record['得意先コード']?.value ?? '' },
          "得意先名1":           { "value": toku1 },
          "得意先名2":           { "value": toku2 },
          "請求先担当者":         { "value": record['請求先_担当者']?.value ?? '' },
          "請求書メールアドレス": { "value": record['請求先メールアドレス']?.value ?? '' },
          "担当者":               { "value": record['tanto']?.value ?? '' },
          "メールアドレス":       { "value": record['メールアドレス']?.value ?? '' },
          "CCアドレス":           { "value": record['CCアドレス']?.value ?? '' }
        };
        await addOne(APP_SEIKYU_KAKUNIN, rec1084);
        console.info('請求確認アプリ(1084)へ新規連携しました。');
      } else {
        console.info('請求確認アプリ(1084)：同一キーのレコードが存在するためスキップ。');
      }

      // 3) 請求管理アプリ(633) Insert/Update（キー：案件No）
      const ankenNo = record['案件No']?.value ?? '';
      if (isBlank(ankenNo)) {
        console.warn('案件Noが空のため、請求管理アプリへの連携をスキップします。');
        return event;
      }

      const nyukin        = record['入金方法']?.value ?? '';
      const siharaiyotei  = record['入金日_請求']?.value ?? '';

      const record633 = {
        "案件No":               { "value": record['案件No']?.value ?? '' },
        "案件種別":             { "value": record['案件種別']?.value ?? '' },
        "案件ステータス":       { "value": "請求済" },
        "営業担当":             { "value": record['担当営業']?.value ?? '' },
        "営業フォロー":         { "value": record['営業フォロー']?.value ?? '' },
        "物件担当メールアドレス": { "value": record['物件担当メールアドレス']?.value ?? '' },
        "現場コード":           { "value": record['現場コード']?.value ?? '' },
        "現場名":               { "value": record['bukenmei']?.value ?? record['現場名']?.value ?? '' },
        "設置完了日":           { "value": record['設置完了日']?.value ?? '' },
        "得意先コード":         { "value": record['得意先コード']?.value ?? '' },
        "得意先1":             { "value": record['得意先名1']?.value ?? record['得意先1']?.value ?? toku1 },
        "得意先2":             { "value": record['得意先名2']?.value ?? record['得意先2']?.value ?? toku2 },
        "担当者":               { "value": record['tanto']?.value ?? record['得意先担当者']?.value ?? '' },
        // 必要に応じて再開
        // "得意先電話番号":       { "value": record['得意先電話番号']?.value ?? '' },
        // "受注見積No":           { "value": record['受注見積No']?.value ?? '' },
        "税抜請求金額":         { "value": record['合計金額_税抜']?.value ?? record['税抜_合計']?.value ?? '' },
        "請求月":               { "value": seikyugetu },
        "入金方法":             { "value": nyukin },
        "お支払い予定日":       { "value": siharaiyotei }
      };

      const exists633 = await findOne(APP_SEIKYU_KANRI, `案件No = "${q(ankenNo)}"`);

      if (exists633) {
        await updateOne(APP_SEIKYU_KANRI, exists633.$id.value, record633);
        console.info(`請求管理アプリ(633)：案件No=${ankenNo} を更新しました。`);
      } else {
        await addOne(APP_SEIKYU_KANRI, record633);
        console.info(`請求管理アプリ(633)：案件No=${ankenNo} を新規作成しました。`);
      }

      // 4) 633反映が成功したので、自アプリの 他APP反映 に「請求」を付与
      await markSeikyuChecked(event, flags);
      console.info('自アプリ：他APP反映 に「請求」を付与しました。');

    } catch (err) {
      console.error('連携処理でエラーが発生しました:', err);
      // 保存は成功しているため、ここではブロックしない。
      // 必要ならユーザー通知UIを追加してください。
    }

    return event;
  });
})();