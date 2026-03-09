(function () {
  'use strict';

  // --- 設定値 ---
  const CONFIG = {
    TARGET_FIELD: '案件ステータス',
    BASE_FIELD: '当込み_ステータス',
    SUCCESS_VALUE: 'ﾌﾟﾗﾝ当込_承認済(作成可)',
    BUTTON_ID: 'mores-approve-btn'
  };

  // デザインルール：現場での使いやすさを優先し、文字サイズは大きめ、太字を多用
  const BUTTON_STYLE = `
    .#${CONFIG.BUTTON_ID} {
      display: inline-block;
      margin-left: 10px;
      padding: 0 24px;
      height: 44px;           /* 押しやすい高さ */
      line-height: 44px;
      background-color: #003399; /* 信頼感のある濃いブルー */
      color: #ffffff !important;
      font-weight: 900 !important; /* 極太 */
      font-size: 18px !important;  /* 大きめサイズ */
      border: none;
      border-radius: 6px;
      cursor: pointer;
      vertical-align: middle;
      box-shadow: 0 4px 10px rgba(0,0,0,0.3); /* 視認性を高める影 */
      transition: all 0.2s;
    }
    .#${CONFIG.BUTTON_ID}:hover {
      background-color: #0052cc;
      transform: translateY(-1px); /* ホバー時に少し浮く演出 */
      box-shadow: 0 6px 12px rgba(0,0,0,0.35);
    }
    .#${CONFIG.BUTTON_ID}:active {
      transform: translateY(1px);
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .#${CONFIG.BUTTON_ID}:disabled {
      background-color: #e0e0e0;
      color: #999999 !important;
      box-shadow: none;
      cursor: not-allowed;
    }
  `;

  // スタイルの注入
  const injectStyle = () => {
    if (!document.getElementById('mores-approve-style')) {
      const style = document.createElement('style');
      style.id = 'mores-approve-style';
      style.textContent = BUTTON_STYLE;
      document.head.appendChild(style);
    }
  };

  kintone.events.on('app.record.detail.show', (event) => {
    const record = event.record;

    // 二重設置防止
    if (document.getElementById(CONFIG.BUTTON_ID)) return event;
    
    // すでに承認済みの場合はボタンを出さない（視覚的ノイズの除去）
    if (record[CONFIG.TARGET_FIELD].value === CONFIG.SUCCESS_VALUE) {
      return event;
    }

    injectStyle();

    const baseEl = kintone.app.record.getFieldElement(CONFIG.BASE_FIELD);
    if (!baseEl) return event;

    const btn = document.createElement('button');
    btn.id = CONFIG.BUTTON_ID;
    btn.textContent = '案件を承認する'; // 現場で直感的にわかる文言
    baseEl.insertAdjacentElement('afterend', btn);

    btn.addEventListener('click', async () => {
      if (!confirm('ステータスを承認済に変更します。よろしいですか？')) return;

      btn.disabled = true;
      btn.textContent = '承認中...';

      const body = {
        app: kintone.app.getId(),
        id: kintone.app.record.getId(),
        record: {
          [CONFIG.TARGET_FIELD]: { value: CONFIG.SUCCESS_VALUE }
        }
      };

      try {
        await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body);
        // 更新成功後、画面をリロード
        location.reload();
      } catch (error) {
        console.error(error);
        alert('承認処理に失敗しました。権限などを確認してください。\n' + (error.message || ''));
        btn.disabled = false;
        btn.textContent = '案件を承認する';
      }
    });

    return event;
  });
})();