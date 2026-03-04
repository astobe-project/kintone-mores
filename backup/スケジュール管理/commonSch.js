const deliappId = 1202;

let taskGOptionsCache = null;  // タスクGの選択肢キャッシュ
let deliveryOptionsCache = null; // 配送業者の選択肢キャッシュ
let assignedOptionsCache = null; // 担当者の選択肢キャッシュ

// 全角スペースで右側パディング（表示用・超過分は切り捨て）
const ZEN_SPACE = '\u3000';
function padZenRight(str, len) {
  const s = String(str ?? '');
  return s.length >= len ? s.slice(0, len) : s + ZEN_SPACE.repeat(len - s.length);
}



function updateTaskRecord(recordId, subId, newDate, newStatus, newTaskKind) {
    console.log(`📡 [DEBUG] updateTaskRecord 実行: recordId=${recordId}, subId=${subId}, newDate=${newDate}, newStatus=${newStatus}, newTaskKind=${newTaskKind}`);

    return new Promise((resolve, reject) => {
        // まず、現在のレコードを取得
        kintone.api(kintone.api.url('/k/v1/record', true), 'GET', { app: kintone.app.getId(), id: recordId }, function(resp) {
            let updatedSubTable = [];

            if (resp.record["タスク管理"] && resp.record["タスク管理"].value) {
                updatedSubTable = resp.record["タスク管理"].value.map(row => {
                    if (row.id === subId) {
                        return {
                            id: row.id,
                            value: {
                                "日付": { value: newDate },
                                "調整状況": { value: newStatus },
                                "タスク": { value: newTaskKind }
                            }
                        };
                    } else {
                        return row;
                    }
                });
            }

            const updateBody = {
                app: kintone.app.getId(),
                id: recordId,
                record: {
                    "タスク管理": { value: updatedSubTable }
                }
            };

            // レコードを更新
            kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', updateBody, function(updateResp) {
                console.log(`✅ [DEBUG] サブテーブルのタスク更新成功:`, updateResp);
                resolve(updateResp);
            }, function(error) {
                console.error(`🚨 [ERROR] サブテーブルのタスク更新失敗:`, error);
                alert("タスクの更新に失敗しました");
                reject(error);
            });

        }, function(error) {
            console.error(`🚨 [ERROR] レコード取得失敗:`, error);
            alert("レコード情報の取得に失敗しました");
            reject(error);
        });
    });
}



function updateTaskRecords(updates) {
    var body = {
        app: kintone.app.getId(),
        records: updates
    };
    kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', body, function(resp) {
        console.log('Records updated successfully');
    }, function(error) {
        console.error('Error updating records:', error);
    });
}

async function updateTaskRecordsSafely(updates) {
    const appId = kintone.app.getId();

    for (const update of updates) {
        try {
            // レコード全体を取得
            const recordResp = await kintone.api(kintone.api.url('/k/v1/record', true), 'GET', {
                app: appId,
                id: update.recordId
            });
            const subTableField = "タスク管理";
            const subTable = recordResp.record[subTableField].value;

            // 該当subIdの行だけ書き換え
            const updatedSubTable = subTable.map(row => {
                if (row.id === update.subId) {
                    Object.keys(update.fieldUpdates).forEach(key => {
                        row.value[key].value = update.fieldUpdates[key];
                    });
                }
                return row;
            });

            const putBody = {
                app: appId,
                id: update.recordId,
                record: {
                    [subTableField]: {
                        value: updatedSubTable
                    }
                }
            };

            await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', putBody);
            console.log(`✅ RecordID=${update.recordId} / SubID=${update.subId} の表示順を更新しました`);

        } catch (error) {
            console.error(`🚨 RecordID=${update.recordId} / SubID=${update.subId} の更新に失敗`, error);
        }
    }
}




async function saveTaskOrder(container) {
  const td = container.closest('td');
  if (!td) return;

  const date = td.dataset.date;
  const taskKind = td.id;

  // ✅ DOM順で取得（ここが最重要）
  const bars = Array.from(
    td.querySelectorAll('.task-bar')
  );

  const updates = [];

  bars.forEach((taskEl, index) => {
    const recordId = taskEl.dataset.recordId;
    const subId = taskEl.dataset.subId;
    const newOrder = index + 1;

    if (!recordId || !subId) return;

    taskEl.dataset.order = newOrder;

    updates.push({
      recordId,
      subId,
      fieldUpdates: {
        表示順: newOrder
      }
    });
  });

  console.log(
    `🧮 厳密採番: 日付=${date}, 列=${taskKind}, 件数=${updates.length}`
  );

  if (updates.length > 0) {
    await updateTaskRecordsSafely(updates);
  }
}



function reorderDomByOrder(container) {
  const bars = Array.from(container.querySelectorAll('.task-bar'));

  bars.sort((a, b) => {
    const aOrder = parseInt(a.dataset.order || 9999, 10);
    const bOrder = parseInt(b.dataset.order || 9999, 10);
    return aOrder - bOrder;
  });

  bars.forEach(bar => container.appendChild(bar));
}




 
 
 
function convertSymbolToNumber(symbol) {
    const baseCode = 0x2460; // ①のUnicode
    return symbol.charCodeAt(0) - baseCode + 1; // 数値に変換
}

function convertNumberToSymbol(number) {
    if (number >= 1 && number <= 20) {
        return String.fromCharCode(0x2460 + number - 1); // 丸付き数字を生成
    }
    return ''; // 範囲外の場合は空文字
}
function adjustTooltipPosition(tooltip, taskElement) {
    const taskRect = taskElement.getBoundingClientRect();
    const OFFSET_X = 15; // 横方向の余白
    const OFFSET_Y = 0;  // 上下方向の余白（必要なら調整）

    // タスクバーの右側に表示
    let top = taskRect.top + window.scrollY + OFFSET_Y;
    let left = taskRect.right + window.scrollX + OFFSET_X;

    // 画面右端にはみ出した場合 → 左側に表示
    if (left + tooltip.offsetWidth > window.scrollX + window.innerWidth) {
        left = taskRect.left + window.scrollX - tooltip.offsetWidth - OFFSET_X;
    }

    tooltip.style.position = 'absolute';
    tooltip.style.top = `${top}px`;
    tooltip.style.left = `${left}px`;
}




function updateCurrentMonth(year, month ) {
    var monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    document.getElementById('current-month').textContent = year + "年 " + monthNames[month];
}

// Utility Functions
function kintoneApiWrapper(url, method, body, successCallback, errorCallback) {
    kintone.api(url, method, body, successCallback, errorCallback);
}

 
 /**
 * Kintoneの担当者フィールドを更新
 */
function updateTaskRecord(recordId, subId, newDate, newStatus, newTaskKind) {
  console.log(`📡 [DEBUG] updateTaskRecord 実行: recordId=${recordId}, subId=${subId}, newDate=${newDate}, newStatus=${newStatus}, newTaskKind=${newTaskKind}`);

  return new Promise((resolve, reject) => {
    // まず、現在のレコードを取得
    kintone.api(kintone.api.url('/k/v1/record', true), 'GET', { app: kintone.app.getId(), id: recordId }, function(resp) {

      if (!resp.record["タスク管理"] || !resp.record["タスク管理"].value) {
        console.error("🚨 サブテーブルが存在しません");
        return reject("サブテーブルが存在しません");
      }

      // --- サブテーブル更新 ---
      const updatedSubTable = resp.record["タスク管理"].value.map(row => {
        if (row.id === subId) {
          console.log(`🧩 [DEBUG] 対象行更新: subId=${subId}`);

          // 既存行の値をすべて保持しつつ必要部分だけ更新
          const currentValue = row.value;
          return {
            id: row.id,
            value: {
              ...currentValue,
              "日付": { value: newDate || currentValue["日付"].value },
              "調整状況": { value: newStatus || currentValue["調整状況"].value },
              "タスク": { value: newTaskKind || currentValue["タスク"].value }
            }
          };
        }
        return row;
      });

      // --- PUT実行 ---
      const updateBody = {
        app: kintone.app.getId(),
        id: recordId,
        record: {
          "タスク管理": { value: updatedSubTable }
        }
      };

      kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', updateBody, function(updateResp) {
        console.log(`✅ [更新完了] サブテーブル更新成功:`, updateResp);
        resolve(updateResp);
      }, function(error) {
        console.error(`🚨 [ERROR] サブテーブル更新失敗:`, error);
        reject(error);
      });

    }, function(error) {
      console.error(`🚨 [ERROR] レコード取得失敗:`, error);
      reject(error);
    });
  });
}



 

function updateselectedGroup(taskId, subId, newselectedGroup, dropdown) {

    // レコード全体を取得して、サブテーブルをまるごと更新
    kintone.api(kintone.api.url('/k/v1/record', true), 'GET', {
        app: kintone.app.getId(),
        id: taskId
    }, function(resp) {
        let updatedSubTable = [];

        if (resp.record["タスク管理"] && resp.record["タスク管理"].value) {
            updatedSubTable = resp.record["タスク管理"].value.map(row => {
                if (row.id === subId) {
                    // 🎯 該当行のタスクGを更新
                    return {
                        id: row.id,
                        value: {
                            ...row.value,
                            "タスクG": { value: newselectedGroup }
                        }
                    };
                } else {
                    return row;
                }
            });
        }

        const updateBody = {
            app: kintone.app.getId(),
            id: taskId,
            record: {
                "タスク管理": {
                    value: updatedSubTable
                }
            }
        };

        kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', updateBody, function(updateResp) {
            console.log('✅ タスクG を更新しました:', newselectedGroup);
            dropdown.value = newselectedGroup;
        }, function(error) {
            console.error('🚨 タスクG 更新失敗:', error);
            alert("タスクGの保存に失敗しました");
        });
    }, function(error) {
        console.error("🚨 レコード取得失敗:", error);
        alert("レコードの取得に失敗しました");
    });
}


function updateTaskStatusInKintone(taskId, newStatus, callback) {
    var updateBody = {
        app: kintone.app.getId(), // KintoneアプリのID
        id: taskId, // 更新するレコードID
        record: {
            "調整状況": { "value": newStatus }
        }
    };

    kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', updateBody, function (resp) {
        callback(null, resp);
    }, function (error) {
        callback(error, null);
    });
}


// 更新ボタンを作成し、ツールバーに追加
function createRefreshButton() {
    var toolbar = document.querySelector('.calendar-container-header'); // ツールバーを取得

    if (!toolbar) {
        console.error("🚨 [ERROR] ツールバーが見つかりませんでした");
        return;
    }

    // 既にボタンがある場合は追加しない
    if (document.getElementById('refresh-button')) {
        return;
    }

    // 更新ボタンを作成
    var refreshButton = document.createElement('button');
    refreshButton.id = "refresh-button";
    refreshButton.textContent = "更新";
    refreshButton.style.cssText = `
        font-size: 20px;
        padding: 10px 20px;
        border: none;
        border-radius: 10px;
        margin-top: 20px;
        margin-left: 5px;
        margin-right: 20px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        background-color: #28a745; /* ✅ グリーンに変更 */
        color: white;
        cursor: pointer;
    `;

    // ホバー時のエフェクト
    refreshButton.addEventListener('mouseover', function() {
        refreshButton.style.backgroundColor = "#218838"; // 濃いグリーン
    });

    refreshButton.addEventListener('mouseout', function() {
        refreshButton.style.backgroundColor = "#28a745"; // 元の色
    });

    // ボタンクリックでリロード
    refreshButton.addEventListener('click', function() {
        window.location.reload();
    });

    // ツールバーにボタンを追加
    toolbar.appendChild(refreshButton);
}

function formatDateToLocalISO(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

//
// 進捗バー
//
function showProgressBar() {
    let bar = document.getElementById('progress-bar-container');
    if (!bar) {
        bar = document.createElement('div');
        bar.id = 'progress-bar-container';
        bar.style.position = 'fixed';
        bar.style.top = '0';
        bar.style.left = '0';
        bar.style.width = '100%';
        bar.style.height = '6px';
        bar.style.zIndex = '9999';
        bar.style.backgroundColor = '#f0f0f0';

        const progress = document.createElement('div');
        progress.id = 'progress-bar';
        progress.style.height = '100%';
        progress.style.width = '0%';
        progress.style.backgroundColor = '#FFA500'; // オレンジ色
        progress.style.transition = 'width 0.3s ease';

        bar.appendChild(progress);
        document.body.appendChild(bar);
    }
}

function setProgress(percent) {
    const progress = document.getElementById('progress-bar');
    if (progress) {
        progress.style.width = percent + '%';
    }
}

function hideProgressBar() {
    const bar = document.getElementById('progress-bar-container');
    if (bar) {
        bar.remove();
    }
}


function showLoadingMessage() {
    const msg = document.getElementById('loading-message');
    if (msg) msg.style.display = 'block';
}

function hideLoadingMessage() {
    const msg = document.getElementById('loading-message');
    if (msg) msg.style.display = 'none';
}

// サブテーブルのタスク情報を展開する関数
function fetchTasksFromSubTable(records) {
  const allTasks = [];

  records.forEach(record => {

    // =========================
    // ★ 案件フィルタ（超前段）
    // =========================

    const table = record['タスク管理']?.value;
    if (!Array.isArray(table) || table.length === 0) return;

    // =========================
    // ★ サブテーブルを「表示順」で厳密ソート
    // =========================
    const sortedTable = [...table].sort((a, b) => {
      const orderA = parseInt(a.value['表示順']?.value ?? 9999, 10);
      const orderB = parseInt(b.value['表示順']?.value ?? 9999, 10);
      return orderA - orderB;
    });

    // =========================
    // 各サブ行を task に変換
    // =========================
    sortedTable.forEach(subTask => {
      const v = subTask.value;

      const taskKind = v['タスク']?.value || '';
      const date     = v['日付']?.value || '';
      const flag     = v['回・設フラグ']?.value || '';

      // 必須項目チェック
      if (!taskKind || !date) return;

      // =========================
      // ★ 移設判定（核心）
      // =========================
      const isRelocate =
        /^3：[1-5]台目$/.test(taskKind) &&
        flag === '回';

      // =========================
      // 基本タスク構造
      // =========================
      const task = {
        // --- ID ---
        taskId: record.$id.value,
        subId: subTask.id,

        // --- タスク基本 ---
        タスク: taskKind,
        日付: date,
        表示順: parseInt(v['表示順']?.value ?? 0, 10),
        調整状況: v['調整状況']?.value || '',
        準備状況: v['準備状況']?.value || '',
        担当者: v['担当者']?.value || '',
        回・設フラグ: flag,

        // --- 案件 ---
        案件番号: record['案件番号']?.value || '',
        案件種別: record['案件種別']?.value || '',
        案件ステータス: record['案件ステータス']?.value || '',

        // --- 得意先 ---
        得意先略称: record['得意先略称']?.value || '',
        得意先名: record['得意先名']?.value || '',

        // --- メモ ---
        テキストメモ: v['テキストメモ']?.value || '',
        詳細: v['詳細']?.value || '',
        備考: v['備考']?.value || ''
      };

      // =========================
      // 表示専用フィールド分岐
      // =========================
      if (isRelocate) {
        // ---- 移設バー ----
        task.barMode = 'relocate';

        task.移設元現場名 =
          v['移設元現場名']?.value ||
          record['現場名']?.value ||
          '';

        task.現場名 =
          record['現場名']?.value || '';

      } else {
        // ---- 設置 / 通常バー ----
        task.barMode = 'install';

        task.現場名 =
          record['現場名']?.value || '';

        task.回収現場名 =
          record['移設元現場名']?.value || '';
      }

      allTasks.push(task);
    });
  });

  return allTasks;
}





/**
 * 指定した列を表示/非表示にし、ボタンラベルも切り替える
 */
/**
 * 指定した列を表示/非表示にし、ボタンラベルも切り替える
 */
function toggleColumnVisibility(columnId) {
  // カラムインデックスを特定
  const columnIndexMap = {
    'task-4th': 10, // 3：4台目
    'task-5th': 11  // 3：5台目
  };
  const colIndex = columnIndexMap[columnId];
  if (!colIndex) return;

  const table = document.querySelector('#calendar .calendar-table2');
  if (!table) return;

  const headerCell = table.querySelector(`thead th:nth-child(${colIndex})`);
  const bodyCells = table.querySelectorAll(`tbody td:nth-child(${colIndex})`);

  // 今の状態を確認（thのdisplayを参照）
  const isHidden = getComputedStyle(headerCell).display === 'none';

  // ✅ 切り替え
  const newDisplay = isHidden ? '' : 'none';
  headerCell.style.display = newDisplay;
  bodyCells.forEach(td => td.style.display = newDisplay);

  // ✅ ボタン更新
  const button = document.getElementById(
    columnId === 'task-4th' ? 'toggle-4th' : 'toggle-5th'
  );
  if (button) {
    if (isHidden) {
      button.textContent = columnId === 'task-4th'
        ? '3：4台目 非表示'
        : '3：5台目 非表示';
      button.classList.remove('active');
    } else {
      button.textContent = columnId === 'task-4th'
        ? '3：4台目 表示'
        : '3：5台目 表示';
      button.classList.add('active');
    }
  }
}


// 見出しテキストから列番号を安全に取得（1-based）
function getColIndexByHeaderLabel(label) {
  const ths = document.querySelectorAll('#calendar .calendar-table2 thead th');
  for (let i = 0; i < ths.length; i++) {
    const text = ths[i].textContent.replace(/\s+/g, '').trim();
    if (text === label.replace(/\s+/g, '').trim()) {
      return i + 1; // 1-based
    }
  }
  return null;
}

/**
 * 指定ラベル列の表示/非表示トグル
 * @param {string} label - 例: '3：4台目' or '3：5台目'
 * @param {string} btnId - トグルボタンのID
 */
function toggleColumnByLabel(label, btnId) {
  const table = document.querySelector('#calendar .calendar-table2');
  if (!table) return;

  const colIndex = getColIndexByHeaderLabel(label);
  if (!colIndex) {
    console.warn('列見出しが見つからない:', label);
    return;
  }

  const headerCell = table.querySelector(`thead th:nth-child(${colIndex})`);
  const bodyCells = table.querySelectorAll(`tbody td:nth-child(${colIndex})`);

  // 現在非表示か判定（computedStyle）
  const isHidden = getComputedStyle(headerCell).display === 'none';

  if (isHidden) {
    // ✅ 強制表示（CSSの!importantに勝つ）
    headerCell.style.setProperty('display', 'table-cell', 'important');
    bodyCells.forEach(td => td.style.setProperty('display', 'table-cell', 'important'));
  } else {
    // 非表示
    headerCell.style.setProperty('display', 'none', 'important');
    bodyCells.forEach(td => td.style.setProperty('display', 'none', 'important'));
  }

  // ボタンの文言更新
  const btn = document.getElementById(btnId);
  if (btn) {
    if (isHidden) {
      btn.textContent = `${label} 非表示`;
      btn.classList.remove('active');
    } else {
      btn.textContent = `${label} 表示`;
      btn.classList.add('active');
    }
  }
}


/**
 * 「3：4台目」「3：5台目」列の表示/非表示を切り替えるボタンを設置
 */
function addColumnToggleButtons() {
  // 既にあれば再作成しない
  if (document.getElementById('toggle-4th')) return;

  const buttonContainer = document.createElement('div');
  buttonContainer.id = 'column-toggle-buttons';
  buttonContainer.style.margin = '10px 0';

  buttonContainer.innerHTML = `
    <button id="toggle-4th" class="toggle-btn">3：4台目 表示</button>
    <button id="toggle-5th" class="toggle-btn">3：5台目 表示</button>
  `;

  const calendar = document.getElementById('calendar');
  if (calendar) {
    calendar.parentNode.insertBefore(buttonContainer, calendar);
  }

  // ボタンイベント設定
  document.getElementById('toggle-4th').addEventListener('click', () => toggleColumnVisibility('task-4th'));
  document.getElementById('toggle-5th').addEventListener('click', () => toggleColumnVisibility('task-5th'));

  // ✅ 初期状態：4台目・5台目を非表示にする
  toggleColumnVisibility('task-4th');
  toggleColumnVisibility('task-5th');
}


/**
 * メモをDBに保存（共通）
 */
async function saveTaskMemo(taskEl, newMemo) {
  const recordId = taskEl.dataset.recordId;
  const subId    = taskEl.dataset.subId;

  if (!recordId || !subId) {
    console.warn('⚠️ メモ保存失敗：recordId / subId 不足');
    return;
  }

  try {
    await kintone.api(
      kintone.api.url('/k/v1/record', true),
      'PUT',
      {
        app: kintone.app.getId(),
        id: recordId,
        record: {
          タスク管理: {
            value: [
              {
                id: subId,
                value: {
                  テキストメモ: { value: newMemo }
                }
              }
            ]
          }
        }
      }
    );

    console.log(`✅ メモ保存完了 subId=${subId}`);
  } catch (e) {
    console.error('🚨 メモ保存失敗:', e);
    alert('メモの保存に失敗しました');
  }
}

/**
 * メモ編集欄に保存処理を紐付ける
 */
function bindMemoSave(taskEl, memoEl) {
  if (!memoEl) return;

  let beforeText = memoEl.innerText;

  // フォーカス時
  memoEl.addEventListener('focus', () => {
    beforeText = memoEl.innerText;
  });

  // ★ Enterキーで改行させない
  memoEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      memoEl.blur(); // Enter＝確定扱いにする（UX◎）
    }
  });

  // ★ 貼り付け時の改行を除去
  memoEl.addEventListener('paste', (e) => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData)
      .getData('text')
      .replace(/\r?\n/g, ' ');   // 改行 → 半角スペース
    document.execCommand('insertText', false, text);
  });

  // フォーカスアウト時に保存
  memoEl.addEventListener('blur', async () => {
    const afterText = memoEl.innerText;

    if (afterText !== beforeText) {
      await saveTaskMemo(taskEl, afterText);
    }
  });
}


function normalizeTaskRow(record, subId) {
  const table = record['タスク管理']?.value;
  if (!table || !subId) return null;

  const row = table.find(r => r.id === subId);
  if (!row) return null;

  const rv = row.value;
  const pv = (code, def = '') => record?.[code]?.value ?? def;
  const sv = (code, def = '') => rv?.[code]?.value ?? def;

  return {
    // --- キー ---
    recordId: record.$id?.value,
    subId,

    // --- サブテーブル（正本） ---
    タスク: sv('タスク'),
    表示順: sv('表示順'),
    調整状況: sv('調整状況'),
    担当者: sv('担当者'),
    テキストメモ: sv('テキストメモ'),

    // --- 親（案件単位） ---
    日付: pv('日付'),
    現場名: pv('現場名'),
    回収現場名: pv('回収現場名'),
    案件種別: pv('案件種別'),
    案件番号: pv('案件番号'),
    得意先略称: pv('得意先略称'),
  };
}

/**
 * 移設（回フラグ）のサブテーブル行を削除する
 * - recordId: 親レコードID
 * - taskKind: "3：1台目" など（※台目→台目移動のときは移動元の台目を渡す）
 * 
 * 戻り値: 削除した件数
 */
async function deleteRelocateRow({ recordId, taskKind }) {
  if (!recordId) throw new Error('deleteRelocateRow: recordId is required');
  if (!taskKind) throw new Error('deleteRelocateRow: taskKind is required');

  const tableCode = 'タスク管理';

  // ① 最新レコード取得
  const resp = await kintone.api(
    kintone.api.url('/k/v1/record', true),
    'GET',
    { app: kintone.app.getId(), id: recordId }
  );

  const rows = resp.record?.[tableCode]?.value || [];

  // ② 削除対象：タスク一致 かつ 回フラグ
  let deleted = 0;
  const newRows = rows.filter(row => {
    const v = row.value || {};
    const isSameTask = (v['タスク']?.value || '') === taskKind;
    const isRelocate = (v['回・設フラグ']?.value || '') === '回';

    const shouldDelete = isSameTask && isRelocate;
    if (shouldDelete) deleted++;
    return !shouldDelete;
  });

  // ③ 変化がなければ終了
  if (deleted === 0) {
    console.log(`ℹ️ deleteRelocateRow: 削除対象なし recordId=${recordId}, taskKind=${taskKind}`);
    return 0;
  }

  // ④ 保存（サブテーブル丸ごと更新）
  await kintone.api(
    kintone.api.url('/k/v1/record', true),
    'PUT',
    {
      app: kintone.app.getId(),
      id: recordId,
      record: {
        [tableCode]: { value: newRows }
      }
    }
  );

  console.log(`✅ deleteRelocateRow: deleted=${deleted} recordId=${recordId}, taskKind=${taskKind}`);
  return deleted;
}


