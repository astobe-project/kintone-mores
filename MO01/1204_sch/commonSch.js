// ==============================
// Kintone App ID 定義（唯一の正）
// ==============================
const APP_IDS = {
  TASK: kintone.app.getId(), // 現在のアプリ
  DELIVERY: 1202,            // 配送業者
  INSTALL_SUMMARY: 1224,     // 設置概要
  PROJECT_MGMT: 1145         // 案件管理（設置完了日・ステータス更新用）
};

let taskGOptionsCache = null;  // タスクGの選択肢キャッシュ
let deliveryOptionsCache = null; // 配送業者の選択肢キャッシュ
let assignedOptionsCache = null; // 担当者の選択肢キャッシュ

// ==============================
// 設置概要 月次キャッシュ
// ==============================
const installSummaryCache = {}; 

// ==============================
// 列トグル 初期化フラグ（グローバル）
// ==============================
window.columnToggleInitialized = false;

// =======================================
// カレンダー列マスタ定義（移設含む）
// =======================================
const COLUMN_DEFS = [
  { id: 'task-gencho',  label: '1：現調',       taskKind: '1：現調',       sortable: true  },
  { id: 'task-plan',    label: '2：プラン作成', taskKind: '2：プラン作成', sortable: true  },
  { id: 'task-secchi',  label: '3：設置予定',   taskKind: '3：設置予定',   sortable: true  },
  { id: 'task-limit',   label: '3：回収期限',   taskKind: '3：回収期限',   sortable: true  },
  { id: 'task-summary', label: '3：設置メモ',   taskKind: null,            sortable: false },
  { id: 'task-collect',  label: '3：回収メモ',   taskKind: null,            sortable: false }, // ★追加
  { id: 'task-1st',     label: '3：1台目',      taskKind: '3：1台目',      sortable: true  },
  { id: 'task-2nd',     label: '3：2台目',      taskKind: '3：2台目',      sortable: true  },
  { id: 'task-3rd',     label: '3：3台目',      taskKind: '3：3台目',      sortable: true  },
  { id: 'task-4th',     label: '3：4台目',      taskKind: '3：4台目',      sortable: true  },
  { id: 'task-5th',     label: '3：5台目',      taskKind: '3：5台目',      sortable: true  },
  { id: 'task-satsuei', label: '4：撮影',       taskKind: '4：撮影',       sortable: true  }
];

const STATUS_DEF = {
  未受注: {
    class: 'task-nonorderd',
    label: '受注',
    bg: '#CCFFCC',
    border: '#88CC88'
  },
  調整中: {
    class: 'task-adjusting',
    label: '確定',
    bg: '#FFF59D',
    border: '#FBC02D'
  },
  確定: {
    class: 'task-confirmed',
    label: '完了',
    bg: '#90CAF9',
    border: '#42A5F5'
  },
  完了: {
    class: 'task-completed',
    label: '戻し',
    bg: '#BDBDBD',
    border: '#757575'
  }
};


// 全角スペースで右側パディング（表示用・超過分は切り捨て）
const ZEN_SPACE = '\u3000';

function updateStatusButtonVisual(button, status, taskKind) {
  button.className = 'task-status-btn';

  let bg = '';
  let border = '';
  let label = '';

  if (taskKind === '3：設置予定') {
    if (status === '未受注') {
      label = '受注';
      bg = '#ffb84d';
      border = '#e69500';
    } else {
      label = '未受注';
      bg = '#ccffcc';
      border = '#88cc88';
    }
  } else {
    if (status === '未受注') {
      label = '受注';
      bg = '#ccffcc';
      border = '#88cc88';
    } else if (status === '調整中') {
      label = '確定';
      bg = '#ccffcc';
      border = '#88cc88';
    } else if (status === '確定') {
      label = '完了';
      bg = '#90caf9';
      border = '#42a5f5';
    } else if (status === '完了') {
      label = '戻し';
      bg = '#bdbdbd';
      border = '#757575';
    }
  }

  button.textContent = label;
  button.style.backgroundColor = bg;
  button.style.border = `2px solid ${border}`;
  button.style.color = '#333';
  button.style.fontWeight = 'bold';
}


/**
 * 調整状況を変更する唯一の関数（司令塔）
 * - DB更新
 * - dataset更新
 * - class更新
 * - ボタン表示更新
 */
async function applyStatus(taskEl, newStatus, targetDate) {
  const recordId = taskEl?.dataset?.recordId;
  const subId    = taskEl?.dataset?.subId;

  if (!taskEl || !recordId || !subId) {
    console.error('🚨 applyStatus: 必須情報不足', { taskEl, recordId, subId });
    return;
  }

  const taskKind = taskEl.dataset.taskKind || '';
  const date     = targetDate || taskEl.dataset.date || '';

  /* =========================
     ① DB更新（唯一の場所）
     ========================= */
  await updateTaskRecord(
    recordId,
    subId,
    date,
    newStatus,
    taskKind
  );

  /* =========================
     ② dataset 更新
     ========================= */
  taskEl.dataset.status = newStatus;
  taskEl.dataset.date   = date;

  /* =========================
     ③ class 更新
     ========================= */
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

  /* =========================
     ④ ステータスボタン更新
     ========================= */
  const btn = taskEl.querySelector('.task-status-btn');
  if (btn && typeof updateStatusButtonVisual === 'function') {
    updateStatusButtonVisual(btn, newStatus);
  }

  console.log(`✅ applyStatus 完了: subId=${subId}, status=${newStatus}`);
}


// ==========================================
// 複数のタスクバー（サブテーブル行）を一括更新する（デバッグログ強化版）
// ==========================================
async function applyStatusBulk(taskElements, newStatus, targetDate) {
  if (!taskElements || taskElements.length === 0) {
    console.error('🚨 [一括更新] 更新対象のエレメントが空です');
    return;
  }

  console.log('--- 🚀 一括更新処理開始 ---');
  console.log('更新ステータス:', newStatus);
  console.log('ターゲット日付:', targetDate);

  // 1. レコードIDごとにグループ化
  const recordMap = taskElements.reduce((acc, el) => {
    const rid = el.dataset.recordId;
    if (!acc[rid]) acc[rid] = [];
    acc[rid].push(el);
    return acc;
  }, {});

  const recordIds = Object.keys(recordMap);
  console.log('更新対象レコードID一覧:', recordIds);

  try {
    // 2. レコード取得
    const getResp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
      app: kintone.app.getId(),
      query: `$id in (${recordIds.join(',')})`
    });
    console.log('📦 DBから取得した最新レコード:', getResp.records);

    // 3. 更新データの作成
    const recordsToUpdate = getResp.records.map(record => {
      const rid = record.$id.value;
      const targetElms = recordMap[rid];
      const subTableField = "タスク管理";
      
      console.log(`🔍 レコード ID:${rid} のサブテーブル行をチェック中...`);

      const updatedSubTable = record[subTableField].value.map(row => {
        // IDが一致するか、型を意識して比較（row.id は文字列の場合があるため）
        const matchedElm = targetElms.find(el => String(el.dataset.subId) === String(row.id));
        
        if (matchedElm) {
          console.log(`  ✅ 一致する行を発見: RowID=${row.id}, Task=${row.value["タスク"].value}`);
          return {
            id: row.id,
            value: {
              ...row.value,
              "調整状況": { value: newStatus },
              "日付": { value: targetDate || row.value["日付"].value }
            }
          };
        }
        return row;
      });

      return {
        id: rid,
        record: { [subTableField]: { value: updatedSubTable } }
      };
    });

    console.log('📤 APIに送信する更新用データ(PUT Body):', recordsToUpdate);

    // 4. 一括更新実行
    const putResp = await kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', {
      app: kintone.app.getId(),
      records: recordsToUpdate
    });
    console.log('✅ kintone API レスポンス:', putResp);

    // 5. UI反映
    taskElements.forEach(taskEl => {
      taskEl.dataset.status = newStatus;
      taskEl.classList.remove('task-nonorderd', 'task-adjusting', 'task-confirmed', 'task-completed');
      if (newStatus === '未受注') taskEl.classList.add('task-nonorderd');
      else if (newStatus === '調整中') taskEl.classList.add('task-adjusting');
      else if (newStatus === '確定') taskEl.classList.add('task-confirmed');
      else if (newStatus === '完了') taskEl.classList.add('task-completed');

      const btn = taskEl.querySelector('.task-status-btn');
      if (btn && typeof updateStatusButtonVisual === 'function') {
        updateStatusButtonVisual(btn, newStatus, taskEl.dataset.taskKind);
      }
    });

    console.log('--- ✨ UI反映完了 ---');

  } catch (error) {
    console.error('🚨 [一括更新エラー] 詳細:', error);
    // エラーが「GAIA_RE01（リビジョン不一致）」などの場合は別途対策が必要です
    alert('更新に失敗しました。コンソールログを確認してください。');
    throw error;
  }
}




function padZenRight(str, len) {
  const s = String(str ?? '');
  return s.length >= len ? s.slice(0, len) : s + ZEN_SPACE.repeat(len - s.length);
}



function updateTaskRecords(updates) {
    var body = {
        app: APP_IDS.TASK,
        records: updates
    };
    kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', body, function(resp) {
        console.log('Records updated successfully');
    }, function(error) {
        console.error('Error updating records:', error);
    });
}

async function updateTaskRecordsSafely(updates) {

    for (const update of updates) {
        try {
            // レコード全体を取得
            const recordResp = await kintone.api(kintone.api.url('/k/v1/record', true), 'GET', {
                app: APP_IDS.TASK,
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
                app: APP_IDS.TASK,
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

// ==========================================
// App 1145 (案件管理) の設置完了日とステータスを一括更新
// ==========================================
async function updateApp1145Bulk(taskElements, targetDate) {
    // 1. 重複を除いた「案件番号」のリストを抽出
    // ※ taskElementsのdatasetにcaseNumberが正しくセットされている必要があります
    const ankenNos = [...new Set(taskElements.map(el => el.dataset.caseNumber).filter(Boolean))];
    
    if (ankenNos.length === 0) {
        console.warn("// [DEBUG] 更新対象の案件番号が見つかりません");
        return;
    }

    try {
        // 2. App 1145 から該当するレコードを検索
        // 定数 APP_IDS.PROJECT_MGMT (1145) を使用するように変更
        const query = `案件番号 in ("${ankenNos.join('","')}")`;
        const searchResp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
            app: APP_IDS.PROJECT_MGMT, 
            query: query,
            fields: ['$id', '案件番号']
        });

        if (searchResp.records.length === 0) {
            console.warn("// [DEBUG] App 1145 に該当する案件が見つかりません");
            return;
        }

        // 3. 更新用データ作成
        const updateRecords = searchResp.records.map(rec => {
            return {
                id: rec.$id.value,
                record: {
                    '設置完了日': { value: targetDate },
                    '案件ステータス': { value: '完了_撮影済/編集未' }
                }
            };
        });

        // 4. 一括更新（kintone REST APIの制限に基づき一度に100レコードまで）
        await kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', {
            app: APP_IDS.PROJECT_MGMT,
            records: updateRecords
        });

        console.log(`// ✅ App 1145 (${APP_IDS.PROJECT_MGMT}) の ${updateRecords.length} 件を一括更新しました`);
    } catch (error) {
        console.error("// 🚨 App 1145 連携失敗:", error);
        alert("別アプリ(1145)の更新に失敗しました。詳細はコンソールを確認してください。");
    }
}

// ==========================================
// App 1145 (案件管理) のステータスを「設置日通知済」に戻し、完了日をクリア
// ==========================================
async function revertApp1145Bulk(taskElements) {
    const ankenNos = [...new Set(taskElements.map(el => el.dataset.caseNumber).filter(Boolean))];
    
    if (ankenNos.length === 0) return;

    try {
        const query = `案件番号 in ("${ankenNos.join('","')}")`;
        const searchResp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
            app: APP_IDS.PROJECT_MGMT, // 1145
            query: query,
            fields: ['$id']
        });

        if (searchResp.records.length === 0) return;

        const updateRecords = searchResp.records.map(rec => {
            return {
                id: rec.$id.value,
                record: {
                    '設置完了日': { value: null }, // 💡 空欄にする
                    '案件ステータス': { value: '設置_設置日通知済' } // 💡 ステータスを戻す
                }
            };
        });

        await kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', {
            app: APP_IDS.PROJECT_MGMT,
            records: updateRecords
        });

        console.log(`// ✅ App 1145 の ${updateRecords.length} 件を「設置日通知済」に戻しました`);
    } catch (error) {
        console.error("// 🚨 App 1145 戻し処理失敗:", error);
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

  console.group(`saveTaskOrder start: ${taskKind} ${date}`);
  bars.forEach((taskEl, index) => {
    const title =
      taskEl.querySelector('.task-middle, .install-row-1, .collect-row-2, .relocate-row-2')?.textContent?.trim() || '';
    const badge =
      taskEl.querySelector('.task-order-badge')?.textContent?.trim() || '';
    console.log('before', {
      index: index + 1,
      subId: taskEl.dataset.subId || '',
      order: taskEl.dataset.order || '',
      badge,
      title
    });
  });

  const updates = [];

  bars.forEach((taskEl, index) => {
    const recordId = taskEl.dataset.recordId;
    const subId = taskEl.dataset.subId;
    const newOrder = index + 1;

    taskEl.dataset.order = newOrder;
    syncTaskOrderBadge(taskEl, newOrder);
    syncTaskOrderText(taskEl, newOrder);

    if (!recordId || !subId) return;

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

  reorderDomByOrder(td);

  Array.from(td.querySelectorAll('.task-bar')).forEach((taskEl, index) => {
    const title =
      taskEl.querySelector('.task-middle, .install-row-1, .collect-row-2, .relocate-row-2')?.textContent?.trim() || '';
    const badge =
      taskEl.querySelector('.task-order-badge')?.textContent?.trim() || '';
    console.log('after', {
      index: index + 1,
      subId: taskEl.dataset.subId || '',
      order: taskEl.dataset.order || '',
      badge,
      title
    });
  });
  console.groupEnd();
}

function syncTaskOrderBadge(taskEl, order) {
  const orderText = String(order ?? '').trim();
  let badge = taskEl.querySelector('.task-order-badge');

  if (!orderText) {
    if (badge) badge.remove();
    return;
  }

  if (!badge) {
    const rightDiv = taskEl.querySelector('.task-right');
    if (!rightDiv) return;
    badge = document.createElement('div');
    badge.className = 'task-order-badge';
    rightDiv.appendChild(badge);
  }

  badge.textContent = orderText;
}

function syncTaskOrderText(taskEl, order) {
  const topEl = taskEl.querySelector('.task-top');
  if (!topEl) return;

  const rawText = topEl.textContent || '';
  const trimmed = rawText.trimStart();
  const replaced = trimmed.replace(/^\d+\s*/, '');
  topEl.textContent = `${order} ${replaced}`.trim();
}



function reorderDomByOrder(container) {
  const bars = Array.from(container.querySelectorAll('.task-bar'));

  bars.sort((a, b) => {
    const aBadge = a.querySelector('.task-order-badge')?.textContent || '';
    const bBadge = b.querySelector('.task-order-badge')?.textContent || '';
    const aOrder = parseInt(a.dataset.order || aBadge || 9999, 10);
    const bOrder = parseInt(b.dataset.order || bBadge || 9999, 10);
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
    kintone.api(kintone.api.url('/k/v1/record', true), 'GET', { app: APP_IDS.TASK, id: recordId }, function(resp) {

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
        app: APP_IDS.TASK,
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
        app: APP_IDS.TASK,
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
            app: APP_IDS.TASK,
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
        app: APP_IDS.TASK, // KintoneアプリのID
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

        task.回収元現場名 =
          v['回収元現場名']?.value ||
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
          record['回収元現場名']?.value || '';
      }

      allTasks.push(task);
    });
  });

  return allTasks;
}


// 配送業者アプリ側のレコードの「調整状況」を更新する
async function updatePdownRecordStatus(recordId, status) {
    const body = {
        app: APP_IDS.DELIVERY,
        id: recordId,
        record: {
            '調整状況': { value: status }
        }
    };
    return kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body);
}


/**
 * 指定した列を表示/非表示にし、ボタンラベルも切り替える
 */
function toggleColumnVisibility(columnId) {
  const COLUMN_MAP = {
    'task-summary': { index: 6,  btnId: 'toggle-summary', label: '3：設置メモ' },
    'task-4th':     { index: 10, btnId: 'toggle-4th',     label: '3：4台目' },
    'task-5th':     { index: 11, btnId: 'toggle-5th',     label: '3：5台目' }
  };

  const config = COLUMN_MAP[columnId];
  if (!config) return;

  const table = document.querySelector('#calendar .calendar-table2');
  if (!table) return;

  const header = table.querySelector(`thead th:nth-child(${config.index})`);
  const cells  = table.querySelectorAll(`tbody td:nth-child(${config.index})`);
  if (!header) return;

  const isHidden = getComputedStyle(header).display === 'none';
  const newDisplay = isHidden ? 'table-cell' : 'none';

  header.style.display = newDisplay;
  cells.forEach(td => td.style.display = newDisplay);

  const btn = document.getElementById(config.btnId);
  if (!btn) return;

  if (isHidden) {
    btn.textContent = `${config.label} 非表示`;
    btn.classList.add('active');
    btn.classList.remove('inactive');
  } else {
    btn.textContent = `${config.label} 表示`;
    btn.classList.remove('active');
    btn.classList.add('inactive');
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

  if (columnToggleInitialized) {
    console.log('⏭ addColumnToggleButtons skipped');
    return;
  }

  console.log('🔥 addColumnToggleButtons called');

  const wrapper = document.createElement('div');
  wrapper.style.display = 'flex';
  wrapper.style.gap = '6px';

  wrapper.innerHTML = `
    <button id="toggle-install-memo"
      class="toggle-btn"
      onclick="onToggleInstallMemo()">
      非表示
    </button>

    <button id="toggle-collect-memo"
      class="toggle-btn"
      onclick="onToggleCollectMemo()">
      回収メモ 非表示
    </button>
    
    <button id="toggle-4th"
      class="toggle-btn inactive"
      onclick="toggleColumnVisibility('task-4th')">
      3：4台目 表示
    </button>

    <button id="toggle-5th"
      class="toggle-btn inactive"
      onclick="toggleColumnVisibility('task-5th')">
      3：5台目 表示
    </button>
  `;

  const nav = document.querySelector('#calendar-container-header');
  if (!nav) {
    console.warn('⚠ calendar header not found');
    return;
  }

  nav.appendChild(wrapper);

  // ★ 初期状態を必ず反映（超重要）
  setInstallMemoVisible(window._installMemoVisible !== false);

  columnToggleInitialized = true;
}




/**
 * 設置 / 回収 メモを保存（1224）
 * キー：日付 × No × 分類
 */
async function saveInstallOrCollectMemo({
  isoDate,
  category,
  no,
  memo,
  color = '#000000',
  bold = false
}) {

  if (!no) {
    console.error('🚨 No が未指定です', { isoDate, category, memo });
    return;
  }

  // ==========================
  // 既存レコード検索（分類込み）
  // ==========================
  const searchResp = await kintone.api(
    kintone.api.url('/k/v1/records', true),
    'GET',
    {
      app: APP_IDS.INSTALL_SUMMARY,
      query: `
        日付 = "${isoDate}"
        and No = ${no}
        and 分類 in ("${category}")
      `,
      fields: ['$id']
    }
  );

  // ==========================
  // 保存データ（★色・太字を追加）
  // ==========================
  const recordData = {
    日付: { value: isoDate },
    No: { value: no },
    分類: { value: category },
    メモ: { value: memo || '' },
    テキストカラー: { value: color },
    テキストボールド: { value: bold ? 'ON' : '' }
  };

  // ==========================
  // 更新 or 新規作成
  // ==========================
  if (searchResp.records.length > 0) {
    await kintone.api(
      kintone.api.url('/k/v1/record', true),
      'PUT',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        id: searchResp.records[0].$id.value,
        record: recordData
      }
    );
  } else {
    await kintone.api(
      kintone.api.url('/k/v1/record', true),
      'POST',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        record: recordData
      }
    );
  }
}


// ==========================================
// App 1145 (案件管理) の設置完了日とステータスを一括更新
// ==========================================
async function updateApp1145Bulk(taskElements, targetDate) {
    // 1. 重複を除いた「案件番号」のリストを抽出
    const ankenNos = [...new Set(taskElements.map(el => el.dataset.caseNumber).filter(Boolean))];
    
    if (ankenNos.length === 0) {
        console.warn("// [DEBUG] 更新対象の案件番号が見つかりません");
        return;
    }

    try {
        // 2. App 1145 から該当するレコードを検索
        const query = `案件番号 in ("${ankenNos.join('","')}")`;
        const searchResp = await kintone.api(kintone.api.url('/k/v1/records', true), 'GET', {
            app: 1145,
            query: query,
            fields: ['$id', '案件番号']
        });

        if (searchResp.records.length === 0) return;

        // 3. 更新用データ作成
        const updateRecords = searchResp.records.map(rec => {
            return {
                id: rec.$id.value,
                record: {
                    '設置完了日': { value: targetDate },
                    '案件ステータス': { value: '完了_撮影済/編集未' }
                }
            };
        });

        // 4. 一括更新（レコードの更新制限100件以内を想定）
        await kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', {
            app: 1145,
            records: updateRecords
        });
        console.log(`// ✅ App 1145 の ${updateRecords.length} 件を一括更新しました`);
    } catch (error) {
        console.error("// 🚨 App 1145 連携失敗:", error);
        alert("別アプリ(1145)の更新に失敗しました。");
    }
}




/**
 * メモをDBに保存（共通）
 */
async function saveTaskMemo(taskEl, newMemo) {
  const recordId = taskEl.dataset.recordId;
  const subId    = taskEl.dataset.subId;

  if (!recordId || !subId) {
    console.warn('⚠️ saveTaskMemo: recordId / subId 不足');
    return;
  }

  // ① 最新レコード取得
  const resp = await kintone.api(
    kintone.api.url('/k/v1/record', true),
    'GET',
    {
      app: APP_IDS.TASK,
      id: recordId
    }
  );

  const rows = resp.record['タスク管理']?.value || [];

  // ② 全行を保持したまま、対象行だけ更新
  const newRows = rows.map(row => {
    if (row.id === subId) {
      return {
        id: row.id,
        value: {
          ...row.value,
          テキストメモ: { value: newMemo }
        }
      };
    }
    return row;
  });

  // ③ PUT（⚠️ 全行）
  await kintone.api(
    kintone.api.url('/k/v1/record', true),
    'PUT',
    {
      app: APP_IDS.TASK,
      id: recordId,
      record: {
        タスク管理: { value: newRows }
      }
    }
  );

  console.log(`✅ メモ保存成功 subId=${subId}`);
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
    { app: APP_IDS.TASK, id: recordId }
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
      app: APP_IDS.TASK,
      id: recordId,
      record: {
        [tableCode]: { value: newRows }
      }
    }
  );

  console.log(`✅ deleteRelocateRow: deleted=${deleted} recordId=${recordId}, taskKind=${taskKind}`);
  return deleted;
}


/**
 * 設置概要セル描画（A/B/C ブロック方式・最終確定版）
 * @param {HTMLElement} cell
 * @param {string} isoDate YYYY-MM-DD
 */
async function renderInstallSummaryCell(cell, isoDate, category) {
  cell.innerHTML = '';
  cell.classList.add('install-summary-cell');

  // ============================
  // キャッシュから状態取得（唯一の情報源）
  // ============================
  const summaryState = await loadInstallSummary(isoDate, category);

  const BLOCKS = [
    { key: 'A', nos: [1, 2, 3] },
    { key: 'B', nos: [4, 5, 6] },
    { key: 'C', nos: [7, 8, 9] },
    { key: 'D', nos: [10, 11, 12] },
    { key: 'E', nos: [13, 14, 15] }
  ];

  // ============================
  // 表示ブロック判定（★API禁止）
  // ============================
  const visibleBlocks = new Set();

  BLOCKS.forEach(block => {
    if (block.nos.some(no => summaryState[no]?.text)) {
      visibleBlocks.add(block.key);
    }
  });

  // 何もなければ1行目だけ
  if (visibleBlocks.size === 0) {
    visibleBlocks.add('A');
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'summary-wrapper';

  // ============================
  // ユーティリティ
  // ============================
  function isBlockEmpty(block) {
    return block.nos.every(no => !summaryState[no]?.text);
  }

  function shouldShowAdd(index) {
    const cur = BLOCKS[index];
    const next = BLOCKS[index + 1];
    if (!next) return false;
    return visibleBlocks.has(cur.key) && !visibleBlocks.has(next.key);
  }

  // ============================
  // 再描画
  // ============================
  function redraw() {
    wrapper.innerHTML = '';

    BLOCKS.forEach((block, index) => {
      if (!visibleBlocks.has(block.key)) return;

      const row = document.createElement('div');
      row.className = 'summary-row';

      // ---------- 入力欄 ----------
      const inputsWrap = document.createElement('div');
      inputsWrap.className = 'summary-inputs';

      block.nos.forEach(no => {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'summary-input';
        input.placeholder = `${category}メモ`;

        const state = summaryState[no];
        if (state?.text) {
          input.value = state.text;
          input.style.color = state.color || '#000';
          input.style.fontWeight = state.bold ? 'bold' : 'normal';
        }

        // モーダル起動
        input.addEventListener('click', () => {
          openSummaryModal({
            isoDate,
            no,
            currentText: state?.text || '',
            currentColor: state?.color || '#000000',
            currentBold: state?.bold || false,
            onSave: async (text, color, bold) => {
              await saveInstallOrCollectMemo({
                isoDate,
                category,
                no,
                color,
                bold,
                memo: text
              });

              // キャッシュ更新
              if (!installSummaryCache[isoDate]) {
                installSummaryCache[isoDate] = { 設置: {}, 回収: {} };
              }
              installSummaryCache[isoDate][category][no] = {
                text,
                color,
                bold
              };

              summaryState[no] = { text, color, bold };

              // 行表示制御
              BLOCKS.forEach(b => {
                if (b.nos.includes(no)) visibleBlocks.add(b.key);
              });

              redraw();
            }
          });
        });

        inputsWrap.appendChild(input);
      });

      // ---------- 操作ボタン ----------
      const actions = document.createElement('div');
      actions.className = 'summary-row-actions';

      // − ボタン
      const delBtn = document.createElement('button');
      delBtn.textContent = '−';
      delBtn.className = 'kintone-custom-btn del-btn';

      delBtn.onclick = async () => {
        if (!isBlockEmpty(block)) {
          if (!confirm('この行にはメモがあります。本当に削除しますか？')) return;
        }

        for (const no of block.nos) {
          await deleteInstallSummary(isoDate, no);
          delete installSummaryCache[isoDate]?.[category]?.[no];
          summaryState[no] = null;
        }

        visibleBlocks.delete(block.key);
        if (visibleBlocks.size === 0) visibleBlocks.add('A');
        redraw();
      };

      actions.appendChild(delBtn);

      // ＋ ボタン
      if (shouldShowAdd(index)) {
        const addBtn = document.createElement('button');
        addBtn.textContent = '＋';
        addBtn.className = 'kintone-custom-btn add-btn';

        addBtn.onclick = () => {
          visibleBlocks.add(BLOCKS[index + 1].key);
          redraw();
        };

        actions.appendChild(addBtn);
      }

      row.appendChild(inputsWrap);
      row.appendChild(actions);
      wrapper.appendChild(row);
    });
  }

  redraw();
  cell.appendChild(wrapper);
}





/**
 * 設置 / 回収 メモを取得（分類はプルダウン）
 */
async function loadInstallOrCollectMemo(isoDate, category, no) {
  const resp = await kintone.api(
    kintone.api.url('/k/v1/records', true),
    'GET',
    {
      app: APP_IDS.INSTALL_SUMMARY,
      query: `
        日付 = "${isoDate}"
        and No = ${no}
        and 分類 in ("${category}")
      `,
      fields: ['メモ']
    }
  );

  if (resp.records.length === 0) return '';
  return resp.records[0].メモ?.value || '';
}













function openSummaryModal({
  isoDate,
  no,
  currentText = '',
  currentColor = '#000000',
  currentBold = false,
  onSave
}) {
  /* ======================================
     Overlay / Modal
  ====================================== */
  const overlay = document.createElement('div');
  overlay.className = 'summary-modal-overlay';

  const modal = document.createElement('div');
  modal.className = 'summary-modal';

  /* ======================================
     日付表示
  ====================================== */
  const dateObj = new Date(isoDate);
  const week = ['日', '月', '火', '水', '木', '金', '土'][dateObj.getDay()];
  const dateLabel =
    `${dateObj.getFullYear()}年${dateObj.getMonth() + 1}月${dateObj.getDate()}日（${week}）`;

  /* ======================================
     カラーパレット
  ====================================== */
  const COLORS = [
    { label: '黒', value: '#000000' },
    { label: '青', value: '#0066cc' },
    { label: '赤', value: '#cc0000' },
    { label: '緑', value: '#008000' },
    { label: '橙', value: '#ff8800' }
  ];

  /* ======================================
     HTML
  ====================================== */
  modal.innerHTML = `
    <div class="summary-modal-header">
      <div class="summary-modal-date">${dateLabel}</div>
      <div class="summary-modal-title">設置概要メモ（No.${no}）</div>
    </div>

    <textarea class="summary-modal-text" rows="1"></textarea>

    <div class="summary-style-bar">
      <div class="style-group">
        <span class="style-label">文字色</span>
        <div class="style-buttons color-buttons"></div>
      </div>

      <div class="style-group right">
        <span class="style-label">強調</span>
        <div class="style-buttons">
          <button type="button" class="style-btn bold-btn">太字</button>
        </div>
      </div>
    </div>

    <div class="summary-modal-actions">
      <button class="summary-btn primary save-btn">保存</button>
      <button class="summary-btn cancel cancel-btn">キャンセル</button>
    </div>
  `;

  overlay.appendChild(modal);
  document.body.appendChild(overlay);

  /* ======================================
     DOM取得（順番が超重要）
  ====================================== */
  const textarea = modal.querySelector('.summary-modal-text');
  const saveBtn  = modal.querySelector('.save-btn');
  const cancelBtn = modal.querySelector('.cancel-btn');

  /* ======================================
     textarea 初期化
  ====================================== */
  textarea.value = String(currentText).replace(/\r?\n/g, '');
  textarea.style.color = currentColor;
  textarea.style.fontWeight = currentBold ? 'bold' : 'normal';

  /* ======================================
     文字数カウンター
  ====================================== */
  const counter = document.createElement('div');
  counter.className = 'summary-text-counter';
  modal.insertBefore(counter, modal.querySelector('.summary-style-bar'));

  /* ======================================
     状態更新（文字数・保存可否）
  ====================================== */
  function updateSaveState() {
    const len = textarea.value.length;
    counter.textContent = `${len} / 20`;

    if (len > 20) {
      counter.style.color = '#dc2626';
      saveBtn.disabled = true;
      saveBtn.style.opacity = '0.5';
      saveBtn.style.cursor = 'not-allowed';
    } else {
      counter.style.color = '#6b7280';
      saveBtn.disabled = false;
      saveBtn.style.opacity = '';
      saveBtn.style.cursor = '';
    }
  }

  /* ======================================
     textarea イベント
  ====================================== */
  textarea.addEventListener('keydown', e => {
    if (e.key === 'Enter') e.preventDefault();
  });

  textarea.addEventListener('input', () => {
    textarea.value = textarea.value.replace(/\r?\n/g, '');
    updateSaveState();
  });

  // 初期判定
  updateSaveState();

  /* ======================================
     文字色ボタン
  ====================================== */
  let selectedColor = currentColor;
  let isBold = Boolean(currentBold);

  const colorWrap = modal.querySelector('.color-buttons');

  COLORS.forEach(c => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'style-btn';
    btn.textContent = c.label;
    btn.style.color = c.value;

    if (c.value === selectedColor) btn.classList.add('selected');

    btn.onclick = () => {
      selectedColor = c.value;
      textarea.style.color = c.value;
      colorWrap.querySelectorAll('.style-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    };

    colorWrap.appendChild(btn);
  });

  /* ======================================
     太字トグル
  ====================================== */
  const boldBtn = modal.querySelector('.bold-btn');
  if (isBold) boldBtn.classList.add('selected');

  boldBtn.onclick = () => {
    isBold = !isBold;
    textarea.style.fontWeight = isBold ? 'bold' : 'normal';
    boldBtn.classList.toggle('selected', isBold);
  };

  /* ======================================
     保存
  ====================================== */
  saveBtn.onclick = async () => {
    const text = textarea.value.trim();

    // 二重ガード
    if (text.length > 20) {
      alert('20文字以内で入力してください。');
      return;
    }

    try {
      await onSave(text, selectedColor, isBold);
      document.body.removeChild(overlay);
    } catch {
      // 保存失敗時は閉じない
    }
  };

  /* ======================================
     キャンセル
  ====================================== */
  cancelBtn.onclick = () => {
    document.body.removeChild(overlay);
  };

  /* ======================================
     Overlayクリックで閉じる
  ====================================== */
  overlay.addEventListener('click', e => {
    if (e.target === overlay) {
      document.body.removeChild(overlay);
    }
  });
}











/**
 * 設置概要（app: APP_IDS.INSTALL_SUMMARY）を読み込み、No:1〜9 の state を返す
 * @param {string} isoDate - YYYY-MM-DD
 * @returns {Promise<Object>} summaryState
 *
 * summaryState = {
 *   1: { text, color, bold } | null,
 *   2: null,
 *   ...
 *   9: { ... }
 * }
 */
/**
 * 設置概要メモ（キャッシュ版）
 * @param {string} isoDate YYYY-MM-DD
 */
async function loadInstallSummary(isoDate, category) {
  const state = {};
  for (let no = 1; no <= 15; no++) {
    state[no] = null;
  }

  const cached = installSummaryCache[isoDate]?.[category];
  if (!cached) return state;

  Object.keys(cached).forEach(no => {
    state[no] = cached[no];
  });

  return state;
}





/**
 * 設置概要メモ 保存（Upsert）
 * @param {string} isoDate YYYY-MM-DD
 * @param {number} no 1〜9
 * @param {string} text
 * @param {string} color
 * @param {boolean} bold
 */
async function saveInstallSummary(isoDate, no, text, color, bold) {
  
  // ===== 空文字は削除扱い =====
  if (!text || !text.trim()) {
    await deleteInstallSummary(isoDate, no);
    return;
  }

  try {
    // ===== 既存レコード検索 =====
    const searchResp = await kintone.api(
      kintone.api.url('/k/v1/records', true),
      'GET',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        query: `日付 = "${isoDate}" and No = ${no}`,
        fields: ['$id']
      }
    );

    const recordData = {
      日付: { value: isoDate },
      No: { value: no },
      メモ: { value: text },
      テキストカラー: { value: color },
      テキストボールド: { value: bold ? 'ON' : '' }
    };

    // ===== 更新 or 新規 =====
    if (searchResp.records.length > 0) {
      const recordId = searchResp.records[0].$id.value;

      await kintone.api(
        kintone.api.url('/k/v1/record', true),
        'PUT',
        {
          app: APP_IDS.INSTALL_SUMMARY,
          id: recordId,
          record: recordData
        }
      );
    } else {
      await kintone.api(
        kintone.api.url('/k/v1/record', true),
        'POST',
        {
          app: APP_IDS.INSTALL_SUMMARY,
          record: recordData
        }
      );
    }

  } catch (error) {
    console.error('🚨 saveInstallSummary 失敗:', error);
    alert('設置概要メモの保存に失敗しました。20文字以内で入力してください。');
    throw error;
  }
}




/**
 * 設置概要メモ 削除
 * @param {string} isoDate YYYY-MM-DD
 * @param {number} no 1〜9
 */
async function deleteInstallSummary(isoDate, no) {

  try {
    // ===== 対象レコード取得 =====
    const resp = await kintone.api(
      kintone.api.url('/k/v1/records', true),
      'GET',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        query: `日付 = "${isoDate}" and No = ${no}`,
        fields: ['$id']
      }
    );

    if (resp.records.length === 0) return;

    // ===== 複数あっても全削除 =====
    const ids = resp.records.map(r => r.$id.value);

    await kintone.api(
      kintone.api.url('/k/v1/records', true),
      'DELETE',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        ids
      }
    );

  } catch (error) {
    console.error('🚨 deleteInstallSummary 失敗:', error);
    alert('設置概要メモの削除に失敗しました');
  }
}


function hookSummaryIntoCalendar() {
  // 設置メモ列
  document.querySelectorAll('#calendar td#task-summary').forEach(cell => {
    const isoDate = cell.dataset.date;
    if (!isoDate) return;
    renderInstallSummaryCell(cell, isoDate, '設置');
  });

  // 回収メモ列（★追加）
  document.querySelectorAll('#calendar td#task-collect').forEach(cell => {
    const isoDate = cell.dataset.date;
    if (!isoDate) return;
    renderInstallSummaryCell(cell, isoDate, '回収');
  });
}


/**
 * 設置概要メモ用：文字サイズ自動調整（1行）
 * @param {HTMLInputElement} input
 */
function adjustSummaryFontSize(input) {
  if (!input || !input.value) {
    input.style.fontSize = '13px';
    return;
  }

  const BASE_SIZE = 13;   // 通常サイズ
  const MIN_SIZE  = 9;    // 最小サイズ
  const PADDING   = 6;    // 左右余白分

  // 初期化
  input.style.fontSize = BASE_SIZE + 'px';

  const maxWidth = input.clientWidth - PADDING;
  if (maxWidth <= 0) return;

  // 計測用 span（毎回作って毎回消す：安全）
  const span = document.createElement('span');
  span.style.position = 'absolute';
  span.style.visibility = 'hidden';
  span.style.whiteSpace = 'nowrap';

  const computed = window.getComputedStyle(input);
  span.style.fontFamily = computed.fontFamily;
  span.style.fontWeight = computed.fontWeight;
  span.style.letterSpacing = computed.letterSpacing;

  document.body.appendChild(span);

  let size = BASE_SIZE;

  while (size > MIN_SIZE) {
    span.style.fontSize = size + 'px';
    span.textContent = input.value;

    if (span.offsetWidth <= maxWidth) break;
    size--;
  }

  input.style.fontSize = size + 'px';

  document.body.removeChild(span);
}

/**
 * 初期状態で非表示にする列を制御
 * ・4台目
 * ・5台目
 */
function initHiddenColumns() {
  const table = document.querySelector('#calendar .calendar-table2');
  if (!table) return;

  // nth-child は「日付列」を含めた番号
  const hiddenIndexes = [10, 11]; // 4台目, 5台目

  hiddenIndexes.forEach(index => {
    const th = table.querySelector(`thead th:nth-child(${index})`);
    const tds = table.querySelectorAll(`tbody td:nth-child(${index})`);

    if (th) th.style.display = 'none';
    tds.forEach(td => td.style.display = 'none');
  });

  console.log('👻 初期非表示列を適用:', hiddenIndexes);
}


/**
 * 設置概要を「月単位」で一括取得してキャッシュ
 * @param {number} year  - 例: 2025
 * @param {number} month - 1〜12
 */
async function preloadInstallSummary(year, month) {
  const mm = String(month).padStart(2, '0');

  // ✅ 月末日を正しく計算
  const lastDay = new Date(year, month, 0).getDate();

  const start = `${year}-${mm}-01`;
  const end   = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

  console.log(`📦 preloadInstallSummary: ${start} 〜 ${end}`);

  try {
    const resp = await kintone.api(
      kintone.api.url('/k/v1/records', true),
      'GET',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        query: `日付 >= "${start}" and 日付 <= "${end}"`,
        fields: [
          '日付',
          'No',
          '分類',
          'メモ',
          'テキストカラー',
          'テキストボールド'
        ]
      }
    );

    resp.records.forEach(r => {
      const date = r['日付'].value;
      if (!installSummaryCache[date]) {
        installSummaryCache[date] = { 設置: {}, 回収: {} };
      }
      
      const category = r['分類']?.value;
      const no = Number(r['No'].value);
      
      installSummaryCache[date][category][no] = {
        text: r['メモ']?.value || '',
        color: r['テキストカラー']?.value || '#000000',
        bold: r['テキストボールド']?.value === 'ON'
      };
    });

    console.log('✅ preload 完了', installSummaryCache);

  } catch (error) {
    console.error('🚨 preloadInstallSummary 失敗:', error);
  }
}

const SUMMARY_FIELDS = {
  date: '日付',
  category: '分類',
  memo: 'メモ',
  color: 'テキストカラー',
  bold: 'テキストボールド'
};

function normalizeSummaryCategory(category) {
  if (category === '設置メモ') return '設置';
  if (category === '回収メモ') return '回収';
  return category;
}

async function saveInstallOrCollectMemo({
  isoDate,
  category,
  no,
  memo,
  color = '#000000',
  bold = false
}) {
  if (!no) return;

  const normalizedCategory = normalizeSummaryCategory(category);
  const searchResp = await kintone.api(
    kintone.api.url('/k/v1/records', true),
    'GET',
    {
      app: APP_IDS.INSTALL_SUMMARY,
      query: `
        ${SUMMARY_FIELDS.date} = "${isoDate}"
        and No = ${no}
        and ${SUMMARY_FIELDS.category} in ("${normalizedCategory}")
      `,
      fields: ['$id']
    }
  );

  const recordData = {
    [SUMMARY_FIELDS.date]: { value: isoDate },
    No: { value: no },
    [SUMMARY_FIELDS.category]: { value: normalizedCategory },
    [SUMMARY_FIELDS.memo]: { value: memo || '' },
    [SUMMARY_FIELDS.color]: { value: color },
    [SUMMARY_FIELDS.bold]: { value: bold ? 'ON' : '' }
  };

  if (searchResp.records.length > 0) {
    await kintone.api(
      kintone.api.url('/k/v1/record', true),
      'PUT',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        id: searchResp.records[0].$id.value,
        record: recordData
      }
    );
  } else {
    await kintone.api(
      kintone.api.url('/k/v1/record', true),
      'POST',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        record: recordData
      }
    );
  }
}

async function loadInstallOrCollectMemo(isoDate, category, no) {
  const normalizedCategory = normalizeSummaryCategory(category);
  const resp = await kintone.api(
    kintone.api.url('/k/v1/records', true),
    'GET',
    {
      app: APP_IDS.INSTALL_SUMMARY,
      query: `
        ${SUMMARY_FIELDS.date} = "${isoDate}"
        and No = ${no}
        and ${SUMMARY_FIELDS.category} in ("${normalizedCategory}")
      `,
      fields: [SUMMARY_FIELDS.memo]
    }
  );

  if (resp.records.length === 0) return '';
  return resp.records[0][SUMMARY_FIELDS.memo]?.value || '';
}

async function saveInstallSummary(isoDate, no, text, color, bold) {
  if (!text || !text.trim()) {
    await deleteInstallSummary(isoDate, no);
    return;
  }

  const searchResp = await kintone.api(
    kintone.api.url('/k/v1/records', true),
    'GET',
    {
      app: APP_IDS.INSTALL_SUMMARY,
      query: `${SUMMARY_FIELDS.date} = "${isoDate}" and No = ${no}`,
      fields: ['$id']
    }
  );

  const recordData = {
    [SUMMARY_FIELDS.date]: { value: isoDate },
    No: { value: no },
    [SUMMARY_FIELDS.memo]: { value: text },
    [SUMMARY_FIELDS.color]: { value: color },
    [SUMMARY_FIELDS.bold]: { value: bold ? 'ON' : '' }
  };

  if (searchResp.records.length > 0) {
    await kintone.api(
      kintone.api.url('/k/v1/record', true),
      'PUT',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        id: searchResp.records[0].$id.value,
        record: recordData
      }
    );
  } else {
    await kintone.api(
      kintone.api.url('/k/v1/record', true),
      'POST',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        record: recordData
      }
    );
  }
}

async function preloadInstallSummary(year, month) {
  const mm = String(month).padStart(2, '0');
  const lastDay = new Date(year, month, 0).getDate();
  const start = `${year}-${mm}-01`;
  const end = `${year}-${mm}-${String(lastDay).padStart(2, '0')}`;

  try {
    const resp = await kintone.api(
      kintone.api.url('/k/v1/records', true),
      'GET',
      {
        app: APP_IDS.INSTALL_SUMMARY,
        query: `${SUMMARY_FIELDS.date} >= "${start}" and ${SUMMARY_FIELDS.date} <= "${end}"`,
        fields: [
          SUMMARY_FIELDS.date,
          'No',
          SUMMARY_FIELDS.category,
          SUMMARY_FIELDS.memo,
          SUMMARY_FIELDS.color,
          SUMMARY_FIELDS.bold
        ]
      }
    );

    resp.records.forEach(r => {
      const date = r[SUMMARY_FIELDS.date]?.value;
      if (!date) return;

      if (!installSummaryCache[date]) {
        installSummaryCache[date] = { '\u8a2d\u7f6e': {}, '\u56de\u53ce': {} };
      }

      const category = normalizeSummaryCategory(r[SUMMARY_FIELDS.category]?.value || '');
      if (!installSummaryCache[date][category]) return;

      const no = Number(r['No']?.value);
      if (!no) return;

      installSummaryCache[date][category][no] = {
        text: r[SUMMARY_FIELDS.memo]?.value || '',
        color: r[SUMMARY_FIELDS.color]?.value || '#000000',
        bold: r[SUMMARY_FIELDS.bold]?.value === 'ON'
      };
    });
  } catch (error) {
    console.error('preloadInstallSummary failed', error);
  }
}

