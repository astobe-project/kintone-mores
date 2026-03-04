/**
 * ファイル名   : PDFtoJPG.js　（PDF to JPG 変換ツール）
 * 最終更新日   : 2025/07/03
 * 作成者       : 小澤 竜一郎
 * 著作権       : © 2025 フィットコンサルティング. All rights reserved.
 * 概要         : このファイルは 以下を実装したものです。
 * フィールドコード「マイソク」にPDFファイルを格納し、保存ボタンを押すと
 * フィールドコード「マイソク_JPG_」にPDFをJPGファイルに変換したファイルを保管します。
 * バージョン   : 1.0.1（Array.prototype 汚染対策を追加）
 */
(async function () {
    'use strict';

    kintone.events.on(['app.record.create.submit', 'app.record.create.submit.success', 'app.record.edit.submit.success'], async function (event) {
        const recordId = event.recordId;
        const record = event.record;

        const fileFieldCode = 'マイソクPDF_QRコード'; // PDFファイルが入るフィールド
        const jpgFieldCode = 'マイソクJPG_QRコード自動'; // JPGファイルを保存するフィールド

        console.log("📌 [開始] レコード処理を開始します。");

        // **すでにJPGが存在するかチェック**
        const existingJpgFiles = record[jpgFieldCode]?.value;
        if (existingJpgFiles && existingJpgFiles.length > 0) {
            console.log(`⚠️ JPGファイルがすでに存在するため、処理を中止します。`);
            return event;
        }

        // 「マイソク」フィールドに格納されているファイルを取得
        const files = record[fileFieldCode]?.value;
        if (!files || files.length === 0) {
            console.log('⚠️ ファイルが存在しません。');
            return event;
        }

        console.log(`📌 [処理対象] ファイル数: ${files.length} 個`);

        try {
            // **JPGファイルを処理**
            const jpgFiles = await processMultipleFiles(files);
            
            console.log('📝 [JPGファイル一覧]:', jpgFiles);

            // **JPGファイルが1つ以上ある場合のみレコード更新**
            if (jpgFiles.length > 0) {
                console.log('📢 [レコード更新] 実行します:', {
                    id: recordId,
                    field: jpgFieldCode,
                    files: jpgFiles
                });

                await updateRecordWithJpgFiles(recordId, jpgFieldCode, jpgFiles);
            } else {
                console.log("✅ JPGファイルがないため、レコード更新をスキップしました。");
            }

        } catch (error) {
            console.error('❌ [エラー] 処理中にエラーが発生しました:', error);
        }

        return event;
    });

    // **PDF・JPGファイルを処理する関数**
    async function processMultipleFiles(files) {
        const jpgFiles = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            console.log(`🔄 [処理中] ファイル (${i + 1}/${files.length}): ${file.name}`);

            if (!file.fileKey) {
                console.warn(`⚠️ ファイル "${file.name}" の fileKey が無効です。処理をスキップします。`);
                continue;
            }
        
            console.log("🟢 fileKey:", file.fileKey);

            if (isJpgFile(file.name)) {
                // **既存のJPGを再アップロード**
                console.log(`📌 [JPGファイル] Kintoneに再アップロード: ${file.name}`);

                // **Kintoneから既存JPGを取得**
                const jpgBlob = await fetchFileFromKintone(file.fileKey);
                console.log(`✅ [取得成功] KintoneからJPGを取得: ${file.name}`);

                // **再アップロード**
                const newFileKey = await uploadFileToKintone(jpgBlob, file.name);
                console.log(`✅ [アップロード成功] 新しい fileKey を取得: ${newFileKey}`);

                jpgFiles.push({ fileKey: newFileKey });
            } else if (isPdfFile(file.name)) {
                // PDFファイルの場合 → JPGに変換
                console.log(`📄 [PDF変換] 変換開始: ${file.name}`);

                // PDFをBlob形式で取得
                const pdfBlob = await fetchFileFromKintone(file.fileKey);

                // PDFからJPGに変換
                const jpgBlob = await convertPdfToJpg(pdfBlob, i + 1);

                // KintoneにJPGファイルをアップロード
                const jpgFileName = file.name.replace(/\.pdf$/i, '') + '.jpg';
                const jpgFileKey = await uploadFileToKintone(jpgBlob, jpgFileName);

                if (jpgFileKey) {
                    jpgFiles.push({ fileKey: jpgFileKey });
                } else {
                    console.error(`❌ JPGファイルのアップロードに失敗しました: ${jpgFileName}`);
                }
            } else {
                console.log(`⚠️ 未対応のファイル形式: ${file.name}`);
            }
        }

        return jpgFiles;
    }

    // **Kintone からファイルを取得する関数**
    async function fetchFileFromKintone(fileKey) {
        const url = kintone.api.url('/k/v1/file', true) + `?fileKey=${fileKey}`;
        const response = await fetch(url, {
            method: 'GET',
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        return await response.blob();
    }

    // **PDF→JPG変換**
    async function convertPdfToJpg(pdfBlob, fileIndex) {
        console.log(`PDFファイル ${fileIndex} をJPGに変換中...`);

        // 🔧 Array.prototype 汚染対策
        ['each', 'first', 'last'].forEach(function(prop) {
            if (Array.prototype.hasOwnProperty(prop)) {
                Object.defineProperty(Array.prototype, prop, { enumerable: false });
            }
        });

        pdfjsLib.GlobalWorkerOptions.workerSrc =
            'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.14.305/pdf.worker.min.js';

        const pdfData = await pdfBlob.arrayBuffer();
        const pdf = await pdfjsLib.getDocument({ data: pdfData }).promise;

        const page = await pdf.getPage(1);

        // Canvasレンダリング
        const scale = 2.5;
        const viewport = page.getViewport({ scale });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        await page.render({ canvasContext: context, viewport: viewport }).promise;

        return new Promise((resolve) => {
            canvas.toBlob((blob) => {
                console.log(`PDF ${fileIndex} のJPG変換完了`);
                resolve(blob);
            }, 'image/jpeg', 1.0);
        });
    }

    // **ファイルをKintoneにアップロードする関数**
    async function uploadFileToKintone(fileBlob, fileName) {
        const formData = new FormData();
        formData.append('__REQUEST_TOKEN__', kintone.getRequestToken());
        formData.append('file', fileBlob, fileName);

        const response = await fetch(kintone.api.url('/k/v1/file', true), {
            method: 'POST',
            body: formData,
            headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        const data = await response.json();
        return data.fileKey;
    }

    // **拡張子チェック関数**
    function isJpgFile(fileName) {
        return /\.(jpg|jpeg)$/i.test(fileName);
    }

    function isPdfFile(fileName) {
        return /\.pdf$/i.test(fileName);
    }

    // **レコードを更新する関数**
    async function updateRecordWithJpgFiles(recordId, fieldCode, jpgFiles) {
        if (!jpgFiles || jpgFiles.length === 0) {
            console.log("🚫 [レコード更新] 更新するJPGファイルがありません。");
            return;
        }

        const params = {
            app: kintone.app.getId(),
            id: recordId,
            record: {
                [fieldCode]: {
                    value: jpgFiles
                }
            }
        };

        console.log('📡 [レコード更新パラメータ]:', JSON.stringify(params, null, 2));

        return await kintone.api(kintone.api.url('/k/v1/record', true), 'PUT', params)
            .then((resp) => {
                console.log('✅ [レコード更新成功]:', resp);
            })
            .catch((err) => {
                console.error('❌ [レコード更新エラー]:', err);
                throw new Error('レコード更新に失敗しました。');
            });
    }

})();
