(function () {
    'use strict';

    // SortableJSの読み込み関数（必要なら軽量版へ置き換え）
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

    // レコードの更新関数
    function updateRecord(recordId, newDate, newStatus, newTaskKind) {
        var body = {
            app: kintone.app.getId(),
            id: recordId,
            record: {
                "日付": { "value": newDate },
                "調整状況": { "value": newStatus },
                "タスク": { "value": newTaskKind }
            }
        };
        kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', body, function () {
            console.log('Record updated successfully');
        }, function (error) {
            console.error('Error updating record:', error);
        });
    }

    // タスク順序の保存関数
    function saveTaskOrder(container) {
        var tasks = container.children;
        var updates = [];
        for (var i = 0; i < tasks.length; i++) {
            var recordId = tasks[i].dataset.recordId;
            updates.push({
                id: recordId,
                record: {
                    "順番": { "value": i + 1 }
                }
            });
        }
        var body = {
            app: kintone.app.getId(),
            records: updates
        };
        kintone.api(kintone.api.url('/k/v1/records', true), 'PUT', body, function () {
            console.log('Records updated successfully');
        }, function (error) {
            console.error('Error updating records:', error);
        });
    }

    // カレンダーの生成関数
    function generateCalendar(year, month, containerId) {
        var daysInMonth = new Date(year, month + 1, 0).getDate();
        var dayNames = ['日', '月', '火', '水', '木', '金', '土'];
        var calendarHtml = '<div class="calendar-container">';

        for (var day = 1; day <= daysInMonth; day++) {
            var date = new Date(year, month, day);
            var dayOfWeek = date.getDay();
            calendarHtml += `
                <div class="calendar-day">
                    <div class="date-header">
                        ${day} (${dayNames[dayOfWeek]})
                    </div>
                    <div class="tasks-container" id="tasks-${day}"></div>
                </div>`;
        }

        calendarHtml += '</div>';
        var root = document.getElementById(containerId);
        if (!root) {
            console.error(`Calendar container not found: #${containerId}`);
            return;
        }
        root.innerHTML = calendarHtml;

        loadSortableJS(function () {
            var containers = document.querySelectorAll('.tasks-container');
            containers.forEach(function (container) {
                new Sortable(container, {
                    group: 'tasks',
                    animation: 150,
                    onEnd: function (evt) {
                        var taskElement = evt.item;
                        saveTaskOrder(container);
                        console.log(`Task ${taskElement.dataset.recordId} moved`);
                    }
                });
            });
        });
    }

    // タスクの追加関数
    function addTaskToCalendar(record, day) {
        var taskElement = document.createElement('div');
        taskElement.className = 'task-item';
        taskElement.dataset.recordId = record.id;
        taskElement.textContent = record.name || 'Task';
        var tasksContainer = document.getElementById(`tasks-${day}`);
        if (tasksContainer) {
            tasksContainer.appendChild(taskElement);
        } else {
            console.error(`No tasks container found for day ${day}`);
        }
    }

    // メイン処理
    kintone.events.on('app.record.index.show', function (event) {
        // 現在の年月を取得
        var today = new Date();
        var currentYear = today.getFullYear();
        var currentMonth = today.getMonth();

        // カレンダーを生成
        var containerId = 'calendarContainer';
        if (!document.getElementById(containerId)) {
            // 対象DOMがない一覧ビューでは何もしない
            return event;
        }
        generateCalendar(currentYear, currentMonth, containerId);

        // カレンダー要素にスタイルを適用
        var calendarContainer = document.getElementById(containerId);
        if (calendarContainer) {
            calendarContainer.style.display = 'grid';
            calendarContainer.style.gridTemplateColumns = 'repeat(auto-fit, minmax(100px, 1fr))';
            calendarContainer.style.gap = '10px';
        }

        // サンプルデータのタスクをカレンダーに追加
        var sampleTasks = [
            { id: '1', name: 'タスク1', day: 1 },
            { id: '2', name: 'タスク2', day: 5 },
            { id: '3', name: 'タスク3', day: 10 }
        ];

        sampleTasks.forEach(function (task) {
            addTaskToCalendar(task, task.day);
        });

        return event;
    });
})();
