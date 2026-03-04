const deliappId = 129;
const satuappId = 157;

function updateTaskRecord(recordId, newDate, newStatus, newTaskKind) {
    var body = {
        app: kintone.app.getId(),
        id: recordId,
        record: {
            "日付": {"value": newDate},
            "調整状況": {"value": newStatus},
            "タスク": {"value": newTaskKind}
        }
    };
    kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function(resp) {
        console.log('Record updated successfully');
    }, function(error) {
        console.error('Error updating record:', error);
    });
}

function updateRecordOrder(recordId, order) {
    var body = {
        app: kintone.app.getId(),
        id: recordId,
        record: {
            "順番": {"value": order}
        }
    };
    kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function(resp) {
        console.log('Record order updated successfully');
    }, function(error) {
        console.error('Error updating record order:', error);
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

function saveTaskOrder(container) {
    var tasks = container.querySelectorAll('.task-bar');
    var updates = [];
    for (var i = 0; i < tasks.length; i++) {
        var recordId = tasks[i].dataset.recordId;

        // 数値を丸付き数字に変換
        var orderSymbol = convertNumberToSymbol(i + 1);

        if (!orderSymbol) {
            console.error('順番が範囲外です: ', i + 1);
            continue; // 範囲外の値はスキップ
        }

        // 更新データを作成
        updates.push({
            id: recordId,
            record: {
                "表示順": { "value": orderSymbol } // 丸付き数字を保存
            }
        });
    }

    // 一括更新処理を実行
    updateTaskRecords(updates);
}



function updateTaskText(recordId, line1, line2, callback) {
    // 最大文字数の制限
    const LINE1_MAX_LENGTH = 23;
    const LINE2_MAX_LENGTH = 25;

    // 入力値の文字数チェック
    if (line1.length > LINE1_MAX_LENGTH) {
        const errorMessage = `エラー: 入力内容が最大文字数（${LINE1_MAX_LENGTH}文字）を超えています。`;
        console.error(errorMessage);
        alert(errorMessage);
        if (callback) {
            callback(new Error(errorMessage), null);
        }
        location.reload();
        return; // 更新処理を中断
    }
    // 入力値の文字数チェック
    if (line2.length > LINE2_MAX_LENGTH) {
        const errorMessage = `エラー: 入力内容が最大文字数（${LINE2_MAX_LENGTH}文字）を超えています。`;
        console.error(errorMessage);
        alert(errorMessage);
        if (callback) {
            callback(new Error(errorMessage), null);
        }
        location.reload();
        return; // 更新処理を中断
    }

    // 空の場合は空文字列に設定
    line1 = line1 || '';
    line2 = line2 || '';
    
    var body = {
        app: kintone.app.getId(), // アプリIDを取得
        id: recordId,            // レコードID
        record: {
            "タスクバー上段表示_edit": { value: line1 }, // 1行目のフィールド
            "タスクバー下段表示_edit": { value: line2 }  // 2行目のフィールド
        }
    };

    // Kintone API を使ってデータを更新
    kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function(resp) {
        // 成功時の処理
        if (callback) {
            callback(null, resp);
        }
    }, function(error) {
        // 失敗時の処理
        if (callback) {
            callback(error, null);
        }
    });
}



function loadTasks(records, year, month) {
    // 丸付き数字を数値に変換してソート
    records.sort(function(a, b) {
        const numA = convertSymbolToNumber(a['表示順'].value);
        const numB = convertSymbolToNumber(b['表示順'].value);
        return numA - numB;
    });
debugger;
    // コンテナをクリアする処理
    document.getElementById('task-irai').innerHTML = '';

    // ソートされた順序でタスクをカレンダーに追加
    records.forEach(function(record) {
        // 順番を丸付き数字として表示
        const order = convertSymbolToNumber(record['表示順'].value);
        console.log(`タスク順番: ${order}`);

        if (record['タスク'].value === '依頼') {
            addCaseBarToTaskspace(record);
        } else {
            addTaskToCalendar(record);
        }
    });
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

function handleSortEnd(evt, year, month) {
    var taskElement = evt.item;
    const containerId = evt.to.id; // e.g., "secchi-0"
    var idParts = evt.to.id.split('-');
    var recordId = taskElement.dataset.recordId;
    // コンテナの ID を解析
    const secchiIndex = containerId.split('-').pop(); // "0", "1", "2"
    const newDate = new Date(year, month, parseInt(secchiIndex, 10) + 1); // 日付計算 (例: "secchi-0" -> 1日)

    const container = evt.to; // 移動先のコンテナ
    const isoDate = container.getAttribute('data-date');

    const newStatus = '調整中';

    var newContainerId = idParts[1];
    // 年が変わる場合を考慮
    var newTaskKind = '';
    // タスクの種類を決定
    if (containerId==="task-irai") {
        newTaskKind = '依頼';
    } else if (containerId==="task-gencho") {
        newTaskKind = '現調';
    } else if (containerId==="task-plan") {
        newTaskKind = 'プラン作成';
    } else if (containerId==="task-secchi") {
        newTaskKind = '設置予定';
    } else if (containerId==="task-kaishu") {
        newTaskKind = '回収予定';
    } else if (containerId==="task-1st") {
        newTaskKind = '1台目';
    } else if (containerId==="task-2nd") {
        newTaskKind = '2台目';
    } else if (containerId==="task-3rd") {
        newTaskKind = '3台目';
    } else if (containerId==="task-4th") {
        newTaskKind = '4台目';
    } else if (containerId==="task-5th") {
        newTaskKind = '5台目';
    } else if (containerId==="task-satsuei") {
        newTaskKind = '撮影';
    }

    // 確認メッセージを表示 
    if (taskElement.classList.contains('task-confirmed')) { 
      if (!confirm('このタスクを移動するとステータスが「調整中」に戻ります。よろしいですか？')) { 
        // ユーザーがキャンセルした場合、タスクバーを元の位置に戻す 
        evt.from.appendChild(taskElement);
        return; // ユーザーがキャンセルした場合、処理を中断 
      }
    }
    // レコードを更新
    updateTaskRecord(recordId,isoDate, '調整中', newTaskKind);

    // タスクの表示を更新 
    taskElement.classList.remove('task-confirmed', 'task-completed'); 
    taskElement.classList.add('task-adjusting'); 
    var toggleButton = taskElement.querySelector('button'); 
    toggleButton.textContent = '確定'; 
    toggleButton.className ='button-adjusting';

    taskElement.dataset.status = '調整中';
    taskElement.dataset.date = isoDate; // 日付情報を更新
    
    // タスクの順序を保存
    saveTaskOrder(evt.to);
}

function populateCell(cell, taskElement, dropdown) {
    // セルの内容をクリアせず、両方を追加
    const container = document.createElement('div');
    container.style.display = 'flex'; // 水平に並べるためのスタイル
    container.style.flexDirection = 'column'; // 垂直方向に配置する場合
    container.style.alignItems = 'flex-start'; // 必要に応じて位置調整

    // タスクバーとプルダウンを追加
    container.appendChild(taskElement);
    container.appendChild(dropdown);

    // セルにコンテナを配置
    cell.innerHTML = ''; // セルをクリア
    cell.appendChild(container);
}

function addCaseBarToTaskspace(record) {
    const taskElement = document.createElement('div');
    taskElement.className = 'case-bar';
    taskElement.dataset.recordId = record['$id'].value;

    // 案件バーに表示する内容
    const taskName = record['現場名'] ? record['現場名'].value : '未設定';
    taskElement.textContent = taskName;

    // ダブルクリックで詳細画面に遷移
    taskElement.addEventListener('dblclick', function () {
        const recordId = taskElement.dataset.recordId;
        const detailUrl = `/k/${kintone.app.getId()}/show#record=${recordId}`;
        window.location.href = detailUrl;
    });

    // 「実行中案件＝（依頼）」エリアに追加
    document.getElementById('task-irai').appendChild(taskElement);
}

function addTaskToCalendar(record, year, month) {
    var taskName = record['現場名'] ? record['現場名'].value : 'No Task Name';
    var taskDate = record['日付'].value ? new Date(record['日付'].value) : null;
    var taskYear = taskDate ? taskDate.getFullYear() : null;
    var taskMonth = taskDate ? taskDate.getMonth() : null;
    var taskDay = taskDate ? taskDate.getDate() : null;
    const caseNumber = record['案件番号'] ? record['案件番号'].value : null;
    var taskKind = record['タスク'].value;
    var taskId = record['$id'].value;
    var taskNo = record['表示順'].value;
    var status = record['調整状況'].value;
    var shosai = record['詳細'].value;
    var upsideBar = record['タスクバー上段表示_edit'].value ? record['タスクバー上段表示_edit'].value : record['タスクバー上段表示_original'].value;
    var dwsideDisp = record['タスクバー下段表示_edit'].value ? record['タスクバー下段表示_edit'].value : record['タスクバー下段表示_original'].value;
    // 条件分岐で taskNo を付けるかどうかを判定
    var upsideDisp = record['タスクバー上段表示_edit'].value 
      ? upsideBar 
      : taskNo + '　' + upsideBar;
    
    var biko = record['備考'].value;
    var dueDate = record['締切日'] ? record['締切日'].value : null; // 締切日フィールドを追加
    var relocationSource = record['移設元現場名'] ? record['移設元現場名'].value : null; // 移設元現場名を取得


    var taskElement = document.createElement('div');
    //taskElement.className = relocationSourceFlag ? 'task-bar child-task' : 'task-bar parent-task';
    taskElement.className = 'task-bar';
    taskElement.dataset.recordId = taskId;

//    if (relocationSourceFlag) {
//        taskElement.dataset.parentCaseNumber = caseNumber;
//    }

    taskElement.dataset.date = taskDate ? taskDate.toISOString().split('T')[0] : ''; // 日付情報をデータ属性に設定
    taskElement.dataset.dueDate = dueDate; // 締切日をデータ属性に設定

    if (status === '調整中') {
        taskElement.classList.add('task-adjusting');
    } else if (status === '確定') {
        taskElement.classList.add('task-confirmed');
    } else if (status === '完了') {
        taskElement.classList.add('task-completed');
    }

    if (taskDate && dueDate) {
        updateTaskBarBorderColor(taskElement, taskDate, dueDate);
    }

    addStatusButton(taskElement, status, taskId, taskKind);

    // 上段（テキスト）　改行　下段（テキスト）
    var taskText = document.createElement('div');
    taskText.className = 'task-text';
    taskText.innerHTML = `${upsideDisp}<br>${dwsideDisp}`; // 上段表示　改行　下段表示
/*
    if (taskbarDisp.includes('→')) {
        taskText.innerHTML = `<span style="color: black;">${taskbarDisp}</span>`;
    } else {
        taskText.innerHTML = `${upsideDisp}<br>${dwsideDisp}`; // 改行を挿入
    }
 */
    taskText.contentEditable = 'false';
    taskText.style.cursor = 'pointer';



    taskText.style.overflow = 'hidden';
    taskText.style.textOverflow = 'ellipsis';
    taskText.style.whiteSpace = 'nowrap';
    taskElement.appendChild(taskText);


    taskElement.appendChild(taskText);
    document.body.appendChild(taskElement);

    var tooltip = document.createElement('div');
    tooltip.className = 'tooltip';
    tooltip.textContent = `締切：${dueDate} 順番: ${taskNo}\n現場名: ${taskName}\n状況: ${status}\n詳細: ${shosai}\n備考: ${biko}`;
    tooltip.style.zIndex = 10000;

    document.body.appendChild(tooltip);

    if (taskDate) {
        const taskDateISO = taskDate.toISOString().split('T')[0];

        let container = document.querySelector(`td[data-date="${taskDate.toISOString().split('T')[0]}"]`);
        switch (taskKind) {
        case '現調':
            container = document.querySelector(`td[data-date="${taskDateISO}"][id="task-gencho"]`);
            break;
        case 'プラン作成':
            container = document.querySelector(`td[data-date="${taskDateISO}"][id="task-plan"]`);
            break;
        case '設置予定':
            container = document.querySelector(`td[data-date="${taskDateISO}"][id="task-secchi"]`);
            break;
        case '回収予定':
            container = document.querySelector(`td[data-date="${taskDateISO}"][id="task-kaishu"]`);
            break;
        case '1台目':
            container = document.querySelector(`td[data-date="${taskDateISO}"][id="task-1st"]`);
            break;
        case '2台目':
            container = document.querySelector(`td[data-date="${taskDateISO}"][id="task-2nd"]`);
            break;
        case '3台目':
            container = document.querySelector(`td[data-date="${taskDateISO}"][id="task-3rd"]`);
            break;
        case '4台目':
            container = document.querySelector(`td[data-date="${taskDateISO}"][id="task-4th"]`);
            break;
        case '5台目':
            container = document.querySelector(`td[data-date="${taskDateISO}"][id="task-5th"]`);
            break;
        case '撮影':
            container = document.querySelector(`td[data-date="${taskDateISO}"][id="task-satsuei"]`);
            break;
        default:
            console.log('タスク種類が未定義:', taskKind);
            break;
        }

        if (container) {
            container.appendChild(taskElement);
        }
    }

    if (tooltip) {
        tooltip.dataset.recordId = taskElement.dataset.recordId;
        taskElement.addEventListener('mouseover', () => {
            tooltip.style.display = 'block';
            adjustTooltipPosition(tooltip, taskElement);
        });

        taskElement.addEventListener('mouseout', () => {
            tooltip.style.display = 'none';
        });
    }
    let isDragging = false;

    taskText.addEventListener('mousedown', function () {
        isDragging = false; // ドラッグの開始準備
        // ツールチップを非表示にする
        const tooltip = document.querySelector(`.tooltip[data-record-id="${taskElement.dataset.recordId}"]`);
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    });

    taskText.addEventListener('mousemove', function () {
        isDragging = true; // ドラッグ中にフラグを設定
    });

    taskText.addEventListener('mouseup', function () {
        if (isDragging) {
            isDragging = false; // ドラッグが終了
            return; // ドラッグ中は他の処理を無効化
        }
    });

    // シングルクリックでテキスト編集
    taskText.addEventListener('click', function (event) {
        if (!isDragging && event.detail === 1) { // シングルクリックかつドラッグでない場合
            event.stopPropagation();
            if (status === '調整中' || status === '確定' ) {
                taskText.contentEditable = 'true';
                taskText.focus();
            }
        }
    });

    taskText.addEventListener('blur', function () {
        var newText = taskText.innerText;
        console.log('新しいテキスト:', newText);
        let [line1, line2] = newText.split('\n');
        console.log('上段テキスト:', line1);
        console.log('下段テキスト:', line2);

        
        if(record['タスクバー上段表示_original'].value !== line1 ||record['タスクバー下段表示_original'].value !== line2  ){
          if(record['タスクバー上段表示_original'].value === line1){
            line1 = '';
          }
          if(record['タスクバー下段表示_original'].value === line2){
            line2 = '';
          }

          // 現在のレコードIDを取得
          const recordId = taskElement.dataset.recordId;
          console.log('ID:', recordId);
          updateTaskText(recordId, line1, line2, function(error, resp) {
              if (error) {
                  console.error('タスクの保存に失敗しました:', error);
                  alert('タスクの保存に失敗しました。もう一度試してください。');
              } else {
                  console.log('タスクテキストが保存されました:', resp);
              }
          });
        }
    });

    taskText.addEventListener('dblclick', function (event) {
        const recordId = taskElement.dataset.recordId;
        const detailUrl = `/k/${kintone.app.getId()}/show#record=${recordId}`;
        window.location.href = detailUrl;
    });

    taskElement.addEventListener('dblclick', function (event) {
        const recordId = taskElement.dataset.recordId;
        const detailUrl = `/k/${kintone.app.getId()}/show#record=${recordId}`;
        window.location.href = detailUrl;
    });


}

function addStatusButton(taskElement, status, taskId, taskKind) {
    var toggleButton = document.createElement('button');
    toggleButton.textContent = (status === '調整中') ? '確定' : (status === '確定') ? '完了' : '訂正';
    toggleButton.classList.add((status === '調整中') ? 'button-adjusting' : (status === '確定') ? 'button-confirmed' : (status === '完了') ? 'button-completed' : '');

    toggleButton.addEventListener('click', function (event) {
        event.stopPropagation();
        var currentStatus = taskElement.dataset.status || status;
        var currentDate = taskElement.dataset.date;
        var newStatus;

        if (currentStatus === '調整中') {
            newStatus = '確定';
        } else if (currentStatus === '確定') {
            newStatus = '完了';
        } else {
            if (confirm('内容を訂正しますか？')) {
                newStatus = '確定';
            } else {
                return;
            }
        }

        updateTaskRecord(taskId, currentDate, newStatus, taskKind);
        taskElement.classList.toggle('task-adjusting', newStatus === '調整中');
        taskElement.classList.toggle('task-confirmed', newStatus === '確定');
        taskElement.classList.toggle('task-completed', newStatus === '完了');
        taskElement.dataset.status = newStatus;
        toggleButton.textContent = (newStatus === '調整中') ? '確定' : (newStatus === '確定') ? '完了' : '訂正';
        toggleButton.className = (newStatus === '調整中') ? 'button-adjusting' : (newStatus === '確定') ? 'button-confirmed' : (newStatus === '完了') ? 'button-completed' : '';
    });

    taskElement.appendChild(toggleButton);
}


function adjustTooltipPosition(tooltipElement, taskElement) {
    const rect = taskElement.getBoundingClientRect();
    tooltipElement.style.position = 'absolute';
    tooltipElement.style.top = `${rect.top + window.scrollY + taskElement.offsetHeight - 45}px`;
    tooltipElement.style.left = `${rect.left + window.scrollX +370 }px`;
}

function updateTaskBarBorderColor(taskElement, taskDate, dueDate) {
    var taskDateObj = new Date(taskDate);
    var dueDateObj = new Date(dueDate);
    var timeDiff = dueDateObj - taskDateObj;
    var dayDiff = timeDiff / (1000 * 60 * 60 * 24);

    if (taskDateObj > dueDateObj) {
        taskElement.style.borderColor = 'red'; // 締切日を過ぎている場合は赤色
    } else if (taskDateObj.toDateString() === dueDateObj.toDateString()) {
        taskElement.style.borderColor = 'orange'; // 締切日当日の場合はオレンジ色
    } else if (dayDiff <= 3) {
        taskElement.style.borderColor = 'green'; // 3日以内の場合は緑色
    } else {
        taskElement.style.borderColor = 'blue'; // それ以上先の場合は青色
    }
}

function updateCurrentMonth(year, month ) {
    var monthNames = ["1月", "2月", "3月", "4月", "5月", "6月", "7月", "8月", "9月", "10月", "11月", "12月"];
    document.getElementById('current-month').textContent = year + "年 " + monthNames[month];
}

// Utility Functions
function kintoneApiWrapper(url, method, body, successCallback, errorCallback) {
    kintone.api(url, method, body, successCallback, errorCallback);
}

// Helper function to format date as YYYY-MM-DD in local time
function formatDateToLocalISO(date) {
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    return `${year}-${month}-${day}`;
}

// Fetch existing records and populate calendar cells
function fetchAndPopulateCells(year, month, containerId,callback) {
  try{
    const startDate = `${year}-${month + 1}-01`;
    const endDate = new Date(year, month + 2, 0).toISOString().split('T')[0]; // 次月の最終日を計算
    const query = `日付 >= "${startDate}" and 日付 <= "${endDate}" order by 日付 asc`;

    const body1 = {
        app: deliappId,
        query: query,
        fields: ["日付", "配送番号", "配送業者", "メモ", "$id"]
    };
    
    const body2 = {
        app: satuappId,
        query: query,
        fields: ["日付", "担当者", "メモ", "$id"]
    };

    
      // 最初のアプリのデータ取得
      kintoneApiWrapper(kintone.api.url('/k/v1/records', true),'GET', body1, (resp1) => {
          const recordMap = new Map();
          resp1.records.forEach(record => {
            const isoDate = formatDateToLocalISO(new Date(record["日付"].value));
            if (!recordMap.has(isoDate)) recordMap.set(isoDate, []);
            recordMap.get(isoDate).push(record);
          });
  
          // 2つ目のアプリのデータ取得
          kintoneApiWrapper(kintone.api.url('/k/v1/records', true), 'GET', body2, (resp2) => {
              const recordMap2 = new Map();
              resp2.records.forEach(record => {
                const isoDate = formatDateToLocalISO(new Date(record["日付"].value));
                if (!recordMap2.has(isoDate)) recordMap2.set(isoDate, []);
                recordMap2.get(isoDate).push(record);
              });
              // 両方の recordMap を渡してカレンダーセルを更新
              populateCalendarCells(recordMap, recordMap2, year, month, containerId);
  
              if (callback) {
                callback(); // 処理が完了したらコールバックを実行
              }
            },
            (error) => {
              console.error(`Failed to fetch records from second app: ${error.message}`);
            }
          );
        }, (error) => {
        console.error(`Failed to fetch records: ${error.message}`);
    });
  }catch(error){
        console.error('Failed to fetch and populate cells:', error);

  }
}

function populateCalendarCells(recordMap,recordMap2, year, month, containerId) {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysIn2Month = new Date(year, (month + 1) % 12 + 1, 0).getDate();
    var totalDay = daysInMonth + daysIn2Month;
    for (let day = 1; day <= totalDay; day++) {
        const isoDate = formatDateToLocalISO(new Date(year, month, day));
        const recordsForDate = (recordMap.get(isoDate) || []).sort((a, b) => parseInt(a["配送番号"].value || "0") - parseInt(b["配送番号"].value || "0"));
        document.querySelectorAll(`.calendar-cell[data-date="${isoDate}"]`).forEach((cell, index) => {
          if((cell.id === 'task-1st') || (cell.id === 'task-2nd')|| (cell.id === 'task-3rd')|| (cell.id === 'task-4th')|| (cell.id === 'task-5th')){
            const record = recordsForDate.find(record => parseInt(record["配送番号"].value, 10) === index + 1);
            populateDropdown(cell, record ? record["配送業者"].value : "", record, isoDate, index + 1);
          }
        });

        // recordMap2 の処理
        const recordsForDate2 = (recordMap2.get(isoDate) || []).sort((a, b) => parseInt(a["担当者"].value || "0") - parseInt(b["担当者"].value || "0"));
        document.querySelectorAll(`.calendar-cell[data-date="${isoDate}"]`).forEach((cell, index) => {
          if (cell.id === 'satsuei') {
//            const record = recordsForDate2.find(record => parseInt(record["担当者"].value, 10) === index + 1);
            const record = recordsForDate2.find(record =>record["担当者"].value);
            populateDropdown2(cell, record ? record["担当者"].value : "", record, isoDate, index + 1);
          }
        });        
    }
}

function populateDropdown2(cell, existingValue = "", record, date, column) {

    const sharedStyles = `
        height: 32px;
        padding: 4px;
        font-size: 14px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
        display: inline-block;
        vertical-align: top; /* 垂直方向の位置を揃える */
    `;

    // セルをクリア
    cell.innerHTML = "";
    // ドロップダウンを作成
    const dropdown = document.createElement('select');
    dropdown.style.cssText = sharedStyles;
    dropdown.style.width = '120px'; // 横幅を設定
    dropdown.innerHTML = `
        <option value="">選択してください</option>
        <option value="Aさん">Aさん</option>
        <option value="Bさん">Bさん</option>
        <option value="Cさん">Cさん</option>
    `;
    dropdown.value = existingValue;

    // ドロップダウン初期背景色を設定
    updateDropdownBackground(dropdown);

    // メモ入力フィールドを作成
    const memoInput = document.createElement('input');
    memoInput.style.cssText = sharedStyles;
    memoInput.style.width = '215px'; // 横幅を設定
    memoInput.style.marginRight = '8px'; // 余白を設定
    memoInput.type = 'text';
    memoInput.placeholder = 'メモを入力';

    const memo = record?.['メモ']?.value || ''; // メモフィールドを取得
    memoInput.value = memo;

    // メモ入力フィールドがフォーカスを外れたときの処理
    memoInput.addEventListener('blur', function () {
        const newMemo = memoInput.value;
        if (record) {
            if (newMemo !== memo) {
                console.log("新メモ:", newMemo);
                console.log("元メモ:", memo);
                updatePdownRecordMemo(record["$id"].value, dropdown.value, newMemo);
            }
        } else {
            createRecord2(satuappId, date, column, "選択してください", newMemo);
        }
    });

    // ドロップダウンの選択が変更されたときの処理
    dropdown.addEventListener('change', () => {
        const selectedValue = dropdown.value;

        if (!selectedValue) {
            alert('担当者を選択してください');
            return;
        }

        // 背景色を更新
        updateDropdownBackground(dropdown);

        if (record) {
            console.log("新業者:", selectedValue);
            console.log("元業者:", existingValue);
            updatePdownRecord2( record["$id"].value, selectedValue);
        } else {
            createRecord2(satuappId, date, column, selectedValue, "");
        }
    });
    // ドロップダウンとメモフィールドをセルに追加
    cell.appendChild(dropdown);
    cell.appendChild(memoInput);
}

function populateDropdown(cell, existingValue = "", record, date, column) {

    const sharedStyles = `
        height: 32px;
        padding: 4px;
        font-size: 14px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-sizing: border-box;
        display: inline-block;
        vertical-align: top; /* 垂直方向の位置を揃える */
    `;

    // セルをクリア
    cell.innerHTML = "";
    // ドロップダウンを作成
    const dropdown = document.createElement('select');
    dropdown.style.cssText = sharedStyles;
    dropdown.style.width = '120px'; // 横幅を設定
    dropdown.innerHTML = `
        <option value="">選択してください</option>
        <option value="配送業者A">配送業者A</option>
        <option value="配送業者B">配送業者B</option>
        <option value="配送業者C">配送業者C</option>
    `;
    dropdown.value = existingValue;

    // ドロップダウン初期背景色を設定
    updateDropdownBackground(dropdown);

    // メモ入力フィールドを作成
    const memoInput = document.createElement('input');
    memoInput.style.cssText = sharedStyles;
    memoInput.style.width = '215px'; // 横幅を設定
    memoInput.style.marginRight = '8px'; // 余白を設定
    memoInput.type = 'text';
    memoInput.placeholder = 'メモを入力';

    const memo = record?.['メモ']?.value || ''; // メモフィールドを取得
    memoInput.value = memo;

    // メモ入力フィールドがフォーカスを外れたときの処理
    memoInput.addEventListener('blur', function () {
        const newMemo = memoInput.value;
        if (record) {
            if (newMemo !== memo) {
                console.log("新メモ:", newMemo);
                console.log("元メモ:", memo);
                updatePdownRecordMemo(record["$id"].value, dropdown.value, newMemo);
            }
        } else {
            createRecord(deliappId, date, column, "選択してください", newMemo);
        }
    });

    // ドロップダウンの選択が変更されたときの処理
    dropdown.addEventListener('change', () => {
        const selectedValue = dropdown.value;

        if (!selectedValue) {
            alert('配送業者を選択してください');
            return;
        }

        // 背景色を更新
        updateDropdownBackground(dropdown);

        if (record) {
            console.log("新業者:", selectedValue);
            console.log("元業者:", existingValue);
            updatePdownRecord( record["$id"].value, selectedValue);
        } else {
            createRecord(deliappId, date, column, selectedValue, "");
        }
    });
    // ドロップダウンとメモフィールドをセルに追加
    cell.appendChild(dropdown);
    cell.appendChild(memoInput);
}

// 選択状態の背景色を設定する関数
function updateDropdownBackground(dropdown) {
    const selectedBackgroundColors = {
        '配送業者A': '#FFD700', // ゴールド
        '配送業者B': '#7FFFD4', // アクアマリン
        '配送業者C': '#FF6347', // トマト
        '': '#FFFFFF' // デフォルト（白）
    };
    const selectedValue = dropdown.value;
    const bgColor = selectedBackgroundColors[selectedValue] || '#FFFFFF';
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
function updatePdownRecord2(recordId, selectedValue) {
    const updateBody = {
        app: satuappId,
        id: recordId,
        record: {
            "担当者": { "value": selectedValue }
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

function createRecord2(appId, date, column, selectedValue, newMemo) {
    const createBody = {
        app: appId,
        record: {
            "日付": { "value": date },
            "メモ": { "value": newMemo },
            "担当者": { "value": selectedValue }
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
    var daysInFirstMonth = new Date(year, month + 1, 0).getDate();
    var daysInSecondMonth = new Date(year, (month + 1) % 12 + 1, 0).getDate();
    var totalDays = daysInFirstMonth + daysInSecondMonth;
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];

    let calendarHtml = '<table class="calendar-table"><thead class="calendar-header"><tr><th class="date">日付</th>\
        <th class="task">現調</th> \
        <th class="task">プラン作成</th> \
        <th class="task">設定予定</th> \
        <th class="task">回収予定</th> \
        <th class="task">1台目</th> \
        <th class="task">2台目</th> \
        <th class="task">3台目</th> \
        <th class="task">4台目</th> \
        <th class="task">5台目</th> \
        <th class="task">撮影・現調</th></tr></thead><tbody>';

    for (let day = 1; day <= totalDays; day++) {
        // 現在の月と次の月を適切に計算
        let currentYear = year;
        let currentMonth = month;
        let currentDay = day;

        if (day > daysInFirstMonth) {
            currentMonth = (month + 1) % 12; // 翌月に切り替え
            currentDay = day - daysInFirstMonth; // 翌月の日付に変換
            if (currentMonth === 0) {
                currentYear += 1; // 年を繰り上げ
            }
        }

        const date = new Date(currentYear, currentMonth, currentDay);
        const isoDate = formatDateToLocalISO(date);
        const dayLabel = `${currentMonth + 1}月${currentDay}日 (${dayNames[date.getDay()]})`;

        calendarHtml += `<tr><td class="dateindex">${dayLabel}</td>
            <td data-date="${isoDate}" class="calendar-cell " id="task-gencho"></td>
            <td data-date="${isoDate}" class="calendar-cell " id="task-plan"></td>
            <td data-date="${isoDate}" class="calendar-cell " id="task-secchi"></td>
            <td data-date="${isoDate}" class="calendar-cell " id="task-kaishu"></td>
            <td data-date="${isoDate}" class="calendar-cell " id="task-1st"></td>
            <td data-date="${isoDate}" class="calendar-cell " id="task-2nd"></td>
            <td data-date="${isoDate}" class="calendar-cell " id="task-3rd"></td>
            <td data-date="${isoDate}" class="calendar-cell " id="task-4th"></td>
            <td data-date="${isoDate}" class="calendar-cell " id="task-5th"></td>
            <td data-date="${isoDate}" class="calendar-cell " id="satsuei"></td>
        </tr>`;
    }

    calendarHtml += '</tbody></table>';
    document.getElementById(containerId).innerHTML = calendarHtml;

loadSortableJS(() => {
//    const sharedGroupName = 'shared-task-group'; // 共有グループ名
//    const sharedTasks = ['secchi', 'kaishu', '1st', '2nd', '3rd', '4th', '5th']; // 共有グループのIDサフィックス

    const containers = document.querySelectorAll(`#${containerId} .calendar-cell`);
    containers.forEach(container => {
        var groupName = container.id.split('-')[1]; // タスク種類を取得

        if (groupName === 'secchi' || groupName === 'kaishu' || groupName === '1st' || groupName === '2nd' || groupName === '3rd' || groupName === '4th' || groupName === '5th') {
            groupName = 'secchi'; // 設置A、設置B、設置Cは同じグループ
        }
        new Sortable(container, {
            group: {
                name: groupName,
                put: groupName
//                put: sharedTasks.includes(groupName) ? sharedGroupName : groupName, // 共有グループの場合は共有グループを許可
//                pull: sharedTasks.includes(groupName) ? sharedGroupName : false   // 共有グループのみ移動可能
            },
            animation: 150,
            draggable: '.task-bar',
            filter: '.task-completed', // 完了タスクをドラッグ不可にする
            onMove: function(evt) {
                console.log('移動中:', evt);
                return !evt.related.classList.contains('task-completed'); // 完了タスクへの移動を禁止
            },
            onEnd: function(evt) {
                console.log('移動完了:', evt);

                handleSortEnd(evt, year, month); // 移動終了後の処理
            }
        });
    });
});

}

function updateCalendar(year,month,kintoneEvent) {
  
    generateCalendar(year, month, 'calendar', deliappId);
    document.getElementById('current-month').textContent = `${year}年 ${month + 1}月`;
        
    updateCurrentMonth(year, month);
    var records = kintoneEvent.records;
        
    fetchAndPopulateCells(year, month, 'calendar', () => {
        console.log('fetchAndPopulateCells が完了しました。次に loadTasks を実行します。');
        loadTasks(records, year, month);
    });

    localStorage.setItem('calendarYear', year);
    localStorage.setItem('calendarMonth', month);
}


(function() {
'use strict';

    kintone.events.on('app.record.index.show', function(kintoneEvent) {
        const viewId = kintoneEvent.viewId;
debugger;        
        if (viewId !== 8223617) return kintoneEvent;

        const records = kintoneEvent.records;
        
        // デフォルト値を指定してソート
        records.sort((a, b) => {
            const dateA = new Date(a['日付']?.value || '1970-01-01');
            const dateB = new Date(b['日付']?.value || '1970-01-01');

            if (dateA.getTime() !== dateB.getTime()) {
                return dateA - dateB;
            }
            const taskA = (a['タスク']?.value || '').toLowerCase();
            const taskB = (b['タスク']?.value || '').toLowerCase();

            return taskA.localeCompare(taskB);
        });
        

        const date = new Date();
        let year = parseInt(localStorage.getItem('calendarYear'), 10) || date.getFullYear();
        let month = parseInt(localStorage.getItem('calendarMonth'), 10) || date.getMonth();

        updateCalendar(year,month,kintoneEvent);

        document.getElementById('prev-month').addEventListener('click', () => {
            month = (month - 1 + 12) % 12;
            if (month === 11) year--;
//            updateCalendar();
            updateCalendar(year,month,kintoneEvent);
         });

        document.getElementById('now-month').addEventListener('click', () => {
            const today = new Date();
            year = today.getFullYear();
            month = today.getMonth();
            updateCalendar(year,month,kintoneEvent);
        });

        document.getElementById('next-month').addEventListener('click', () => {
            month = (month + 1) % 12;
            if (month === 0) year++;
            updateCalendar(year,month,kintoneEvent);
        });
        return kintoneEvent;
    });
})();
