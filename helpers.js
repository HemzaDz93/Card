/* ===================================
   ملف مساعد - تحسينات إضافية
   Helper Functions & Enhancements
   =================================== */

// ===== تحسين وظيفة الطباعة =====
function enhancedPrint() {
    const printWindow = window.open('', '', 'height=600,width=800');
    const printDoc = printWindow.document;
    
    const style = `
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            @page {
                size: A4;
                margin: 0;
                background: white;
            }
            
            @media print {
                * {
                    -webkit-print-color-adjust: exact !important;
                    print-color-adjust: exact !important;
                    color-adjust: exact !important;
                }
                
                .no-break {
                    page-break-inside: avoid;
                }
                
                body {
                    margin: 0;
                    padding: 40px 20px;
                    background: white;
                }
            }
            
            body {
                font-family: Arial, sans-serif;
                background: white;
                padding: 20px;
            }
            
            .print-container {
                display: flex;
                flex-direction: column;
                gap: 40px;
            }
            
            .card-section {
                page-break-after: always;
                text-align: center;
                padding: 20px;
                border: 1px dashed #ccc;
            }
            
            .card-section:last-child {
                page-break-after: avoid;
            }
            
            .card-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 20px;
                text-align: right;
                color: #333;
            }
            
            .instructions {
                background: #fffbea;
                border: 1px solid #fcd34d;
                padding: 15px;
                margin-top: 20px;
                border-radius: 5px;
                font-size: 12px;
                text-align: right;
                line-height: 1.6;
            }
            
            .instructions h4 {
                margin-bottom: 10px;
                color: #92400e;
                text-align: right;
            }
            
            .instructions ol {
                margin-right: 20px;
            }
            
            canvas {
                max-width: 100%;
                height: auto;
                border: 1px solid #ddd;
                border-radius: 5px;
                display: block;
                margin: 0 auto;
            }
            
            .page-info {
                font-size: 11px;
                color: #999;
                margin-top: 20px;
                text-align: center;
            }
        </style>
    `;
    
    const frontCanvas = appState.canvas.front.toCanvasElement();
    const backCanvas = appState.canvas.back.toCanvasElement();
    
    const frontDataUrl = frontCanvas.toDataURL('image/png');
    const backDataUrl = backCanvas.toDataURL('image/png');
    
    const content = `
        ${style}
        <body>
            <div class="print-container">
                <div class="card-section no-break">
                    <div class="card-title">الصورة الأمامية (Front Side)</div>
                    <img src="${frontDataUrl}" style="max-width: 90%; height: auto;">
                    <div class="page-info">الجانب الأمامي - Front Side</div>
                </div>
                
                <div class="card-section no-break">
                    <div class="card-title">الصورة الخلفية (Back Side)</div>
                    <img src="${backDataUrl}" style="max-width: 90%; height: auto;">
                    <div class="page-info">الجانب الخلفي - Back Side</div>
                </div>
                
                <div class="instructions">
                    <h4>📋 تعليمات الطباعة المهمة:</h4>
                    <ol>
                        <li>تأكد من تفعيل <strong>Duplex Printing</strong></li>
                        <li>اختر <strong>Flip on Long Edge</strong></li>
                        <li>اضبط الهوامش على <strong>None</strong></li>
                        <li>اختر جودة <strong>Best Quality</strong></li>
                        <li>اطبع على ورق عالي الجودة (280 gsm+)</li>
                        <li>اطبع نسخة تجريبية أولاً للتحقق من المحاذاة</li>
                    </ol>
                </div>
            </div>
        </body>
    `;
    
    printDoc.write(content);
    printDoc.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// ===== تحسين تصدير PDF =====
async function enhancedPDFExport() {
    try {
        updateStatus('جاري معالجة PDF...');
        
        const size = CARD_SIZE[appState.cardSize];
        const pdfWidth = size.width;
        const pdfHeight = size.height;
        
        // إنشاء PDF بحجم البطاقة
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: pdfWidth > pdfHeight ? 'landscape' : 'portrait',
            unit: 'mm',
            format: [pdfWidth + 10, (pdfHeight + 10) * 2]
        });
        
        // تحويل Canvas إلى صور
        const frontCanvas = appState.canvas.front.toCanvasElement();
        const backCanvas = appState.canvas.back.toCanvasElement();
        
        const frontImg = frontCanvas.toDataURL('image/png');
        const backImg = backCanvas.toDataURL('image/png');
        
        // حساب الأبعاد والتمركز
        const margin = 5;
        const imgWidth = pdfWidth;
        const imgHeight = pdfHeight;
        
        // إضافة الجانب الأمامي
        pdf.addImage(frontImg, 'PNG', margin, margin, imgWidth, imgHeight);
        
        // إضافة الجانب الخلفي أسفله
        pdf.addImage(backImg, 'PNG', margin, pdfHeight + margin + 8, imgWidth, imgHeight);
        
        // إضافة ملصقات
        const size2 = pdf.getPageSize();
        pdf.setFontSize(10);
        pdf.text('الصورة الأمامية (Front)', margin + imgWidth / 2, margin - 2, { align: 'center' });
        pdf.text('الصورة الخلفية (Back)', margin + imgWidth / 2, pdfHeight + margin + 6, { align: 'center' });
        
        // حفظ PDF
        pdf.save('ID_Card_Duplex.pdf');
        updateStatus('تم تصدير PDF بنجاح ✓');
        
    } catch (error) {
        console.error('خطأ في تصدير PDF:', error);
        updateStatus('حدث خطأ في التصدير: ' + error.message);
    }
}

// ===== دالة لتطبيق التصفية على الصورة =====
function applyImageFilter(filterType, intensity = 1) {
    const currentCanvas = appState.currentSide === 'front' ? 
        appState.canvas.front : appState.canvas.back;
    
    const objects = currentCanvas.getObjects();
    objects.forEach(obj => {
        if (obj.type === 'image') {
            switch(filterType) {
                case 'brightness':
                    obj.brightness = intensity;
                    break;
                case 'contrast':
                    obj.contrast = intensity;
                    break;
                case 'saturate':
                    obj.saturation = intensity;
                    break;
            }
        }
    });
    
    currentCanvas.renderAll();
}

// ===== دالة لقياس دقة الصورة =====
function getImageDPI() {
    return DPI; // 300 DPI
}

// ===== التحقق من توافق المتصفح =====
function checkBrowserCompatibility() {
    const checks = {
        canvas: !!document.createElement('canvas').getContext,
        localStorage: typeof(Storage) !== 'undefined',
        fileReader: typeof FileReader !== 'undefined',
        fabric: typeof fabric !== 'undefined',
        html2canvas: typeof html2canvas !== 'undefined',
        jspdf: typeof jspdf !== 'undefined'
    };
    
    console.log('فحص توافق المتصفح:', checks);
    
    const allOk = Object.values(checks).every(v => v);
    if (!allOk) {
        console.warn('تنبيه: بعض الميزات قد لا تعمل بشكل صحيح');
    }
    
    return checks;
}

// ===== تحسين معالجة الملفات =====
function validateImageFile(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    const maxSize = 10 * 1024 * 1024; // 10 MB
    
    if (!validTypes.includes(file.type)) {
        throw new Error('نوع الملف غير مدعوم. استخدم JPG أو PNG أو GIF');
    }
    
    if (file.size > maxSize) {
        throw new Error('حجم الملف كبير جداً. الحد الأقصى: 10 MB');
    }
    
    return true;
}

// ===== دالة لطباعة بطاقات متعددة على صفحة واحدة =====
function printMultipleCards(count = 10) {
    const printWindow = window.open('', '', 'height=600,width=800');
    const printDoc = printWindow.document;
    
    const pageSize = {
        width: 210, // A4 width mm
        height: 297 // A4 height mm
    };
    
    const cardSize = CARD_SIZE[appState.cardSize];
    const margin = 5;
    
    // حساب عدد البطاقات التي تناسب في الصفحة
    const cardsPerRow = Math.floor((pageSize.width - margin * 2) / (cardSize.width + margin));
    const cardsPerCol = Math.floor((pageSize.height - margin * 2) / (cardSize.height + margin));
    const cardsPerPage = cardsPerRow * cardsPerCol;
    
    let html = `
        <style>
            @page { size: A4; margin: 0; }
            @media print { body { margin: 0; padding: 0; } }
            body { margin: 0; padding: 5mm; font-family: Arial; }
            .card-grid { display: grid; grid-template-columns: repeat(${cardsPerRow}, 1fr); gap: 5mm; }
            .card { border: 1px dashed #ccc; padding: 5px; text-align: center; page-break-inside: avoid; }
            .card img { max-width: 100%; height: auto; }
        </style>
    `;
    
    html += '<div class="card-grid">';
    
    const frontCanvas = appState.canvas.front.toCanvasElement();
    const frontImg = frontCanvas.toDataURL('image/png');
    
    for (let i = 0; i < count; i++) {
        html += `
            <div class="card">
                <div style="font-size: 10px; margin-bottom: 5px; color: #999;">
                    البطاقة ${i + 1}
                </div>
                <img src="${frontImg}" alt="Card ${i + 1}">
            </div>
        `;
    }
    
    html += '</div>';
    
    printDoc.write(html);
    printDoc.close();
    
    setTimeout(() => {
        printWindow.print();
    }, 250);
}

// ===== حفظ الإعدادات الحالية =====
function saveCurrentSettings() {
    const settings = {
        cardSize: appState.cardSize,
        zoom: appState.zoom,
        rotation: appState.rotation,
        offsetX: appState.offsetX,
        offsetY: appState.offsetY,
        showGrid: appState.showGrid,
        showMarks: appState.showMarks,
        flipHorizontal: appState.flipHorizontal,
        flipVertical: appState.flipVertical,
        unit: document.getElementById('unit').value,
        timestamp: new Date().toISOString()
    };
    
    localStorage.setItem('lastSettings', JSON.stringify(settings));
    console.log('تم حفظ الإعدادات');
}

// ===== استعادة الإعدادات المحفوظة =====
function restoreLastSettings() {
    try {
        const settings = JSON.parse(localStorage.getItem('lastSettings'));
        if (!settings) return;
        
        // استعادة الإعدادات
        document.getElementById('cardSize').value = settings.cardSize;
        document.getElementById('unit').value = settings.unit;
        document.getElementById('zoomSlider').value = settings.zoom;
        document.getElementById('rotationSlider').value = settings.rotation;
        document.getElementById('offsetXSlider').value = settings.offsetX;
        document.getElementById('offsetYSlider').value = settings.offsetY;
        document.getElementById('showGrid').checked = settings.showGrid;
        document.getElementById('showMarks').checked = settings.showMarks;
        document.getElementById('flipHorizontal').checked = settings.flipHorizontal;
        document.getElementById('flipVertical').checked = settings.flipVertical;
        
        // تطبيق الإعدادات
        appState.cardSize = settings.cardSize;
        appState.zoom = settings.zoom;
        appState.rotation = settings.rotation;
        appState.offsetX = settings.offsetX;
        appState.offsetY = settings.offsetY;
        appState.showGrid = settings.showGrid;
        appState.showMarks = settings.showMarks;
        appState.flipHorizontal = settings.flipHorizontal;
        appState.flipVertical = settings.flipVertical;
        
        console.log('تم استعادة الإعدادات المحفوظة');
    } catch (error) {
        console.log('لا توجد إعدادات محفوظة سابقة');
    }
}

// ===== دالة لتوليد رمز QR (يمكن إضافتها لاحقاً) =====
function addQRCode(data) {
    // سيتم تنفيذها لاحقاً باستخدام مكتبة QR Code
    console.log('سيتم إضافة ميزة رمز QR قريباً');
}

// ===== الإخطارات =====
function showNotification(message, type = 'info', duration = 3000) {
    // يمكن تحسين هذا لاحقاً باستخدام مكتبة إخطارات
    updateStatus(message);
}

// ===== الاستكشاف التلقائي للمشاكل =====
function diagnostics() {
    console.group('🔍 تشخيص النظام');
    
    console.log('المتصفح:', navigator.userAgent);
    console.log('توافق المتصفح:', checkBrowserCompatibility());
    console.log('حالة التطبيق:', appState);
    console.log('حجم Local Storage:', JSON.stringify(localStorage).length);
    
    console.groupEnd();
}

// ===== تحديث وظيفة الطباعة الأصلية =====
if (typeof handlePrint !== 'undefined') {
    const originalPrint = handlePrint;
    window.handlePrint = function() {
        try {
            enhancedPrint();
        } catch (error) {
            console.error('خطأ في الطباعة:', error);
            updateStatus('حدث خطأ في الطباعة');
        }
    };
}

// ===== طباعة دفعة محسّنة =====
function enhancedBatchPrint() {
    if (!appState.batchImages || appState.batchImages.front.length === 0) {
        alert('الرجاء رفع صور البطاقات أولاً');
        return;
    }
    
    try {
        printBatch();
    } catch (error) {
        console.error('خطأ في طباعة الدفعة:', error);
        updateStatus('حدث خطأ في الطباعة');
    }
}

// ===== تصدير دفعة إلى PDF محسّن =====
async function enhancedBatchPDFExport() {
    if (!appState.batchImages || appState.batchImages.front.length === 0) {
        alert('الرجاء رفع صور البطاقات أولاً');
        return;
    }
    
    try {
        await exportBatchToPDF();
    } catch (error) {
        console.error('خطأ في تصدير الدفعة:', error);
        updateStatus('حدث خطأ في التصدير');
    }
}

// ===== تحديث وظيفة تصدير PDF الأصلية =====
if (typeof exportToPDF !== 'undefined') {
    const originalPDF = exportToPDF;
    window.exportToPDF = function() {
        try {
            enhancedPDFExport();
        } catch (error) {
            console.error('خطأ في تصدير PDF:', error);
            updateStatus('حدث خطأ في التصدير');
        }
    };
}

// ===== تشغيل الفحوصات عند بدء التطبيق =====
window.addEventListener('load', function() {
    console.log('✓ تم تحميل محرر بطاقات الهوية بنجاح');
    checkBrowserCompatibility();
    restoreLastSettings();
    
    // حفظ الإعدادات تلقائياً عند التغيير
    ['cardSize', 'unit', 'zoomSlider', 'rotationSlider', 
     'offsetXSlider', 'offsetYSlider', 'showGrid', 'showMarks', 
     'flipHorizontal', 'flipVertical'].forEach(id => {
        const element = document.getElementById(id);
        if (element) {
            element.addEventListener('change', saveCurrentSettings);
            element.addEventListener('input', saveCurrentSettings);
        }
    });
});

// ===== معالجة الأخطاء العامة =====
window.addEventListener('error', function(event) {
    console.error('خطأ في التطبيق:', event.error);
    updateStatus('حدث خطأ ✗');
});

console.log('✓ تم تحميل ملف المساعدات بنجاح');
