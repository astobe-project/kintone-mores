
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

function loadTasks(records, year, month) {
  if (!records || !Array.isArray(records) || records.length === 0) {
    console.error("🚨 [ERROR] records が `undefined` または空です");
    return;
  }
  // 🔹 日付＋表示順で安定ソート
  records.sort((a, b) => {
    const dateA = a['日付']?.value || '';
    const dateB = b['日付']?.value || '';
    if (dateA !== dateB) return dateA.localeCompare(dateB);

    const numA = parseInt(a['表示順']?.value ?? '9999', 10);
    const numB = parseInt(b['表示順']?.value ?? '9999', 10);

    return numA - numB;
  });

  // 🔹 ソート済みデータを追加
  records.forEach(record => {
    addTaskToCalendar(record);
  });
}


/**
 * タスクバー移動後の処理（確定→調整中リセット含む）
 */
async function handleSortEndDel(evt, year, month) {
  console.group("=== 🧩 handleSortEndDel Debug (rollback) ===");
  console.log("evt.item:", evt.item);
  console.log("evt.to:", evt.to);

  const taskElement = evt.item;
  const recordId = taskElement.dataset.recordId;
  const subId = taskElement.dataset.subId;

  if (!recordId || recordId === "undefined" || recordId === "") {
    console.error("🚨 recordId が取得できません:", recordId);
    alert("タスクのレコードIDが見つかりません。再読み込みしてください。");
    return;
  }

  // === data-date 取得（セル直下構造） ===
  const container = evt.to;
  const isoDate = container?.getAttribute('data-date') || null;
  console.log("✅ isoDate:", isoDate);
  if (!isoDate) {
    console.error("🚨 [ERROR] data-date が取得できませんでした");
    console.groupEnd();
    return;
  }

  // === ステータス ===
  const currentStatus = taskElement.dataset.status || '';
  let newStatus = (currentStatus === '未受注') ? '未受注' : '調整中';

  // === 移動先タスク種別 ===
  const taskKindMap = {
    "task-irai": "依頼",
    "task-gencho": "1：現調",
    "task-plan": "2：プラン作成",
    "task-secchi": "3：設置予定",
    "task-limit": "3：回収期限",
    "task-1st": "3：1台目",
    "task-2nd": "3：2台目",
    "task-3rd": "3：3台目",
    "task-4th": "3：4台目",
    "task-5th": "3：5台目",
    "task-satsuei": "4：撮影"
  };
  const newTaskKind = taskKindMap[container.id] || null;
  if (!newTaskKind) {
    console.error("🚨 [ERROR] 不明なコンテナID:", container.id);
    return;
  }

  // === 確定状態の警告 ===
  if (taskElement.classList.contains('task-confirmed')) {
    if (!confirm('このタスクを移動するとステータスが「調整中」に戻ります。よろしいですか？')) {
      evt.from.appendChild(taskElement);
      return;
    }
  }

  // === サブテーブル更新 ===
  await updateTaskRecord(recordId, subId, isoDate, newStatus, newTaskKind);

  // === AppID=1202 から配送業者取得 ===
  try {
    const taskToNum = {
      "3：1台目": "3",
      "3：2台目": "4",
      "3：3台目": "5",
      "3：4台目": "6",
      "3：5台目": "7"
    };
    if (taskToNum[newTaskKind]) {
      const query = `日付 = "${isoDate}" and 配送番号 in ("${taskToNum[newTaskKind]}")`;
      console.log(query);
      const resp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
        app: 1202,
        query,
        fields: ['配送業者']
      });
      if (resp.records.length > 0) {
        const selectedValue = resp.records[0]['配送業者'].value;
        await updateSelfRecord(recordId, subId, selectedValue);
      } else {
        console.warn(`⚠️ 配送番号=${taskToNum[newTaskKind]} のレコードが見つかりませんでした`);
      }
    }
  } catch (e) {
    console.error("🚨 配送業者取得・更新エラー:", e);
  }

  // === ステータス反映 ===
  taskElement.classList.remove('task-nonorderd','task-adjusting','task-confirmed','task-completed');
  if (newStatus === '未受注') taskElement.classList.add('task-nonorderd');
  else if (newStatus === '調整中') taskElement.classList.add('task-adjusting');
  else if (newStatus === '確定') taskElement.classList.add('task-confirmed');
  else if (newStatus === '完了') taskElement.classList.add('task-completed');

  // === ボタン表示更新（共通関数化） ===
  const updateButtonVisual = (button, st, taskKind) => {
    button.className = 'task-status-btn'; // リセット
    let bgColor = '', borderColor = '', label = '';

    if (taskKind === '3：設置予定') {
      if (st === '未受注') { bgColor = '#ffb84d'; borderColor = '#e69500'; label = '受注'; button.style.setProperty('border-color', borderColor, 'important'); }
      else { bgColor = '#ccffcc'; borderColor = '#88cc88'; label = '未受注'; button.style.setProperty('border-color', borderColor, 'important'); }
    } else {
      if (st === '未受注') { bgColor = '#CCFFCC'; borderColor = '#88CC88'; label = '受注'; }
      else if (st === '調整中') { bgColor = '#CCFFCC'; borderColor = '#88CC88'; label = '確定'; }
      else if (st === '確定') { bgColor = '#90CAF9'; borderColor = '#42A5F5'; label = '完了'; }
      else if (st === '完了') { bgColor = '#BDBDBD'; borderColor = '#757575'; label = '戻し'; }
    }

    button.textContent = label;
    button.style.backgroundColor = bgColor;
    button.style.border = `2px solid ${borderColor}`;
    button.style.color = '#333';
    button.style.fontWeight = 'bold';
    button.style.minWidth = '60px';
    button.style.height = '28px';
    button.style.fontSize = '13px';
    button.style.borderRadius = '6px';
    button.style.padding = '3px 6px';
    button.style.boxSizing = 'border-box';
    button.style.transition = 'background-color 0.2s ease, border-color 0.2s ease';

    console.log(`🎨 [updateButtonVisual] ${taskKind} → ${st}`);
  };

  const toggleButton = taskElement.querySelector('button');
  if (toggleButton) {
    updateButtonVisual(toggleButton, newStatus, newTaskKind);
  }

  // === dataset更新 ===
  taskElement.dataset.status = newStatus;
  taskElement.dataset.date = isoDate;

  // === 並び順保存 ===
  await saveTaskOrder(evt.to);
  if (evt.from && evt.from !== evt.to) {
    await saveTaskOrder(evt.from);
  }

  // === 🔁 再描画後の色補正（0.5秒後に再反映） ===
  setTimeout(() => {
    const newBtn = document.querySelector(`.task-bar[data-sub-id="${subId}"] button.task-status-btn`);
    if (newBtn) {
      updateButtonVisual(newBtn, newStatus, newTaskKind);
      console.log(`🎨 [再描画補正] subId=${subId} → ${newStatus}`);
    }
  }, 500);

  console.groupEnd();
}



 
/**
 * タスク種別に応じて対応するカラムIDを返す
 */
function getTaskCellId(taskKind) {
  
  if (taskKind === '3：回収予定') return '';

  // ★ 移設は「設置系の列」に出す（初期表示用）
  if (taskKind === '3：移設') {
    return 'task-secchi'; 
    // ※ 後で insertBefore で親の上に並ぶ
  }
  
  switch (taskKind) {
    case '1：現調':
      return 'task-gencho'; // 現調
    case '2：プラン作成':
      return 'task-plan'; // プラン作成
    case '3：設置予定':
      return 'task-secchi'; // 設置予定
    case '3：回収期限':
      return 'task-limit'; // 回収期限 ← 今回新設
    case '3：1台目':
      return 'task-1st';
    case '3：2台目':
      return 'task-2nd';
    case '3：3台目':
      return 'task-3rd';
    case '3：4台目':
      return 'task-4th';
    case '3：5台目':
      return 'task-5th';
    case '4：撮影':
      return 'task-satsuei';
    default:
      console.warn(`⚠️ 未対応のタスク種別: ${taskKind}`);
      return '';
  }
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

  console.warn(`⚠️ getBarMode: 未分類 ${taskKind}`);
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


  console.log('① addTaskToCalendar called ====================');
  console.log('① record =', record);

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
  console.log('② taskKind before normalize =', taskKind);

  taskKind = normalizeTaskKind(taskKind);
  console.log('② taskKind after normalize =', taskKind);

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
  
  console.log('③ barMode =', barMode);

  // =========================
  // ③ タスクバー生成
  // =========================
  const taskEl = await createTaskBar(record, barMode);
  console.log('④ createTaskBar result =', taskEl);

  if (!taskEl) {
    console.warn('⚠️ createTaskBar が null / undefined', record);
    return;
  }

  // =========================
  // ④ dataset 設定
  // =========================
  const recordId = record['$id']?.value || record['recordId']?.value;
  const subId    = record['subId']?.value;

  console.log('⑤ recordId raw =', record['$id'], record['recordId']);
  console.log('⑤ subId raw =', record['subId']);

  if (recordId) taskEl.dataset.recordId = recordId;
  if (subId)    taskEl.dataset.subId = subId;

  taskEl.dataset.taskKind = taskKind;
  taskEl.dataset.barMode  = barMode;

  console.log('⑤ dataset after set =', taskEl.dataset);

  // =========================
  // ⑤ 配置セル決定
  // =========================
  const cellId = getTaskCellId(taskKind);
  console.log('⑥ cellId =', cellId);

  if (!cellId) {
    console.warn('⚠️ cellId なし（表示対象外）', taskKind);
    return;
  }

  console.log('⑦ 日付 raw =', record['日付']);

  const rawDate = record['日付'];
  
  const date = rawDate
    ? new Date(rawDate).toISOString().split('T')[0]
    : '';


  console.log('⑦ 日付 ISO =', date);

  const selector = `td[data-date="${date}"][id="${cellId}"]`;
  console.log('⑧ selector =', selector);

  const container = document.querySelector(selector);
  console.log('⑧ container =', container);

  if (!container) {
    console.warn('⚠️ 配置先セルが見つかりません', date, cellId);
    return;
  }

  container.appendChild(taskEl);
  console.log('⑨ appended taskEl');

  // =========================
  // ⑥ ツールチップ生成
  // =========================
  const tooltip = document.createElement('div');
  tooltip.className = 'tooltip';
  tooltip.style.zIndex = 10000;

  const caseNumber   = record['案件番号']?.value || '不明';
  const caseType     = record['案件種別']?.value || '不明';
  const customerName = record['得意先名']?.value || '不明';
  const taskNo       = record['表示順']?.value || '';
  const genbaName    = record['現場名']?.value || '';
  const status       = record['調整状況']?.value || '';
  const memo         = record['テキストメモ']?.value || '';
  const biko         = record['備考']?.value || '';

  console.log('⑩ tooltip data =', {
    caseNumber, caseType, customerName, taskNo, genbaName, status, memo, biko
  });

  tooltip.textContent =
    `案件番号：${caseNumber}
案件種別：${caseType}
得意先名：${customerName}
順番：${taskNo}
現場名：${genbaName}
状況：${status}
メモ：${memo}
備考：${biko}`;

  document.body.appendChild(tooltip);

  // =========================
  // ⑦ ツールチップイベント登録
  // =========================
  displaytooltip(taskEl, tooltip);

  console.log('⑪ addTaskToCalendar finished ====================');
}


function buildInstallRightDiv(record) {
  const v = (code, def = '') => record?.[code]?.value ?? def;

  const rightDiv = document.createElement('div');
  rightDiv.className = 'task-right install-right';

  const genbaName      = v('現場名');
  const caseType       = v('案件種別');
  const caseStetus     = v('案件ステータス');
  const collectGenba   = v('移設元現場名'); // 無ければ空でOK
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
  const flag = task['回・設フラグ'];

  // ★ 最優先：回フラグ
  if (flag === '回') {
    return 'relocate';
  }

  // 回収期限
  if (taskKind === '3：回収期限') {
    return 'collect';
  }

  // 設置系（1台目〜5台目・設置予定）
  if (
    taskKind === '3：設置予定' ||
    /^3：([1-5])台目$/.test(taskKind)
  ) {
    return 'install';
  }

  // その他
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

  // ===== 0) record はすでに「正規化済み task」 =====
  const task = record;

  // 念のため最低限チェック
  if (!task || !task.subId) {
    console.warn('⚠️ 不正な taskRecord', task);
    return null;
  }
  // ★ barMode 判定（record そのまま渡す）
//  const barMode = resolveBarMode({ タスク: { value: task.タスク } });
//  const barMode = resolveBarMode({ タスク: task.タスク });
//    const barMode = type;
  const barMode = resolveBarMode(task);



  // ===== 1) taskEl =====
  const taskEl = document.createElement('div');
//  taskEl.className = `task-bar task-type-${type} bar-${barMode}`;
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
        ${escapeHtml(task.案件種別 || '')}｜${escapeHtml(task.案件番号 || '')}
      </div>
      <div class="install-row install-row-3">
        ${escapeHtml(task.回収現場名 || '')}
      </div>
      <div class="install-row install-row-4" contenteditable="true">
        ${escapeHtml(task.テキストメモ || '')}
      </div>
    `;

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
        ${escapeHtml(task.移設元現場名 || '')}
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
async function toggleStatusBtnB2(btn, recordId, subId, currentStatus) {
  try {
    console.log(`🟢 [DEBUG] toggleStatusBtnB2 初期: currentStatus=${currentStatus}`);

    // ✅ 最新ステータスを毎回DOMから取得
    const taskElement = btn.closest('.task-bar');
    let status = taskElement?.dataset.status || currentStatus;
    console.log(`🟢 [DEBUG] 最新 status=${status}`);

    // 🔄 ステータス遷移ロジック
    let newStatus = status;
    if (status === '未受注') {
      newStatus = '調整中';
    } else if (status === '調整中') {
      newStatus = '確定';
    } else if (status === '確定') {
      newStatus = '完了';
    } else if (status === '完了') {
      const ok = confirm('ステータスを「確定」に戻します。よろしいですか？');
      if (!ok) return;
      newStatus = '確定';
    }

    // ✅ 二重クリック防止
    btn.disabled = true;

    // ✅ ボタン見た目即時反映
    const updateButtonVisual = (button, st) => {
      button.className = 'task-status-btn'; // クラス競合を完全リセット

      let bgColor = '', borderColor = '', label = '';
      if (st === '未受注') {
        bgColor = '#CCFFCC'; borderColor = '#88CC88'; label = '受注';
      } else if (st === '調整中') {
        bgColor = '#FFF59D'; borderColor = '#FBC02D'; label = '確定';
      } else if (st === '確定') {
        bgColor = '#90CAF9'; borderColor = '#42A5F5'; label = '完了';
      } else if (st === '完了') {
        bgColor = '#BDBDBD'; borderColor = '#757575'; label = '戻し';
      }

      // 🔹 インラインスタイルで即時反映
      button.textContent = label;
      button.style.backgroundColor = bgColor;
      button.style.border = `2px solid ${borderColor}`;
      button.style.color = '#333';
      button.style.fontWeight = 'bold';
      button.style.display = 'inline-flex';
      button.style.alignItems = 'center';
      button.style.justifyContent = 'center';
      button.style.margin = '0';
      button.style.padding = '0 4px';
      button.style.boxSizing = 'border-box';
      button.style.transition = 'background-color 0.2s ease, border-color 0.2s ease';

      console.log(`🎨 [DEBUG] ボタン色更新: ${st}, bg=${bgColor}`);
    };

    updateButtonVisual(btn, newStatus);

    // ✅ タスクバー自体の見た目も即時反映
    taskElement.dataset.status = newStatus;
    taskElement.classList.remove('task-nonorderd', 'task-adjusting', 'task-confirmed', 'task-completed');

    if (newStatus === '未受注') taskElement.classList.add('task-nonorderd');
    else if (newStatus === '調整中') taskElement.classList.add('task-adjusting');
    else if (newStatus === '確定') taskElement.classList.add('task-confirmed');
    else if (newStatus === '完了') taskElement.classList.add('task-completed');

    // ✅ DB更新（非同期）
    const newDate = taskElement?.dataset.date || '';
    await updateTaskRecord(recordId, subId, newDate, newStatus, '');

    console.log(`✅ [更新完了] subId=${subId} ステータス=${newStatus}`);

    // ✅ 再描画後のボタン再取得と色再適用（0.5秒待機）
    setTimeout(() => {
      const newBtn = document.querySelector(`.task-bar[data-sub-id="${subId}"] button.task-status-btn`);
      if (newBtn) {
        console.log(`🎨 [再適用] subId=${subId} → ${newStatus}`);
        updateButtonVisual(newBtn, newStatus);
      } else {
        console.warn(`⚠️ [再適用失敗] subId=${subId} のボタンが見つかりません`);
      }
    }, 500);

  } catch (error) {
    console.error('🚨 toggleStatusBtnB2 エラー:', error);
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
            app: deliappId,
            query: query,
            fields: ["日付", "配送番号", "配送業者", "メモ", "$id"]
        };

        console.log("📡 [DEBUG] Kintone API へリクエスト送信 (App ID: deliappId)", body);

        kintoneApiWrapper(kintone.api.url('/k/v1/records', true), 'GET', body, (resp) => {
            console.log("✅ [DEBUG] Kintone API (deliappId) 取得成功:", resp);

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
            console.error("🚨 [ERROR] Kintone API (deliappId) 取得失敗:", error.message);
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
                const record = recordsForDate.find(record => parseInt(record["配送番号"].value, 10) === index + 1);
                populateDropdown(cell, record ? record["配送業者"].value : "", record, isoDate, index + 1);
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



// **🚀 配送業者プルダウン＋メモ入力フィールドを生成**
function populateDropdown(cell, existingValue = "", record, date, column) {
    cell.innerHTML = ""; // セルをクリア

    const sharedStyles = `
        height: 32px;
        padding: 4px;
        font-size: 14px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
        display: inline-block;
        vertical-align: top;
    `;

    // **ドロップダウン作成**
    const dropdown = document.createElement('select');
    dropdown.style.cssText = sharedStyles;
    dropdown.style.width = '120px';

    // **初期選択肢「選択してください」を追加**
    const defaultOption = document.createElement('option');
    defaultOption.value = "";  // 空の値をセット
    defaultOption.textContent = "選択してください";
    dropdown.appendChild(defaultOption);

    // **配送業者の選択肢追加（キャッシュから取得）**
    if (deliveryOptionsCache) {
        deliveryOptionsCache.forEach(company => {
            const option = document.createElement('option');
            option.value = company;
            option.textContent = company;
            if (company === existingValue) {
                option.selected = true; // 既存の値があればそれを選択
            }
            dropdown.appendChild(option);
        });
        updateDropdownBackground(dropdown);
    } else {
        console.warn("⚠️ [WARNING] 配送業者リストがキャッシュされていません");
    }

    // **メモ入力フィールド作成**
    const memoInput = document.createElement('input');
    memoInput.style.cssText = sharedStyles;
    memoInput.style.width = '240px';
    memoInput.style.marginRight = '4px';
    memoInput.type = 'text';
    memoInput.placeholder = 'メモを入力';
    memoInput.value = record?.['メモ']?.value || ''; // **メモフィールドの初期値**

    // **メモ入力フィールドがフォーカスを外れたときの処理**
    memoInput.addEventListener('blur', function () {
        const newMemo = memoInput.value;
        if (record) {
            if (newMemo !== (record?.['メモ']?.value || '')) {
                updatePdownRecordMemo(record["$id"].value, dropdown.value, newMemo);
            }
        } else {
            createRecord(deliappId , date, column, "選択してください", newMemo);
        }
    });

    // ** ドロップダウンの選択が変更されたときの処理 **
    dropdown.addEventListener('change', async function () {
        const selectedValue = dropdown.value;
    
        // 「選択してください」が選ばれた場合は空にする
        if (selectedValue === "") {
            updateDropdownBackground(dropdown);
            if (record) {
                await updatePdownRecord(record["$id"].value, "未選択");
            }
            return;
        }
    
        updateDropdownBackground(dropdown);
    
        try {
            if (record) {
                // 🚚 1202アプリの更新
                await updatePdownRecord(record["$id"].value, selectedValue);
            } else {
                // 🚚 新規レコード作成
                await createRecord(deliappId, date, column, selectedValue, "");
            }
    
            // ✅ 自レコードに配送業者を反映
            // bar(Task)側を探して更新する
            const taskToNum = {
                1: "3：1台目",
                2: "3：2台目",
                3: "3：3台目",
                4: "3：4台目",
                5: "3：5台目"
            };
    
            const taskKind = taskToNum[column];
            if (taskKind) {
                // 対象日のタスクバーをDOMから探す
                const taskBars = document.querySelectorAll(`.task-bar[data-date="${date}"]`);
                taskBars.forEach(async taskElement => {
                    const recordId = taskElement.dataset.recordId;
                    const subId = taskElement.dataset.subId;
                    // サブレコード更新
                    await updateSelfRecord(recordId, subId, selectedValue);
                });
            }
        } catch (err) {
            console.error("🚨 プルダウン変更処理に失敗:", err);
        }
    });


    // **セルにドロップダウンとメモ入力フィールドを追加**
    cell.appendChild(dropdown);
    cell.appendChild(memoInput);
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
        app: deliappId,
        id: recordId,
        record: {
            "配送業者": { "value": selectedValue }
        }
    };

    kintoneApiWrapper(kintone.api.url('/k/v1/record.json', true), 'PUT', updateBody, () => {
        alert(`更新しました: ${selectedValue}`);
    }, (error) => {
        console.error('更新に失敗しました:', error);
        alert(`更新に失敗しました: ${error.message}`);
    });
}

function updatePdownRecordMemo(taskId, selectedValue, memoValue) {
    const updateBody = {
        app:deliappId,
        id: taskId,
        record: {
            "タスク": { "value": selectedValue },
            "メモ": { "value": memoValue }
        }
    };

    kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', updateBody, function (resp) {
        alert(`更新しました: ${memoValue}`);
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
          <th class="task">1：現調</th>
          <th class="task">2：プラン作成</th>
          <th class="task">3：設置予定</th>
          <th class="task">3：回収期限</th>
          <th class="task">3：1台目</th>
          <th class="task">3：2台目</th>
          <th class="task">3：3台目</th>
          <th class="task">3：4台目</th>
          <th class="task">3：5台目</th>
          <th class="task">4：撮影</th>
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

    calendarHtml += `
      <tr>
        <td class="dateindex">${dayLabel}</td>
        <td data-date="${isoDate}" class="calendar-cell" id="task-gencho"></td>
        <td data-date="${isoDate}" class="calendar-cell" id="task-plan"></td>
        <td data-date="${isoDate}" class="calendar-cell" id="task-secchi"></td>
        <td data-date="${isoDate}" class="calendar-cell" id="task-limit"></td>
        <td data-date="${isoDate}" class="calendar-cell" id="task-1st"></td>
        <td data-date="${isoDate}" class="calendar-cell" id="task-2nd"></td>
        <td data-date="${isoDate}" class="calendar-cell" id="task-3rd"></td>
        <td data-date="${isoDate}" class="calendar-cell" id="task-4th"></td>
        <td data-date="${isoDate}" class="calendar-cell" id="task-5th"></td>
        <td data-date="${isoDate}" class="calendar-cell" id="task-satsuei"></td>
      </tr>
    `;
  }

  calendarHtml += `</tbody></table>`;
  document.getElementById(containerId).innerHTML = calendarHtml;

  // ✅ --- 列トグル機能設定 ---
  function getColIndexByLabel(label) {
    const ths = document.querySelectorAll(`#${containerId} thead th`);
    for (let i = 0; i < ths.length; i++) {
      const text = ths[i].textContent.replace(/\s+/g, '').trim();
      if (text === label.replace(/\s+/g, '').trim()) return i + 1;
    }
    return null;
  }

  function setColumnVisibleByLabel(label, visible) {
    const table = document.querySelector(`#${containerId} .calendar-table2`);
    if (!table) return;
    const colIndex = getColIndexByLabel(label);
    if (!colIndex) return;

    const displayValue = visible ? 'table-cell' : 'none';
    const headerCell = table.querySelector(`thead th:nth-child(${colIndex})`);
    const bodyCells = table.querySelectorAll(`tbody td:nth-child(${colIndex})`);

    headerCell.style.display = displayValue;
    bodyCells.forEach(td => (td.style.display = displayValue));
  }

  // ✅ ボタン見た目更新関数（「3：」除去＋スタイル切替）
  function updateToggleButtonStyle(btn, label, isVisible) {
    if (!btn) return;
    const cleanLabel = label.replace(/^3：/, '').trim(); // ← 「3：」削除
    if (isVisible) {
      btn.textContent = `${cleanLabel} 非表示`;
      btn.classList.remove('inactive');
      btn.classList.add('active');
    } else {
      btn.textContent = `${cleanLabel} 表示`;
      btn.classList.remove('active');
      btn.classList.add('inactive');
    }
  }

  // ✅ トグル処理本体
  function toggleColumnByLabel(label, btnId) {
    const table = document.querySelector(`#${containerId} .calendar-table2`);
    if (!table) return;
    const colIndex = getColIndexByLabel(label);
    if (!colIndex) return;

    const headerCell = table.querySelector(`thead th:nth-child(${colIndex})`);
    const bodyCells = table.querySelectorAll(`tbody td:nth-child(${colIndex})`);
    const isHidden = getComputedStyle(headerCell).display === 'none';
    const newDisplay = isHidden ? 'table-cell' : 'none';

    headerCell.style.display = newDisplay;
    bodyCells.forEach(td => (td.style.display = newDisplay));

    const btn = document.getElementById(btnId);
    updateToggleButtonStyle(btn, label, isHidden); // ← 状態更新をここに集約
  }

  // ✅ ボタン参照を先に取得
  const btn4 = document.getElementById('toggle-4th');
  const btn5 = document.getElementById('toggle-5th');

  // ✅ 初期状態：非表示＋ボタン反映
  setColumnVisibleByLabel('3：4台目', false);
  setColumnVisibleByLabel('3：5台目', false);
  updateToggleButtonStyle(btn4, '3：4台目', false);
  updateToggleButtonStyle(btn5, '3：5台目', false);

  // ✅ ボタンイベント登録
  btn4?.addEventListener('click', () => toggleColumnByLabel('3：4台目', 'toggle-4th'));
  btn5?.addEventListener('click', () => toggleColumnByLabel('3：5台目', 'toggle-5th'));

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



// 初期非表示に合わせてトグルボタンの表示をそろえる
function initHiddenColumnState(containerId) {
  const btn4 = document.getElementById('toggle-4th');
  const btn5 = document.getElementById('toggle-5th');

  // 「4台目」列がCSSで非表示になっているかを確認（thのdisplayをみる）
  const th4 = document.querySelector(`#${containerId} .calendar-table2 thead th:nth-child(10)`);
  const th5 = document.querySelector(`#${containerId} .calendar-table2 thead th:nth-child(11)`);

  if (th4 && getComputedStyle(th4).display === 'none' && btn4) {
    btn4.textContent = '4台目 表示';
    btn4.classList.add('active');
  }
  if (th5 && getComputedStyle(th5).display === 'none' && btn5) {
    btn5.textContent = '5台目 表示';
    btn5.classList.add('active');
  }
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
        let year = parseInt(localStorage.getItem('calendarYear'), 10) || date.getFullYear();
        let month = parseInt(localStorage.getItem('calendarMonth'), 10) || date.getMonth();

        // 🔸 アプリロード時に1回だけ実行
        await initApp();


        await updateCalendarDel(year, month);

        document.getElementById('prev-month').addEventListener('click', async () => {
            month = (month - 1 + 12) % 12;
            if (month === 11) year--;
            await updateCalendarDel(year, month);
         });

        document.getElementById('now-month').addEventListener('click', async () => {
            const today = new Date();
            year = today.getFullYear();
            month = today.getMonth();
            await updateCalendarDel(year, month);
        });

        document.getElementById('next-month').addEventListener('click', async () => {
            month = (month + 1) % 12;
            if (month === 0) year++;
            await updateCalendarDel(year, month);
        });
        
        document.getElementById('reload-page').addEventListener('click', async () => {
            location.reload();
        });
        document.getElementById('scroll-today').addEventListener('click', () => {
          scrollToToday();
        });
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
  const recordId = evt.item.dataset.recordId;

  // レコード取得
  const resp = await kintone.api(
    kintone.api.url('/k/v1/record', true),
    'GET',
    { app: kintone.app.getId(), id: recordId }
  );

  const rows = resp.record['タスク管理']?.value || [];

  // 回・設フラグ = 回 をすべて削除
  const newRows = rows.filter(row =>
    row.value['回・設フラグ']?.value !== '回'
  );

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

  console.log('🧩 移設タスクをすべて統合削除');
}




async function updateCalendarDel(year, month) {
  showLoadingMessage();
  showProgressBar();

  // ===== カレンダー生成 =====
  generateCalendar(year, month, 'calendar', kintone.app.getId());
  document.getElementById('current-month').textContent = `${year}年 ${month + 1}月`;
  updateCurrentMonth(year, month);

  // ===== レコード取得 =====
  setProgress(10);
  const allRecords = await fetchAllRecords(year, month);
  setProgress(50);
  if (!allRecords || allRecords.length === 0) {
    hideProgressBar();
    hideLoadingMessage();
    return;
  }

  // ===== サブテーブルからタスク抽出 =====
  const allTasks = fetchTasksFromSubTable(allRecords);
  setProgress(65);

  // ===== カレンダーにデータ適用 =====
  fetchAndPopulateCells(year, month, 'calendar', async () => {
    setProgress(80);
    console.time("⏳ [TIME] loadTasks");
    loadTasks(allTasks, year, month);
    console.timeEnd("⏳ [TIME] loadTasks");

    // ===== Sortable 再設定 =====
    setTimeout(() => {
      console.log('🛠️ Sortable再設定開始');
    
      // --- 既存Sortableを破棄（再初期化前にクリーンアップ） ---
      document.querySelectorAll('#calendar .calendar-cell').forEach(container => {
        if (container._sortable) {
          container._sortable.destroy();
          delete container._sortable;
        }
      });
    
      // --- 各セルにSortableを再設定 ---
      const containers = document.querySelectorAll('#calendar .calendar-cell');
      console.log(`📦 Sortable設定対象セル数: ${containers.length}`);
    
      containers.forEach(container => {
        const tdId = container.id;
        let groupName = 'delivery-group';
        if (['task-secchi'].includes(tdId)) {
          groupName = tdId;
        }
    
        const sortableInstance = new Sortable(container, {
          group: {
            name: groupName,
            pull: true,   // 他セルから持ち出し可
            put: true     // 他セルに持ち込み可
          },
          animation: 150,
          draggable: '.task-bar',
          filter: '.task-completed',
        
onMove: evt => {
  const fromTd = evt.from.closest('td');
  const toTd   = evt.to.closest('td');
  if (!fromTd || !toTd) return true;

  const fromId = fromTd.id;
  const toId   = toTd.id;

  const isInstallSlot = id =>
    /^task-(1st|2nd|3rd|4th|5th)$/.test(id);

  /* =========================
     回収期限：物理的制限
     ========================= */
  if (fromId === 'task-limit' || toId === 'task-limit') {
    // 日付変更（同一セル内）だけ許可
    return fromId === toId;
  }

  /* =========================
     設置系（3系）
     ========================= */
  const isInstallGroup = id =>
    id === 'task-secchi' || isInstallSlot(id);

  if (isInstallGroup(fromId) && isInstallGroup(toId)) {
    return true; // 設置予定 ↔ 台目 ↔ 台目 OK
  }

  /* =========================
     工程固定系（現調・プラン・撮影）
     ========================= */
  const fixedTasks = [
    'task-gencho',
    'task-plan',
    'task-satsuei'
  ];

  if (fixedTasks.includes(fromId)) {
    return fromId === toId; // 同一工程内の日付変更のみ
  }

  /* =========================
     その他はすべて禁止
     ========================= */
  return false;
},

        
onEnd: async evt => {
  const taskEl = evt.item;
  const fromTd = evt.from.closest('td');
  const toTd   = evt.to.closest('td');
  if (!fromTd || !toTd) return;

  const beforeTaskKind = taskEl.dataset.taskKind;
  const recordId = taskEl.dataset.recordId;

  const fromId = fromTd.id;
  const toId   = toTd.id;

  const fromInstallSlot = /^task-(1st|2nd|3rd|4th|5th)$/.test(fromId);
  const toInstallSlot   = /^task-(1st|2nd|3rd|4th|5th)$/.test(toId);
  const isToInstallPlan = (toId === 'task-secchi');

  // この案件にすでに移設バーが存在するか（DOM）
  const hasRelocateChild = !!document.querySelector(
    `.task-bar.bar-relocate[data-record-id="${recordId}"]`
  );

  // =========================
  // ① 基本更新（日付・タスク・ステータス）
  //    ※ 表示順はまだ触らない
  // =========================
  await handleSortEndDel(evt, year, month, { skipOrder: true });

  // =========================
  // ② 分裂：設置予定 → X台目（初回のみ）
  // =========================

  if (
    beforeTaskKind === '3：設置予定' &&
    toInstallSlot &&
    !hasRelocateChild
  ) {
    // ★ 移設先現場名チェック
    const installRows = taskEl.querySelectorAll('.install-row');
    const installGenbaName = installRows[2]?.textContent?.trim() || '';
  
    if (!installGenbaName) {
      console.log('⏭ 移設先現場名なし → 分裂スキップ');
    } else {
      const relocateBar = await splitInstallToRelocateUI(evt);
      if (relocateBar) {
        toTd.insertBefore(relocateBar, taskEl);
      }
    }
  }


  // =========================
  // ③ 台目 → 台目（移動）
  //    ・旧台目の子を消す
  //    ・DBの旧「回」行を削除
  //    ・移動先用に新しく子を作る
  // =========================
  else if (
    fromInstallSlot &&
    toInstallSlot &&
    fromId !== toId
  ) {
    const fromTaskKind = taskKindFromCellId(fromId);

    // ① DOM：移動元の移設バーを削除
    const oldChildren = document.querySelectorAll(
      `.task-bar.bar-relocate[data-record-id="${recordId}"][data-task-kind="${fromTaskKind}"]`
    );
    oldChildren.forEach(bar => bar.remove());

    // ② DB：移動元の「回」行を削除
    await deleteRelocateRow({
      recordId,
      taskKind: fromTaskKind
    });

    // ③ 移動先用の移設バーを新規作成
    const relocateBar = await splitInstallToRelocateUI(evt);
    if (relocateBar) {
      toTd.insertBefore(relocateBar, taskEl);
    }
  }

  // =========================
  // ④ 台目 → 設置予定（統合）
  //    ※ ここだけ割り切ってリロード
  // =========================
  else if (
    fromInstallSlot &&
    isToInstallPlan
  ) {
    await mergeRelocateToInstallPlan(evt);

    console.log('🔄 台目 → 設置予定：完全リロード');
    location.reload();
    return;
  }

  // =========================
  // ⑤ 表示順を確定
  // =========================
  await saveTaskOrder(toTd);
  if (fromTd !== toTd) {
    await saveTaskOrder(fromTd);
  }
},










        
          disabled: container.id === 'task-limit' // 「回収期限」はドラッグ禁止
        });

    
        container._sortable = sortableInstance;
      });
    
      // --- すべてのセルで「表示順」に基づき初期整列 ---
//      document.querySelectorAll('#calendar .calendar-cell').forEach(container => {
//        sortTasksInCell(container);
//      });
    
      console.log('✅ Sortable再設定＋表示順整列 完了');
    }, 500);


    // ===== 完了処理 =====
    setProgress(100);
    hideProgressBar();
    hideLoadingMessage();
  });

  // ===== 年月を保存 =====
  localStorage.setItem('calendarYear', year);
  localStorage.setItem('calendarMonth', month);
}

function taskKindFromCellId(cellId) {
  switch (cellId) {
    case 'task-gencho':  return '1：現調';
    case 'task-plan':    return '2：プラン作成';
    case 'task-secchi':  return '3：設置予定';
    case 'task-limit':   return '3：回収期限';
    case 'task-1st':     return '3：1台目';
    case 'task-2nd':     return '3：2台目';
    case 'task-3rd':     return '3：3台目';
    case 'task-4th':     return '3：4台目';
    case 'task-5th':     return '3：5台目';
    case 'task-satsuei': return '4：撮影';
    default:
      console.warn('⚠️ 未対応セルID:', cellId);
      return '';
  }
}


async function splitInstallToRelocateUI(evt) {
  console.log('🧩 splitInstallToRelocateUI called');

  const parentTaskEl = evt.item;
  const targetTd = evt.to.closest('td');
  if (!targetTd) return null;

  const recordId = parentTaskEl.dataset.recordId;
  const date = targetTd.dataset.date;
  const parentStatus = parentTaskEl.dataset.status || '';

  const targetTaskKind = taskKindFromCellId(targetTd.id);
  if (!targetTaskKind) {
    console.warn('❌ 移動先からタスク種別を特定できません', targetTd.id);
    return null;
  }

  /* ============================
     ① 親バーから表示用情報を取得
     ============================ */
  const installRows = parentTaskEl.querySelectorAll('.install-row');
  const genbaName = installRows[0]?.textContent?.trim() || '';
  const installGenbaName = installRows[2]?.textContent?.trim() || '';

  /* ============================
     ② レコード取得（最新）
     ============================ */
  let recordResp;
  try {
    recordResp = await kintone.api(
      kintone.api.url('/k/v1/record', true),
      'GET',
      { app: kintone.app.getId(), id: recordId }
    );
  } catch (e) {
    console.error('❌ レコード取得失敗', e);
    return null;
  }

  const subTableCode = 'タスク管理';
  const currentRows = recordResp.record[subTableCode]?.value || [];

  /* ============================
     ③ 追加するサブテーブル行
     ============================ */
  const todayISO = new Date().toISOString().slice(0, 10);

  const newRow = {
    value: {
      日付:        { value: date },
      更新日:      { value: todayISO },
      調整状況:    { value: parentStatus },
      タスク:      { value: targetTaskKind }, // 例：3：1台目
      回・設フラグ:{ value: '回' }
      // 表示順はここでは入れない（後でDOM基準で振る）
    }
  };

  /* ============================
     ④ サブテーブル保存（INSERT）
     ============================ */
  try {
    await kintone.api(
      kintone.api.url('/k/v1/record', true),
      'PUT',
      {
        app: kintone.app.getId(),
        id: recordId,
        record: {
          [subTableCode]: { value: [...currentRows, newRow] }
        }
      }
    );
    console.log('✅ 移設タスクをサブテーブルに追加保存');
  } catch (e) {
    console.error('❌ 移設タスク保存失敗', e);
    return null;
  }

  /* ============================
     ⑤ 保存後に「正式 subId」を取得
     ============================ */
  let newSubId;
  try {
    const afterResp = await kintone.api(
      kintone.api.url('/k/v1/record', true),
      'GET',
      { app: kintone.app.getId(), id: recordId }
    );

    const rows = afterResp.record[subTableCode].value;
    newSubId = rows[rows.length - 1]?.id;
  } catch (e) {
    console.error('❌ subId 再取得失敗', e);
    return null;
  }

  if (!newSubId) {
    console.error('❌ 新規 subId が取得できません');
    return null;
  }

  /* ============================
     ⑥ UI用 移設バー生成
     ============================ */
  const relocateTask = {
    taskId: recordId,
    subId: newSubId,
    タスク: targetTaskKind,
    日付: date,

    // UI表示専用
    移設元現場名: installGenbaName || genbaName,
    現場名: genbaName,
    テキストメモ: '',
    調整状況: parentStatus,
    回・設フラグ: '回'
  };

  const relocateBar = await createTaskBar(relocateTask, 'relocate');
  if (!relocateBar) return null;

  // 念のため dataset を再セット
  relocateBar.dataset.recordId = recordId;
  relocateBar.dataset.subId = newSubId;
  relocateBar.dataset.taskKind = targetTaskKind;
  relocateBar.dataset.status = parentStatus;
  relocateBar.dataset.date = date;

  // 親の直前に表示（UI）
  targetTd.insertBefore(relocateBar, parentTaskEl);

  /* ============================
     ⑦ 表示順をDOM基準で再採番
     ============================ */
  await saveTaskOrder(targetTd);

  if (evt.from && evt.from !== targetTd) {
    await saveTaskOrder(evt.from);
  }

  console.log('🧩 移設バーUI表示＋DB Insert＋表示順確定 完了');
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
    const startDate = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    const endDate = new Date(year, month + 2, 0).toISOString().split('T')[0];

    let lastRetrievedId = 0;
    const limit = 500;
    let hasMoreRecords = true;

    console.time("⏳ [TIME] 全レコード取得時間");

//    console.log(`📌 [DEBUG] 取得範囲: ${startDate} 〜 ${endDate}`);
    while (hasMoreRecords) {
        const fullQuery = `($id > ${lastRetrievedId}) and ((案件登録日付 >= "${startDate}" and 案件登録日付 <= "${endDate}") or (撮影日付 >= "${startDate}" and 撮影日付 <= "${endDate}")) order by $id asc limit ${limit}`;

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

