/**
 * ファイル名   : PDFtoJPG.js　（PDF to JPG 変換ツール）
 * 最終更新日   : 2025/07/03
 * 作成者       : 小澤 竜一郎
 * 著作権       : © 2025 フィットコンサルティング. All rights reserved.
 * 概要         : このファイルは 以下を実装したものです。
 * フィールドコード「マイソク」にPDFファイルを格納し、保存ボタンを押すと
 * フィールドコード「マイソク_JPG_」にPDFをJPGファイルに変換したファイルを保管します。
 * バージョン   : 1.0.0
 */
(async function () {
    'use strict';

    const lambdaUrl = 'https://ymi6zskgkmki5v57rrunoisjmq0xadhj.lambda-url.ap-southeast-2.on.aws/';

    kintone.events.on(['app.record.create.submit', 'app.record.create.submit.success', 'app.record.edit.submit.success'], async function (event) {
        const recordId = event.recordId;
        const record = event.record;

        const fileFieldCode = 'マイソク'; // PDFファイルが入るフィールド
        const jpgFieldCode = 'マイソク_JPG'; // JPGファイルを保存するフィールド

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

    function base64ToBlob(base64, mimeType) {
        const binary = atob(base64);
        const length = binary.length;
        const bytes = new Uint8Array(length);

        for (let i = 0; i < length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }

        return new Blob([bytes], { type: mimeType });
    }


    // **PDF→JPG変換**
    async function convertPdfToJpg(pdfBlob, fileIndex) {
        console.log(`PDFファイル ${fileIndex} をJPGに変換中...`);
        const pdfBase64 = await blobToBase64(pdfBlob);
        console.log('[lambda request size]', pdfBase64.length);

        return new Promise((resolve, reject) => {
            kintone.proxy(
                lambdaUrl,
                'POST',
                { 'Content-Type': 'application/json' },
                JSON.stringify({
                    fileName: `source-${fileIndex}.pdf`,
                    pdfBase64: pdfBase64
                }),
                function(body, status, headers) {
                    try {
                        console.log('[lambda response]', status, body, headers);

                        if (status !== 200) {
                            reject(new Error(`Lambda変換エラー: ${status}`));
                            return;
                        }

                        const data = JSON.parse(body || '{}');

                        if (!data.ok) {
                            reject(new Error(data.message || 'Lambda変換に失敗しました。'));
                            return;
                        }

                        if (!data.jpgBase64) {
                            reject(new Error('Lambdaレスポンスに jpgBase64 がありません。'));
                            return;
                        }

                        resolve(base64ToBlob(data.jpgBase64, 'image/jpeg'));
                    } catch (error) {
                        reject(error);
                    }
                },
                function(error) {
                    console.error('[lambda error]', error);
                    reject(error);
                }
            );
        });
    }

    function blobToBase64(blob) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = function() {
                const result = reader.result || '';
                resolve(String(result).split(',')[1] || '');
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
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
