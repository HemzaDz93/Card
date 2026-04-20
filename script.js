/* ===================================
   محرر بطاقات الهوية - JavaScript
   ID Card Printer - Logic & Functionality
   
   الميزات الرئيسية:
   - رفع وتعديل صور البطاقات الأمامية والخلفية
   - معاينة حية بدقة 300 DPI
   - طباعة مزدوجة الوجه بمحاذاة دقيقة
   - تصدير PDF وصور PNG
   - إضافة وتعديل النصوص
   - حفظ وتحميل القوالب
   - شبكة مساعدة وعلامات تسجيل
   
   متطلبات المكتبات:
   - Fabric.js: معالجة الصور والرسومات
   - html2canvas: تحويل الصفحات إلى صور
   - jsPDF: إنشاء ملفات PDF
   
   =================================== */

// ===== متغيرات عامة =====
const CARD_SIZE = {
    standard: { width: 85.6, height: 54 },
    credit: { width: 85, height: 54 },
    custom: { width: 85.6, height: 54 }
};

const DPI = 300;
const MM_TO_PX = DPI / 25.4; // تحويل mm إلى pixels

let appState = {
    frontImage: null,
    backImage: null,
    cardSize: 'standard',
    unit: 'mm',
    currentSide: 'front',
    zoom: 1,
    rotation: 0,
    offsetX: 0,
    offsetY: 0,
    brightness: 0,
    contrast: 0,
    saturation: 0,
    showGrid: false,
    showMarks: false,
    flipHorizontal: false,
    flipVertical: false,
    textFields: [],
    canvas: {
        front: null,
        back: null
    },
    batchImages: {
        front: [],
        back: []
    },
    exportHistory: [],
    draggedCard: null,
    draggedSide: null,
    batchRows: 4,      // عدد الصفوف في الدفعة
    batchCols: 2       // عدد الأعمدة في الدفعة
};

// ===== بدء التطبيق =====
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

function initializeApp() {
    loadSavedData(); // تحميل البيانات المحفوظة
    setupEventListeners();
    createFabricCanvases();
    setupTabs();
    updateCardDimensions();
}

// ===== إعداد أحداث الاستماع =====
function setupEventListeners() {
    // ملفات الدفعة (مجموعة البطاقات)
    document.getElementById('batchFrontImages').addEventListener('change', handleBatchFrontImagesUpload);
    document.getElementById('batchBackImages').addEventListener('change', handleBatchBackImagesUpload);
    document.getElementById('clearBatchBtn').addEventListener('click', clearBatchImages);
    document.getElementById('previewBatchBtn').addEventListener('click', showBatchPreview);
    document.getElementById('printBatchBtn').addEventListener('click', printBatch);
    document.getElementById('exportBatchPdfBtn').addEventListener('click', exportBatchToPDF);
    
    // إعدادات تخطيط الدفعة (جديد)
    document.getElementById('batchRows')?.addEventListener('change', handleBatchLayoutChange);
    document.getElementById('batchCols')?.addEventListener('change', handleBatchLayoutChange);
    
    // تحسين تجربة الدفع بإضافة drag & drop
    setupBatchDragAndDrop();
    
    // التحكم بالصورة
    document.getElementById('sideSelect').addEventListener('change', handleSideChange);
    document.getElementById('zoomSlider').addEventListener('input', handleZoomChange);
    document.getElementById('rotationSlider').addEventListener('input', handleRotationChange);
    document.getElementById('offsetXSlider').addEventListener('input', handleOffsetXChange);
    document.getElementById('offsetYSlider').addEventListener('input', handleOffsetYChange);
    
    // تحسين الصور (جديد)
    document.getElementById('brightnessSlider').addEventListener('input', handleBrightnessChange);
    document.getElementById('contrastSlider').addEventListener('input', handleContrastChange);
    document.getElementById('saturationSlider').addEventListener('input', handleSaturationChange);
    document.getElementById('copyFrontToBackBtn').addEventListener('click', copyFrontToBack);
    document.getElementById('resetImageFilters').addEventListener('click', resetImageFilters);
    
    // الخيارات الإضافية
    document.getElementById('showGrid').addEventListener('change', handleGridToggle);
    document.getElementById('showMarks').addEventListener('change', handleMarksToggle);
    document.getElementById('flipHorizontal').addEventListener('change', handleFlipHorizontal);
    document.getElementById('flipVertical').addEventListener('change', handleFlipVertical);
    
    // النصوص
    document.getElementById('addTextField').addEventListener('click', addTextField);
    document.getElementById('clearAllText').addEventListener('click', clearAllText);
    
    // التصدير والطباعة
    document.getElementById('exportPdfBtn').addEventListener('click', exportToPDF);
    document.getElementById('exportPngBtn').addEventListener('click', exportToPNG);
    document.getElementById('printBtn').addEventListener('click', handlePrint);
    document.getElementById('saveTemplateBtn').addEventListener('click', saveTemplate);
    document.getElementById('loadTemplateBtn').addEventListener('click', loadTemplate);
    
    // عناصر جديدة
    document.getElementById('darkModeToggle').addEventListener('click', toggleDarkMode);
    document.getElementById('predefinedTemplates').addEventListener('change', applyPredefinedTemplate);
    document.getElementById('exportHistoryBtn').addEventListener('click', showExportHistory);
    document.getElementById('helpBtn').addEventListener('click', showHelp);
    
    // إغلاق النوافذ المنبثقة
    document.querySelectorAll('.close').forEach(btn => {
        btn.addEventListener('click', function() {
            this.closest('.modal').style.display = 'none';
        });
    });
    
    // اختصارات لوحة المفاتيح
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

// ===== إنشاء Fabric Canvases =====
function createFabricCanvases() {
    const width = getCardPixelWidth();
    const height = getCardPixelHeight();
    
    // Canvas الأمام
    appState.canvas.front = new fabric.Canvas('frontCanvasFabric', {
        width: width,
        height: height,
        backgroundColor: '#ffffff'
    });
    
    // Canvas الخلف
    appState.canvas.back = new fabric.Canvas('backCanvasFabric', {
        width: width,
        height: height,
        backgroundColor: '#ffffff'
    });
    
    // إضافة شبكة مساعدة
    drawGrid(appState.canvas.front);
    drawGrid(appState.canvas.back);
}

// ===== رسم الشبكة المساعدة =====
function drawGrid(canvas) {
    const gridSize = 5 * MM_TO_PX; // شبكة بحجم 5mm
    
    // خطوط أفقية
    for (let i = 0; i <= canvas.height; i += gridSize) {
        canvas.add(new fabric.Line([0, i, canvas.width, i], {
            stroke: '#ddd',
            strokeWidth: 0.5,
            selectable: false,
            evented: false
        }));
    }
    
    // خطوط عمودية
    for (let i = 0; i <= canvas.width; i += gridSize) {
        canvas.add(new fabric.Line([i, 0, i, canvas.height], {
            stroke: '#ddd',
            strokeWidth: 0.5,
            selectable: false,
            evented: false
        }));
    }
    
    canvas.renderAll();
}

// ===== رسم علامات التسجيل =====
function drawRegistrationMarks(canvas) {
    const markSize = 10 * MM_TO_PX;
    const offset = 5 * MM_TO_PX;
    
    const corners = [
        { x: offset, y: offset }, // يسار أعلى
        { x: canvas.width - offset - markSize, y: offset }, // يمين أعلى
        { x: offset, y: canvas.height - offset - markSize }, // يسار أسفل
        { x: canvas.width - offset - markSize, y: canvas.height - offset - markSize } // يمين أسفل
    ];
    
    corners.forEach(corner => {
        // دائرة خارجية
        canvas.add(new fabric.Circle({
            left: corner.x + markSize / 2,
            top: corner.y + markSize / 2,
            radius: markSize / 2,
            stroke: '#000',
            strokeWidth: 1,
            fill: 'transparent',
            selectable: false,
            evented: false
        }));
        
        // نقطة داخلية
        canvas.add(new fabric.Circle({
            left: corner.x + markSize / 2,
            top: corner.y + markSize / 2,
            radius: 2,
            fill: '#000',
            selectable: false,
            evented: false
        }));
    });
    
    canvas.renderAll();
}

// ===== التبويبات =====
function setupTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // إزالة active من جميع الأزرار
            tabButtons.forEach(b => b.classList.remove('active'));
            
            // إضافة active للزر المضغوط
            this.classList.add('active');
            
            // إخفاء جميع محتويات التبويبات
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            
            // عرض محتوى التبويب المختار
            const tabName = this.getAttribute('data-tab');
            document.getElementById(`${tabName}-tab`).classList.add('active');
        });
    });
}

// ===== رفع الصور =====
function handleFrontImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            appState.frontImage = event.target.result;
            updatePreview();
            updateStatus('تم رفع الصورة الأمامية بنجاح ✓');
        };
        reader.readAsDataURL(file);
    }
}

function handleBackImageUpload(e) {
    const file = e.target.files[0];
    if (file) {
        const reader = new FileReader();
        reader.onload = function(event) {
            appState.backImage = event.target.result;
            updatePreview();
            updateStatus('تم رفع الصورة الخلفية بنجاح ✓');
        };
        reader.readAsDataURL(file);
    }
}

// ===== مسح الصور =====
function clearImage(side) {
    if (side === 'front') {
        appState.frontImage = null;
        document.getElementById('frontImage').value = '';
    } else {
        appState.backImage = null;
        document.getElementById('backImage').value = '';
    }
    updatePreview();
    updateStatus('تم مسح الصورة ✓');
}

// ===== تحديث معاينة البطاقة =====
function updatePreview() {
    const currentCanvas = appState.currentSide === 'front' ? 
        appState.canvas.front : appState.canvas.back;
    const currentImage = appState.currentSide === 'front' ? 
        appState.frontImage : appState.backImage;
    
    // مسح الصور السابقة من Canvas
    const objects = currentCanvas.getObjects();
    objects.forEach(obj => {
        if (obj.isImage) {
            currentCanvas.remove(obj);
        }
    });
    
    if (currentImage) {
        fabric.Image.fromURL(currentImage, function(img) {
            // تحديد حجم الصورة بناءً على حجم البطاقة
            const width = getCardPixelWidth();
            const height = getCardPixelHeight();
            
            // حساب النسبة المئوية للملاءمة
            const scaleX = width / img.width;
            const scaleY = height / img.height;
            const scale = Math.min(scaleX, scaleY);
            
            img.set({
                left: width / 2,
                top: height / 2,
                originX: 'center',
                originY: 'center',
                scaleX: scale * appState.zoom,
                scaleY: scale * appState.zoom,
                angle: appState.rotation,
                flipX: appState.flipHorizontal,
                flipY: appState.flipVertical
            });
            
            // تطبيق الإزاحة
            const offsetPixelsX = appState.offsetX * MM_TO_PX;
            const offsetPixelsY = appState.offsetY * MM_TO_PX;
            img.left = (width / 2) + offsetPixelsX;
            img.top = (height / 2) + offsetPixelsY;
            
            // تطبيق الفلاتر (جديد)
            applyFilters(img);
            
            img.isImage = true;
            currentCanvas.add(img);
            currentCanvas.renderAll();
        });
    }
    
    renderAllTextFields();
}

// ===== معالجة تغيير حجم البطاقة =====
function handleCardSizeChange() {
    appState.cardSize = document.getElementById('cardSize').value;
    
    if (appState.cardSize === 'custom') {
        const width = parseFloat(document.getElementById('customWidth').value);
        const height = parseFloat(document.getElementById('customHeight').value);
        CARD_SIZE.custom = { width, height };
    }
    
    recreateCanvases();
    updateCardDimensions();
    updatePreview();
}

// ===== إعادة إنشاء Canvas =====
function recreateCanvases() {
    const width = getCardPixelWidth();
    const height = getCardPixelHeight();
    
    appState.canvas.front.dispose();
    appState.canvas.back.dispose();
    
    appState.canvas.front = new fabric.Canvas('frontCanvasFabric', {
        width: width,
        height: height,
        backgroundColor: '#ffffff'
    });
    
    appState.canvas.back = new fabric.Canvas('backCanvasFabric', {
        width: width,
        height: height,
        backgroundColor: '#ffffff'
    });
    
    if (appState.showGrid) {
        drawGrid(appState.canvas.front);
        drawGrid(appState.canvas.back);
    }
    
    if (appState.showMarks) {
        drawRegistrationMarks(appState.canvas.front);
        drawRegistrationMarks(appState.canvas.back);
    }
}

// ===== الحصول على أبعاد البطاقة بالـ Pixels =====
function getCardPixelWidth() {
    const size = CARD_SIZE[appState.cardSize];
    return size.width * MM_TO_PX;
}

function getCardPixelHeight() {
    const size = CARD_SIZE[appState.cardSize];
    return size.height * MM_TO_PX;
}

// ===== تحديث أبعاد البطاقة في الواجهة =====
function updateCardDimensions() {
    const size = CARD_SIZE[appState.cardSize];
    const unit = document.getElementById('unit').value;
    
    let width = size.width;
    let height = size.height;
    
    if (unit === 'inch') {
        width = (width / 25.4).toFixed(2);
        height = (height / 25.4).toFixed(2);
    } else if (unit === 'cm') {
        width = (width / 10).toFixed(2);
        height = (height / 10).toFixed(2);
    }
    
    document.getElementById('cardDimensionsInfo').textContent = 
        `الحجم: ${width}×${height} ${unit}`;
}

// ===== معالجة تغيير الجانب =====
function handleSideChange() {
    appState.currentSide = document.getElementById('sideSelect').value;
    
    // عرض/إخفاء المعاينات
    if (appState.currentSide === 'front') {
        document.getElementById('frontPreview').style.display = 'block';
        document.getElementById('backPreview').style.display = 'none';
    } else {
        document.getElementById('frontPreview').style.display = 'none';
        document.getElementById('backPreview').style.display = 'block';
    }
    
    updatePreview();
}

// ===== التحكم بالتكبير/التصغير =====
function handleZoomChange() {
    appState.zoom = parseFloat(document.getElementById('zoomSlider').value);
    document.getElementById('zoomValue').textContent = 
        Math.round(appState.zoom * 100) + '%';
    updatePreview();
}

// ===== معالجة الدوران =====
function handleRotationChange() {
    appState.rotation = parseInt(document.getElementById('rotationSlider').value);
    document.getElementById('rotationValue').textContent = appState.rotation + '°';
    updatePreview();
}

// ===== الإزاحة الأفقية =====
function handleOffsetXChange() {
    appState.offsetX = parseInt(document.getElementById('offsetXSlider').value);
    document.getElementById('offsetXValue').textContent = appState.offsetX;
    updatePreview();
}

// ===== الإزاحة العمودية =====
function handleOffsetYChange() {
    appState.offsetY = parseInt(document.getElementById('offsetYSlider').value);
    document.getElementById('offsetYValue').textContent = appState.offsetY;
    updatePreview();
}

// ===== عرض/إخفاء الشبكة =====
function handleGridToggle() {
    appState.showGrid = document.getElementById('showGrid').checked;
    recreateCanvases();
    updatePreview();
}

// ===== عرض/إخفاء علامات التسجيل =====
function handleMarksToggle() {
    appState.showMarks = document.getElementById('showMarks').checked;
    recreateCanvases();
    updatePreview();
}

// ===== عكس أفقياً =====
function handleFlipHorizontal() {
    appState.flipHorizontal = document.getElementById('flipHorizontal').checked;
    updatePreview();
}

// ===== عكس عمودياً =====
function handleFlipVertical() {
    appState.flipVertical = document.getElementById('flipVertical').checked;
    updatePreview();
}

// ===== إعادة تعيين جميع الصور =====
function resetAllImages() {
    if (confirm('هل أنت متأكد من رغبتك في مسح جميع الصور؟')) {
        appState.frontImage = null;
        appState.backImage = null;
        document.getElementById('frontImage').value = '';
        document.getElementById('backImage').value = '';
        updatePreview();
        updateStatus('تم مسح جميع الصور ✓');
    }
}

// ===== إعادة تعيين الإعدادات =====
function resetSettings() {
    document.getElementById('zoomSlider').value = 1;
    document.getElementById('rotationSlider').value = 0;
    document.getElementById('offsetXSlider').value = 0;
    document.getElementById('offsetYSlider').value = 0;
    document.getElementById('showGrid').checked = false;
    document.getElementById('showMarks').checked = false;
    document.getElementById('flipHorizontal').checked = false;
    document.getElementById('flipVertical').checked = false;
    
    appState.zoom = 1;
    appState.rotation = 0;
    appState.offsetX = 0;
    appState.offsetY = 0;
    appState.showGrid = false;
    appState.showMarks = false;
    appState.flipHorizontal = false;
    appState.flipVertical = false;
    
    updatePreview();
    updateStatus('تم إعادة تعيين الإعدادات ✓');
}

// ===== النصوص =====
function addTextField() {
    const fieldId = Date.now();
    appState.textFields.push({
        id: fieldId,
        text: 'نص جديد',
        x: 50,
        y: 50,
        fontSize: 12,
        color: '#000000',
        fontFamily: 'Arial',
        side: appState.currentSide
    });
    
    renderTextFields();
    updatePreview();
}

function renderTextFields() {
    const container = document.getElementById('textFieldsContainer');
    container.innerHTML = '';
    
    appState.textFields.forEach((field, index) => {
        const fieldDiv = document.createElement('div');
        fieldDiv.className = 'text-field-item';
        fieldDiv.innerHTML = `
            <label>حقل النص #${index + 1}</label>
            <input type="text" value="${field.text}" 
                   onchange="updateTextField(${field.id}, 'text', this.value)">
            <label>الحجم:</label>
            <input type="number" value="${field.fontSize}" 
                   onchange="updateTextField(${field.id}, 'fontSize', this.value)"
                   min="8" max="72">
            <label>اللون:</label>
            <input type="color" value="${field.color}" 
                   onchange="updateTextField(${field.id}, 'color', this.value)">
            <button class="btn-small" 
                    onclick="removeTextField(${field.id})" 
                    style="background: #dc2626; color: white; border: none;">
                🗑️ حذف
            </button>
        `;
        container.appendChild(fieldDiv);
    });
}

function updateTextField(fieldId, prop, value) {
    const field = appState.textFields.find(f => f.id === fieldId);
    if (field) {
        if (prop === 'fontSize') {
            field[prop] = parseInt(value);
        } else {
            field[prop] = value;
        }
        updatePreview();
    }
}

function removeTextField(fieldId) {
    appState.textFields = appState.textFields.filter(f => f.id !== fieldId);
    renderTextFields();
    updatePreview();
}

function clearAllText() {
    if (confirm('هل تريد حذف جميع النصوص؟')) {
        appState.textFields = [];
        renderTextFields();
        updatePreview();
        updateStatus('تم حذف جميع النصوص ✓');
    }
}

function renderAllTextFields() {
    // إضافة النصوص إلى Canvas
    const currentCanvas = appState.currentSide === 'front' ? 
        appState.canvas.front : appState.canvas.back;
    
    // مسح النصوص السابقة
    const objects = currentCanvas.getObjects();
    objects.forEach(obj => {
        if (obj.isTextField) {
            currentCanvas.remove(obj);
        }
    });
    
    // إضافة النصوص المتعلقة بهذا الجانب
    appState.textFields
        .filter(f => f.side === appState.currentSide)
        .forEach(field => {
            const text = new fabric.Text(field.text, {
                left: field.x,
                top: field.y,
                fontSize: field.fontSize,
                fill: field.color,
                fontFamily: field.fontFamily,
                isTextField: true
            });
            currentCanvas.add(text);
        });
    
    currentCanvas.renderAll();
}

// ===== حفظ القالب =====
function saveTemplate() {
    const templateName = prompt('أدخل اسم القالب:', 'قالبي');
    if (!templateName) return;
    
    const template = {
        name: templateName,
        cardSize: appState.cardSize,
        zoom: appState.zoom,
        rotation: appState.rotation,
        offsetX: appState.offsetX,
        offsetY: appState.offsetY,
        flipHorizontal: appState.flipHorizontal,
        flipVertical: appState.flipVertical,
        textFields: appState.textFields,
        timestamp: new Date().toLocaleString()
    };
    
    let templates = JSON.parse(localStorage.getItem('cardTemplates') || '[]');
    templates.push(template);
    localStorage.setItem('cardTemplates', JSON.stringify(templates));
    
    updateStatus('تم حفظ القالب بنجاح ✓');
}

// ===== تحميل القالب =====
function loadTemplate() {
    const templates = JSON.parse(localStorage.getItem('cardTemplates') || '[]');
    
    if (templates.length === 0) {
        alert('لا توجد قوالب محفوظة');
        return;
    }
    
    const modal = document.getElementById('templateModal');
    const modalBody = document.getElementById('modalBody');
    
    let html = '<h3>اختر قالباً لتحميله:</h3>';
    html += '<div style="overflow-y: auto; max-height: 400px;">';
    
    templates.forEach((template, index) => {
        html += `
            <div style="background: #f3f4f6; padding: 1rem; margin: 0.5rem 0; border-radius: 6px;">
                <strong>${template.name}</strong>
                <small style="display: block; color: #6b7280; margin: 0.5rem 0;">
                    محفوظ: ${template.timestamp}
                </small>
                <button onclick="applyTemplate(${index})" class="btn-primary" 
                    style="padding: 0.5rem 1rem; font-size: 0.85rem; width: auto;">
                    تحميل
                </button>
                <button onclick="deleteTemplate(${index})" class="btn-small" 
                    style="background: #dc2626; color: white; border: none; padding: 0.5rem; width: auto;">
                    حذف
                </button>
            </div>
        `;
    });
    
    html += '</div>';
    modalBody.innerHTML = html;
    modal.style.display = 'flex';
}

function applyTemplate(index) {
    const templates = JSON.parse(localStorage.getItem('cardTemplates') || '[]');
    const template = templates[index];
    
    appState.cardSize = template.cardSize;
    appState.zoom = template.zoom;
    appState.rotation = template.rotation;
    appState.offsetX = template.offsetX;
    appState.offsetY = template.offsetY;
    appState.flipHorizontal = template.flipHorizontal;
    appState.flipVertical = template.flipVertical;
    appState.textFields = template.textFields;
    
    // تحديث العناصر في الواجهة
    document.getElementById('cardSize').value = template.cardSize;
    document.getElementById('zoomSlider').value = template.zoom;
    document.getElementById('rotationSlider').value = template.rotation;
    document.getElementById('offsetXSlider').value = template.offsetX;
    document.getElementById('offsetYSlider').value = template.offsetY;
    document.getElementById('flipHorizontal').checked = template.flipHorizontal;
    document.getElementById('flipVertical').checked = template.flipVertical;
    
    renderTextFields();
    updatePreview();
    closeModal();
    updateStatus('تم تحميل القالب بنجاح ✓');
}

function deleteTemplate(index) {
    if (confirm('هل أنت متأكد من حذف هذا القالب؟')) {
        let templates = JSON.parse(localStorage.getItem('cardTemplates') || '[]');
        templates.splice(index, 1);
        localStorage.setItem('cardTemplates', JSON.stringify(templates));
        loadTemplate();
        updateStatus('تم حذف القالب ✓');
    }
}

// ===== إغلاق النافذة المنبثقة =====
function closeModal() {
    document.getElementById('templateModal').style.display = 'none';
}

// ===== تصدير PDF =====
async function exportToPDF() {
    // سيتم استخدام الدالة المحسنة من helpers.js
    if (typeof enhancedPDFExport === 'function') {
        await enhancedPDFExport();
    } else {
        updateStatus('جاري تصدير PDF...');
        
        try {
            const size = CARD_SIZE[appState.cardSize];
            const { jsPDF } = window.jspdf;
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: [size.width + 10, (size.height + 10) * 2]
            });
            
            const frontCanvas = appState.canvas.front.toCanvasElement();
            const backCanvas = appState.canvas.back.toCanvasElement();
            
            const frontImg = frontCanvas.toDataURL('image/png');
            const backImg = backCanvas.toDataURL('image/png');
            
            const margin = 5;
            const imgWidth = size.width;
            const imgHeight = size.height;
            
            pdf.addImage(frontImg, 'PNG', margin, margin, imgWidth, imgHeight);
            pdf.addImage(backImg, 'PNG', margin, imgHeight + margin + 8, imgWidth, imgHeight);
            
            pdf.save('ID_Card_Duplex.pdf');
            updateStatus('تم تصدير PDF بنجاح ✓');
        } catch (error) {
            console.error('خطأ في تصدير PDF:', error);
            updateStatus('حدث خطأ في تصدير PDF ✗');
        }
    }
}

// ===== تصدير كصورة PNG =====
async function exportToPNG() {
    updateStatus('جاري تصدير الصورة...');
    
    try {
        const canvas = appState.currentSide === 'front' ? 
            appState.canvas.front : appState.canvas.back;
        
        const link = document.createElement('a');
        link.href = canvas.toDataURL('image/png');
        link.download = `ID_Card_${appState.currentSide}.png`;
        link.click();
        
        updateStatus('تم تصدير الصورة بنجاح ✓');
    } catch (error) {
        console.error('خطأ في تصدير الصورة:', error);
        updateStatus('حدث خطأ في تصدير الصورة ✗');
    }
}

// ===== الطباعة =====
function handlePrint() {
    // سيتم استخدام الدالة المحسنة من helpers.js
    if (typeof enhancedPrint === 'function') {
        try {
            enhancedPrint();
        } catch (error) {
            console.error('خطأ في الطباعة:', error);
            updateStatus('حدث خطأ في الطباعة ✗');
        }
    } else {
        updateStatus('جاري فتح نافذة الطباعة...');
        
        const printWindow = window.open('', '', 'height=600,width=800');
        const printDoc = printWindow.document;
        
        const style = `
            <style>
                @page { size: A4; margin: 0; }
                @media print { * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; } }
                body { margin: 0; padding: 20px; background: white; }
                .card-section { page-break-after: always; text-align: center; }
                h2 { text-align: right; margin-bottom: 20px; }
                canvas { max-width: 90%; margin: 20px auto; display: block; }
            </style>
        `;
        
        const frontCanvas = appState.canvas.front.toCanvasElement();
        const backCanvas = appState.canvas.back.toCanvasElement();
        
        const frontDataUrl = frontCanvas.toDataURL('image/png');
        const backDataUrl = backCanvas.toDataURL('image/png');
        
        const content = `
            ${style}
            <body>
                <div class="card-section">
                    <h2>الصورة الأمامية (Front Side)</h2>
                    <img src="${frontDataUrl}" style="max-width: 90%; height: auto;">
                </div>
                <div class="card-section">
                    <h2>الصورة الخلفية (Back Side)</h2>
                    <img src="${backDataUrl}" style="max-width: 90%; height: auto;">
                </div>
            </body>
        `;
        
        printDoc.write(content);
        printDoc.close();
        
        setTimeout(() => {
            printWindow.print();
            updateStatus('تم إرسال البطاقة للطباعة ✓');
        }, 500);
    }
}

// ===== تحديث الحالة =====
function updateStatus(message) {
    document.getElementById('statusInfo').textContent = message;
    setTimeout(() => {
        document.getElementById('statusInfo').textContent = 'جاهز';
    }, 3000);
}

// ===== معالجة الصور المتعددة (الدفعة) =====
function handleBatchFrontImagesUpload(e) {
    const files = e.target.files;
    if (!files || files.length === 0) {
        console.log('لم يتم اختيار صور');
        return;
    }
    
    console.log(`تم اختيار ${files.length} صور أمامية`);
    
    appState.batchImages.front = [];
    let loadedCount = 0;
    
    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            appState.batchImages.front.push({
                index: index,
                data: event.target.result,
                name: file.name
            });
            
            loadedCount++;
            if (loadedCount === files.length) {
                updateStatus(`تم رفع ${files.length} صور أمامية ✓`);
                console.log(`تم تحميل جميع ${files.length} صور بنجاح`);
                // عرض المعاينة تلقائياً
                showBatchPreview();
            }
        };
        reader.onerror = function() {
            console.error(`خطأ في تحميل الصورة: ${file.name}`);
            updateStatus(`خطأ في تحميل الصورة: ${file.name}`);
        };
        reader.readAsDataURL(file);
    });
}

function handleBatchBackImagesUpload(e) {
    const files = e.target.files;
    appState.batchImages.back = [];
    
    if (!files || files.length === 0) {
        console.log('لم يتم اختيار صور خلفية');
        showBatchPreview();
        return;
    }
    
    console.log(`تم اختيار ${files.length} صور خلفية`);
    
    let loadedCount = 0;
    
    Array.from(files).forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = function(event) {
            appState.batchImages.back.push({
                index: index,
                data: event.target.result,
                name: file.name
            });
            
            loadedCount++;
            if (loadedCount === files.length) {
                updateStatus(`تم رفع ${files.length} صور خلفية ✓`);
                console.log(`تم تحميل جميع ${files.length} صور خلفية بنجاح`);
                // عرض المعاينة تلقائياً
                showBatchPreview();
            }
        };
        reader.onerror = function() {
            console.error(`خطأ في تحميل الصورة الخلفية: ${file.name}`);
            updateStatus(`خطأ في تحميل الصورة الخلفية: ${file.name}`);
        };
        reader.readAsDataURL(file);
    });
}

// ===== عرض معاينة الدفعات في صفحات =====
function showBatchPreview() {
    const container = document.getElementById('batchPagesContainer');
    container.innerHTML = '';
    
    // استخدام القيم الديناميكية من الإعدادات
    const rows = appState.batchRows || 4;
    const cols = appState.batchCols || 2;
    const cardsPerPage = rows * cols;
    
    const totalCards = Math.max(
        appState.batchImages.front.length,
        appState.batchImages.back.length
    );
    
    if (totalCards === 0) {
        container.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">لم يتم رفع أي صور. اختر صوراً لعرض معاينة الصفحات.</p>';
        return;
    }
    
    updateBatchStatistics(); // تحديث الإحصائيات
    
    // حساب عدد الصفحات
    const hasBackImages = appState.batchImages.back.length > 0;
    
    // إنشاء صفحات الصور الأمامية
    for (let page = 0; page < Math.ceil(appState.batchImages.front.length / cardsPerPage); page++) {
        const pageHtml = createBatchPage(page, 'front', cardsPerPage, rows, cols);
        container.innerHTML += pageHtml;
    }
    
    // إنشاء صفحات الصور الخلفية (إن وجدت)
    if (hasBackImages) {
        for (let page = 0; page < Math.ceil(appState.batchImages.back.length / cardsPerPage); page++) {
            const pageHtml = createBatchPage(page, 'back', cardsPerPage, rows, cols);
            container.innerHTML += pageHtml;
        }
    }
    
    const frontPages = Math.ceil(appState.batchImages.front.length / cardsPerPage);
    const backPages = hasBackImages ? Math.ceil(appState.batchImages.back.length / cardsPerPage) : 0;
    const totalPages = frontPages + backPages;
    updateStatus(`معاينة ${totalCards} صورة في ${totalPages} صفحة(ات) (${rows}×${cols}) ✓`);
    
    // إضافة drag and drop handlers بعد إنشاء المعاينة
    setupCardDragAndDrop();
}

// ===== إعداد Drag and Drop للبطاقات =====
function setupCardDragAndDrop() {
    const cardPreviews = document.querySelectorAll('[data-card-index][data-card-side]');
    
    cardPreviews.forEach(card => {
        const index = parseInt(card.getAttribute('data-card-index'));
        const isEmpty = index === -1;
        
        // فقط البطاقات الحقيقية يمكن سحبها
        if (!isEmpty) {
            card.draggable = true;
        }
        
        // جعل اللعبة أكثر سلاسة - السماح بالسحب على أي بطاقة
        card.addEventListener('dragstart', (e) => {
            const index = parseInt(card.getAttribute('data-card-index'));
            
            // منع السحب من بطاقات فارغة
            if (index === -1) {
                e.preventDefault();
                return;
            }
            
            appState.draggedCard = { index, side: card.getAttribute('data-card-side') };
            card.style.opacity = '0.5';
            card.style.cursor = 'grabbing';
            e.dataTransfer.effectAllowed = 'move';
        });
        
        // عند الانتهاء من السحب
        card.addEventListener('dragend', (e) => {
            card.style.opacity = '1';
            card.style.cursor = 'grab';
            appState.draggedCard = null;
            // إزالة التأثيرات البصرية من جميع البطاقات
            document.querySelectorAll('[data-card-index]').forEach(c => {
                c.style.borderColor = '';
                c.style.backgroundColor = '';
                c.style.transform = '';
            });
        });
        
        // عند السحب فوق بطاقة
        card.addEventListener('dragover', (e) => {
            if (!appState.draggedCard) return;
            
            const currentSide = card.getAttribute('data-card-side');
            const draggedSide = appState.draggedCard.side;
            
            // السماح بالسحب على نفس الجانب (سواء بطاقة حقيقية أو فارغة)
            if (currentSide === draggedSide) {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                card.style.borderColor = '#2563eb';
                card.style.borderWidth = '2px';
                card.style.backgroundColor = 'rgba(37, 99, 235, 0.15)';
                card.style.transform = 'scale(1.02)';
            }
        });
        
        // عند ترك البطاقة
        card.addEventListener('drop', (e) => {
            e.preventDefault();
            
            if (!appState.draggedCard) return;
            
            const targetIndex = parseInt(card.getAttribute('data-card-index'));
            const targetGridPosition = parseInt(card.getAttribute('data-grid-position'));
            const targetSide = card.getAttribute('data-card-side');
            const draggedIndex = appState.draggedCard.index;
            const draggedSide = appState.draggedCard.side;
            
            // التحقق من صحة العملية
            if (targetSide === draggedSide && draggedIndex >= 0) {
                const images = appState.batchImages[draggedSide];
                const draggedImage = images[draggedIndex];
                
                // إزالة البطاقة من موقعها الأصلي
                images.splice(draggedIndex, 1);
                
                let newIndex;
                
                if (targetIndex === -1) {
                    // إفلات على موقع فارغ
                    // حساب موقع الشبكة للبطاقة المسحوبة
                    if (targetGridPosition < draggedIndex) {
                        // الموقع الفارغ قبل الموقع المسحوب - ننقل إلى قبل الموقع الفارغ
                        newIndex = targetGridPosition;
                    } else if (targetGridPosition > draggedIndex) {
                        // الموقع الفارغ بعد الموقع المسحوب - ننقل بعده مباشرة
                        newIndex = Math.min(targetGridPosition - 1, images.length);
                    } else {
                        // نفس الموقع (لا ننقل)
                        images.splice(draggedIndex, 0, draggedImage);
                        showBatchPreview();
                        updateStatus('البطاقة في نفس الموقع');
                        return;
                    }
                } else if (draggedIndex !== targetIndex) {
                    // إفلات على بطاقة حقيقية
                    newIndex = targetIndex;
                    if (draggedIndex < targetIndex) {
                        newIndex = targetIndex - 1;
                    }
                } else {
                    // إفلات على نفس الموقع
                    images.splice(draggedIndex, 0, draggedImage);
                    showBatchPreview();
                    updateStatus('البطاقة في نفس الموقع');
                    return;
                }
                
                // تأكد من أن newIndex في نطاق صحيح
                newIndex = Math.max(0, Math.min(newIndex, images.length));
                
                // إدراج البطاقة في الموقع الجديد
                images.splice(newIndex, 0, draggedImage);
                
                // إعادة عرض المعاينة
                showBatchPreview();
                updateStatus('تم نقل البطاقة ✓');
            }
        });
        
        // عند مغادرة الموقع
        card.addEventListener('dragleave', (e) => {
            if (e.target === card) {
                card.style.borderColor = '';
                card.style.backgroundColor = '';
                card.style.transform = '';
            }
        });
        
        // إضافة تأثير hover - جعل cursor للأماكن الفارغة أيضاً
        card.addEventListener('mouseenter', (e) => {
            if (!appState.draggedCard) {
                const isEmpty = parseInt(card.getAttribute('data-card-index')) === -1;
                if (isEmpty) {
                    card.style.cursor = 'default';
                    card.style.backgroundColor = 'rgba(37, 99, 235, 0.05)';
                }
            }
        });
        
        card.addEventListener('mouseleave', (e) => {
            if (!appState.draggedCard) {
                card.style.backgroundColor = '';
            }
        });
    });
}

// ===== إنشاء صفحة معاينة =====
function createBatchPage(pageNumber, side, cardsPerPage, rows, cols) {
    const images = appState.batchImages[side] || [];
    const startIdx = pageNumber * cardsPerPage;
    const endIdx = Math.min(startIdx + cardsPerPage, images.length);
    const pageImagesCount = endIdx - startIdx;
    
    // استخدام القيم الممرورة أو القيم الافتراضية
    rows = rows || 4;
    cols = cols || 2;
    
    const sideLabel = side === 'front' ? '🖼️ الصور الأمامية' : '🖼️ الصور الخلفية';
    
    let gridHtml = '';
    
    if (side === 'front') {
        // الصور الأمامية: من اليسار إلى اليمين (LTR)
        // نعكس الترتيب في كل صف لتحقيق ترتيب من اليسار لليمين
        for (let i = 0; i < cardsPerPage; i++) {
            // حساب الصف والعمود
            const rowIdx = Math.floor(i / cols);
            const colIdx = i % cols;
            
            // عكس الأعمدة لتحقيق اتجاه من اليسار لليمين
            const reversedColIdx = (cols - 1) - colIdx;
            const imgIdx = startIdx + rowIdx * cols + reversedColIdx;
            const gridPosition = startIdx + i; // الموقع الفعلي في الشبكة
            
            if (imgIdx < images.length) {
                const img = images[imgIdx];
                gridHtml += `
                    <div class="batch-card-preview" data-card-index="${imgIdx}" data-grid-position="${gridPosition}" data-card-side="front">
                        <img src="${img.data}" alt="front ${imgIdx + 1}" />
                    </div>
                `;
            } else {
                gridHtml += `
                    <div class="batch-card-preview empty" data-card-index="-1" data-grid-position="${gridPosition}" data-card-side="front">
                        <span>فارغ</span>
                    </div>
                `;
            }
        }
    } else {
        // الصور الخلفية: معاكسة (من اليمين لليسار عند الطباعة)
        for (let i = 0; i < cardsPerPage; i++) {
            // استخدام pageImagesCount (عدد الصور الفعلي) بدلاً من cardsPerPage
            // هذا يضمن محاذاة صحيحة للصفحات الناقصة
            const reversedI = (pageImagesCount - 1) - i;
            let imgIdx;
            
            // تحقق من أن الموقع المعاكس ضمن الصور المتاحة
            if (reversedI >= 0 && reversedI < pageImagesCount) {
                imgIdx = startIdx + reversedI;
            } else {
                imgIdx = -1;
            }
            
            const gridPosition = startIdx + i; // الموقع الفعلي في الشبكة
            
            if (imgIdx >= 0 && imgIdx < images.length) {
                const img = images[imgIdx];
                gridHtml += `
                    <div class="batch-card-preview" data-card-index="${imgIdx}" data-grid-position="${gridPosition}" data-card-side="back" style="position: relative; opacity: 0.85;">
                        <img src="${img.data}" alt="back ${imgIdx + 1}" style="filter: brightness(0.95);" />
                        <div style="position: absolute; bottom: 2px; left: 2px; background: #dc2626; color: white; padding: 2px 4px; border-radius: 3px; font-size: 9px;">معاكس</div>
                    </div>
                `;
            } else {
                gridHtml += `
                    <div class="batch-card-preview empty" data-card-index="-1" data-grid-position="${gridPosition}" data-card-side="back">
                        <span>فارغ</span>
                    </div>
                `;
            }
        }
    }
    
    const pageNum = pageNumber + 1;
    const totalPages = Math.ceil(images.length / cardsPerPage);
    
    return `
        <div class="batch-page">
            <div class="batch-page-header">
                <span>${sideLabel}</span>
                <span style="margin-right: 1rem; font-size: 0.9rem; color: #6b7280;">الصفحة ${pageNum} من ${totalPages}</span>
            </div>
            <div class="batch-page-grid" style="--grid-cols: ${cols}; --grid-rows: ${rows};">
                ${gridHtml}
            </div>
            <div style="text-align: center; margin-top: 0.75rem; font-size: 0.85rem; color: #6b7280;">
                البطاقات: ${startIdx + 1} - ${endIdx}
            </div>
        </div>
    `;
}

function updateBatchPreview() {
    showBatchPreview();
}

function removeBatchImage(side, index) {
    appState.batchImages[side].splice(index, 1);
    updateBatchPreview();
}

function clearBatchImages() {
    if (confirm('هل تريد مسح جميع الصور المرفوعة؟')) {
        appState.batchImages.front = [];
        appState.batchImages.back = [];
        document.getElementById('batchFrontImages').value = '';
        document.getElementById('batchBackImages').value = '';
        document.getElementById('batchPagesContainer').innerHTML = '';
        updateStatus('تم مسح جميع الصور ✓');
    }
}

function handleCardsPerPageChange() {
    const value = document.getElementById('cardsPerPage').value;
    const customDiv = document.getElementById('customCardsDiv');
    
    if (value === 'custom') {
        customDiv.style.display = 'block';
    } else {
        customDiv.style.display = 'none';
    }
}

function getCardsLayout() {
    const value = document.getElementById('cardsPerPage').value;
    const size = CARD_SIZE[appState.cardSize];
    
    let rows = 2, cols = 2;
    
    switch(value) {
        case '4': rows = 2; cols = 2; break;
        case '6': rows = 3; cols = 2; break;
        case '8': rows = 4; cols = 2; break;
        case '10': rows = 5; cols = 2; break;
        case 'custom':
            rows = parseInt(document.getElementById('customRows').value) || 2;
            cols = parseInt(document.getElementById('customCols').value) || 2;
            break;
    }
    
    return { rows, cols, cardWidth: size.width, cardHeight: size.height };
}

// ===== طباعة الدفعة =====
function printBatch() {
    if (appState.batchImages.front.length === 0) {
        alert('الرجاء رفع صور البطاقات أولاً');
        return;
    }
    
    updateStatus('جاري إعداد الطباعة...');
    
    const printWindow = window.open('', '', 'height=600,width=800');
    const printDoc = printWindow.document;
    
    // استخدام نفس التخطيط من الإعدادات الديناميكية
    const rows = appState.batchRows || 4;
    const cols = appState.batchCols || 2;
    const cardsPerPage = rows * cols;
    
    // سمات البطاقة ISO 7810 القياسية
    const cardWidth = 85.6; // mm
    const cardHeight = 54; // mm
    
    // هندسة الصفحة
    const pageWidth = 210; // A4 width mm
    const pageHeight = 297; // A4 height mm
    const headerSpace = 10; // mm for page header
    const gapBetweenCards = 5; // mm gap between cards
    
    // حساب الهوامش المتساوية
    const horizontalSpace = pageWidth - (cardWidth * cols + gapBetweenCards * (cols - 1));
    const leftMargin = horizontalSpace / 2;
    
    const verticalSpace = pageHeight - headerSpace - (cardHeight * rows + gapBetweenCards * (rows - 1));
    const topMargin = verticalSpace / 2;
    
    let html = `
        <style>
            @page { size: A4; margin: 0; }
            @media print { 
                * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                body { margin: 0; padding: 0; }
            }
            body { margin: 0; padding: 0; font-family: Arial, sans-serif; }
            .page { page-break-after: always; width: 210mm; height: 297mm; position: relative; overflow: hidden; box-sizing: border-box; }
            .page-header { position: absolute; top: 3mm; left: 5mm; right: 5mm; font-size: 10px; color: #666; text-align: center; }
            .card-wrapper { position: absolute; }
            .card-img { width: 100%; height: 100%; object-fit: cover; border: 0.5px solid #ccc; }
        </style>
    `;
    
    // طباعة صور الواجهة الأمامية
    const frontPages = Math.ceil(appState.batchImages.front.length / cardsPerPage);
    
    // صفحات الصور الأمامية
    for (let page = 0; page < frontPages; page++) {
        html += `
            <div class="page">
                <div class="page-header">🖼️ الصور الأمامية - الصفحة ${page + 1} من ${frontPages}</div>
        `;
        
        for (let i = 0; i < cardsPerPage; i++) {
            const rowIdx = Math.floor(i / cols);
            const colIdx = i % cols;
            
            // عكس الأعمدة لتحقيق اتجاه من اليسار لليمين (مثل المعاينة)
            const reversedColIdx = (cols - 1) - colIdx;
            const imgIdx = page * cardsPerPage + rowIdx * cols + reversedColIdx;
            
            const x = leftMargin + colIdx * (cardWidth + gapBetweenCards);
            const y = headerSpace + topMargin + rowIdx * (cardHeight + gapBetweenCards);
            
            if (imgIdx < appState.batchImages.front.length) {
                const img = appState.batchImages.front[imgIdx];
                html += `
                    <div class="card-wrapper" style="left: ${x}mm; top: ${y}mm; width: ${cardWidth}mm; height: ${cardHeight}mm;">
                        <img src="${img.data}" class="card-img" />
                    </div>
                `;
            }
        }
        
        html += `</div>`;
    }
    
    // صفحات الصور الخلفية (معاكسة للمطابقة بعد القلب)
    if (appState.batchImages.back.length > 0) {
        const backPages = Math.ceil(appState.batchImages.back.length / cardsPerPage);
        
        for (let page = 0; page < backPages; page++) {
            html += `
                <div class="page">
                    <div class="page-header">🖼️ الصور الخلفية - الصفحة ${page + 1} من ${backPages} (معاكسة)</div>
            `;
            
            const pageStartIdx = page * cardsPerPage;
            const pageEndIdx = Math.min(pageStartIdx + cardsPerPage, appState.batchImages.back.length);
            const pageImagesCount = pageEndIdx - pageStartIdx;
            
            // معاكسة الترتيب: البطاقات الخلفية تطبع معاكسة
            for (let i = 0; i < cardsPerPage; i++) {
                // استخدام pageImagesCount (عدد الصور الفعلي) بدلاً من cardsPerPage
                const reversedI = (pageImagesCount - 1) - i;
                
                // حساب الفهرس الفعلي للصورة
                let imgIdx;
                if (reversedI >= 0 && reversedI < pageImagesCount) {
                    // إذا كان موقع البطاقة ضمن الصفحة الحالية
                    imgIdx = pageStartIdx + reversedI;
                } else {
                    // خلاف ذلك، لا توجد صورة في هذا الموقع
                    imgIdx = -1;
                }
                
                const rowIdx = Math.floor(i / cols);
                const colIdx = i % cols;
                const x = leftMargin + colIdx * (cardWidth + gapBetweenCards);
                const y = headerSpace + topMargin + rowIdx * (cardHeight + gapBetweenCards);
                
                if (imgIdx >= 0 && imgIdx < appState.batchImages.back.length) {
                    const img = appState.batchImages.back[imgIdx];
                    html += `
                        <div class="card-wrapper" style="left: ${x}mm; top: ${y}mm; width: ${cardWidth}mm; height: ${cardHeight}mm;">
                            <img src="${img.data}" class="card-img" />
                        </div>
                    `;
                }
            }
            
            html += `</div>`;
        }
    }
    
    printDoc.write(html);
    printDoc.close();
    
    setTimeout(() => {
        printWindow.print();
        const totalPages = frontPages + (appState.batchImages.back.length > 0 ? Math.ceil(appState.batchImages.back.length / cardsPerPage) : 0);
        updateStatus(`تم إرسال الدفعة للطباعة (${totalPages} صفحة) - قلب الورقة على الحافة الطويلة ✓`);
    }, 500);
}

// ===== تصدير الدفعة إلى PDF =====
async function exportBatchToPDF() {
    if (appState.batchImages.front.length === 0) {
        alert('الرجاء رفع صور البطاقات أولاً');
        return;
    }
    
    updateStatus('جاري معالجة PDF...');
    
    try {
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4'
        });
        
        // استخدام نفس التخطيط من الإعدادات الديناميكية
        const rows = appState.batchRows || 4;
        const cols = appState.batchCols || 2;
        const cardsPerPage = rows * cols;
        
        // سمات البطاقة ISO 7810 القياسية
        const cardWidth = 85.6; // mm
        const cardHeight = 54; // mm
        
        // هندسة الصفحة
        const pageWidth = 210; // A4 width mm
        const pageHeight = 297; // A4 height mm
        const headerSpace = 10; // mm for page header
        const gapBetweenCards = 5; // mm gap between cards
        
        // حساب الهوامش المتساوية
        const horizontalSpace = pageWidth - (cardWidth * cols + gapBetweenCards * (cols - 1));
        const leftMargin = horizontalSpace / 2;
        
        // حساب الهامش العلوي المتساوي
        const verticalSpace = pageHeight - headerSpace - (cardHeight * rows + gapBetweenCards * (rows - 1));
        const topMargin = verticalSpace / 2;
        
        // إضافة صفحات الصور الأمامية
        const frontPages = Math.ceil(appState.batchImages.front.length / cardsPerPage);
        
        for (let page = 0; page < frontPages; page++) {
            if (page > 0) pdf.addPage();
            
            // رأس الصفحة
            pdf.setFontSize(10);
            pdf.setTextColor(100, 100, 100);
            pdf.text(`🖼️ الصور الأمامية - الصفحة ${page + 1} من ${frontPages}`, pageWidth / 2, 7, { align: 'center' });
            
            // إضافة البطاقات
            for (let i = 0; i < cardsPerPage; i++) {
                const rowIdx = Math.floor(i / cols);
                const colIdx = i % cols;
                
                // عكس الأعمدة لتحقيق اتجاه من اليسار لليمين (مثل المعاينة)
                const reversedColIdx = (cols - 1) - colIdx;
                const imgIdx = page * cardsPerPage + rowIdx * cols + reversedColIdx;
                
                if (imgIdx < appState.batchImages.front.length) {
                    const x = leftMargin + colIdx * (cardWidth + gapBetweenCards);
                    const y = headerSpace + topMargin + rowIdx * (cardHeight + gapBetweenCards);
                    
                    const img = appState.batchImages.front[imgIdx];
                    pdf.addImage(img.data, 'JPEG', x, y, cardWidth, cardHeight);
                }
            }
        }
        
        // إضافة صفحات الصور الخلفية (معاكسة للمطابقة بعد القلب)
        if (appState.batchImages.back.length > 0) {
            const backPages = Math.ceil(appState.batchImages.back.length / cardsPerPage);
            
            for (let page = 0; page < backPages; page++) {
                pdf.addPage();
                
                // رأس الصفحة
                pdf.setFontSize(10);
                pdf.setTextColor(100, 100, 100);
                pdf.text(`🖼️ الصور الخلفية - الصفحة ${page + 1} من ${backPages} (معاكسة)`, pageWidth / 2, 7, { align: 'center' });
                
                const pageStartIdx = page * cardsPerPage;
                const pageEndIdx = Math.min(pageStartIdx + cardsPerPage, appState.batchImages.back.length);
                const pageImagesCount = pageEndIdx - pageStartIdx;
                
                // إضافة البطاقات مع معاكسة الترتيب
                for (let i = 0; i < cardsPerPage; i++) {
                    // استخدام pageImagesCount (عدد الصور الفعلي) بدلاً من cardsPerPage
                    const reversedI = (pageImagesCount - 1) - i;
                    
                    // حساب الفهرس الفعلي للصورة
                    let imgIdx;
                    if (reversedI >= 0 && reversedI < pageImagesCount) {
                        imgIdx = pageStartIdx + reversedI;
                    } else {
                        imgIdx = -1;
                    }
                    
                    const rowIdx = Math.floor(i / cols);
                    const colIdx = i % cols;
                    const x = leftMargin + colIdx * (cardWidth + gapBetweenCards);
                    const y = headerSpace + topMargin + rowIdx * (cardHeight + gapBetweenCards);
                    
                    if (imgIdx >= 0 && imgIdx < appState.batchImages.back.length) {
                        const img = appState.batchImages.back[imgIdx];
                        pdf.addImage(img.data, 'JPEG', x, y, cardWidth, cardHeight);
                    }
                }
            }
        }
        
        pdf.save('Batch_Cards.pdf');
        const totalPages = frontPages + (appState.batchImages.back.length > 0 ? Math.ceil(appState.batchImages.back.length / cardsPerPage) : 0);
        updateStatus(`تم تصدير PDF بنجاح (${totalPages} صفحة) - قلب على الحافة الطويلة ✓`);
    } catch (error) {
        console.error('خطأ في تصدير PDF:', error);
        updateStatus('حدث خطأ في التصدير ✗');
    }
}

console.log('تم تحميل محرر بطاقات الهوية بنجاح!');
console.log('Version 1.0 - ID Card Printer');

// ===== تحسين جودة الصور (جديد) =====
function handleBrightnessChange() {
    appState.brightness = parseInt(document.getElementById('brightnessSlider').value);
    document.getElementById('brightnessValue').textContent = appState.brightness;
    updatePreview();
}

function handleContrastChange() {
    appState.contrast = parseInt(document.getElementById('contrastSlider').value);
    document.getElementById('contrastValue').textContent = appState.contrast;
    updatePreview();
}

function handleSaturationChange() {
    appState.saturation = parseInt(document.getElementById('saturationSlider').value);
    document.getElementById('saturationValue').textContent = appState.saturation;
    updatePreview();
}

// ===== نسخ الأمام للخلف =====
function copyFrontToBack() {
    if (!appState.frontImage) {
        alert('الرجاء رفع صورة أمامية أولاً');
        return;
    }
    
    appState.backImage = appState.frontImage;
    appState.currentSide = 'back';
    document.getElementById('sideSelect').value = 'back';
    updatePreview();
    updateStatus('تم نسخ الصورة الأمامية للخلفية ✓');
}

// ===== إعادة تعيين الفلاتر =====
function resetImageFilters() {
    appState.brightness = 0;
    appState.contrast = 0;
    appState.saturation = 0;
    
    document.getElementById('brightnessSlider').value = 0;
    document.getElementById('contrastSlider').value = 0;
    document.getElementById('saturationSlider').value = 0;
    document.getElementById('brightnessValue').textContent = 0;
    document.getElementById('contrastValue').textContent = 0;
    document.getElementById('saturationValue').textContent = 0;
    
    updatePreview();
    updateStatus('تم إعادة تعيين الفلاتر ✓');
}

// ===== الوضع المظلم =====
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', document.body.classList.contains('dark-mode'));
    updateStatus('تم تبديل الوضع المظلم ✓');
}

function loadDarkModePreference() {
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
    }
}

// ===== القوالب الجاهزة =====
function applyPredefinedTemplate() {
    const templateId = document.getElementById('predefinedTemplates').value;
    
    const templates = {
        membership: {
            zoom: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            brightness: 0,
            contrast: 10,
            saturation: 20,
            textFields: [
                { text: 'بطاقة عضوية', x: 50, y: 80, fontSize: 16, color: '#1e40af', fontFamily: 'Arial', side: 'front' }
            ]
        },
        employee: {
            zoom: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            brightness: 5,
            contrast: 15,
            saturation: 10,
            textFields: [
                { text: 'بطاقة موظف', x: 50, y: 80, fontSize: 16, color: '#065f46', fontFamily: 'Arial', side: 'front' }
            ]
        },
        student: {
            zoom: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            brightness: 0,
            contrast: 5,
            saturation: 15,
            textFields: [
                { text: 'بطاقة طالب', x: 50, y: 80, fontSize: 16, color: '#7c2d12', fontFamily: 'Arial', side: 'front' }
            ]
        },
        conference: {
            zoom: 1,
            rotation: 0,
            offsetX: 0,
            offsetY: 0,
            brightness: 10,
            contrast: 20,
            saturation: 5,
            textFields: [
                { text: 'بطاقة مؤتمر', x: 50, y: 80, fontSize: 16, color: '#1e1b4b', fontFamily: 'Arial', side: 'front' }
            ]
        }
    };
    
    if (!templates[templateId]) return;
    
    const template = templates[templateId];
    appState.zoom = template.zoom;
    appState.rotation = template.rotation;
    appState.offsetX = template.offsetX;
    appState.offsetY = template.offsetY;
    appState.brightness = template.brightness;
    appState.contrast = template.contrast;
    appState.saturation = template.saturation;
    appState.textFields = [...template.textFields];
    
    // تحديث العناصر
    document.getElementById('zoomSlider').value = template.zoom;
    document.getElementById('rotationSlider').value = template.rotation;
    document.getElementById('offsetXSlider').value = template.offsetX;
    document.getElementById('offsetYSlider').value = template.offsetY;
    document.getElementById('brightnessSlider').value = template.brightness;
    document.getElementById('contrastSlider').value = template.contrast;
    document.getElementById('saturationSlider').value = template.saturation;
    document.getElementById('zoomValue').textContent = (template.zoom * 100) + '%';
    document.getElementById('rotationValue').textContent = template.rotation + '°';
    document.getElementById('brightnessValue').textContent = template.brightness;
    document.getElementById('contrastValue').textContent = template.contrast;
    document.getElementById('saturationValue').textContent = template.saturation;
    
    renderTextFields();
    updatePreview();
    updateStatus('تم تطبيق القالب الجاهز ✓');
}

// ===== معالج تغيير تخطيط الدفعة =====
function handleBatchLayoutChange() {
    const rows = parseInt(document.getElementById('batchRows')?.value) || 4;
    const cols = parseInt(document.getElementById('batchCols')?.value) || 2;
    
    // تحديث appState
    appState.batchRows = rows;
    appState.batchCols = cols;
    
    // حفظ إلى localStorage
    localStorage.setItem('batchRows', rows.toString());
    localStorage.setItem('batchCols', cols.toString());
    
    // إذا كانت هناك صور مرفوعة، أعد المعاينة
    if (appState.batchImages.front.length > 0 || appState.batchImages.back.length > 0) {
        showBatchPreview();
    }
    
    updateStatus(`تم تحديث التخطيط: ${rows} صف × ${cols} عمود (${rows * cols} بطاقة لكل ورقة) ✓`);
}

// ===== إحصائيات الدفعة =====
function updateBatchStatistics() {
    const frontCount = appState.batchImages.front.length;
    const backCount = appState.batchImages.back.length;
    
    // استخدام القيم الديناميكية
    const rows = appState.batchRows || 4;
    const cols = appState.batchCols || 2;
    const cardsPerPage = rows * cols;
    
    const pagesNeeded = Math.ceil(Math.max(frontCount, backCount) / cardsPerPage);
    
    let totalSize = 0;
    appState.batchImages.front.forEach(img => {
        totalSize += img.data.length;
    });
    appState.batchImages.back.forEach(img => {
        totalSize += img.data.length;
    });
    
    const fileSizeKB = (totalSize / 1024).toFixed(2);
    
    document.getElementById('statsFrontCount').textContent = frontCount;
    document.getElementById('statsBackCount').textContent = backCount;
    document.getElementById('statsPagesCount').textContent = pagesNeeded;
    document.getElementById('statsFileSize').textContent = fileSizeKB + ' KB';
    
    if (frontCount > 0) {
        document.getElementById('batchStats').style.display = 'block';
    }
}

// ===== سجل التصدير =====
function addToExportHistory(filename, format, imageCount) {
    appState.exportHistory.unshift({
        filename: filename,
        format: format,
        imageCount: imageCount,
        date: new Date().toLocaleString(),
        timestamp: Date.now()
    });
    
    if (appState.exportHistory.length > 50) {
        appState.exportHistory = appState.exportHistory.slice(0, 50);
    }
    
    localStorage.setItem('exportHistory', JSON.stringify(appState.exportHistory));
}

function showExportHistory() {
    const history = appState.exportHistory;
    const modal = document.getElementById('exportHistoryModal');
    const content = document.getElementById('exportHistoryContent');
    
    if (history.length === 0) {
        content.innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">لا توجد عمليات تصدير سابقة</p>';
    } else {
        let html = '';
        history.forEach((item, index) => {
            html += `
                <div class="export-history-item">
                    <div><strong>#${index + 1}</strong> - ${item.filename}</div>
                    <div style="font-size: 0.85rem; color: #6b7280; margin-top: 0.25rem;">
                        📋 ${item.format} | 🖼️ ${item.imageCount} صورة | 📅 ${item.date}
                    </div>
                </div>
            `;
        });
        content.innerHTML = html;
    }
    
    modal.style.display = 'flex';
}

function clearExportHistory() {
    if (confirm('هل أنت متأكد من حذف سجل التصدير؟')) {
        appState.exportHistory = [];
        localStorage.setItem('exportHistory', JSON.stringify(appState.exportHistory));
        document.getElementById('exportHistoryContent').innerHTML = '<p style="text-align: center; color: #9ca3af; padding: 2rem;">تم مسح السجل</p>';
        updateStatus('تم مسح سجل التصدير ✓');
    }
}

// ===== نافذة المساعدة =====
function showHelp() {
    document.getElementById('helpModal').style.display = 'flex';
}

// ===== اختصارات لوحة المفاتيح =====
function handleKeyboardShortcuts(e) {
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        saveTemplate();
    }
    
    if (e.shiftKey && e.key === 'C') {
        e.preventDefault();
        copyFrontToBack();
    }
}

// ===== تحميل البيانات المحفوظة =====
function loadSavedData() {
    const historyData = localStorage.getItem('exportHistory');
    if (historyData) {
        try {
            appState.exportHistory = JSON.parse(historyData);
        } catch (e) {
            console.warn('خطأ في تحميل سجل التصدير');
        }
    }
    
    // تحميل إعدادات تخطيط الدفعة (جديد)
    const savedRows = localStorage.getItem('batchRows');
    const savedCols = localStorage.getItem('batchCols');
    if (savedRows) appState.batchRows = parseInt(savedRows);
    if (savedCols) appState.batchCols = parseInt(savedCols);
    
    // تحديث قيم الإدخالات
    if (document.getElementById('batchRows')) {
        document.getElementById('batchRows').value = appState.batchRows || 4;
    }
    if (document.getElementById('batchCols')) {
        document.getElementById('batchCols').value = appState.batchCols || 2;
    }
    
    loadDarkModePreference();
}

// ===== دعم Drag and Drop للدفعات =====
function setupBatchDragAndDrop() {
    const frontInput = document.getElementById('batchFrontImages');
    const backInput = document.getElementById('batchBackImages');
    
    if (!frontInput || !backInput) return;
    
    // الـ labels التي توضع الملفات فيها
    const frontLabel = frontInput.closest('label');
    const backLabel = backInput.closest('label');
    
    [frontLabel, backLabel].forEach(label => {
        if (!label) return;
        
        // منع السلوك الافتراضي للـ drag and drop
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            label.addEventListener(eventName, preventDefaults, false);
        });
        
        function preventDefaults(e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        // تأثير بصري عند السحب
        ['dragenter', 'dragover'].forEach(eventName => {
            label.addEventListener(eventName, () => {
                label.style.backgroundColor = '#a5b4fc';
                label.style.borderColor = '#1e40af';
            });
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            label.addEventListener(eventName, () => {
                label.style.backgroundColor = '#ffffff';
                label.style.borderColor = 'var(--primary-color)';
            });
        });
        
        // معالجة الملفات المسحوبة
        label.addEventListener('drop', (e) => {
            const dt = e.dataTransfer;
            const files = dt.files;
            
            if (label === frontLabel) {
                frontInput.files = files;
                const event = new Event('change', { bubbles: true });
                frontInput.dispatchEvent(event);
            } else if (label === backLabel) {
                backInput.files = files;
                const event = new Event('change', { bubbles: true });
                backInput.dispatchEvent(event);
            }
        });
    });
}
