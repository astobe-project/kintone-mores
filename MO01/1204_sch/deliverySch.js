// Install memo visibility state.
window._installMemoVisible = true;
// Collect memo visibility state.
window._collectMemoVisible = true;
window._calendarRenderToken = 0;
window._calendarNavBound = false;


/**
 * 初期化処理（アプリ起動時に1回だけ実行）
 */
async function initApp() {
    // 各選択肢を並行して取得（Promise.all を使用）
    await Promise.all([
        fetchFieldOptions("タスクG_list"),
        fetchFieldOptions("配送業者"),
        fetchFieldOptions("作業担当")
    ]);
}

/**
 * 指定されたフィールドの選択肢を取得（キャッシュ対応）
 * @param {string} fieldName - フィールド名（例: 'タスクG', '配送業者', '担当者'）
 * @returns {Promise<Array>} 選択肢の配列
 */
async function fetchFieldOptions(fieldName) {
    console.log(`Fetching field options for: ${fieldName}`);  // デバッグ用ログ
    // 既にキャッシュがあればそれを返す
    if (fieldName === "タスクG_list" && taskGOptionsCache) return taskGOptionsCache;
    if (fieldName === "配送業者" && deliveryOptionsCache) return deliveryOptionsCache;
    if (fieldName === "作業担当" && assignedOptionsCache) return assignedOptionsCache;

    try {
        const response = await kintone.api(kintone.api.url('/k/v1/app/form/fields', true), 'GET', { app: kintone.app.getId() });

        if (response.properties[fieldName] && response.properties[fieldName].options) {
            const options = Object.keys(response.properties[fieldName].options).sort();
            // キャッシュに保存
            if (fieldName === "タスクG_list") taskGOptionsCache = options;
            if (fieldName === "配送業者") deliveryOptionsCache = options;
            if (fieldName === "作業担当") assignedOptionsCache = options;

            return options;
        }
    } catch (error) {
        console.error(`🚨 [ERROR] ${fieldName} の選択肢取得に失敗:`, error.message);
        return [];
    }
}
async function initApp() {
    await Promise.all([
        fetchFieldOptions('タスクG'),
        fetchFieldOptions('配送業者'),
        fetchFieldOptions('作業担当')
    ]);
}

async function fetchFieldOptions(fieldName) {
    console.log(`Fetching field options for: ${fieldName}`);

    // キャッシュがある場合はそれを返す
    if (fieldName === 'タスクG' && taskGOptionsCache) return taskGOptionsCache;
    if (fieldName === '配送業者' && deliveryOptionsCache) return deliveryOptionsCache;
    if (fieldName === '作業担当' && assignedOptionsCache) return assignedOptionsCache;

    try {
        const response = await kintone.api(
            kintone.api.url('/k/v1/app/form/fields', true),
            'GET',
            { app: kintone.app.getId() }
        );

        let fieldDef = response.properties?.[fieldName];
        
        // 通常のフィールドに見つからない場合、サブテーブル内を探索
        if (!fieldDef) {
            Object.values(response.properties || {}).some(prop => {
                if (prop?.type === 'SUBTABLE' && prop.fields?.[fieldName]) {
                    fieldDef = prop.fields[fieldName];
                    return true;
                }
                return false;
            });
        }

        if (!fieldDef?.options) {
            return [];
        }

        // 選択肢をソートしてキャッシュに保存
        const options = Object.keys(fieldDef.options).sort();
        if (fieldName === 'タスクG') taskGOptionsCache = options;
        if (fieldName === '配送業者') deliveryOptionsCache = options;
        if (fieldName === '作業担当') assignedOptionsCache = options;
        
        return options;
    } catch (error) {
        console.error(`Field option fetch failed: ${fieldName}`, error.message);
        return [];
    }
}

function setInstallMemoVisible(isVisible) {
  window._installMemoVisible = isVisible;

  // === 列制御 ===
  const table = document.querySelector('.calendar-table2');
  if (table) {
    const ths = Array.from(table.querySelectorAll('thead th'));
    const idx = ths.findIndex(th => th.textContent.trim() === '3：設置メモ');

    if (idx >= 0) {
      const col = idx + 1;
      table.querySelectorAll(`tr > :nth-child(${col})`).forEach(cell => {
        cell.style.display = isVisible ? '' : 'none';
      });
    }
  }

  // === ボタン同期 ===
  const btn = document.getElementById('toggle-install-memo');
  if (btn) {
    btn.textContent = isVisible ? '設置メモ 非表示' : '設置メモ 表示';
    btn.classList.toggle('active', isVisible);
    btn.classList.toggle('inactive', !isVisible);
  }
}

function setCollectMemoVisible(isVisible) {
  window._collectMemoVisible = isVisible;

  const table = document.querySelector('.calendar-table2');
  if (table) {
    const ths = Array.from(table.querySelectorAll('thead th'));
    const idx = ths.findIndex(th => th.textContent.trim() === '3：回収メモ');

    if (idx >= 0) {
      const col = idx + 1;
      table.querySelectorAll(`tr > :nth-child(${col})`).forEach(cell => {
        cell.style.display = isVisible ? '' : 'none';
      });
    }
  }

  const btn = document.getElementById('toggle-collect-memo');
  if (btn) {
    btn.textContent = isVisible ? '回収メモ 非表示' : '回収メモ 表示';
    btn.classList.toggle('active', isVisible);
    btn.classList.toggle('inactive', !isVisible);
  }
}

function onToggleCollectMemo() {
  setCollectMemoVisible(!window._collectMemoVisible);
}


function onToggleInstallMemo() {
  setInstallMemoVisible(!window._installMemoVisible);
}





function loadTasks(records, year, month) {
  console.group('🧪 loadTasks START');
  console.log('records.length =', records?.length);
  console.log('records sample[0] =', records?.[0]);

  if (!records || !Array.isArray(records) || records.length === 0) {
    console.error("🚨 [ERROR] records が `undefined` または空です");
    console.groupEnd();
    return;
  }

  // 🔹 日付＋表示順で安定ソート
  records.sort((a, b) => {
    const dateA = a['日付']?.value ?? a['日付'];
    const dateB = b['日付']?.value ?? b['日付'];
    if (dateA !== dateB) return String(dateA).localeCompare(String(dateB));

    const numA = parseInt(a['表示順']?.value ?? a['表示順'] ?? '9999', 10);
    const numB = parseInt(b['表示順']?.value ?? b['表示順'] ?? '9999', 10);

    return numA - numB;
  });

  console.table(
    records.map(r => ({
      subId: r.subId,
      task: r['タスク']?.value ?? r['タスク'],
      date: r['日付']?.value ?? r['日付'],
      order: r['表示順']?.value ?? r['表示順'],
    }))
  );

  records.forEach((record, idx) => {
    console.log(`➡️ addTaskToCalendar[${idx}]`, record);
    addTaskToCalendar(record);
  });

  console.groupEnd();
}






/**
 * タスクバー移動後の処理（確定→調整中リセット含む）
 */
/**
 * 汎用タスク移動処理（現調・プラン・撮影など）
 * ※ 設置系は onEnd で完全制御する
 */
async function handleSortEndDel(evt, year, month) {
  const taskEl = evt.item;
  const fromTd = evt.from?.closest('td');
  const toTd   = evt.to?.closest('td');

  if (!taskEl || !fromTd || !toTd) return;

  const recordId = taskEl.dataset.recordId;
  const subId    = taskEl.dataset.subId;
  if (!recordId || !subId) return;

  const isoDate = toTd.dataset.date;
  if (!isoDate) return;

  const fromKind = taskKindFromCellId(fromTd.id);
  const toKind   = taskKindFromCellId(toTd.id);

  // ★ 設置系は onEnd 側で処理する
  const isInstall =
    fromKind === '3：設置予定' ||
    toKind === '3：設置予定' ||
    /^3：[1-5]台目$/.test(fromKind) ||
    /^3：[1-5]台目$/.test(toKind);

  if (isInstall) return;

  // ===== 確定 → 調整中 =====
  if (taskEl.dataset.status === '確定') {
    const ok = confirm(
      'このタスクを移動すると「調整中」に戻ります。よろしいですか？'
    );
    if (!ok) {
      fromTd.appendChild(taskEl);
      return;
    }
    await applyStatus(taskEl, '調整中', isoDate);
  }

  // ===== DB更新 =====
  await updateTaskRecord(
    recordId,
    subId,
    isoDate,
    taskEl.dataset.status,
    toKind
  );

  taskEl.dataset.taskKind = toKind;
  taskEl.dataset.date     = isoDate;

  // ===== 表示順保存 =====
  await saveTaskOrder(toTd);
  if (fromTd !== toTd) await saveTaskOrder(fromTd);
}








 
/**
 * タスク種別に応じて対応するカラムIDを返す
 */
function getTaskCellId(taskKind) {
  // 廃止タスク
  if (taskKind === '3：回収予定') return '';

  // ★ 移設は「設置予定」列に寄せる（列は増やさない）
  if (taskKind === '3：移設') {
    return 'task-secchi';
  }

  const def = COLUMN_DEFS.find(col => col.taskKind === taskKind);
  if (!def) {
//    console.warn(`⚠️ 未対応のタスク種別: ${taskKind}`);
    return '';
  }
  return def.id;
}




/**
 * タスク種別からバーの表示モードを返す
 * @param {string} taskKind
 * @returns {'normal' | 'install' | 'collect'}
 */
function getBarMode(taskKind, record) {
  if (!taskKind) return 'normal';

  const isRelocate =
    record?.['回・設フラグ'] === '回' ||
    record?.['回・設フラグ']?.value === '回';

  // ★ 移設バー判定（核心）
  if (
    isRelocate &&
    /^3：[1-5]台目$/.test(taskKind)
  ) {
    return 'relocate';
  }

  // --- 通常バー ---
  if (
    taskKind === '1：現調' ||
    taskKind === '2：プラン作成' ||
    taskKind === '4：撮影'
  ) {
    return 'normal';
  }

  // --- 回収期限 ---
  if (taskKind === '3：回収期限') {
    return 'collect';
  }

  // --- 設置バー ---
  if (
    taskKind === '3：設置予定' ||
    /^3：[1-5]台目$/.test(taskKind)
  ) {
    return 'install';
  }

//  console.warn(`⚠️ getBarMode: 未分類 ${taskKind}`);
  return 'normal';
}


/**
 * 旧タスク種別を新仕様に正規化する
 * 移行期間用の吸収レイヤー
 */
function normalizeTaskKind(taskKind) {
  if (!taskKind) return taskKind;

  // 旧仕様「回収予定」は廃止 → 回収期限扱い
  if (taskKind === '3：回収予定') {
    return '3：回収期限';
  }

  return taskKind;
}


async function addTaskToCalendar(record) {

  // =========================
  // ★ 切り分け用：案件番号フィルタ
  // =========================


//  console.log('① addTaskToCalendar called ====================');
//  console.log('① record =', record);

  // =========================
  // 0. 早期return確認
  // =========================
  if (!record || !record['タスク']) {
    console.warn('❌ early return: タスクが存在しない', record);
    return;
  }

  // =========================
  // ① タスク種別の正規化
  // =========================
  let taskKind = record['タスク'];
//  console.log('② taskKind before normalize =', taskKind);

  taskKind = normalizeTaskKind(taskKind);
//  console.log('② taskKind after normalize =', taskKind);

  record['タスク'] = taskKind;

  // =========================
  // ② バー表示モード判定
  // =========================
  let barMode = getBarMode(taskKind);

  if (
    /^3：[1-5]台目$/.test(taskKind) &&
    record['回・設フラグ']?.value === '回'
  ) {
    barMode = 'relocate';
  }
  
//  console.log('③ barMode =', barMode);

  // =========================
  // ③ タスクバー生成
  // =========================
  const taskEl = await createTaskBar(record, barMode);
//  console.log('④ createTaskBar result =', taskEl);

  if (!taskEl) {
    console.warn('⚠️ createTaskBar が null / undefined', record);
    return;
  }

  // =========================
  // ④ dataset 設定
  // =========================
  const recordId = record['$id']?.value || record['recordId']?.value;
  const subId    = record['subId']?.value;

//  console.log('⑤ recordId raw =', record['$id'], record['recordId']);
//  console.log('⑤ subId raw =', record['subId']);

  if (recordId) taskEl.dataset.recordId = recordId;
  if (subId)    taskEl.dataset.subId = subId;

  taskEl.dataset.taskKind = taskKind;
  taskEl.dataset.barMode  = barMode;

//  console.log('⑤ dataset after set =', taskEl.dataset);

  // =========================
  // ⑤ 配置セル決定
  // =========================
  const cellId = getTaskCellId(taskKind);
//  console.log('⑥ cellId =', cellId);

  if (!cellId) {
//    console.warn('⚠️ cellId なし（表示対象外）', taskKind);
    return;
  }

//  console.log('⑦ 日付 raw =', record['日付']);

  const rawDate = record['日付'];
  
  const date = rawDate
    ? new Date(rawDate).toISOString().split('T')[0]
    : '';


//  console.log('⑦ 日付 ISO =', date);

  const selector = `td[data-date="${date}"][id="${cellId}"]`;
//  console.log('⑧ selector =', selector);

  const container = document.querySelector(selector);
//  console.log('⑧ container =', container);

  if (!container) {
//    console.warn('⚠️ 配置先セルが見つかりません', date, cellId);
    return;
  }

  container.appendChild(taskEl);
//  console.log('⑨ appended taskEl');

  // =========================
  // ⑥ ツールチップ生成
  // =========================
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.style.zIndex = 10000;
  const getTooltipValue = (fieldName, fallback = '') => {
    const value = record?.[fieldName];
    if (value && typeof value === 'object' && 'value' in value) {
      return value.value || fallback;
    }
    return value || fallback;
  };

  const caseNumber   = record['案件番号']?.value || '不明';
  const caseType     = record['案件種別']?.value || '不明';
  const customerName = record['得意先名']?.value || '不明';
  const taskNo       = record['表示順']?.value || '';
  const genbaName    = record['現場名']?.value || '';
  const status       = record['調整状況']?.value || '';
  const memo         = record['テキストメモ']?.value || '';
  const biko         = record['備考']?.value || '';

//  console.log('⑩ tooltip data =', {
//    caseNumber, caseType, customerName, taskNo, genbaName, status, memo, biko
//  });

  tooltip.textContent =
    `案件番号：${caseNumber}
案件種別：${caseType}
得意先名：${customerName}
順番：${taskNo}
現場名：${genbaName}
状況：${status}
メモ：${memo}
備考：${biko}`;

const tooltipCaseNumber   = getTooltipValue('案件番号', '不明');
  const tooltipCaseType     = getTooltipValue('案件種別', '不明');
  const tooltipCustomerName = getTooltipValue('得意先名', '不明');
  const tooltipTaskNo       = getTooltipValue('表示順');
  const tooltipGenbaName     = getTooltipValue('現場名');
  const tooltipStatus       = getTooltipValue('調整状況');
  const tooltipMemo         = getTooltipValue('メモ');
  const tooltipBiko         = getTooltipValue('備考');

  tooltip.textContent =
    `案件番号：${tooltipCaseNumber}
案件種別：${tooltipCaseType}
得意先名：${tooltipCustomerName}
順番：${tooltipTaskNo}
現場名：${tooltipGenbaName}
状況：${tooltipStatus}
メモ：${tooltipMemo}
備考：${tooltipBiko}`;
  tooltip.innerHTML =
    `<div style="font-weight:700;font-size:14px;margin-bottom:4px;">得意先名：${escapeHtml(tooltipCustomerName)}</div>
<div>案件番号：${escapeHtml(tooltipCaseNumber)}</div>
<div>案件種別：${escapeHtml(tooltipCaseType)}</div>
<div>順番：${escapeHtml(tooltipTaskNo)}</div>
<div>現場名：${escapeHtml(tooltipGenbaName)}</div>
<div>状況：${escapeHtml(tooltipStatus)}</div>
<div>メモ：${escapeHtml(tooltipMemo)}</div>
<div>備考：${escapeHtml(tooltipBiko)}</div>`;

  tooltip.innerHTML = `<div>得意先名：${escapeHtml(tooltipCustomerName)}</div><div>----------------------------------------</div><div>案件番号：${escapeHtml(tooltipCaseNumber)}</div><div>案件種別：${escapeHtml(tooltipCaseType)}</div><div>順番：${escapeHtml(tooltipTaskNo)}</div><div>現場名：${escapeHtml(tooltipGenbaName)}</div><div>状況：${escapeHtml(tooltipStatus)}</div><div>メモ：${escapeHtml(tooltipMemo)}</div><div>備考：${escapeHtml(tooltipBiko)}</div>`;
  document.body.appendChild(tooltip);

  // =========================
  // ⑦ ツールチップイベント登録
  // =========================
  displaytooltip(taskEl, tooltip);

//  console.log('⑪ addTaskToCalendar finished ====================');
}


function buildInstallRightDiv(record) {
  const v = (code, def = '') => record?.[code]?.value ?? def;

  const rightDiv = document.createElement('div');
  rightDiv.className = 'task-right install-right';

  const genbaName      = v('現場名');
  const caseType       = v('案件種別');
  const caseStetus     = v('案件ステータス');
  const collectGenba   = v('回収元現場名'); // 無ければ空でOK
  const memo           = v('メモ');

  rightDiv.innerHTML = `
    <div class="install-row install-row-1">${escapeHtml(genbaName)}</div>
    <div class="install-row install-row-2">
      ${escapeHtml(caseType)}｜${escapeHtml(caseStetus)}
    </div>
    <div class="install-row install-row-3">${escapeHtml(collectGenba)}</div>
    <div class="install-row install-row-4" contenteditable="true">
      ${escapeHtml(memo)}
    </div>
  `;

  return rightDiv;
}

/**
 * タスクバーの表示モードを判定
 * normal  : 現調 / プラン / 撮影 / 回収期限
 * install : 設置予定 / 1〜5台目（設置バー）
 * collect : 回収バー（※後で実装）
 */
function resolveBarMode(task) {
  const taskKind = task.タスク;
  const flag =
    task['回・設フラグ']?.value ??
    task['回・設フラグ'] ??
    '';

  if (flag === '回') {
    return 'relocate';
  }

  if (taskKind === '3：回収期限') {
    return 'collect';
  }

  if (
    taskKind === '3：設置予定' ||
    /^3：([1-5])台目$/.test(taskKind)
  ) {
    return 'install';
  }

  return 'normal';
}



function buildCollectRightDiv(record) {
  const v = (code, def = '') => record?.[code]?.value ?? def;

  const rightDiv = document.createElement('div');
  rightDiv.className = 'task-right collect-right';

  const collectGenba = v('回収現場名');   // 回収側
  const installGenba = v('現場名');       // 設置側
  const memo         = v('メモ');

  rightDiv.innerHTML = `
    <!-- 1段目：回収現場 -->
    <div class="collect-row collect-row-1">
      ${escapeHtml(collectGenba)}
    </div>

    <!-- 2段目：設置現場 -->
    <div class="collect-row collect-row-2">
      ${escapeHtml(installGenba)}
    </div>

    <!-- 3段目：メモ -->
    <div class="collect-row collect-row-3" contenteditable="true">
      ${escapeHtml(memo)}
    </div>
  `;

  return rightDiv;
}


async function createTaskBar(record, type) {

  console.log('🧪 createTaskBar called', {
    task: record.タスク,
    flag: record['回・設フラグ'],
    barModeProp: record.barMode
  });

  // ===== 0) record はすでに「正規化済み task」 =====
  const task = record;

  // 念のため最低限チェック
  if (!task || !task.subId) {
    console.warn('⚠️ 不正な taskRecord', task);
    return null;
  }
  const barMode = resolveBarMode(record);


  // ===== 1) taskEl =====
  const taskEl = document.createElement('div');
  taskEl.className = `task-bar bar-${barMode}`;


  // ===== 2) dataset =====
  taskEl.dataset.recordId = task.taskId;
  taskEl.dataset.subId    = task.subId;
  taskEl.dataset.status   = task.調整状況 || '';
  taskEl.dataset.taskKind = task.タスク || '';

  if (task.日付) {
    const iso = new Date(task.日付).toISOString().split('T')[0];
    taskEl.dataset.date = iso;
  }
  // ===== 3) 右側（表示エリア） =====
  let rightDiv = document.createElement('div');
  if (barMode === 'install') {
    // --- 設置バー（4段） ---
    rightDiv.className = 'task-right install-right';

    rightDiv.innerHTML = `
      <div class="install-row install-row-1">
        ${escapeHtml(task.現場名 || '')}
      </div>
      <div class="install-row install-row-2">
        ${escapeHtml(task.案件種別 || '')}｜${escapeHtml(task.案件ステータス || '')}
      </div>
      <div class="install-row install-row-3">
        ${escapeHtml(task.回収現場名 || '')}
      </div>
      <div class="install-row install-row-4" contenteditable="true">
        ${escapeHtml(task.テキストメモ || '')}
      </div>
    `;
//        ${escapeHtml(task.案件種別 || '')}｜${escapeHtml(task.案件番号 || '')}


    const installRow3 = rightDiv.querySelector('.install-row-3');
    const collectFromText = (task.回収元現場名 || '').trim();
    if (installRow3 && collectFromText) {
      installRow3.textContent = collectFromText;
    }
    if (installRow3 && !installRow3.textContent.trim()) {
      installRow3.innerHTML = '<span class="collect-from-placeholder">\u4e8b\u52d9\u6240</span>';
    }
  } else if (barMode === 'collect') {
    // --- 回収バー（3段） ---
    rightDiv.className = 'task-right collect-right';
    rightDiv.innerHTML = `
      <div class="collect-row collect-row-1">
        ${escapeHtml(task.回収現場名 || '')}
      </div>
      <div class="collect-row collect-row-2">
        ${escapeHtml(task.現場名 || '')}
      </div>
      <div class="collect-row collect-row-3" contenteditable="true">
        ${escapeHtml(task.テキストメモ || '')}
      </div>
    `;
  } else if (barMode === 'relocate') {
    // --- 移設バー（3段） ---
    rightDiv.className = 'task-right relocate-right';
    rightDiv.innerHTML = `
      <div class="relocate-row relocate-row-1">
        ${escapeHtml(task.回収元現場名 || '')}
      </div>
      <div class="relocate-row relocate-row-2">
        ${escapeHtml(task.現場名 || '')}
      </div>
      <div class="relocate-row relocate-row-3" contenteditable="true">
        ${escapeHtml(task.テキストメモ || '')}
      </div>
    `;
  } else {
    // --- 通常バー ---
    rightDiv.className = 'task-right';

    const order2 = padZenRight(task.表示順 || '', 2);
    const cust6  = padZenRight(task.得意先略称 || '', 6);
    const kind8  = padZenRight(task.案件種別 || '', 8);
    const topText = `${order2}${ZEN_SPACE}${cust6}${ZEN_SPACE}${kind8}`;

    rightDiv.innerHTML = `
      <div class="task-top">${escapeHtml(topText)}</div>
      <div class="task-middle">${escapeHtml(task.現場名 || '')}</div>
      <div class="task-bottom" contenteditable="true">
        ${escapeHtml(task.テキストメモ || '')}
      </div>
    `;
  }

  // ===== 4) 左側（操作エリア） =====
  const leftDiv = document.createElement('div');
  leftDiv.className = 'task-left';

  if (barMode === 'install') {
    const btn = buildStatusButtonForB(task, taskEl);
    if (btn) leftDiv.appendChild(btn);

    const prepSelect = buildPrepStatusSelect(task, taskEl);
    if (prepSelect) leftDiv.appendChild(prepSelect);
  }

  if (barMode === 'normal' && task.タスク === '4：撮影') {
    const assigneeSelect = buildAssigneeSelect(task, taskEl);
    if (assigneeSelect) leftDiv.appendChild(assigneeSelect);
  }

  // ===== 5) DOM =====
  taskEl.appendChild(leftDiv);
  taskEl.appendChild(rightDiv);

  const orderValue = String(task.表示順 || '').trim();
  if (orderValue) {
    const orderBadge = document.createElement('div');
    orderBadge.className = 'task-order-badge';
    orderBadge.textContent = orderValue;
    rightDiv.appendChild(orderBadge);
  }

  // ===== 5.5) メモ保存 =====
  const memoEl = rightDiv.querySelector('[contenteditable="true"]');
  bindMemoSave(taskEl, memoEl);

  // ===== 6) 詳細 =====
  taskEl.addEventListener('dblclick', () => {
    window.open(`/k/${kintone.app.getId()}/show#record=${task.taskId}`, '_blank');
  });

  return taskEl;
}



/** XSS対策（contenteditableやinnerHTMLに入れる文字） */
function escapeHtml(str) {
  return String(str ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function buildStatusButtonForB(record, taskEl) {
  const taskName = record?.['タスク'] || '';
  const status   = record?.['調整状況'] || '調整中';

  const btn = document.createElement('button');
  btn.className = 'task-status-btn';

  // 「3：設置予定」
  if (taskName === '3：設置予定') {
    if (status === '未受注') {
      btn.textContent = '受注';
      btn.style.backgroundColor = '#ffb84d';
      btn.style.border = '2px solid #e69500';
    } else {
      btn.textContent = '未受注';
      btn.style.backgroundColor = '#ccffcc';
      btn.style.border = '2px solid #88cc88';
    }

    btn.onclick = () => {
      const recordId = taskEl.dataset.recordId;
      if (!recordId) return alert('レコードIDが取得できません');
      toggleStatusBtnB1(btn, recordId);
    };
    return btn;
  }

  // 「3：1〜5台目」
  if (['3：1台目','3：2台目','3：3台目','3：4台目','3：5台目'].includes(taskName)) {
    // 見た目は既存ロジックに合わせる（必要ならここも共通関数化できる）
    if (status === '未受注') {
      btn.textContent = '受注';
      btn.style.backgroundColor = '#ffb84d';
      btn.style.border = '2px solid #e69500';
    } else if (status === '調整中') {
      btn.textContent = '確定';
      btn.style.backgroundColor = '#ccffcc';
      btn.style.border = '2px solid #88cc88';
    } else if (status === '確定') {
      btn.textContent = '完了';
      btn.style.backgroundColor = '#90CAF9';
      btn.style.border = '2px solid #42A5F5';
    } else if (status === '完了') {
      btn.textContent = '戻し';
      btn.style.backgroundColor = '#BDBDBD';
      btn.style.border = '2px solid #757575';
    }

    btn.onclick = () => {
      const recordId = taskEl.dataset.recordId;
      const subId = taskEl.dataset.subId;
      if (!recordId || !subId) return alert('レコードIDまたはサブIDが取得できません');

      // currentStatus は「その時点の dataset.status を渡す」
      toggleStatusBtnB2(btn, recordId, subId, taskEl.dataset.status || status);
    };
    return btn;
  }

  // Bだけど該当しないタスクならボタン無し
  return null;
}

function buildPrepStatusSelect(record, taskEl) {
  const select = document.createElement('select');
  select.className = 'task-select';

  ['準備', 'CHK', 'OK'].forEach(opt => {
    const o = document.createElement('option');
    o.value = o.textContent = opt;
    select.appendChild(o);
  });

  const prepStatus = record?.['準備状況']?.value || '準備';
  select.value = prepStatus;
  select.style.backgroundColor = (select.value !== '〇|〇') ? '#fff5e6' : '#ffffff';

  select.addEventListener('change', async () => {
    const newValue = select.value;
    select.style.backgroundColor = (newValue !== '〇|〇') ? '#fff5e6' : '#ffffff';

    const recordId = taskEl.dataset.recordId;
    const subId = taskEl.dataset.subId;
    if (!recordId || !subId) return alert('レコードIDまたはサブIDが取得できません');

    try {
      await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
        app: kintone.app.getId(),
        id: recordId,
        record: {
          タスク管理: {
            value: [{ id: subId, value: { 準備状況: { value: newValue } } }]
          }
        }
      });
      console.log(`✅ 準備状況を更新: ${newValue}`);
    } catch (err) {
      console.error('🚨 準備状況更新失敗:', err);
      alert('準備状況の更新に失敗しました。');
    }
  });

  return select;
}
function buildPrepStatusSelect(record, taskEl) {
  const select = document.createElement('select');
  select.className = 'task-select';

  // --- 日本語に修正した変数群 ---
  const taskTableField = 'タスク管理'; // サブテーブルのフィールドコード
  const taskGroupField = 'タスクG';    // サブテーブル内のフィールドコード
  const unsetLabel     = '未設定';     // 未選択時のラベル
  // ----------------------------

  const getFieldValue = (obj, fieldName) => {
    const value = obj?.[fieldName];
    return value && typeof value === 'object' && 'value' in value ? value.value : value;
  };

  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = unsetLabel;
  select.appendChild(defaultOpt);

  if (Array.isArray(taskGOptionsCache)) {
    taskGOptionsCache.forEach(opt => {
      const option = document.createElement('option');
      option.value = opt;
      option.textContent = opt;
      select.appendChild(option);
    });
  }

  const currentTaskGroup = getFieldValue(record, taskGroupField) || '';
  select.value = currentTaskGroup;
  select.style.backgroundColor = currentTaskGroup ? '#fff5e6' : '#ffffff';

  select.addEventListener('change', async () => {
    const newValue = select.value;
    select.style.backgroundColor = newValue ? '#fff5e6' : '#ffffff';

    const recordId = taskEl.dataset.recordId;
    const subId = taskEl.dataset.subId;
    if (!recordId || !subId) {
      alert('レコードIDまたはサブIDが取得できません');
      return;
    }

    try {
      await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
        app: kintone.app.getId(),
        id: recordId,
        record: {
          [taskTableField]: {
            // サブテーブル内の特定の行（id: subId）だけを更新する形式
            value: [{ id: subId, value: { [taskGroupField]: { value: newValue } } }]
          }
        }
      });
      console.log(`タスクG 更新完了: ${newValue}`);
    } catch (err) {
      console.error('タスクG 更新失敗:', err);
      alert('タスクGの更新に失敗しました。');
    }
  });

  return select;
}

function buildAssigneeSelect(record, taskEl) {
  const select = document.createElement('select');
  select.className = 'task-assignee-select';

  // 未設定
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '未設定';
  select.appendChild(defaultOpt);

  if (assignedOptionsCache && Array.isArray(assignedOptionsCache)) {
    assignedOptionsCache.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      select.appendChild(o);
    });
  } else {
    console.warn("⚠️ 担当者キャッシュ未取得 assignedOptionsCache");
  }

  const currentAssignee = record?.['担当者']?.value || '';
  select.value = currentAssignee;
  select.style.backgroundColor = currentAssignee ? '#ffffff' : '#fff5e6';

  select.addEventListener('change', async () => {
    const newAssignee = select.value;
    select.style.backgroundColor = newAssignee ? '#ffffff' : '#fff5e6';

    const recordId = taskEl.dataset.recordId;
    const subId = taskEl.dataset.subId;
    if (!recordId || !subId) return alert('レコードIDまたはサブIDが取得できません');

    try {
      await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
        app: kintone.app.getId(),
        id: recordId,
        record: {
          タスク管理: {
            value: [{ id: subId, value: { 担当者: { value: newAssignee } } }]
          }
        }
      });
      console.log(`✅ 担当者を更新: ${newAssignee}`);
    } catch (err) {
      console.error('🚨 担当者更新失敗:', err);
      alert('担当者の更新に失敗しました。');
    }
  });

  return select;
}





// ステータス切替の例
function toggleStatus(btn) {
  const states = ['受注', '確定', '完了', '戻し'];
  let idx = states.indexOf(btn.textContent);
  btn.textContent = states[(idx + 1) % states.length];
}


//
// === ステータスボタン①（3：設置予定）===
//
async function toggleStatusBtnB1(buttonEl, recordId) {
  const currentLabel = buttonEl.textContent.trim();
  let newStatus, newLabel, bgColor, borderColor;

  if (currentLabel === '受注') {
    // 🔸 未受注 → 調整中
    newStatus = '調整中';
    newLabel = '未受注';
    bgColor = '#ccffcc';   // 薄い緑
    borderColor = '#88cc88';
  } else {
    // 🔸 調整中 → 未受注
    newStatus = '未受注';
    newLabel = '受注';
    bgColor = '#ffb84d';   // オレンジ
    borderColor = '#e69500';
  }

  try {
    // サブテーブル全行を更新
    const resp = await kintone.api(kintone.api.url('/k/v1/record', true), 'GET', {
      app: kintone.app.getId(),
      id: recordId
    });

    const updatedSub = resp.record['タスク管理'].value.map(row => ({
      id: row.id,
      value: { ...row.value, 調整状況: { value: newStatus } }
    }));

    await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
      app: kintone.app.getId(),
      id: recordId,
      record: { タスク管理: { value: updatedSub } }
    });

    // ✅ 見た目を即時反映
    buttonEl.textContent = newLabel;
    buttonEl.style.backgroundColor = bgColor;
    buttonEl.style.setProperty('border', `2px solid ${borderColor}`, 'important'); // ← 追加！
    buttonEl.style.color = '#333';
    buttonEl.style.fontWeight = 'bold';
    buttonEl.style.transition = 'background-color 0.3s ease, border-color 0.3s ease';

    console.log(`✅ 全サブ行を ${newStatus} に更新完了 (border=${borderColor})`);
  } catch (e) {
    console.error('🚨 [ボタン①更新失敗]', e);
    alert('更新に失敗しました');
  }
}


/**
 * ボタン②（3：1〜5台目）のステータス遷移処理
 * 未受注 → 調整中 → 確定 → 完了 → 戻し
 */
async function toggleStatusBtnB2(btn, recordId, subId) {
  try {
    const taskEl = btn.closest('.task-bar');
    if (!taskEl) return;

    const currentStatus = taskEl.dataset.status || '未受注';
    let newStatus = currentStatus;

    if (currentStatus === '未受注') {
      newStatus = '調整中';
    } else if (currentStatus === '調整中') {
      newStatus = '確定';
    } else if (currentStatus === '確定') {
      newStatus = '完了';
    } else if (currentStatus === '完了') {
      const ok = confirm('ステータスを「確定」に戻します。よろしいですか？');
      if (!ok) return;
      newStatus = '確定';
    }

    btn.disabled = true;

    const targetDate = taskEl.dataset.date || '';
    const taskKind   = taskEl.dataset.taskKind || '';

    // === DB更新（唯一の正）===
    await updateTaskRecord(
      recordId,
      subId,
      targetDate,
      newStatus,
      taskKind
    );

    // === UI更新（DB後に1回だけ）===
    taskEl.dataset.status = newStatus;
    taskEl.classList.remove(
      'task-nonorderd',
      'task-adjusting',
      'task-confirmed',
      'task-completed'
    );

    if (newStatus === '未受注') taskEl.classList.add('task-nonorderd');
    else if (newStatus === '調整中') taskEl.classList.add('task-adjusting');
    else if (newStatus === '確定') taskEl.classList.add('task-confirmed');
    else if (newStatus === '完了') taskEl.classList.add('task-completed');

    // === ボタン表示更新 ===
    let label = '';
    let bg = '';
    let border = '';

    if (newStatus === '未受注') {
      label = '受注'; bg = '#CCFFCC'; border = '#88CC88';
    } else if (newStatus === '調整中') {
      label = '確定'; bg = '#FFF59D'; border = '#FBC02D';
    } else if (newStatus === '確定') {
      label = '完了'; bg = '#90CAF9'; border = '#42A5F5';
    } else if (newStatus === '完了') {
      label = '戻し'; bg = '#BDBDBD'; border = '#757575';
    }

    btn.textContent = label;
    btn.className = 'task-status-btn';
    btn.style.backgroundColor = bg;
    btn.style.border = `2px solid ${border}`;
    btn.style.color = '#333';
    btn.style.fontWeight = 'bold';

  } catch (err) {
    console.error('🚨 toggleStatusBtnB2 error', err);
    alert('ステータス更新に失敗しました');
  } finally {
    btn.disabled = false;
  }
}





function displaytooltip(taskElement, tooltip) {
  if (!taskElement || !(taskElement instanceof HTMLElement)) {
    console.warn("⚠️ displaytooltip: taskElement が DOM 要素ではありません →", taskElement);
    return;
  }
  if (!tooltip || !(tooltip instanceof HTMLElement)) {
    console.warn("⚠️ displaytooltip: tooltip が無効です →", tooltip);
    return;
  }

  const recordId = taskElement.dataset?.recordId || '';
  if (recordId) tooltip.dataset.recordId = recordId;

  taskElement.addEventListener('mouseover', () => {
    tooltip.style.display = 'block';
    adjustTooltipPosition(tooltip, taskElement);
  });

  taskElement.addEventListener('mouseout', () => {
    tooltip.style.display = 'none';
  });
}







/**
 * AppID=1145 に設置完了日と案件ステータスを反映する
 * @param {string} recordId - 元アプリのレコードID
 * @param {string} subId - サブテーブル行ID
 */
async function updateInstallComplete(recordId, subId) {
    try {
        // ① 元レコードを取得
        const getResp = await kintone.api(kintone.api.url('/k/v1/record', true), 'GET', {
            app: kintone.app.getId(),
            id: recordId
        });

        const record = getResp.record;
        const ankenNo = record['案件番号'].value;

        // ② サブテーブルから「3：1台目〜5台目」の日付を取得
        const subTable = record['タスク管理'].value;
        const targetTasks = ['3：1台目','3：2台目','3：3台目','3：4台目','3：5台目'];

        let installDates = subTable
            .filter(row => targetTasks.includes(row.value['タスク'].value))
            .map(row => row.value['日付'].value)
            .filter(Boolean);

        if (installDates.length === 0) {
            console.warn(`⚠️ 案件No=${ankenNo} に設置日のタスクがありません`);
            return;
        }

        // 一番遅い日付を設置完了日とする
        const completeDate = installDates.sort().pop();

        // ③ 連携先アプリ (1145) を案件番号で検索
        const getResp2 = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
            app: 1145,
            query: `案件番号 = "${ankenNo}"`,
            fields: ['$id']
        });

        if (getResp2.records.length === 0) {
            console.warn(`⚠️ App1145 に案件No=${ankenNo} が見つかりません`);
            return;
        }

        const targetId = getResp2.records[0].$id.value;

        // ④ 設置完了日＋案件ステータスを更新
        await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', {
            app: 1145,
            id: targetId,
            record: {
                '設置完了日': { value: completeDate }
//                '案件ステータス': { value: '完了_撮影済/編集未' }
            }
        });

        console.log(`✅ 案件No=${ankenNo} を更新: 設置完了日=${completeDate}, 案件ステータス=完了_撮影済/編集未`);
    } catch (error) {
        console.error("🚨 updateInstallComplete 失敗:", error);
    }
}



// Fetch existing records and populate calendar cells
async function fetchAndPopulateCells(year, month, containerId, callback) {
    try {
        const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
        const endDate = new Date(year, month + 2, 0).toISOString().split('T')[0];

        const query = `日付 >= "${startDate}" and 日付 <= "${endDate}" order by 日付 asc`;

        const body = {
            app: APP_IDS.DELIVERY,
            query: query,
            fields: ["日付", "配送番号", "配送業者", "メモ", "$id"]
        };

        console.log("[DEBUG] Kintone API へリクエスト送信 (App ID:APP_IDS.DELIVERY)", body);

        kintoneApiWrapper(kintone.api.url('/k/v1/records', true), 'GET', body, (resp) => {
            console.log("[DEBUG] Kintone API (APP_IDS.DELIVERY) 取得成功:", resp);

            const recordMap = new Map();
            const recordMap2 = new Map(); // タスクデータに合わせて同じものを渡す

            resp.records.forEach(record => {
                const isoDate = formatDateToLocalISO(new Date(record["日付"].value));
                if (!recordMap.has(isoDate)) recordMap.set(isoDate, []);
                recordMap.get(isoDate).push(record);

                // recordMap2にも同じレコードを入れておく（タスク表示にも使うなら）
                if (!recordMap2.has(isoDate)) recordMap2.set(isoDate, []);
                recordMap2.get(isoDate).push(record);
            });

            // 🧩 正しい引数でセルを描画
            populateCalendarCells(recordMap, recordMap2, year, month, containerId);

            if (callback) {
                callback(resp.records);
            } else {
                console.warn("⚠️ callback が未定義です");
            }

        }, (error) => {
            console.error("🚨 [ERROR] Kintone API (APP_IDS.DELIVERY) 取得失敗:", error.message);
        });

    } catch (error) {
        console.error("🚨 [ERROR] fetchAndPopulateCells 内部エラー:", error);
    }
}


function populateCalendarCells(recordMap, recordMap2, year, month, containerId) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysIn2Month = new Date(year, (month + 1) % 12 + 1, 0).getDate();
    var totalDay = daysInMonth + daysIn2Month;

    for (let day = 1; day <= totalDay; day++) {
        const isoDate = formatDateToLocalISO(new Date(year, month, day));

        // ** 配送業者の処理 (recordMap) **
        const recordsForDate = (recordMap.get(isoDate) || []).sort((a, b) => 
            parseInt(a["配送番号"].value || "0") - parseInt(b["配送番号"].value || "0")
        );

        document.querySelectorAll(`.calendar-cell[data-date="${isoDate}"]`).forEach((cell, index) => {
            if (["task-1st", "task-2nd", "task-3rd", "task-4th", "task-5th"].includes(cell.id)) {
                const slotNumberMap = {
                    "task-1st": 1,
                    "task-2nd": 2,
                    "task-3rd": 3,
                    "task-4th": 4,
                    "task-5th": 5
                };
                const slotNumber = slotNumberMap[cell.id] || 0;
                const record = recordsForDate.find(record => {
                    const deliveryNo = parseInt(record["配送番号"].value, 10);
                    return deliveryNo === slotNumber || deliveryNo === slotNumber + 6;
                });
                populateDropdown(cell, record ? record["配送業者"].value : "", record, isoDate, slotNumber);
            }
        });
    }
}



function createTaskElement(task) {
    var taskElement = document.createElement('div');
    taskElement.className = 'task-bar';
    taskElement.dataset.recordId = task.案件番号;
    taskElement.dataset.date = task.日付;

    taskElement.innerHTML = `
        <div class="task-top-row">
            <div class="task-text-fixed">${task.表示順} ${task.タスク}</div>
            <div class="task-text-editable">${task.テキストメモ}</div>
        </div>
        <div class="task-text-bottom">${task.担当者}</div>
    `;

    return taskElement;
}



// ==========================================
// 配送業者プルダウン、一括ボタン、メモ欄の生成
// ==========================================
function populateDropdown(cell, existingValue = "", record, date, column) {
    cell.innerHTML = ""; 

    const container = document.createElement('div');
    container.style.cssText = 'display:flex; flex-direction:column; gap:8px; padding:4px;';

    const topRow = document.createElement('div');
    topRow.style.cssText = 'display:flex; gap:6px; align-items:center;';

    // ボタンの雛形作成
    const createBtn = (className) => {
        const btn = document.createElement('button');
        btn.classList.add(className);
        btn.dataset.date = date;
        btn.dataset.column = column;
        btn.style.cssText = `font-size:13px; height:40px; border:0; border-radius:10px; color:white; transition:0.3s; flex:1; white-space:nowrap; cursor:pointer;`;
        return btn;
    };

    const leftBtn = createBtn('bulk-left-btn');
    const rightBtn = createBtn('bulk-right-btn');

    // 🎯 列名特定ロジック（7=1台目, 8=2台目...）
    const getStrictTaskName = (col) => {
        const idMap = { 'task-1st': '3：1台目', 'task-2nd': '3：2台目', 'task-3rd': '3：3台目', 'task-4th': '3：4台目', 'task-5th': '3：5台目' };
        const indexMap = { 1: '3：1台目', 2: '3：2台目', 3: '3：3台目', 4: '3：4台目', 5: '3：5台目' };
        return idMap[col] || indexMap[col];
    };

    // --- 左ボタンクリックイベント（確定 or 完了） ---
    leftBtn.addEventListener('click', async () => {
        const targetKind = getStrictTaskName(column);
        const tasks = Array.from(document.querySelectorAll(`.task-bar[data-date="${date}"]`))
                           .filter(b => b.dataset.taskKind === targetKind);
        const label = leftBtn.textContent;

        if (label === '一括確定') {
            if (!confirm(`「${targetKind}」をすべて「確定」にしますか？`)) return;
            await applyStatusBulk(tasks, '確定', date);
//            if (record) await updatePdownRecordStatus(record["$id"].value, '確定');
        } else if (label === '一括完了') {
            if (!confirm(`「${targetKind}」をすべて「完了」にしますか？\n(別アプリ1145も自動更新されます)`)) return;
            // 1. 自アプリの一括完了
            await applyStatusBulk(tasks, '完了', date);
            // 2. 別アプリ1145の自動更新
debugger;            
//            await updateApp1145Bulk(tasks, date);
//            if (record) await updatePdownRecordStatus(record["$id"].value, '完了');
        }
        refreshAllBulkButtons();
    });

// // --- 右ボタンクリックイベント（解除 or 戻し） ---
    rightBtn.addEventListener('click', async () => {
        const targetKind = getStrictTaskName(column);
        const tasks = Array.from(document.querySelectorAll(`.task-bar[data-date="${date}"]`))
                           .filter(b => b.dataset.taskKind === targetKind);

        const leftLabel = leftBtn.textContent;
        let nextStatus = '調整中'; 

        if (leftLabel === '設置完了') {
            nextStatus = '確定';
        } else {
            nextStatus = '調整中';
        }
        
        if (!confirm(`ステータスを「${nextStatus}」に戻しますか？\n(案件管理アプリの状態も戻ります)`)) return;
        
        // // 1. 自アプリ(TASK)の一括更新
        await applyStatusBulk(tasks, nextStatus, date);
        
        // // 2. 🎯 App 1145 (案件管理) のステータスを戻し、完了日を空にする
//        await revertApp1145Bulk(tasks);

        refreshAllBulkButtons();
    });
    
    // プルダウン・メモ欄は既存通り（略）
    const dropdown = document.createElement('select');
    dropdown.style.cssText = 'height:40px; border-radius:10px; width:130px; border:1px solid #ccc;';
    const emptyOption = document.createElement('option');
    emptyOption.value = '';
    emptyOption.textContent = '';
    dropdown.appendChild(emptyOption);

    if (Array.isArray(deliveryOptionsCache)) {
        deliveryOptionsCache.forEach(optionValue => {
            const option = document.createElement('option');
            option.value = optionValue;
            option.textContent = optionValue;
            dropdown.appendChild(option);
        });
    }

    dropdown.value = existingValue || '';
    updateDropdownBackground(dropdown);
    dropdown.addEventListener('change', function () {
        const selectedValue = dropdown.value || "";
        updateDropdownBackground(dropdown);

        if (record && record.$id) {
            updatePdownRecord(record.$id.value, selectedValue);
        } else {
            createRecord(APP_IDS.DELIVERY, date, column, selectedValue, memoInput?.value || "");
        }
    });
    
    const memoInput = document.createElement('input');
    memoInput.type = 'text';
    // widthをcalcで調整し、box-sizingとmax-widthを追加して枠内に収める
    memoInput.style.cssText = `
        height: 40px; 
        border-radius: 10px; 
        width: calc(100% - 0.2px); 
        max-width: 600px; 
        border: 1px solid #ccc; 
        padding: 0 10px; 
        box-sizing: border-box; 
        font-size: 14px;
        margin: 0 auto;
    `;    memoInput.value = record?.['メモ']?.value || '';
    // 🎯 【重要】保存ロジック：フォーカスが外れた瞬間に DB(1202) へ書き込み
    memoInput.addEventListener('blur', function () {
        const newMemo = memoInput.value;
        const currentDelivery = dropdown.value || "選択してください";

        // // コンソールで保存の動きを確認（テスト完了後に削除可）
        console.log("// [DEBUG] メモ保存処理:", { date, column, newMemo });

        if (record && record.$id) {
            // // 既存レコード(1202)がある場合は更新
            updatePdownRecordMemo(record.$id.value, currentDelivery, newMemo);
        } else {
            // // レコードがない場合は新規作成（App ID: 1202）
            createRecord(APP_IDS.DELIVERY, date, column, currentDelivery, newMemo);
        }
    });

    topRow.appendChild(dropdown);
    topRow.appendChild(leftBtn);
    topRow.appendChild(rightBtn);
    container.appendChild(topRow);
    container.appendChild(memoInput);
    cell.appendChild(container);
}

// ==========================================
// 全ボタンの状態をタスク状況に合わせて更新する
// ==========================================
function refreshAllBulkButtons() {
    const getStrictTaskName = (col) => {
        const idMap = { 'task-1st': '3：1台目', 'task-2nd': '3：2台目', 'task-3rd': '3：3台目', 'task-4th': '3：4台目', 'task-5th': '3：5台目' };
        const indexMap = { 1: '3：1台目', 2: '3：2台目', 3: '3：3台目', 4: '3：4台目', 5: '3：5台目' };
        return idMap[col] || indexMap[col];
    };

    document.querySelectorAll('.bulk-left-btn').forEach(leftBtn => {
        const container = leftBtn.parentElement;
        const rightBtn = container.querySelector('.bulk-right-btn');
        const date = leftBtn.dataset.date;
        const kind = getStrictTaskName(leftBtn.dataset.column);
        
        // // 🎯 ここで最新のDOMからタスクを検索
        const tasks = Array.from(document.querySelectorAll(`.task-bar[data-date="${date}"]`))
                           .filter(b => b.dataset.taskKind === kind);

        const stats = tasks.map(t => t.dataset.status);
        const hasUnordered = stats.includes('未受注');
        const allConfirmed = tasks.length > 0 && stats.every(s => s === '確定');
        const allCompleted = tasks.length > 0 && stats.every(s => s === '完了');
        const hasAdjustingOrConfirmed = stats.some(s => s === '調整中' || s === '確定');

        // // デフォルト設定（基本はグレーアウト）
        leftBtn.disabled = true;
        leftBtn.style.backgroundColor = '#ccc';
        rightBtn.disabled = true;
        rightBtn.style.backgroundColor = '#ccc';
        leftBtn.textContent = '一括確定';
        rightBtn.textContent = '確定解除';

        // // 🚀 修正ポイント: タスクがまだ1つもない場合はここで処理を終える
        if (tasks.length === 0) return;

        if (hasUnordered) {
            // 未受注あり
            leftBtn.textContent = '一括確定';
        } else if (allCompleted) {
            // すべて完了
            leftBtn.textContent = '設置完了';
            rightBtn.textContent = '戻し';
            rightBtn.disabled = false;
            rightBtn.style.backgroundColor = '#708090';
        } else if (allConfirmed) {
            // すべて確定（一括完了へ）
            leftBtn.textContent = '一括完了';
            leftBtn.disabled = false;
            leftBtn.style.backgroundColor = '#3498db';
            rightBtn.textContent = '確定解除';
            rightBtn.disabled = false;
            rightBtn.style.backgroundColor = '#708090';
        } else if (hasAdjustingOrConfirmed) {
            // 調整中や確定が混在（一括確定へ）
            leftBtn.textContent = '一括確定';
            leftBtn.disabled = false;
            leftBtn.style.backgroundColor = '#2ecc71';
            rightBtn.textContent = '確定解除';
            rightBtn.disabled = false;
            rightBtn.style.backgroundColor = '#708090';
        }
    });
}


// 選択状態の背景色を設定する関数
function updateDropdownBackground(dropdown) {
    const selectedValue = dropdown.value;
    
    // デフォルトは白、選択肢がある場合はアクアマリン
    const bgColor = (selectedValue && selectedValue !== "選択してください") ? '#7FFFD4' : '#FFFFFF';

    dropdown.style.backgroundColor = bgColor;
}


function updatePdownRecord(recordId, selectedValue) {
    const updateBody = {
        app: APP_IDS.DELIVERY,
        id: recordId,
        record: {
            "配送業者": { "value": selectedValue }
        }
    };

    kintoneApiWrapper(kintone.api.url('/k/v1/record.json', true), 'PUT', updateBody, () => {
        //alert(`更新しました: ${selectedValue}`);
    }, (error) => {
        console.error('更新に失敗しました:', error);
        alert(`更新に失敗しました: ${error.message}`);
    });
}

function updatePdownRecordMemo(taskId, selectedValue, memoValue) {
    const updateBody = {
        app: APP_IDS.DELIVERY,
        id: taskId,
        record: {
            "タスク": { "value": selectedValue },
            "メモ": { "value": memoValue }
        }
    };

    kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', updateBody, function (resp) {
        //alert(`更新しました: ${memoValue}`);
        console.log('Record updated successfully');
    }, function (error) {
        console.error('Error updating record:', error);
    });
}

function createRecord(appId, date, column, selectedValue, newMemo) {
    const createBody = {
        app: appId,
        record: {
            "日付": { "value": date },
            "メモ": { "value": newMemo },
            "配送番号": { "value": column.toString() },
            "配送業者": { "value": selectedValue }
        }
    };
    kintoneApiWrapper(kintone.api.url('/k/v1/record.json', true), 'POST', createBody, () => {
        alert(`保存しました: ${selectedValue}`);
    }, (error) => {
        console.error('保存に失敗しました:', error);
        alert(`保存に失敗しました: ${error.message}`);
    });
}


function updatePdownRecord(recordId, selectedValue) {
    const updateBody = {
        app: APP_IDS.DELIVERY,
        id: recordId,
        record: {
            "配送業者": { value: selectedValue || "" }
        }
    };

    return kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', updateBody);
}

function updatePdownRecordMemo(taskId, selectedValue, memoValue) {
    const updateBody = {
        app: APP_IDS.DELIVERY,
        id: taskId,
        record: {
            "配送業者": { value: selectedValue || "" },
            "メモ": { value: memoValue || "" }
        }
    };

    return kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', updateBody);
}

function generateCalendar(year, month, containerId, appId) {
  const daysInFirstMonth = new Date(year, month + 1, 0).getDate();
  const daysInSecondMonth = new Date(year, (month + 1) % 12 + 1, 0).getDate();
  const totalDays = daysInFirstMonth + daysInSecondMonth;
  const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

  // ✅ カレンダーHTML生成
  let calendarHtml = `
    <table class="calendar-table2">
      <thead class="calendar-header2">
        <tr>
          <th class="date">日付</th>
  `;
  
  COLUMN_DEFS.forEach(col => {
    calendarHtml += `<th class="task">${col.label}</th>`;
  });
  
  calendarHtml += `
        </tr>
      </thead>
      <tbody>
  `;


  // ✅ 各日付行を追加
  for (let day = 1; day <= totalDays; day++) {
    let currentYear = year;
    let currentMonth = month;
    let currentDay = day;

    if (day > daysInFirstMonth) {
      currentMonth = (month + 1) % 12;
      currentDay = day - daysInFirstMonth;
      if (currentMonth === 0) currentYear++;
    }

    const date = new Date(currentYear, currentMonth, currentDay);
    const isoDate = formatDateToLocalISO(date);
    const dayLabel = `${currentMonth + 1}月${currentDay}日 (${dayNames[date.getDay()]})`;

    calendarHtml += `<tr><td class="dateindex">${dayLabel}</td>`;
    
    COLUMN_DEFS.forEach(col => {
      const noSortClass = col.sortable === false ? ' no-sort' : '';
      calendarHtml += `
        <td
          data-date="${isoDate}"
          class="calendar-cell${noSortClass}"
          id="${col.id}">
        </td>
      `;
    });
    
    calendarHtml += `</tr>`;

  }

  calendarHtml += `</tbody></table>`;
  const root = document.getElementById(containerId);
  if (!root) {
    console.error(`Calendar container not found: #${containerId}`);
    return;
  }
  root.innerHTML = calendarHtml;

  // ★ 列DOM生成後に初期非表示を適用
//  initHiddenColumns();

  // ✅ Sortable 設定（元のまま）
  loadSortableJS(() => {
    console.log('🛠️ Sortable再設定開始');
  
    const containers = document.querySelectorAll(`#${containerId} .cell-left, #${containerId} .cell-right`);
    containers.forEach(container => {
      const td = container.closest('td');
      if (!td) return;
      const tdId = td.id;
      let groupName = 'delivery-group';
      if (['task-secchi'].includes(tdId)) {
        groupName = tdId;
      }
  
      new Sortable(container, {
        group: { name: groupName, pull: true, put: true },
        animation: 150,
        draggable: '.task-bar',
        filter: '.task-completed',
        onMove: evt => {
          if (!evt.related) return true;
          return !evt.related.classList.contains('task-completed');
        },
        onEnd: async evt => {
          await handleSortEndDel(evt, year, month);
  
          // ドラッグ無効化バグ対策
          document.querySelectorAll('.task-bar').forEach(el => {
            el.setAttribute('draggable', true);
          });
        }
      });
    });
  
    console.log('✅ Sortable再設定完了');
  });

}




function loadSortableJS(callback) {
    if (!window.Sortable) {
        var script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Sortable/1.14.0/Sortable.min.js';
        script.onload = callback;
        document.head.appendChild(script);
    } else {
        callback();
    }
}


/**
 * 自レコードのサブテーブルに配送業者を反映
 * @param {string} recordId - メインレコードID
 * @param {string} subId - サブテーブル行ID
 * @param {string} selectedValue - 配送業者の値
 */
async function updateSelfRecord(recordId, subId, selectedValue) {
    try {
        // 元レコードを取得
        const getResp = await kintone.api(kintone.api.url('/k/v1/record', true), 'GET', {
            app: kintone.app.getId(),
            id: recordId
        });

        const record = getResp.record;
        const subTable = record["タスク管理"].value;

        // 対象の subId を探して配送業者フィールドを更新
        const updatedSubTable = subTable.map(row => {
            if (row.id === subId) {
                row.value["配送業者_0"].value = selectedValue || "";
            }
            return row;
        });

        // レコード更新
        const putBody = {
            app: kintone.app.getId(),
            id: recordId,
            record: {
                "タスク管理": {
                    value: updatedSubTable.map(row => ({
                        id: row.id,
                        value: row.value
                    }))
                }
            }
        };

        await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', putBody);
        console.log(`✅ 自レコード更新: RecordID=${recordId}, SubID=${subId}, 配送業者=${selectedValue}`);
    } catch (error) {
        console.error("🚨 自レコード更新に失敗:", error);
    }
}
 
(function() {
'use strict';

    kintone.events.on('app.record.index.show', async function(kintoneEvent) {
        const viewId = kintoneEvent.viewId;
        if (viewId !== 8223617) return kintoneEvent;

        const date = new Date();
        const savedYear = parseInt(localStorage.getItem('calendarYear'), 10);
        const savedMonth = parseInt(localStorage.getItem('calendarMonth'), 10);
        let year = Number.isNaN(savedYear) ? date.getFullYear() : savedYear;
        let month = Number.isNaN(savedMonth) ? date.getMonth() : savedMonth;

        // 🔸 アプリロード時に1回だけ実行
        await initApp();
        // ✅ ★ここで1回だけ呼ぶ（超重要）
        addColumnToggleButtons();


        await updateCalendarDel(year, month);
        window._calendarCurrentYear = year;
        window._calendarCurrentMonth = month;

        if (!window._calendarNavBound) {
          document.getElementById('prev-month').addEventListener('click', async () => {
              let currentYear = window._calendarCurrentYear;
              let currentMonth = window._calendarCurrentMonth;
              currentMonth = (currentMonth - 1 + 12) % 12;
              if (currentMonth === 11) currentYear--;
              window._calendarCurrentYear = currentYear;
              window._calendarCurrentMonth = currentMonth;
              await updateCalendarDel(currentYear, currentMonth);
           });

          document.getElementById('now-month').addEventListener('click', async () => {
              const today = new Date();
              window._calendarCurrentYear = today.getFullYear();
              window._calendarCurrentMonth = today.getMonth();
              await updateCalendarDel(window._calendarCurrentYear, window._calendarCurrentMonth);
          });

          document.getElementById('next-month').addEventListener('click', async () => {
              let currentYear = window._calendarCurrentYear;
              let currentMonth = window._calendarCurrentMonth;
              currentMonth = (currentMonth + 1) % 12;
              if (currentMonth === 0) currentYear++;
              window._calendarCurrentYear = currentYear;
              window._calendarCurrentMonth = currentMonth;
              await updateCalendarDel(currentYear, currentMonth);
          });
          
          document.getElementById('reload-page').addEventListener('click', async () => {
              location.reload();
          });
          document.getElementById('scroll-today').addEventListener('click', () => {
            scrollToToday();
          });
          window._calendarNavBound = true;
        }
        document.getElementById('scroll-top').addEventListener('click', () => {
          scrollToTop();
        });

        // === 🔹 ヘッダー最小化ボタン ===
const toggleBtn = document.getElementById('toggle-header');
const header = document.getElementById('calendar-container-header');
const wrapper = document.getElementById('calendar-header-wrapper');

if (toggleBtn && header) {
  toggleBtn.addEventListener('click', () => {
    const minimized = header.classList.toggle('minimized');
    wrapper.classList.toggle('minimized', minimized);

    if (minimized) {
      // 🎯 ヘッダー全体を隠すけど、小さなボタンだけ左上に残す
      toggleBtn.classList.add('floating-toggle');
      toggleBtn.textContent = '↔'; // 展開ボタン
      document.body.appendChild(toggleBtn); // 外に一時移動
    } else {
      // 🎯 元に戻す
      toggleBtn.classList.remove('floating-toggle');
      toggleBtn.textContent = '←';
      header.prepend(toggleBtn); // 再びヘッダー内へ戻す
    }
  });
}


        return kintoneEvent;
    });
})();


async function mergeRelocateToInstallPlan(evt) {
  console.log('🧩 mergeRelocateToInstallPlan called');

  const recordId = evt.item.dataset.recordId;
  const parentSubId = evt.item.dataset.subId;
  const targetDate = evt.to.closest('td')?.dataset.date;

  const resp = await kintone.api(
    kintone.api.url('/k/v1/record', true),
    'GET',
    { app: kintone.app.getId(), id: recordId }
  );

  const rows = resp.record['タスク管理']?.value || [];

  const newRows = rows
    // ① 移設（子）行を削除
    .filter(row => row.value['回・設フラグ']?.value !== '回')
    // ② 親を「設置予定」に戻す
    .map(row => {
      if (row.id === parentSubId) {
        return {
          id: row.id,
          value: {
            ...row.value,
            タスク: { value: '3：設置予定' },
            日付: { value: targetDate }
          }
        };
      }
      return row;
    });

  await kintone.api(
    kintone.api.url('/k/v1/record', true),
    'PUT',
    {
      app: kintone.app.getId(),
      id: recordId,
      record: {
        タスク管理: { value: newRows }
      }
    }
  );

  console.log('🧩 N台目 → 設置予定 + 移設バー削除 完了');
}





async function updateCalendarDel(year, month) {
  const renderToken = ++window._calendarRenderToken;
  showLoadingMessage();
  showProgressBar();

  /* =========================
     ★ 設置概要：月単位プリロード（追加）
     ※ month は 0-based → +1
  ========================= */
  const nextMonthDate = new Date(year, month + 1, 1);
  await Promise.all([
    preloadInstallSummary(year, month + 1),
    preloadInstallSummary(nextMonthDate.getFullYear(), nextMonthDate.getMonth() + 1)
  ]);

  /* =========================
     カレンダー生成
  ========================= */
  generateCalendar(year, month, 'calendar', kintone.app.getId());
  
  // ★ここで必ず表示に戻す（列とボタンを同期）
//  setInstallMemoVisible(true);
  setInstallMemoVisible(window._installMemoVisible !== false);
  setCollectMemoVisible(window._collectMemoVisible !== false);

  
  document.getElementById('current-month').textContent =
    `${year}年 ${month + 1}月`;
  updateCurrentMonth(year, month);

  /* =========================
     レコード取得
  ========================= */
  setProgress(10);
  const allRecords = await fetchAllRecords(year, month);
  if (renderToken !== window._calendarRenderToken) return;
  setProgress(50);

  if (!allRecords || allRecords.length === 0) {
    hideProgressBar();
    hideLoadingMessage();
    return;
  }

  /* =========================
     サブテーブル → タスク展開
  ========================= */
  const allTasks = fetchTasksFromSubTable(allRecords);
  setProgress(65);

  /* =========================
     カレンダー描画 & データ反映
  ========================= */
  fetchAndPopulateCells(year, month, 'calendar', async () => {
    if (renderToken !== window._calendarRenderToken) return;
    setProgress(80);
    document.querySelectorAll('#calendar .task-bar').forEach(el => el.remove());

    console.time('⏳ [TIME] loadTasks');
    loadTasks(allTasks, year, month);
    console.timeEnd('⏳ [TIME] loadTasks');

// =========================
    // Sortable 再設定
    // =========================
    setTimeout(() => {
      console.log('// 🛠️ Sortable再設定開始');

      document.querySelectorAll('#calendar .calendar-cell').forEach(container => {
        if (container._sortable) {
          container._sortable.destroy();
          delete container._sortable;
        }
      });

      const containers = document.querySelectorAll(
        '#calendar .calendar-cell:not(.no-sort)'
      );

      containers.forEach(container => {
        const tdId = container.id;
        let groupName = 'delivery-group';
        if (tdId === 'task-secchi') groupName = 'task-secchi';

        container._sortable = new Sortable(container, {
          group: { name: groupName, pull: true, put: true },
          animation: 150,
          draggable: '.task-bar',
          filter: '.task-completed',
          disabled: tdId === 'task-limit',

          onMove: evt => {
            const fromTd = evt.from.closest('td');
            const toTd   = evt.to.closest('td');
            if (!fromTd || !toTd) return true;
          
            // // ★★★ 最重要：同じセル内の並び替えは無条件で許可 ★★★
            if (fromTd === toTd) {
              return true;
            }
          
            const fromCol = getColumnDefById(fromTd.id);
            const toCol   = getColumnDefById(toTd.id);
            if (!fromCol || !toCol) return false;
          
            const fromKind = fromCol.taskKind;
            const toKind   = toCol.taskKind;
          
            // // ---- 回収期限：同一列のみ ----
            if (fromKind === '3：回収期限' || toKind === '3：回収期限') {
              return fromTd.id === toTd.id;
            }
          
            // // ---- 設置系（設置予定／1～5台目） ----
            const isInstall = k =>
              k === '3：設置予定' || /^3：[1-5]台目$/.test(k);
          
            if (isInstall(fromKind) && isInstall(toKind)) {
              return true;
            }
          
            // // ---- 工程固定（現調・プラン・撮影） ----
            const fixed = ['1：現調','2：プラン作成','4：撮影'];
            if (fixed.includes(fromKind)) {
              return fromTd.id === toTd.id;
            }
          
            return false;
          },

          onEnd: async evt => {
            const taskEl = evt.item;
            const fromTd = evt.from?.closest('td');
            const toTd   = evt.to?.closest('td');
            if (!taskEl || !fromTd || !toTd) return;

            const fromKind = taskKindFromCellId(fromTd.id);
            const toKind   = taskKindFromCellId(toTd.id);

            const isFromPlan = fromKind === '3：設置予定';
            const isToSlot   = /^3：[1-5]台目$/.test(toKind);
            const isFromSlot = /^3：[1-5]台目$/.test(fromKind);
            const isToPlan   = toKind === '3：設置予定';

            const recordId = taskEl.dataset.recordId;
            const subId    = taskEl.dataset.subId;
            const targetDate = toTd.dataset.date || toTd.getAttribute('data-date') || '';

            if (!recordId || !subId || !targetDate) return;

            try {
              // // ① 設置予定 → 台目
              if (isFromPlan && isToSlot) {
                const deliverySelect = toTd.querySelector('select');
                const selectedDelivery = deliverySelect?.value?.trim() || '';
                if (!selectedDelivery) {
                  try { evt.from?.appendChild(taskEl); } catch (_) {}
                  alert('タスクを移動する前に配送会社を決めてください');
                  return;
                }
                const prevStatus = taskEl.dataset.status || '未受注';
                await updateTaskRecord(recordId, subId, targetDate, prevStatus, toKind);
              
                const rows = taskEl.querySelectorAll('.install-row');
                const newTask = {
                  taskId: recordId, subId, タスク: toKind, 日付: targetDate,
                  現場名: rows[0]?.textContent?.trim() || '',
                  案件種別: rows[1]?.textContent?.split('｜')[0]?.trim() || '',
                  案件ステータス: rows[1]?.textContent?.split('｜')[1]?.trim() || '',
                  回収元現場名: rows[2]?.textContent?.trim() || '',
                  テキストメモ: rows[3]?.textContent?.trim() || '',
                  調整状況: prevStatus, 回・設フラグ: '設'
                };
              
                const newTaskEl = await createTaskBar(newTask, 'install');
                if (!newTaskEl) return;
                newTaskEl.dataset.recordId = recordId;
                newTaskEl.dataset.subId    = subId;
                newTaskEl.dataset.taskKind = toKind;
                newTaskEl.dataset.status   = prevStatus;
                newTaskEl.dataset.date     = targetDate;
              
                taskEl.replaceWith(newTaskEl);
                await splitInstallToRelocateUI({ item: newTaskEl, from: fromTd, to: toTd });
                await saveTaskOrder(toTd);
                if (fromTd !== toTd) await saveTaskOrder(fromTd);

                // // 🚀 移動後にボタン状態を更新
                refreshAllBulkButtons();
                return;
              }

              // // ② 台目 → 台目
              if (isFromSlot && isToSlot) {
                const currentStatus = taskEl.dataset.status || '';
                if (currentStatus === '確定') {
                  const ok = confirm('このタスクを移動するとステータスが「調整中」に戻ります。よろしいですか？');
                  if (!ok) {
                    evt.from.appendChild(taskEl);
                    return;
                  }
                  await applyStatus(taskEl, '調整中', targetDate);
                }

                if (fromTd === toTd) {
                  await saveTaskOrder(toTd);
                  return;
                }

                await updateTaskRecord(recordId, subId, targetDate, taskEl.dataset.status, toKind);
                taskEl.dataset.taskKind = toKind;
                taskEl.dataset.date     = targetDate;
                await saveTaskOrder(toTd);
                if (fromTd !== toTd) await saveTaskOrder(fromTd);

                // // 🚀 移動後にボタン状態を更新
                refreshAllBulkButtons();
                return;
              }

              // // ③ 台目 → 設置予定
              if (isFromSlot && isToPlan) {
                const prevStatus = taskEl.dataset.status || '未受注';
                await mergeRelocateToInstallPlan(evt);

                const siblings = Array.from(toTd.querySelectorAll('.task-bar'));
                siblings.forEach(el => {
                  if (el !== taskEl && el.dataset.recordId === recordId && el.dataset.subId !== subId) {
                    el.remove();
                  }
                });

                const rows = taskEl.querySelectorAll('.install-row');
                const newTask = {
                  taskId: recordId, subId, タスク: '3：設置予定', 日付: targetDate,
                  現場名: rows[0]?.textContent?.trim() || '',
                  案件種別: rows[1]?.textContent?.split('｜')[0]?.trim() || '',
                  案件ステータス: rows[1]?.textContent?.split('｜')[1]?.trim() || '',
                  回収元現場名: rows[2]?.textContent?.trim() || '',
                  テキストメモ: rows[3]?.textContent?.trim() || '',
                  調整状況: prevStatus, 回・設フラグ: '設'
                };

                const newTaskEl = await createTaskBar(newTask, 'install');
                if (!newTaskEl) return;
                newTaskEl.dataset.recordId = recordId;
                newTaskEl.dataset.subId    = subId;
                newTaskEl.dataset.taskKind = '3：設置予定';
                newTaskEl.dataset.status   = prevStatus;
                newTaskEl.dataset.date     = targetDate;

                taskEl.replaceWith(newTaskEl);
                await saveTaskOrder(toTd);
                if (fromTd !== toTd) await saveTaskOrder(fromTd);

                // // 🚀 移動後にボタン状態を更新
                refreshAllBulkButtons();
                return;
              }

              // // ④ その他（現調・プラン・撮影など）
              await handleSortEndDel(evt, year, month);
              await saveTaskOrder(toTd);
              if (fromTd !== toTd) await saveTaskOrder(fromTd);
              
              // // 🚀 移動後にボタン状態を更新
              refreshAllBulkButtons();
              return;

            } catch (err) {
              try { evt.from?.appendChild(taskEl); } catch (_) {}
              alert('// タスク移動の更新に失敗しました。再読み込みしてください。');
              return;
            }
          }
        });
      });

      // // 🚀 【最重要】すべてのSortable設定とタスク描画が終わった後に、ボタン表示を確定させる
      console.log('// 🎯 初期表示のボタンステータスを判定します');
      refreshAllBulkButtons();

      console.log('// ✅ Sortable再設定 完了');
    }, 500);

    /* =========================
       ★ データ依存UIだけここ
    ========================= */
    hookSummaryIntoCalendar();

    setProgress(100);
    hideProgressBar();
    hideLoadingMessage();
  });

  localStorage.setItem('calendarYear', year);
  localStorage.setItem('calendarMonth', month);
}






function getColumnDefById(cellId) {
  return COLUMN_DEFS.find(col => col.id === cellId) || null;
}


function taskKindFromCellId(cellId) {
  const def = COLUMN_DEFS.find(col => col.id === cellId);
  return def ? def.taskKind || '' : '';
}



async function splitInstallToRelocateUI(evt) {
  const parentTaskEl = evt.item;
  const toTd = evt.to?.closest('td');
  if (!parentTaskEl || !toTd) return null;

  const recordId    = parentTaskEl.dataset.recordId;
  const parentSubId = parentTaskEl.dataset.subId;
  const date        = toTd.dataset.date;
  const parentStatus = parentTaskEl.dataset.status || '';

  if (!recordId || !parentSubId || !date) return null;

  /* =========================
     ① 回収元現場名が無い場合は何もしない
     ========================= */
  const collectName =
    parentTaskEl.querySelector('.install-row-3')?.textContent?.trim() || '';
  if (!collectName || collectName === '事務所') return null;

  const targetTaskKind = taskKindFromCellId(toTd.id);
  if (!targetTaskKind) return null;

  /* =========================
     ② 最新レコード取得
     ========================= */
  const resp = await kintone.api(
    kintone.api.url('/k/v1/record', true),
    'GET',
    { app: kintone.app.getId(), id: recordId }
  );

  const rows = resp.record['タスク管理']?.value || [];

  /* =========================
     ③ 既存の回（移設）行があれば作らない
     ========================= */
  const hasRelocate = rows.some(
    r => r.value['回・設フラグ']?.value === '回'
  );
  if (hasRelocate) return null;

  /* =========================
     ④ 親タスクは onEnd 側で更新済みなので
        ここでは触らない
     ========================= */

  /* =========================
     ⑤ 子（回）サブ行 INSERT
     ========================= */
  const todayISO = new Date().toISOString().slice(0, 10);

  const newRow = {
    value: {
      日付:         { value: date },
      更新日:       { value: todayISO },
      調整状況:     { value: parentStatus },
      タスク:       { value: targetTaskKind },
      回・設フラグ: { value: '回' }
    }
  };

  await kintone.api(
    kintone.api.url('/k/v1/record', true),
    'PUT',
    {
      app: kintone.app.getId(),
      id: recordId,
      record: {
        タスク管理: { value: [...rows, newRow] }
      }
    }
  );

  /* =========================
     ⑥ 新 subId 取得
     ========================= */
  const after = await kintone.api(
    kintone.api.url('/k/v1/record', true),
    'GET',
    { app: kintone.app.getId(), id: recordId }
  );

  const newRows = after.record['タスク管理'].value;
  const newSubId = newRows[newRows.length - 1]?.id;
  if (!newSubId) return null;

  /* =========================
     ⑦ UI用データ取得
     ========================= */
  const installRows = parentTaskEl.querySelectorAll('.install-row');
  const genbaName   = installRows[0]?.textContent?.trim() || '';
  const collectFrom = installRows[2]?.textContent?.trim() || genbaName;

  /* =========================
     ⑧ 移設バー生成
     ========================= */
  const relocateTask = {
    taskId: recordId,
    subId: newSubId,
    タスク: targetTaskKind,
    日付: date,
    回収元現場名: collectFrom,
    現場名: genbaName,
    テキストメモ: '',
    調整状況: parentStatus,
    回・設フラグ: '回'
  };

  const relocateBar = await createTaskBar(relocateTask, 'relocate');
  if (!relocateBar) return null;

  relocateBar.dataset.recordId = recordId;
  relocateBar.dataset.subId    = newSubId;
  relocateBar.dataset.taskKind = targetTaskKind;
  relocateBar.dataset.status   = parentStatus;
  relocateBar.dataset.date     = date;

  /* =========================
     ⑨ 親の直前に挿入
     ========================= */
  toTd.insertBefore(relocateBar, parentTaskEl);

  /* =========================
     ⑩ 表示順保存
     ========================= */
  await saveTaskOrder(toTd);

  return relocateBar;
}













function normalizeRecordFormat(record) {
    let normalizedRecord = {};

    // メインフィールドを `.value` 形式に統一
    Object.keys(record).forEach(key => {
        if (record[key] && typeof record[key] === 'object' && 'value' in record[key]) {
            normalizedRecord[key] = record[key];  // すでに `.value` を持っている
        } else if (key === 'タスク管理' && Array.isArray(record[key]?.value)) {
            // サブテーブルの処理
            normalizedRecord[key] = {
                value: record[key].value.map(row => ({
                    id: row.id,  // サブテーブル行ID
                    value: Object.keys(row.value).reduce((acc, fieldKey) => {
                        acc[fieldKey] = row.value[fieldKey];
                        return acc;
                    }, {})
                }))
            };
        } else {
            normalizedRecord[key] = { value: record[key] };  // `.value` を追加
        }
    });

    return normalizedRecord;
}





async function fetchAllRecords(year, month) {
    let allRecords = [];
    let lastRetrievedId = 0;
    const limit = 500;
    let hasMoreRecords = true;

    console.time("⏳ [TIME] 全レコード取得時間");

//    console.log(`📌 [DEBUG] 取得範囲: ${startDate} 〜 ${endDate}`);
    while (hasMoreRecords) {
        // Display inclusion is decided by subtable "日付", so parent-record date filters
        // make overlapping months inconsistent between adjacent 2-month windows.
        const fullQuery = `($id > ${lastRetrievedId}) order by $id asc limit ${limit}`;

        const body = {
            app: kintone.app.getId(),
            query: fullQuery
        };

        try {
            const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', body);

            if (resp.records.length > 0) {
                console.log(`📌 [DEBUG] 取得件数: ${resp.records.length} / 累計: ${allRecords.length + resp.records.length}`);

                allRecords = allRecords.concat(resp.records);
                lastRetrievedId = parseInt(resp.records[resp.records.length - 1]['$id'].value, 10);
            } else {
                hasMoreRecords = false;
            }

            if (allRecords.length >= 10000) {
                console.warn("⚠️ [WARNING] 取得件数が10,000件に達したため取得を停止します。");
                hasMoreRecords = false;
            }
        } catch (error) {
            console.error(`🚨 [ERROR] kintone API 取得失敗: ${error.message}`);
            hasMoreRecords = false;
        }
    }

    console.timeEnd("⏳ [TIME] 全レコード取得時間");
    console.log(`✅ [DEBUG] 取得完了: 総レコード数 ${allRecords.length}, 時刻: ${new Date().toISOString()}`);

    return allRecords;
}


/**
 * 本日の日付までスムーズにスクロール
 */
function scrollToToday() {
  const today = new Date();
  const todayISO = today.toISOString().split('T')[0];

  // 今日の日付に対応する行を探す
  const todayRow = document.querySelector(`tr td[data-date="${todayISO}"]`);

  if (todayRow) {
    todayRow.scrollIntoView({
      behavior: 'smooth',
      block: 'center'
    });

    // 一時的に強調（背景を一瞬点滅）
    todayRow.style.transition = 'background-color 0.6s ease';
    todayRow.style.backgroundColor = '#ffecb3';
    setTimeout(() => {
      todayRow.style.backgroundColor = '';
    }, 1200);
  } else {
    alert('本日の日付がカレンダー内に見つかりませんでした。');
  }
}

/**
 * ページの先頭（カレンダー上部）までスムーズに戻る
 */
function scrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: 'smooth'
  });
}

