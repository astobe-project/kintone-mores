(() => {
  'use strict';

  // ====== CSSの追加 ======
  const style = document.createElement('style');
  style.textContent = `
    .kintone-custom-btn {
      background-color: #007bff;
      color: #fff;
      padding: 6px 14px;
      border: none;
      border-radius: 4px;
      font-size: 14px;
      cursor: pointer;
      transition: background-color 0.2s ease-in-out;
      margin-bottom: 4px;
    }
    .kintone-custom-btn:hover {
      background-color: #0056b3;
    }
    .kintone-undo-btn {
      background-color: #6c757d;
      color: #fff;
      border: none;
      border-radius: 4px;
      padding: 4px 12px;
      cursor: pointer;
      font-size: 14px;
    }
    .kintone-undo-btn:hover {
      background-color: #5a6268;
    }
  `;
  document.head.appendChild(style);

  // ====== 設定 ======
  // 元画像（1枚のみ想定）と保存先（1つ）
  const SRC_FIELD = '白抜き_間取図'; // 添付ファイル型、常に1枚の画像が入る前提
  const DST_FIELD = '採寸シート';    // 添付ファイル型、追加保存

  const LINE_WIDTH_DEFAULT       = 3;
  const ERASER_WIDTH_DEFAULT     = 40;
  const STAMP_DIAMETER_DEFAULT   = 48;
  const TEXT_FONT_SIZE_DEFAULT   = 32;

  const SAVE_FORMAT  = 'image/png';
  const SAVE_QUALITY = 0.92;

  const CIRCLED_NUMS = ['①','②','③','④','⑤','⑥','⑦','⑧','⑨','⑩','⑪','⑫'];

  // ====== ボタン表示先 ======
  function getMountElement() {
    const space = kintone.app.record.getSpaceElement?.('ANNOTATE_BTN');
    if (space) return space;
    const header = kintone.app.record.getHeaderMenuSpaceElement?.();
    if (header) return header;
    const fallback = document.querySelector('.record-header-gaia, .gaia-argoui-app-toolbar');
    return fallback || null;
  }

  // ====== 画像判定 ======
  function isImageFile(fileMeta) {
    const extOk  = /\.(png|jpe?g|gif|bmp|webp)$/i.test(fileMeta?.name || '');
    const mimeOk = (fileMeta?.contentType || '').startsWith('image/');
    return extOk || mimeOk;
  }

  // ====== テキスト描画ヘルパー ======
  function drawFreeText(ctx, text, x, y, {
    color = '#ff0000', fontSize = 32, bold = true, align = 'left', withBg = false, padding = 6, radius = 4
  } = {}) {
    if (!text || !text.trim()) return;

    ctx.save();
    ctx.font = `${bold ? 'bold ' : ''}${Math.floor(fontSize)}px sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = 'top';
    const metrics = ctx.measureText(text);
    const textWidth = metrics.width;
    const textHeight = fontSize * 1.2; 

    if (withBg) {
      const alignHalf = (align === 'center') ? textWidth / 2 : (align === 'right') ? textWidth : 0;
      const boxX = x - alignHalf - padding;
      const boxY = y - padding;
      const boxW = textWidth + padding * 2;
      const boxH = textHeight + padding * 2;

      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      roundRectPath(ctx, boxX, boxY, boxW, boxH, radius);
      ctx.fill();

      ctx.strokeStyle = color + '55';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }

    ctx.fillStyle = color;
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  function roundRectPath(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y,   x + w, y + h, rr);
    ctx.arcTo(x + w, y+h, x,     y + h, rr);
    ctx.arcTo(x,     y+h, x,     y,     rr);
    ctx.arcTo(x,     y,   x + w, y,     rr);
    ctx.closePath();
  }

  // ====== PC：レコード詳細 ======
  kintone.events.on('app.record.detail.show', async (event) => {
    try {
      if (document.getElementById('annotateBtn')) return event;

      const rec = event.record;
      if (!rec[SRC_FIELD] || rec[SRC_FIELD].type !== 'FILE') {
        alert(`「${SRC_FIELD}」が見つからないか、添付ファイル型ではありません。`);
        return event;
      }
      if (!rec[DST_FIELD] || rec[DST_FIELD].type !== 'FILE') {
        alert(`「${DST_FIELD}」が見つからないか、添付ファイル型ではありません。`);
        return event;
      }

      const mount = getMountElement();
      if (!mount) return event;

      const btn = document.createElement('button');
      btn.id = 'annotateBtn';
      btn.textContent = '注記して保存（白抜き_間取図 → 採寸シート）';
      btn.className = 'kintoneplugin-button-normal';
      btn.style.backgroundColor = '#1e90ff';
      btn.style.color = '#fff';
      mount.appendChild(btn);

      btn.addEventListener('click', async () => {
        try {
          const appId    = kintone.app.getId();
          const recordId = kintone.app.record.getId();

          // 元画像取得（1枚のみ前提）
          const files = rec[SRC_FIELD].value || [];
          if (!files.length) {
            alert(`「${SRC_FIELD}」に画像が添付されていません。`);
            return;
          }
          const src = files[0];
          if (!isImageFile(src)) {
            alert(`「${SRC_FIELD}」のファイルは画像ではありません。`);
            return;
          }

          // エディタを開く
          const {
            container, imageCanvas, inkCanvas, objectsCanvas, overlayCanvas, innerWrap,
            imageCtx, inkCtx, srcName, dispose, closeButton
          } = await openCanvasEditor(src);

          const tools = buildToolbar(container);

          // 表示ズーム機能（見た目のみのスケール変更）
          const applyViewZoom = () => {
            const z = tools.getViewZoom ? tools.getViewZoom() : 1;
            innerWrap.style.transformOrigin = 'top left';
            innerWrap.style.transform = `scale(${z})`;
          };
          applyViewZoom();
          const detachZoom = tools.onViewZoomChange ? tools.onViewZoomChange(applyViewZoom) : () => {};

          const { unbind: unbindDraw } = enableDrawTools({
            imageCanvas, inkCanvas, objectsCanvas, overlayCanvas,
            inkCtx, tools, width: LINE_WIDTH_DEFAULT, eraserWidth: ERASER_WIDTH_DEFAULT
          });

          closeButton.onclick = () => {
            try { unbindDraw(); detachZoom(); dispose(); } catch {}
          };

          // 保存ボタン
          const saveWrap = document.createElement('div');
          saveWrap.style.marginTop = '12px';
          saveWrap.style.textAlign = 'right';

          const saveBtn = document.createElement('button');
          saveBtn.textContent = 'この描画で保存（採寸シート）';
          saveBtn.className = 'kintone-custom-btn';
          saveBtn.style.padding = '10px 24px';
          saveBtn.style.fontSize = '16px';
          saveWrap.appendChild(saveBtn);
          container.appendChild(saveWrap);

          saveBtn.onclick = async () => {
            try {
              saveBtn.disabled = true;
              saveBtn.textContent = '保存中...';
              
              const exportCanvas = document.createElement('canvas');
              exportCanvas.width  = imageCanvas.width;
              exportCanvas.height = imageCanvas.height;
              const exportCtx = exportCanvas.getContext('2d');
              exportCtx.drawImage(imageCanvas,   0, 0);
              exportCtx.drawImage(inkCanvas,     0, 0);
              exportCtx.drawImage(objectsCanvas, 0, 0);

              const blob = await new Promise((res) => exportCanvas.toBlob(res, SAVE_FORMAT, SAVE_QUALITY));
              if (!blob) throw new Error('画像の生成に失敗しました');

              const formData = new FormData();
              formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
              const safeName = (srcName || 'image').replace(/\.[^.]+$/, '');
              const fileName = `annotated_${safeName}.${SAVE_FORMAT === 'image/png' ? 'png' : 'jpg'}`;
              formData.append('file', blob, fileName);

              const upResp = await fetch('/k/v1/file.json', { method: 'POST', headers: { 'X-Requested-With': 'XMLHttpRequest' }, body: formData });
              if (!upResp.ok) throw new Error(`アップロード失敗（HTTP ${upResp.status}）`);
              const { fileKey } = await upResp.json();

              // ★ 最新レコードGET → 追記してPUT（競合・上書き防止）
              const getResp = await kintone.api(kintone.api.url('/k/v1/record.json', true), 'GET', { app: appId, id: recordId });
              const latest = getResp.record;
              const current = (latest[DST_FIELD]?.value || []).map(v => ({ fileKey: v.fileKey }));
              current.push({ fileKey });

              await kintone.api(kintone.api.url('/k/v1/record.json', true), 'PUT', { app: appId, id: recordId, record: { [DST_FIELD]: { value: current } } });

              try { unbindDraw(); detachZoom(); dispose(); } catch {}
              sessionStorage.setItem('annotated_saved', '1');
              location.reload();

            } catch (err) {
              console.error(err);
              alert('保存中にエラーが発生しました。');
              saveBtn.disabled = false;
              saveBtn.textContent = 'この描画で保存（採寸シート）';
            }
          };

        } catch (e) {
          console.error(e);
          alert('注記の開始でエラーが発生しました。');
        }
      });

      if (sessionStorage.getItem('annotated_saved') === '1') {
        sessionStorage.removeItem('annotated_saved');
      }

    } catch (e) {
      console.error(e);
    }
    return event;
  });

  // ====== 画像読込＆エディタ構築（座標ズレ完全対策版） ======
  async function openCanvasEditor(fileMeta) {
    const resp = await fetch(`/k/v1/file.json?fileKey=${encodeURIComponent(fileMeta.fileKey)}`, { headers: { 'X-Requested-With': 'XMLHttpRequest' }});
    if (!resp.ok) throw new Error('画像取得失敗');
    const blob = await resp.blob();

    const img = document.createElement('img');
    img.src = URL.createObjectURL(blob);
    await img.decode();

    const container = document.createElement('div');
    Object.assign(container.style, {
      position: 'fixed', inset: '3% 5%', background: '#fff', border: '1px solid #ccc', borderRadius: '8px',
      padding: '16px', zIndex: 9999, boxShadow: '0 8px 32px rgba(0,0,0,.3)',
      maxHeight: '94vh', display: 'flex', flexDirection: 'column'
    });

    const closeButton = document.createElement('button');
    closeButton.textContent = '✕ 閉じる';
    closeButton.className = 'kintone-custom-btn';
    closeButton.style.alignSelf = 'flex-start';
    closeButton.style.backgroundColor = '#dc3545';
    container.appendChild(closeButton);

    // 座標ズレ防止レイヤー
    const wrap = document.createElement('div');
    Object.assign(wrap.style, {
      position: 'relative', width: '100%', flex: '1', overflow: 'auto', 
      marginTop: '12px', border: '1px solid #ddd', backgroundColor: '#f0f0f0', textAlign: 'center'
    });

    const innerWrap = document.createElement('div');
    Object.assign(innerWrap.style, {
      position: 'relative', display: 'inline-block', maxWidth: '100%', boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
    });

    const createCanvas = () => {
      const c = document.createElement('canvas');
      c.width = img.width; c.height = img.height;
      return c;
    };

    const imageCanvas = createCanvas();
    imageCanvas.style.position = 'relative';
    imageCanvas.style.maxWidth = '100%';
    imageCanvas.style.height = 'auto';
    imageCanvas.style.display = 'block';
    
    const imageCtx = imageCanvas.getContext('2d');
    imageCtx.drawImage(img, 0, 0);

    const inkCanvas = createCanvas();
    const objectsCanvas = createCanvas();
    const overlayCanvas = createCanvas();

    const absStyle = { position: 'absolute', top: '0', left: '0', width: '100%', height: '100%', pointerEvents: 'none' };
    Object.assign(inkCanvas.style, absStyle);
    Object.assign(objectsCanvas.style, absStyle);
    Object.assign(overlayCanvas.style, absStyle);
    overlayCanvas.style.pointerEvents = 'auto'; 
    overlayCanvas.style.touchAction = 'none';

    innerWrap.appendChild(imageCanvas);
    innerWrap.appendChild(inkCanvas);
    innerWrap.appendChild(objectsCanvas);
    innerWrap.appendChild(overlayCanvas);
    wrap.appendChild(innerWrap);
    container.appendChild(wrap);
    document.body.appendChild(container);

    const inkCtx = inkCanvas.getContext('2d');
    const dispose = () => container.remove();

    return { container, imageCanvas, inkCanvas, objectsCanvas, overlayCanvas, wrap, innerWrap, imageCtx, inkCtx, srcName: fileMeta.name, dispose, closeButton };
  }

  // ====== ツールバー構築 ======
  function buildToolbar(container) {
    const bar = document.createElement('div');
    Object.assign(bar.style, { marginTop: '12px', display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap', paddingBottom: '8px', borderBottom: '1px solid #eee' });

    const createBtn = (text) => {
      const b = document.createElement('button');
      b.textContent = text;
      b.style.padding = '4px 8px';
      b.style.cursor = 'pointer';
      b.style.border = '1px solid #ccc';
      b.style.borderRadius = '4px';
      b.style.backgroundColor = '#fff';
      return b;
    };

    const penBtn        = createBtn('ペン');
    const lineBtn       = createBtn('直線');
    const arrowBtn      = createBtn('矢印');
    const dArrowBtn     = createBtn('両端矢印');
    const circleBtn     = createBtn('丸（枠のみ）');
    const circleMoveBtn = createBtn('〇移動');
    const circleDelBtn  = createBtn('〇削除');
    const eraseBtn      = createBtn('消しゴム');
    const stampBtn      = createBtn('スタンプ');
    const textToolBtn   = createBtn('テキスト入力');
    const headerBtn     = createBtn('上部に配置');
    
    const undoBtn       = document.createElement('button');
    undoBtn.textContent = '↩ 戻る';
    undoBtn.className   = 'kintone-undo-btn';

    penBtn.style.background = '#ffefef';

    const colorWrap = document.createElement('span');
    colorWrap.textContent = '色: ';
    const redBtn = createBtn('赤'); const blueBtn = createBtn('青');
    let currentColor = '#ff0000'; redBtn.style.background = '#ffefef';

    const setActiveColor = (color) => {
      currentColor = color;
      redBtn.style.background  = (color === '#ff0000') ? '#ffefef' : '#fff';
      blueBtn.style.background = (color === '#0000ff') ? '#eff3ff' : '#fff';
    };
    redBtn.onclick  = () => setActiveColor('#ff0000');
    blueBtn.onclick = () => setActiveColor('#0000ff');

    const stampWrap = document.createElement('span');
    stampWrap.textContent = '  スタンプ: ';
    const palette = document.createElement('span');
    Object.assign(palette.style, { display: 'inline-flex', gap: '4px', flexWrap: 'wrap' });

    let currentStampIndex = 0;
    let currentStampDiameter = STAMP_DIAMETER_DEFAULT;
    let currentStampMode = 'num';
    let currentLabel = { text: '回収', color: '#0000ff' };

    const labelCollectBtn  = createBtn('回収(青)');
    const labelInstallBtn  = createBtn('設置(赤)');
    const labelReplaceBtn  = createBtn('入替(赤)');
    const labelRemoveBtn   = createBtn('撤去(赤)');
    const labelRelocateBtn = createBtn('移設(赤)');

    const stampButtons = CIRCLED_NUMS.map((chr, idx) => {
      const b = createBtn(chr);
      if (idx === currentStampIndex && currentStampMode === 'num') b.style.background = '#ffeccc';
      b.onclick = () => {
        currentStampMode = 'num'; currentStampIndex = idx;
        [...palette.children, labelCollectBtn, labelInstallBtn, labelReplaceBtn, labelRemoveBtn, labelRelocateBtn].forEach(x => x.style.background = '#fff');
        b.style.background = '#ffeccc';
      };
      return b;
    });
    stampButtons.forEach(b => palette.appendChild(b));

    const activateLabel = (btn, text, color) => {
      currentStampMode = 'label'; currentLabel = { text, color };
      [...palette.children, labelCollectBtn, labelInstallBtn, labelReplaceBtn, labelRemoveBtn, labelRelocateBtn].forEach(x => x.style.background = '#fff');
      btn.style.background = '#ffeccc';
    };

    labelCollectBtn.onclick  = () => activateLabel(labelCollectBtn,  '回収', '#0000ff');
    labelInstallBtn.onclick  = () => activateLabel(labelInstallBtn,  '設置', '#ff0000');
    labelReplaceBtn.onclick  = () => activateLabel(labelReplaceBtn,  '入替', '#ff0000');
    labelRemoveBtn.onclick   = () => activateLabel(labelRemoveBtn,   '撤去', '#ff0000');
    labelRelocateBtn.onclick = () => activateLabel(labelRelocateBtn, '移設', '#ff0000');

    const labelWrap = document.createElement('span');
    labelWrap.textContent = ' / テキスト: ';
    [labelCollectBtn, labelInstallBtn, labelReplaceBtn, labelRemoveBtn, labelRelocateBtn].forEach(b => labelWrap.appendChild(b));

    const sizeWrap = document.createElement('span');
    sizeWrap.textContent = ' サイズ: ';
    const sizeRange = document.createElement('input');
    sizeRange.type = 'range'; sizeRange.min = '20'; sizeRange.max = '200'; sizeRange.step = '2'; sizeRange.value = String(currentStampDiameter);
    sizeRange.style.width = '100px'; sizeRange.style.verticalAlign = 'middle';
    const sizeValue = document.createElement('span');
    sizeValue.textContent = ` ${currentStampDiameter}px`; sizeValue.style.minWidth = '46px'; sizeValue.style.display = 'inline-block';
    sizeRange.oninput = () => { currentStampDiameter = Number(sizeRange.value); sizeValue.textContent = ` ${currentStampDiameter}px`; };

    const eraserWrap = document.createElement('span');
    eraserWrap.textContent = '  消しゴム太さ: ';
    const eraserSizeInput = document.createElement('input');
    eraserSizeInput.type = 'number'; eraserSizeInput.min = '10'; eraserSizeInput.max = '200'; eraserSizeInput.step = '2'; eraserSizeInput.value = String(ERASER_WIDTH_DEFAULT);
    eraserSizeInput.style.width = '60px';

    const blueCircleShortcut = createBtn('青〇');
    blueCircleShortcut.onclick = () => { setActiveColor('#0000ff'); circleBtn.click(); };

    const textWrap = document.createElement('span');
    const textInput = document.createElement('input'); textInput.type = 'text'; textInput.placeholder = '表示する文字を入力'; textInput.style.width = '180px'; textInput.style.padding = '4px';
    const textSizeRange = document.createElement('input'); textSizeRange.type = 'range'; textSizeRange.min = '12'; textSizeRange.max = '120'; textSizeRange.step = '2'; textSizeRange.value = String(TEXT_FONT_SIZE_DEFAULT);
    const textSizeValue = document.createElement('span'); textSizeValue.textContent = ` ${TEXT_FONT_SIZE_DEFAULT}px`;
    textSizeRange.oninput = () => { textSizeValue.textContent = ` ${textSizeRange.value}px`; };
    
    const boldChk = document.createElement('input'); boldChk.type = 'checkbox'; boldChk.checked = true;
    const bgChk = document.createElement('input'); bgChk.type = 'checkbox'; bgChk.checked = true;
    const alignSel = document.createElement('select');
    [['left','左'],['center','中央'],['right','右']].forEach(([v, l]) => { const o = document.createElement('option'); o.value = v; o.textContent = l; alignSel.appendChild(o); });

    // 表示ズームコントロール
    const viewZoomWrap = document.createElement('span');
    viewZoomWrap.textContent = '表示ズーム: ';
    const viewZoomRange = document.createElement('input');
    viewZoomRange.type = 'range'; viewZoomRange.min = '50'; viewZoomRange.max = '200'; viewZoomRange.step = '5'; viewZoomRange.value = '100';
    viewZoomRange.style.width = '100px';
    const viewZoomVal = document.createElement('span');
    viewZoomVal.textContent = ' 100%';
    const zoomHandlers = new Set();
    viewZoomRange.oninput = () => {
      viewZoomVal.textContent = ` ${viewZoomRange.value}%`;
      zoomHandlers.forEach(fn => { try { fn(); } catch {} });
    };

    const sep = () => { const s = document.createElement('span'); s.textContent = ' | '; s.style.opacity = '0.3'; bar.appendChild(s); };

    colorWrap.appendChild(redBtn); colorWrap.appendChild(blueBtn); bar.appendChild(colorWrap); sep();
    bar.appendChild(undoBtn); sep();
    
    const zoomGroup = document.createElement('span');
    zoomGroup.appendChild(viewZoomWrap); zoomGroup.appendChild(viewZoomRange); zoomGroup.appendChild(viewZoomVal);
    bar.appendChild(zoomGroup); sep();

    [penBtn, eraseBtn, lineBtn, arrowBtn, dArrowBtn].forEach(b => bar.appendChild(b)); sep();
    [circleBtn, circleMoveBtn, circleDelBtn, blueCircleShortcut].forEach(b => bar.appendChild(b)); sep();
    
    bar.appendChild(stampBtn); stampWrap.appendChild(palette); stampWrap.appendChild(labelWrap);
    sizeWrap.appendChild(sizeRange); sizeWrap.appendChild(sizeValue); stampWrap.appendChild(sizeWrap); bar.appendChild(stampWrap); sep();
    
    bar.appendChild(textToolBtn);
    const textCtrl = document.createElement('span'); textCtrl.appendChild(textInput);
    textCtrl.appendChild(document.createTextNode(' サイズ: ')); textCtrl.appendChild(textSizeRange); textCtrl.appendChild(textSizeValue);
    const boldL = document.createElement('label'); boldL.appendChild(boldChk); boldL.appendChild(document.createTextNode('太字 ')); textCtrl.appendChild(boldL);
    textCtrl.appendChild(alignSel);
    const bgL = document.createElement('label'); bgL.appendChild(bgChk); bgL.appendChild(document.createTextNode('背景白')); textCtrl.appendChild(bgL);
    bar.appendChild(textCtrl); bar.appendChild(headerBtn);
    
    eraserWrap.appendChild(eraserSizeInput); bar.appendChild(eraserWrap);
    container.appendChild(bar);

    const setActiveTool = (activeBtn) => {
      [penBtn, lineBtn, arrowBtn, dArrowBtn, circleBtn, circleMoveBtn, circleDelBtn, eraseBtn, stampBtn, blueCircleShortcut, textToolBtn]
        .forEach(b => b.style.background = '#fff');
      activeBtn.style.background = (currentColor === '#ff0000') ? '#ffefef' : '#eff3ff';
    };

    return {
      bar, penBtn, lineBtn, arrowBtn, dArrowBtn, circleBtn, circleMoveBtn, circleDelBtn, eraseBtn, stampBtn, textToolBtn, headerBtn, undoBtn,
      getColor: () => currentColor, setColor: setActiveColor,
      getStamp: () => (currentStampMode === 'num') ? { type: 'num', char: CIRCLED_NUMS[currentStampIndex], diameter: currentStampDiameter }
                                                   : { type: 'label', text: currentLabel.text, color: currentLabel.color, diameter: currentStampDiameter },
      getEraserWidth: () => Number(eraserSizeInput.value) || ERASER_WIDTH_DEFAULT,
      getTextConfig: () => ({ text: textInput.value || '', fontSize: Number(textSizeRange.value) || TEXT_FONT_SIZE_DEFAULT, bold: !!boldChk.checked, align: alignSel.value, withBg: !!bgChk.checked }),
      setActiveTool,
      getViewZoom: () => Number(viewZoomRange.value) / 100,
      onViewZoomChange: (fn) => { zoomHandlers.add(fn); return () => zoomHandlers.delete(fn); }
    };
  }

  // ====== 図形描画ヘルパー ======
  function drawArrow(ctx, x1, y1, x2, y2, options = {}) {
    const { color = '#ff0000', width = 3, headLength = 14, headAngleDeg = 30 } = options;
    const headAngle = (headAngleDeg * Math.PI) / 180;
    ctx.save(); ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const hx1 = x2 - headLength * Math.cos(angle - headAngle);
    const hy1 = y2 - headLength * Math.sin(angle - headAngle);
    const hx2 = x2 - headLength * Math.cos(angle + headAngle);
    const hy2 = y2 - headLength * Math.sin(angle + headAngle);
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(hx1, hy1);
    ctx.moveTo(x2, y2); ctx.lineTo(hx2, hy2);
    ctx.stroke(); ctx.restore();
  }

  function drawDoubleArrow(ctx, x1, y1, x2, y2, options = {}) {
    const { color = '#ff0000', width = 3, headLength = 14, headAngleDeg = 30 } = options;
    const headAngle = (headAngleDeg * Math.PI) / 180;
    ctx.save(); ctx.lineWidth = width; ctx.strokeStyle = color; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    const angle = Math.atan2(y2 - y1, x2 - x1);
    let hx1 = x2 - headLength * Math.cos(angle - headAngle); let hy1 = y2 - headLength * Math.sin(angle - headAngle);
    let hx2 = x2 - headLength * Math.cos(angle + headAngle); let hy2 = y2 - headLength * Math.sin(angle + headAngle);
    ctx.beginPath(); ctx.moveTo(x2, y2); ctx.lineTo(hx1, hy1); ctx.moveTo(x2, y2); ctx.lineTo(hx2, hy2); ctx.stroke();
    hx1 = x1 + headLength * Math.cos(angle - headAngle); hy1 = y1 + headLength * Math.sin(angle - headAngle);
    hx2 = x1 + headLength * Math.cos(angle + headAngle); hy2 = y1 + headLength * Math.sin(angle + headAngle);
    ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(hx1, hy1); ctx.moveTo(x1, y1); ctx.lineTo(hx2, hy2); ctx.stroke();
    ctx.restore();
  }

  function drawCircleOutline(ctx, cx, cy, x2, y2, options = {}) {
    const { color = '#ff0000', width = 3 } = options;
    const r = Math.hypot(x2 - cx, y2 - cy);
    ctx.save(); ctx.lineWidth = width; ctx.strokeStyle = color;
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
  }

  function drawNumberStamp(ctx, x, y, { char = '①', color = '#ff0000', diameter = 48 }) {
    const fontSize = Math.floor(diameter * 0.9);
    ctx.save(); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${fontSize}px sans-serif`; ctx.fillText(char, x, y); ctx.restore();
  }

  function drawLabelStamp(ctx, x, y, { text = '回収', color = '#0000ff', diameter = 48 }) {
    const fontSize = Math.floor(diameter * 0.55);
    ctx.save(); ctx.fillStyle = color; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.font = `bold ${fontSize}px sans-serif`; ctx.fillText(text, x, y); ctx.restore();
  }

  // ====== 描画イベント ======
  function enableDrawTools({ imageCanvas, inkCanvas, objectsCanvas, overlayCanvas, inkCtx, tools, width = 3, eraserWidth = 40 }) {
    let tool = 'pen';
    const activate = (btn) => tools.setActiveTool ? tools.setActiveTool(btn) : (btn.style.background = '#ffefef');
    tools.penBtn.onclick        = () => { tool = 'pen';          activate(tools.penBtn); };
    tools.lineBtn.onclick       = () => { tool = 'line';         activate(tools.lineBtn); };
    tools.arrowBtn.onclick      = () => { tool = 'arrow';        activate(tools.arrowBtn); };
    tools.dArrowBtn.onclick     = () => { tool = 'doubleArrow';  activate(tools.dArrowBtn); };
    tools.circleBtn.onclick     = () => { tool = 'circle';       activate(tools.circleBtn); };
    tools.circleMoveBtn.onclick = () => { tool = 'circleMove';   activate(tools.circleMoveBtn); };
    tools.circleDelBtn.onclick  = () => { tool = 'circleDelete'; activate(tools.circleDelBtn); };
    tools.eraseBtn.onclick      = () => { tool = 'eraser';       activate(tools.eraseBtn); };
    tools.stampBtn.onclick      = () => { tool = 'stamp';        activate(tools.stampBtn); };
    tools.textToolBtn.onclick   = () => { tool = 'text';         activate(tools.textToolBtn); };

    const octx   = overlayCanvas.getContext('2d');
    const objCtx = objectsCanvas.getContext('2d');
    const getColor = tools.getColor ? tools.getColor : () => '#ff0000';

    const circles = [];
    let selectedCircleIndex = -1;

    // --- Undoロジック ---
    const undoStack = [];
    const MAX_UNDO = 20;

    const saveState = () => {
      undoStack.push({
        ink: inkCtx.getImageData(0, 0, inkCanvas.width, inkCanvas.height),
        circles: JSON.parse(JSON.stringify(circles))
      });
      if (undoStack.length > MAX_UNDO) undoStack.shift();
    };

    const performUndo = () => {
      if (undoStack.length === 0) return;
      const state = undoStack.pop();
      inkCtx.putImageData(state.ink, 0, 0); 
      circles.length = 0;
      circles.push(...state.circles);       
      selectedCircleIndex = -1;
      renderObjects();
    };

    if (tools.undoBtn) tools.undoBtn.onclick = performUndo;

    const onKeyDownUndo = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        performUndo(); e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDownUndo);
    // --------------------

    const renderObjects = () => {
      objCtx.clearRect(0, 0, objectsCanvas.width, objectsCanvas.height);
      for (let i = 0; i < circles.length; i++) {
        const c = circles[i];
        drawCircleOutline(objCtx, c.cx, c.cy, c.cx + c.r, c.cy, { color: c.color, width: c.width });
        if (i === selectedCircleIndex) {
          objCtx.save(); objCtx.setLineDash([6, 6]);
          objCtx.strokeStyle = (c.color === '#0000ff') ? 'rgba(0,0,255,.35)' : 'rgba(255,0,0,.35)';
          objCtx.lineWidth = 2; objCtx.beginPath(); objCtx.arc(c.cx, c.cy, c.r + 4, 0, Math.PI * 2); objCtx.stroke(); objCtx.restore();
        }
      }
    };
    
    const hitCircleIndex = (x, y) => {
      for (let i = circles.length - 1; i >= 0; i--) {
        const c = circles[i], d = Math.hypot(x - c.cx, y - c.cy);
        if (Math.abs(d - c.r) <= Math.max(8, c.width * 1.5)) return i;
      }
      return -1;
    };

    const rel = (e, canvas) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = (e.touches ? e.touches[0].clientX : e.clientX);
      const clientY = (e.touches ? e.touches[0].clientY : e.clientY);
      // rect.width/heightはCSS transform(スケール等)の影響を受けた実際の描画サイズになっているので、この比率計算で正確な論理ピクセルを算出可能
      return { x: (clientX - rect.left) * (canvas.width / rect.width), y: (clientY - rect.top) * (canvas.height / rect.height) };
    };

    let drawing = false;
    const beginPen = (x, y) => {
      saveState(); 
      drawing = true; inkCtx.save(); inkCtx.lineWidth = width; inkCtx.strokeStyle = getColor(); inkCtx.lineCap = 'round';
      inkCtx.beginPath(); inkCtx.moveTo(x, y);
    };
    const movePen  = (x, y) => { if (drawing) { inkCtx.lineTo(x, y); inkCtx.stroke(); }};
    const endPen   = () => { if (drawing) { drawing = false; inkCtx.restore(); }};

    let erasing = false;
    const beginErase = (x, y) => {
      saveState(); 
      erasing = true; inkCtx.save(); inkCtx.globalCompositeOperation = 'destination-out';
      inkCtx.lineWidth = tools.getEraserWidth(); inkCtx.lineCap = 'round'; inkCtx.beginPath(); inkCtx.moveTo(x, y);
    };
    const moveErase  = (x, y) => { if (erasing) { inkCtx.lineTo(x, y); inkCtx.stroke(); }};
    const endErase   = () => { if (erasing) { erasing = false; inkCtx.restore(); }};

    let start = null;
    const beginLine = (x, y) => { saveState(); start = { x, y }; octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); };
    const moveLine  = (x, y) => { if (!start) return; octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); octx.lineWidth = width; octx.strokeStyle = getColor(); octx.beginPath(); octx.moveTo(start.x, start.y); octx.lineTo(x, y); octx.stroke(); };
    const endLine   = (x, y) => { if (!start) return; inkCtx.save(); inkCtx.lineWidth = width; inkCtx.strokeStyle = getColor(); inkCtx.beginPath(); inkCtx.moveTo(start.x, start.y); inkCtx.lineTo(x, y); inkCtx.stroke(); inkCtx.restore(); start = null; octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); };

    let arrowStart = null;
    const beginArrow = (x, y) => { saveState(); arrowStart = { x, y }; };
    const moveArrow  = (x, y) => { if (!arrowStart) return; octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); drawArrow(octx, arrowStart.x, arrowStart.y, x, y, { color: getColor(), width }); };
    const endArrow   = (x, y) => { if (!arrowStart) return; drawArrow(inkCtx, arrowStart.x, arrowStart.y, x, y, { color: getColor(), width }); arrowStart = null; octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); };

    let dArrowStart = null;
    const beginDArrow = (x, y) => { saveState(); dArrowStart = { x, y }; };
    const moveDArrow  = (x, y) => { if (!dArrowStart) return; octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); drawDoubleArrow(octx, dArrowStart.x, dArrowStart.y, x, y, { color: getColor(), width }); };
    const endDArrow   = (x, y) => { if (!dArrowStart) return; drawDoubleArrow(inkCtx, dArrowStart.x, dArrowStart.y, x, y, { color: getColor(), width }); dArrowStart = null; octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); };

    let circleCenter = null;
    const beginCircle = (x, y) => { saveState(); circleCenter = { x, y }; };
    const moveCircle  = (x, y) => { if (!circleCenter) return; octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); drawCircleOutline(octx, circleCenter.x, circleCenter.y, x, y, { color: getColor(), width }); };
    const endCircle   = (x, y) => {
      if (!circleCenter) return;
      const r = Math.hypot(x - circleCenter.x, y - circleCenter.y);
      circles.push({ cx: circleCenter.x, cy: circleCenter.y, r, color: getColor(), width });
      selectedCircleIndex = circles.length - 1;
      circleCenter = null; octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height); renderObjects();
    };

    let moving = false, moveIndex = -1, dragStart = null, startCenter = null;
    const beginCircleMove = (x, y) => {
      const idx = hitCircleIndex(x, y);
      if (idx >= 0) {
        saveState();
        selectedCircleIndex = idx; moving = true; moveIndex = idx;
        dragStart = { x, y }; startCenter = { cx: circles[idx].cx, cy: circles[idx].cy };
      }
    };
    const moveCircleMove = (x, y) => {
      if (!moving) return;
      circles[moveIndex].cx = startCenter.cx + (x - dragStart.x);
      circles[moveIndex].cy = startCenter.cy + (y - dragStart.y);
      renderObjects();
    };
    const endCircleMove = () => { moving = false; moveIndex = -1; dragStart = null; startCenter = null; };

    const deleteCircleAt = (x, y) => {
      const idx = hitCircleIndex(x, y);
      if (idx >= 0) {
        saveState(); 
        circles.splice(idx, 1); selectedCircleIndex = -1; renderObjects();
      }
    };

    const onKeyDown = (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedCircleIndex >= 0) {
        saveState(); 
        circles.splice(selectedCircleIndex, 1); selectedCircleIndex = -1; renderObjects(); e.preventDefault();
      }
    };
    window.addEventListener('keydown', onKeyDown);

    const placeStamp = (x, y) => {
      saveState(); 
      const st = tools.getStamp();
      if (st.type === 'num') drawNumberStamp(inkCtx, x, y, { char: st.char, color: getColor(), diameter: st.diameter });
      else drawLabelStamp(inkCtx, x, y, { text: st.text, color: st.color, diameter: st.diameter });
      octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    };

    const placeFreeText = (x, y) => {
      const cfg = tools.getTextConfig();
      if (!cfg.text.trim()) return alert('テキストを入力してください。');
      saveState(); 
      drawFreeText(inkCtx, cfg.text, x, y, { color: getColor(), fontSize: cfg.fontSize, bold: cfg.bold, align: cfg.align, withBg: cfg.withBg });
      octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    };

    if (tools.headerBtn) {
      tools.headerBtn.onclick = () => {
        const cfg = tools.getTextConfig();
        if (!cfg.text.trim()) return alert('テキストを入力してください。');
        saveState(); 
        let x = 12; if (cfg.align === 'center') x = overlayCanvas.width / 2; else if (cfg.align === 'right') x = overlayCanvas.width - 12;
        drawFreeText(inkCtx, cfg.text, x, 10, { color: getColor(), fontSize: cfg.fontSize, bold: cfg.bold, align: cfg.align, withBg: cfg.withBg });
      };
    }

    const down = (e) => {
      e.preventDefault(); const p = rel(e, overlayCanvas);
      if (tool === 'pen') beginPen(p.x, p.y); else if (tool === 'eraser') beginErase(p.x, p.y);
      else if (tool === 'line') beginLine(p.x, p.y); else if (tool === 'arrow') beginArrow(p.x, p.y);
      else if (tool === 'doubleArrow') beginDArrow(p.x, p.y); else if (tool === 'circle') beginCircle(p.x, p.y);
      else if (tool === 'circleMove') beginCircleMove(p.x, p.y); else if (tool === 'circleDelete') deleteCircleAt(p.x, p.y);
      else if (tool === 'stamp') placeStamp(p.x, p.y); else if (tool === 'text') placeFreeText(p.x, p.y);
    };
    
    const move = (e) => {
      e.preventDefault(); const p = rel(e, overlayCanvas);
      
      // テキストやスタンプの配置前ホバープレビュー機能
      if (!drawing && !erasing && !start && !arrowStart && !dArrowStart && !circleCenter && !moving) {
        octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
        if (tool === 'text') {
          const cfg = tools.getTextConfig();
          if (cfg.text.trim()) {
            octx.globalAlpha = 0.6;
            drawFreeText(octx, cfg.text, p.x, p.y, { color: getColor(), fontSize: cfg.fontSize, bold: cfg.bold, align: cfg.align, withBg: cfg.withBg });
            octx.globalAlpha = 1.0;
          }
        } else if (tool === 'stamp') {
          const st = tools.getStamp();
          octx.globalAlpha = 0.6;
          if (st.type === 'num') drawNumberStamp(octx, p.x, p.y, { char: st.char, color: getColor(), diameter: st.diameter });
          else drawLabelStamp(octx, p.x, p.y, { text: st.text, color: st.color, diameter: st.diameter });
          octx.globalAlpha = 1.0;
        } else if (tool === 'eraser') {
          octx.beginPath(); octx.arc(p.x, p.y, tools.getEraserWidth()/2, 0, Math.PI*2);
          octx.strokeStyle = 'rgba(0,0,0,0.3)'; octx.lineWidth=1; octx.stroke();
        }
      }

      // 描画中の処理
      if (tool === 'pen') movePen(p.x, p.y); else if (tool === 'eraser') moveErase(p.x, p.y);
      else if (tool === 'line') moveLine(p.x, p.y); else if (tool === 'arrow') moveArrow(p.x, p.y);
      else if (tool === 'doubleArrow') moveDArrow(p.x, p.y); else if (tool === 'circle') moveCircle(p.x, p.y);
      else if (tool === 'circleMove') moveCircleMove(p.x, p.y);
    };
    
    const up = (e) => {
      e.preventDefault(); const p = rel(e.changedTouches ? (e.changedTouches[0] || e) : e, overlayCanvas);
      if (tool === 'pen') endPen(); else if (tool === 'eraser') endErase();
      else if (tool === 'line') endLine(p.x, p.y); else if (tool === 'arrow') endArrow(p.x, p.y);
      else if (tool === 'doubleArrow') endDArrow(p.x, p.y); else if (tool === 'circle') endCircle(p.x, p.y);
      else if (tool === 'circleMove') endCircleMove();
    };

    overlayCanvas.addEventListener('mousedown', down); overlayCanvas.addEventListener('mousemove', move); window.addEventListener('mouseup', up);
    overlayCanvas.addEventListener('mouseleave', () => {
      if (!drawing && !erasing && !start && !arrowStart && !dArrowStart && !circleCenter && !moving) {
        octx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
      }
    });
    overlayCanvas.addEventListener('touchstart', down, { passive: false }); overlayCanvas.addEventListener('touchmove',  move, { passive: false }); overlayCanvas.addEventListener('touchend',   up,   { passive: false });

    const unbind = () => {
      overlayCanvas.removeEventListener('mousedown', down); overlayCanvas.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up);
      overlayCanvas.removeEventListener('touchstart', down); overlayCanvas.removeEventListener('touchmove',  move); overlayCanvas.removeEventListener('touchend',   up);
      window.removeEventListener('keydown', onKeyDown); window.removeEventListener('keydown', onKeyDownUndo);
    };

    return { unbind };
  }

})();