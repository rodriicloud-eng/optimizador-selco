/**
 * Main Application Controller for Selco WNT 600 Melamine Optimizer
 * Handles UI interactions, 2D Guillotine optimization, Excel bulk paste, and factory sample viewing.
 */

(function () {
    'use strict';

    let optimizer = null;
    let renderer = null;
    let studio3D = null;
    let activeViewMode = '2d';
    let currentSolution = null;
    let activeSheetIndex = 0;
    let pieceIdCounter = 1;
    let activeMelamineFilter = 'ALL';

    // Default Industrial Melamine Catalog (Selco Factory + Catálogo Oficial Masisa 53 Colores + Faplac / Egger)
    const BASE_SELCO_CATALOG = [
        { code: '002ROB15', name: 'ROBLE PROVENZAL 15', brand: 'Selco / Faplac', length: 2500, width: 1830, thickness: 15, hex: '#c89d66', image: 'assets/melaminas_masisa/imagenes/Roble Santana.jpg' },
        { code: '002CAR18', name: 'CARVALLO 18', brand: 'Selco / Masisa', length: 2500, width: 1830, thickness: 18, hex: '#ad7d55', image: 'assets/melaminas_masisa/imagenes/Carvalo.jpg' },
        { code: '109BLA15', name: 'BLANCA 15', brand: 'Selco / Masisa', length: 2500, width: 1830, thickness: 15, hex: '#f5f6f1', image: 'assets/melaminas_masisa/imagenes/Blanco.jpg' },
        { code: '002DUR3',  name: 'DUR BLANCO 3', brand: 'Selco / Chapadur', length: 2500, width: 1830, thickness: 3, hex: '#f1f5f9', image: 'assets/melaminas_masisa/imagenes/Blanco (Ultra Mate).jpeg' }
    ];

    const DEFAULT_MELAMINE_CATALOG = [
        ...BASE_SELCO_CATALOG,
        ...((typeof window !== 'undefined' && Array.isArray(window.MASISA_OFFICIAL_CATALOG)) ? window.MASISA_OFFICIAL_CATALOG : [])
    ];

    let melamineCatalog = [];

    // Standard Furniture Presets (Item, Descripción, Ancho, Largo, Veta, Material)
    const PRESETS = {
        cocina_bajo: [
            { item: '1', name: 'Lateral Izquierdo', width: 580, length: 720, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '2', name: 'Lateral Derecho', width: 580, length: 720, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '3', name: 'Piso Mueble', width: 580, length: 864, quantity: 1, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '4', name: 'Estante Móvil', width: 550, length: 862, quantity: 1, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '5', name: 'Fajas de Techo', width: 100, length: 864, quantity: 2, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '6', name: 'Puerta Izquierda', width: 446, length: 716, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '7', name: 'Puerta Derecha', width: 446, length: 716, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '8', name: 'Zócalo Frontal', width: 100, length: 900, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 }
        ],
        placard: [
            { item: '1', name: 'Lateral Ropero Izq', width: 550, length: 2000, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'CARVALLO 18', thickness: 18 },
            { item: '2', name: 'Lateral Ropero Der', width: 550, length: 2000, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'CARVALLO 18', thickness: 18 },
            { item: '3', name: 'División Central', width: 550, length: 1900, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'CARVALLO 18', thickness: 18 },
            { item: '4', name: 'Piso / Techo', width: 550, length: 1200, quantity: 2, canRotate: true, grain: 'none', material: 'CARVALLO 18', thickness: 18 },
            { item: '5', name: 'Estantes Interiores', width: 530, length: 580, quantity: 4, canRotate: true, grain: 'none', material: 'CARVALLO 18', thickness: 18 },
            { item: '6', name: 'Puerta Principal 1', width: 595, length: 1980, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'CARVALLO 18', thickness: 18 },
            { item: '7', name: 'Puerta Principal 2', width: 595, length: 1980, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'CARVALLO 18', thickness: 18 }
        ],
        obra_multimelamina: [
            { item: '1', name: 'Lateral Izq Casco', width: 580, length: 720, quantity: 1, canRotate: true, grain: 'none', material: 'BLANCA 15', thickness: 15 },
            { item: '2', name: 'Lateral Der Casco', width: 580, length: 720, quantity: 1, canRotate: true, grain: 'none', material: 'BLANCA 15', thickness: 15 },
            { item: '3', name: 'Piso Bajo Mesada', width: 580, length: 864, quantity: 1, canRotate: true, grain: 'none', material: 'BLANCA 15', thickness: 15 },
            { item: '4', name: 'Estante Interior', width: 550, length: 862, quantity: 2, canRotate: true, grain: 'none', material: 'BLANCA 15', thickness: 15 },
            { item: '5', name: 'Fajas Amarre', width: 100, length: 864, quantity: 2, canRotate: true, grain: 'none', material: 'BLANCA 15', thickness: 15 },
            { item: '6', name: 'Puerta Frente Izq', width: 446, length: 716, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '7', name: 'Puerta Frente Der', width: 446, length: 716, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '8', name: 'Frente Cajón Superior', width: 176, length: 896, quantity: 2, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '9', name: 'Zócalo Vista Roble', width: 100, length: 900, quantity: 1, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '10', name: 'Fondo Trasero Mueble', width: 716, length: 896, quantity: 1, canRotate: true, grain: 'none', material: 'DUR BLANCO 3', thickness: 3 },
            { item: '11', name: 'Fondo Base Cajones', width: 450, length: 820, quantity: 2, canRotate: true, grain: 'none', material: 'DUR BLANCO 3', thickness: 3 }
        ],
        muestra_selco_rob: [
            { item: '1', name: 'Tira Larga Roble', width: 500, length: 1800, quantity: 3, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '2', name: 'Panel 1667 Roble', width: 500, length: 1667, quantity: 2, canRotate: false, grain: 'longitudinal', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '3', name: 'Pieza 470x70', width: 70, length: 470, quantity: 7, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '4', name: 'Pieza 510x70', width: 70, length: 510, quantity: 2, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '5', name: 'Pieza 1446x70', width: 70, length: 1446, quantity: 2, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '6', name: 'Frente 620x500', width: 500, length: 620, quantity: 3, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '7', name: 'Pieza 400x485', width: 485, length: 400, quantity: 2, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '8', name: 'Pieza 1000x485', width: 485, length: 1000, quantity: 1, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '9', name: 'Pieza 970x93', width: 93, length: 970, quantity: 2, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 },
            { item: '10', name: 'Pieza 320x93', width: 93, length: 320, quantity: 2, canRotate: true, grain: 'none', material: 'ROBLE PROVENZAL 15', thickness: 15 }
        ]
    };

    document.addEventListener('DOMContentLoaded', () => {
        initApp();
    });

    function initApp() {
        optimizer = new CuttingOptimizer();
        const canvas = document.getElementById('cuttingCanvas');
        const tooltip = document.getElementById('canvasTooltip');
        renderer = new CuttingCanvasRenderer(canvas, tooltip);

        const threeMount = document.getElementById('threeCanvasMount');
        const threeInfo = document.getElementById('threeInfoBar');
        if (threeMount && window.Furniture3DStudio) {
            studio3D = new Furniture3DStudio(threeMount, threeInfo);
        }

        initMelamineCatalog();

        // Expose controller API for external triggers & diagnostics
        window.SelcoApp = {
            switchViewMode,
            openProductionWorkOrder,
            runOptimization,
            openPasteModal,
            openMelamineCatalogModal,
            closeMelamineCatalogModal,
            loadPreset,
            generateFromParametric3D
        };

        bindEvents();
        loadSampleList();

        const jobCodeInput = document.getElementById('jobCode');
        if (jobCodeInput) jobCodeInput.value = '';

        checkEmptyState();
        updateTotalPartsBadge();
        updateJobMelaminesBar();
    }

    function bindEvents() {
        // Table actions
        const btnAddRow = document.getElementById('btnAddRow');
        if (btnAddRow) btnAddRow.addEventListener('click', () => addPartRow());

        const btnClearTable = document.getElementById('btnClearTable');
        if (btnClearTable) btnClearTable.addEventListener('click', () => clearTable());

        const btnCopyTable = document.getElementById('btnCopyTable');
        if (btnCopyTable) btnCopyTable.addEventListener('click', () => copyPartsTableToClipboard());

        // Preset selector
        const presetSelector = document.getElementById('presetSelector');
        if (presetSelector) {
            presetSelector.addEventListener('change', (e) => {
                if (e.target.value) {
                    loadPreset(e.target.value);
                }
            });
        }

        // Placa dimension presets
        const plateSizePreset = document.getElementById('plateSizePreset');
        if (plateSizePreset) {
            plateSizePreset.addEventListener('change', (e) => {
                const val = e.target.value;
                if (val) {
                    const parts = val.split('x');
                    document.getElementById('sheetLength').value = parts[0];
                    document.getElementById('sheetWidth').value = parts[1];
                }
            });
        }

        // Optimization button
        const btnOptimize = document.getElementById('btnOptimize');
        if (btnOptimize) btnOptimize.addEventListener('click', () => runOptimization());

        // Navigation between sheets
        const btnPrev = document.getElementById('btnPrevSheet');
        if (btnPrev) {
            btnPrev.addEventListener('click', () => {
                if (activeSheetIndex > 0) {
                    selectSheet(activeSheetIndex - 1);
                }
            });
        }

        const btnNext = document.getElementById('btnNextSheet');
        if (btnNext) {
            btnNext.addEventListener('click', () => {
                if (currentSolution && activeSheetIndex < currentSolution.sheets.length - 1) {
                    selectSheet(activeSheetIndex + 1);
                }
            });
        }

        const sheetSelect = document.getElementById('sheetSelectDropdown');
        if (sheetSelect) {
            sheetSelect.addEventListener('change', (e) => {
                selectSheet(parseInt(e.target.value, 10));
            });
        }

        // Canvas controls
        const btnZoomIn = document.getElementById('btnZoomIn');
        if (btnZoomIn) btnZoomIn.addEventListener('click', () => renderer.zoomIn());

        const btnZoomOut = document.getElementById('btnZoomOut');
        if (btnZoomOut) btnZoomOut.addEventListener('click', () => renderer.zoomOut());

        const btnFitScreen = document.getElementById('btnFitScreen');
        if (btnFitScreen) btnFitScreen.addEventListener('click', () => renderer.fitToScreen());

        // View Mode Switcher (2D vs 3D vs Work Order)
        const tabView2D = document.getElementById('tabView2D');
        const tabView3D = document.getElementById('tabView3D');
        const btnTopWorkOrder = document.getElementById('btnTopWorkOrder');
        const btnPrintWorkOrder = document.getElementById('btnPrintWorkOrder');

        if (tabView2D) tabView2D.addEventListener('click', () => switchViewMode('2d'));
        if (tabView3D) tabView3D.addEventListener('click', () => switchViewMode('3d'));
        if (btnTopWorkOrder) btnTopWorkOrder.addEventListener('click', () => openProductionWorkOrder());
        if (btnPrintWorkOrder) btnPrintWorkOrder.addEventListener('click', () => openProductionWorkOrder());

        // 3D Studio Controls
        const explodeSlider = document.getElementById('explodeSlider');
        const explodeValText = document.getElementById('explodeValueText');
        if (explodeSlider) {
            explodeSlider.addEventListener('input', (e) => {
                const val = parseInt(e.target.value, 10) || 0;
                if (explodeValText) explodeValText.textContent = `${val}%`;
                if (studio3D) studio3D.setExplodeFactor(val / 100);
            });
        }

        const chkShow3DLabels = document.getElementById('chkShow3DLabels');
        if (chkShow3DLabels) {
            chkShow3DLabels.addEventListener('change', (e) => {
                if (studio3D) studio3D.setShowLabels(e.target.checked);
            });
        }

        const chkWireframe3D = document.getElementById('chkWireframe3D');
        if (chkWireframe3D) {
            chkWireframe3D.addEventListener('change', (e) => {
                if (studio3D) studio3D.setWireframe(e.target.checked);
            });
        }

        const btnResetCamera3D = document.getElementById('btnResetCamera3D');
        if (btnResetCamera3D) {
            btnResetCamera3D.addEventListener('click', () => {
                if (studio3D) studio3D.fitCameraToCabinet();
            });
        }

        const btnGenerateParametric3D = document.getElementById('btnGenerateParametric3D');
        if (btnGenerateParametric3D) {
            btnGenerateParametric3D.addEventListener('click', () => generateFromParametric3D());
        }

        // Export & Download buttons
        const btnZip = document.getElementById('btnDownloadZip');
        if (btnZip) btnZip.addEventListener('click', () => downloadAllZip());

        const btnDownloadCurrent = document.getElementById('btnDownloadCurrent');
        if (btnDownloadCurrent) btnDownloadCurrent.addEventListener('click', () => downloadCurrentSelcoFile());

        const btnDownloadOsiXml = document.getElementById('btnDownloadOsiXml');
        if (btnDownloadOsiXml) btnDownloadOsiXml.addEventListener('click', () => downloadSelcoOsiXml());

        const btnCopyCode = document.getElementById('btnCopySelcoCode');
        if (btnCopyCode) btnCopyCode.addEventListener('click', () => openCodeModal());

        const btnSaveServer = document.getElementById('btnSaveServer');
        if (btnSaveServer) btnSaveServer.addEventListener('click', () => saveFilesToServer());

        // Modal close
        const modalCloseBtn = document.getElementById('modalCloseBtn');
        if (modalCloseBtn) modalCloseBtn.addEventListener('click', () => closeModal());

        const codeModalBackdrop = document.getElementById('codeModalBackdrop');
        if (codeModalBackdrop) {
            codeModalBackdrop.addEventListener('click', (e) => {
                if (e.target.id === 'codeModalBackdrop') closeModal();
            });
        }

        const btnCopyModal = document.getElementById('btnCopyModalText');
        if (btnCopyModal) btnCopyModal.addEventListener('click', () => copyModalText());

        // Excel paste modal / button
        const btnOpenPaste = document.getElementById('btnOpenPasteModal');
        if (btnOpenPaste) btnOpenPaste.addEventListener('click', () => openPasteModal());

        const btnOpenPasteFooter = document.getElementById('btnOpenPasteModalFooter');
        if (btnOpenPasteFooter) btnOpenPasteFooter.addEventListener('click', () => openPasteModal());

        // Imported pieces banner actions
        const btnCloseBanner = document.getElementById('btnCloseImportedBanner');
        if (btnCloseBanner) {
            btnCloseBanner.addEventListener('click', () => {
                const b = document.getElementById('importedPiecesBanner');
                if (b) b.style.display = 'none';
            });
        }

        const btnRunOptNow = document.getElementById('btnRunOptimizeNow');
        if (btnRunOptNow) {
            btnRunOptNow.addEventListener('click', () => runOptimization());
        }

        // Direct Excel / CSV file triggers & Inputs
        const btnUploadTrigger = document.getElementById('btnUploadExcelTrigger');
        const excelInput = document.getElementById('excelFileInput');
        if (excelInput) {
            if (btnUploadTrigger) btnUploadTrigger.addEventListener('click', () => excelInput.click());
            excelInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleExcelFile(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }

        // Modal Excel File picker & Drop Zone
        const btnModalBrowse = document.getElementById('btnModalBrowseExcel');
        const linkBrowse = document.getElementById('linkBrowseExcel');
        const modalExcelInput = document.getElementById('modalExcelFileInput');
        const excelDrop = document.getElementById('excelDropZone');

        if (modalExcelInput) {
            modalExcelInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files[0]) {
                    handleExcelFile(e.target.files[0]);
                    e.target.value = '';
                }
            });
            if (btnModalBrowse) btnModalBrowse.addEventListener('click', () => modalExcelInput.click());
            if (linkBrowse) linkBrowse.addEventListener('click', () => modalExcelInput.click());
        }

        if (excelDrop) {
            ['dragenter', 'dragover'].forEach(ev => {
                excelDrop.addEventListener(ev, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    excelDrop.classList.add('drag-active');
                });
            });

            ['dragleave', 'drop'].forEach(ev => {
                excelDrop.addEventListener(ev, (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    excelDrop.classList.remove('drag-active');
                });
            });

            excelDrop.addEventListener('drop', (e) => {
                const files = e.dataTransfer?.files;
                if (files && files.length > 0) {
                    handleExcelFile(files[0]);
                }
            });
        }

        const btnApplyPaste = document.getElementById('btnApplyPaste');
        if (btnApplyPaste) btnApplyPaste.addEventListener('click', () => applyPasteData());

        const pasteModalClose = document.getElementById('pasteModalCloseBtn');
        if (pasteModalClose) pasteModalClose.addEventListener('click', () => closePasteModal());

        const btnCancelPaste = document.getElementById('btnCancelPaste');
        if (btnCancelPaste) btnCancelPaste.addEventListener('click', () => closePasteModal());

        const pasteBackdrop = document.getElementById('pasteModalBackdrop');
        if (pasteBackdrop) {
            pasteBackdrop.addEventListener('click', (e) => {
                if (e.target.id === 'pasteModalBackdrop') closePasteModal();
            });
        }

        // Live preview listeners in bulk paste modal
        const pasteArea = document.getElementById('pasteArea');
        if (pasteArea) pasteArea.addEventListener('input', () => updatePastePreview());

        const pasteColFormat = document.getElementById('pasteColFormat');
        if (pasteColFormat) pasteColFormat.addEventListener('change', () => updatePastePreview());

        const pasteDefaultGrain = document.getElementById('pasteDefaultGrain');
        if (pasteDefaultGrain) pasteDefaultGrain.addEventListener('change', () => updatePastePreview());

        const btnPasteClear = document.getElementById('btnPasteClear');
        if (btnPasteClear) {
            btnPasteClear.addEventListener('click', () => {
                document.getElementById('pasteArea').value = '';
                updatePastePreview();
            });
        }

        const btnPasteSampleMulti = document.getElementById('btnPasteSampleMulti');
        if (btnPasteSampleMulti) btnPasteSampleMulti.addEventListener('click', () => loadPasteSample('multi'));

        const btnPasteSample1 = document.getElementById('btnPasteSample1');
        if (btnPasteSample1) btnPasteSample1.addEventListener('click', () => loadPasteSample('cocina'));

        const btnPasteSample2 = document.getElementById('btnPasteSample2');
        if (btnPasteSample2) btnPasteSample2.addEventListener('click', () => loadPasteSample('placard'));

        // Melamine Catalog & Bulk Melamine Loader Events
        const btnOpenMelamineCatalog = document.getElementById('btnOpenMelamineCatalog');
        if (btnOpenMelamineCatalog) btnOpenMelamineCatalog.addEventListener('click', () => openMelamineCatalogModal());

        const melamineCatalogCloseBtn = document.getElementById('melamineCatalogCloseBtn');
        if (melamineCatalogCloseBtn) melamineCatalogCloseBtn.addEventListener('click', () => closeMelamineCatalogModal());

        const btnCloseMelamineCatalogModal = document.getElementById('btnCloseMelamineCatalogModal');
        if (btnCloseMelamineCatalogModal) btnCloseMelamineCatalogModal.addEventListener('click', () => closeMelamineCatalogModal());

        const melamineModalBackdrop = document.getElementById('melamineCatalogModalBackdrop');
        if (melamineModalBackdrop) {
            melamineModalBackdrop.addEventListener('click', (e) => {
                if (e.target.id === 'melamineCatalogModalBackdrop') closeMelamineCatalogModal();
            });
        }

        const melamineCatalogSelect = document.getElementById('melamineCatalogSelect');
        if (melamineCatalogSelect) {
            melamineCatalogSelect.addEventListener('change', (e) => {
                const idx = parseInt(e.target.value, 10);
                if (!isNaN(idx) && melamineCatalog[idx]) {
                    applyMelamineToForm(melamineCatalog[idx], true);
                }
            });
        }

        const btnSaveCurrentMelamine = document.getElementById('btnSaveCurrentMelamine');
        if (btnSaveCurrentMelamine) {
            btnSaveCurrentMelamine.addEventListener('click', () => saveCurrentFormMelamineToCatalog());
        }

        const btnCopyMelamineColor = document.getElementById('btnCopyMelamineColor');
        if (btnCopyMelamineColor) {
            btnCopyMelamineColor.addEventListener('click', () => copyActiveMelamineColor());
        }

        const activeSwatch = document.getElementById('activeMelamineSwatch');
        if (activeSwatch) {
            activeSwatch.style.cursor = 'pointer';
            activeSwatch.addEventListener('click', () => copyActiveMelamineColor());
        }

        const btnLoadMasisaOfficialCatalog = document.getElementById('btnLoadMasisaOfficialCatalog');
        if (btnLoadMasisaOfficialCatalog) {
            btnLoadMasisaOfficialCatalog.addEventListener('click', () => loadMasisaOfficialCatalogToSystem());
        }

        const btnCopyAllCatalogColors = document.getElementById('btnCopyAllCatalogColors');
        if (btnCopyAllCatalogColors) {
            btnCopyAllCatalogColors.addEventListener('click', () => copyAllCatalogColorsToClipboard());
        }

        const btnLoadFullCommercialCatalog = document.getElementById('btnLoadFullCommercialCatalog');
        if (btnLoadFullCommercialCatalog) {
            btnLoadFullCommercialCatalog.addEventListener('click', () => loadFullCommercialCatalog());
        }

        const btnPasteMelamineSample = document.getElementById('btnPasteMelamineSample');
        if (btnPasteMelamineSample) {
            btnPasteMelamineSample.addEventListener('click', () => loadMelaminePasteSample());
        }

        const melaminePasteArea = document.getElementById('melaminePasteArea');
        if (melaminePasteArea) {
            melaminePasteArea.addEventListener('input', () => updateMelaminePasteCounter());
        }

        const btnImportMelaminesAppend = document.getElementById('btnImportMelaminesAppend');
        if (btnImportMelaminesAppend) {
            btnImportMelaminesAppend.addEventListener('click', () => importBulkMelamines(false));
        }

        const btnImportMelaminesReplace = document.getElementById('btnImportMelaminesReplace');
        if (btnImportMelaminesReplace) {
            btnImportMelaminesReplace.addEventListener('click', () => importBulkMelamines(true));
        }

        const btnBrowseMelamineExcel = document.getElementById('btnBrowseMelamineExcel');
        const melamineExcelFileInput = document.getElementById('melamineExcelFileInput');
        if (btnBrowseMelamineExcel && melamineExcelFileInput) {
            btnBrowseMelamineExcel.addEventListener('click', () => melamineExcelFileInput.click());
            melamineExcelFileInput.addEventListener('change', (e) => {
                if (e.target.files && e.target.files.length > 0) {
                    handleMelamineExcelFile(e.target.files[0]);
                    e.target.value = '';
                }
            });
        }

        const melamineSearchInput = document.getElementById('melamineSearchInput');
        if (melamineSearchInput) {
            melamineSearchInput.addEventListener('input', () => renderMelamineCatalogModalTable());
        }

        const btnAddSingleMelamineRow = document.getElementById('btnAddSingleMelamineRow');
        if (btnAddSingleMelamineRow) {
            btnAddSingleMelamineRow.addEventListener('click', () => addNewMelamineRowInCatalog());
        }

        const btnExportMelamineCatalog = document.getElementById('btnExportMelamineCatalog');
        if (btnExportMelamineCatalog) {
            btnExportMelamineCatalog.addEventListener('click', () => exportMelamineCatalogCsv());
        }

        const btnPasteClipboard = document.getElementById('btnPasteFromClipboard');
        if (btnPasteClipboard) {
            btnPasteClipboard.addEventListener('click', () => {
                if (navigator.clipboard && navigator.clipboard.readText) {
                    navigator.clipboard.readText().then(text => {
                        if (text && text.trim()) {
                            document.getElementById('pasteArea').value = text;
                            updatePastePreview();
                            showNotification('Contenido del portapapeles pegado.', 'success');
                        } else {
                            showNotification('El portapapeles no tiene texto.', 'warning');
                        }
                    }).catch(() => {
                        document.getElementById('pasteArea')?.focus();
                        showNotification('Por favor presiona Ctrl+V dentro del cuadro de texto.', 'info');
                    });
                } else {
                    document.getElementById('pasteArea')?.focus();
                    showNotification('Por favor presiona Ctrl+V dentro del cuadro de texto.', 'info');
                }
            });
        }

        // Global Ctrl+V listener on the page
        document.addEventListener('paste', handleGlobalPaste);

        // Reference file viewer selector
        const refSelect = document.getElementById('referenceFileSelect');
        if (refSelect) {
            refSelect.addEventListener('change', (e) => {
                const filename = e.target.value;
                if (filename) {
                    loadReferenceFile(filename);
                }
            });
        }

        // Drag & drop file to import
        setupFileDragAndDrop();
    }

    function reindexRows() {
        const rows = document.querySelectorAll('#partsTableBody tr.part-row');
        rows.forEach((r, idx) => {
            const numEl = r.querySelector('.row-num');
            if (numEl) numEl.textContent = idx + 1;
            const itemInp = r.querySelector('.part-item-code');
            if (itemInp && !itemInp.dataset.userEdited) {
                itemInp.value = idx + 1;
            }
        });
    }

    function switchViewMode(mode) {
        activeViewMode = mode;
        const tab2D = document.getElementById('tabView2D');
        const tab3D = document.getElementById('tabView3D');
        const vp2D = document.getElementById('viewport2DContainer');
        const vp3D = document.getElementById('viewport3DContainer');
        const nav2D = document.getElementById('canvasNavigation');
        const tools2D = document.getElementById('canvasTools2D');

        if (mode === '3d') {
            if (tab2D) tab2D.classList.remove('active');
            if (tab3D) tab3D.classList.add('active');
            if (vp2D) vp2D.style.display = 'none';
            if (vp3D) vp3D.style.display = 'flex';
            if (nav2D) nav2D.style.display = 'none';
            if (tools2D) tools2D.style.display = 'none';
            refresh3DStudio();
            setTimeout(() => {
                if (studio3D) studio3D.onResize();
            }, 60);
        } else {
            if (tab3D) tab3D.classList.remove('active');
            if (tab2D) tab2D.classList.add('active');
            if (vp3D) vp3D.style.display = 'none';
            if (vp2D) vp2D.style.display = 'block';
            if (currentSolution && nav2D) nav2D.style.display = 'flex';
            if (tools2D) tools2D.style.display = 'flex';
            setTimeout(() => {
                if (renderer) renderer.resize();
            }, 60);
        }
    }

    function refresh3DStudio() {
        if (!studio3D) return;
        const parts = getPartsFromTable();
        const thickness = parseFloat(document.getElementById('sheetThickness')?.value) || 18;
        const materialRaw = (document.getElementById('sheetMaterial')?.value || 'ROBLE PROVENZAL 15').trim();
        const cInfo = getMelamineColorInfo(materialRaw);
        const materialName = materialRaw.toLowerCase();
        let finish = 'roble';
        if (materialName.includes('blanc') || materialName.includes('bla')) finish = 'blanco';
        else if (materialName.includes('carv')) finish = 'carvallo';
        else if (materialName.includes('graf') || materialName.includes('gris') || materialName.includes('negr')) finish = 'grafito';
        else if (materialName.includes('nogal') || materialName.includes('cedr')) finish = 'nogal';

        const enrichedParts = parts.map(p => {
            const pColor = getMelamineColorInfo(p.material || materialRaw);
            return {
                ...p,
                hexColor: pColor.hex
            };
        });

        const explodeSlider = document.getElementById('explodeSlider');
        const explodeVal = explodeSlider ? (parseInt(explodeSlider.value, 10) || 0) / 100 : 0.25;

        studio3D.buildFromCutlist(enrichedParts, {
            thickness: thickness,
            finish: finish,
            hexColor: cInfo.hex
        });
        studio3D.setExplodeFactor(explodeVal);
    }

    function generateFromParametric3D() {
        if (!window.Furniture3DStudio) return;
        const type = document.getElementById('paramCabinetType')?.value || 'bajo_mesada';
        const width = parseFloat(document.getElementById('paramWidth')?.value) || 900;
        const height = parseFloat(document.getElementById('paramHeight')?.value) || 720;
        const depth = parseFloat(document.getElementById('paramDepth')?.value) || 580;
        const shelves = parseInt(document.getElementById('paramShelves')?.value, 10) || 0;
        const doors = parseInt(document.getElementById('paramDoors')?.value, 10) || 0;
        const drawers = parseInt(document.getElementById('paramDrawers')?.value, 10) || 0;
        const thickness = parseFloat(document.getElementById('sheetThickness')?.value) || 18;

        const generatedParts = Furniture3DStudio.generateParametricCabinet({
            type,
            width,
            height,
            depth,
            thickness,
            shelves,
            doors,
            drawers
        });

        clearTable();
        generatedParts.forEach(p => {
            addPartRow({
                item: p.item,
                name: p.name,
                width: p.width,
                length: p.length,
                quantity: p.quantity,
                grain: p.grain
            }, true);
        });

        refresh3DStudio();
        runOptimization();
        showNotification(`¡Despiece 3D generado (${generatedParts.length} ítems) y placas optimizadas!`, 'success');
    }

    function openProductionWorkOrder() {
        if (!window.WorkOrderGenerator) {
            showNotification('Módulo de Orden de Trabajo no disponible.', 'error');
            return;
        }
        const parts = getPartsFromTable();
        if (parts.length === 0) {
            showNotification('Agrega piezas y optimiza antes de generar la Orden de Trabajo.', 'warning');
            return;
        }
        if (!currentSolution || !currentSolution.sheets || currentSolution.sheets.length === 0) {
            runOptimization();
            setTimeout(() => {
                if (currentSolution) triggerWorkOrderPopup(parts);
            }, 250);
            return;
        }
        triggerWorkOrderPopup(parts);
    }

    function triggerWorkOrderPopup(parts) {
        const sheetConfig = {
            length: parseFloat(document.getElementById('sheetLength')?.value) || 2500,
            width: parseFloat(document.getElementById('sheetWidth')?.value) || 1830,
            thickness: parseFloat(document.getElementById('sheetThickness')?.value) || 18,
            material: document.getElementById('sheetMaterial')?.value.trim() || 'ROBLE PROVENZAL 18',
            jobName: document.getElementById('jobCode')?.value.trim().toUpperCase() || ''
        };
        const options = {
            kerf: parseFloat(document.getElementById('sawKerf')?.value) || 4.4,
            trim: parseFloat(document.getElementById('sheetTrim')?.value) || 10
        };
        const res = WorkOrderGenerator.openWorkOrderWindow(currentSolution, sheetConfig, parts, options);
        if (!res.success && res.error) {
            showNotification(res.error, 'warning');
        } else {
            showNotification('Orden de Trabajo generada lista para producción.', 'success');
        }
    }

    function downloadSelcoOsiXml() {
        if (!currentSolution || !window.WorkOrderGenerator) return;
        const sheetConfig = {
            length: parseFloat(document.getElementById('sheetLength')?.value) || 2500,
            width: parseFloat(document.getElementById('sheetWidth')?.value) || 1830,
            thickness: parseFloat(document.getElementById('sheetThickness')?.value) || 18,
            material: document.getElementById('sheetMaterial')?.value.trim() || 'MELAMINA 18',
            jobName: document.getElementById('jobCode')?.value.trim().toUpperCase() || ''
        };
        const parts = getPartsFromTable();
        const xmlObj = WorkOrderGenerator.generateSelcoOsiXml(currentSolution, sheetConfig, parts);
        const blob = new Blob([xmlObj.content], { type: 'application/xml;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = xmlObj.filename;
        a.click();
        URL.revokeObjectURL(a.href);
        showNotification(`Archivo OSI XML (${xmlObj.filename}) descargado.`, 'success');
    }

    function checkEmptyState() {
        const tbody = document.getElementById('partsTableBody');
        if (!tbody) return;
        const rows = tbody.querySelectorAll('tr.part-row');
        const emptyRow = tbody.querySelector('.empty-state-row');

        if (rows.length === 0) {
            if (!emptyRow) {
                const tr = document.createElement('tr');
                tr.className = 'empty-state-row';
                tr.innerHTML = `
                    <td colspan="7">
                        <div class="table-empty-box">
                            <div class="empty-icon-wrap">
                                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#38bdf8" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                            </div>
                            <div class="empty-title">Lista de piezas vacía</div>
                            <div class="empty-subtitle">Pega tus datos con <kbd class="kbd-inline">Ctrl+V</kbd>, sube un archivo Excel o carga un mueble de ejemplo.</div>
                            <div class="empty-actions">
                                <button type="button" class="btn btn-bulk-primary btn-sm" id="btnEmptyBulk" style="font-weight: 700;">
                                    📂 Carga Masiva / Excel
                                </button>
                                <button type="button" class="btn btn-secondary btn-sm" id="btnEmptyAdd">
                                    + Agregar Pieza Manual
                                </button>
                            </div>
                        </div>
                    </td>
                `;
                tbody.appendChild(tr);

                tr.querySelector('#btnEmptyBulk')?.addEventListener('click', () => openPasteModal());
                tr.querySelector('#btnEmptyAdd')?.addEventListener('click', () => addPartRow());
            }
        } else {
            if (emptyRow) emptyRow.remove();
        }
    }

    function addPartRow(data = {}, isImported = false) {
        const tbody = document.getElementById('partsTableBody');
        if (!tbody) return;

        // Remove empty state if present
        const emptyRow = tbody.querySelector('.empty-state-row');
        if (emptyRow) emptyRow.remove();

        const id = pieceIdCounter++;
        const rowNum = tbody.querySelectorAll('tr.part-row').length + 1;
        const tr = document.createElement('tr');
        tr.id = `row_${id}`;
        tr.className = `part-row ${isImported ? 'row-imported-new' : ''}`;

        const partItem = data.item !== undefined && data.item !== '' ? String(data.item) : String(rowNum);
        const isCustomItem = data.item !== undefined && String(data.item) !== String(rowNum);
        const partName = data.name || data.descripcion || ('Pieza ' + rowNum);
        const partWidth = data.width || data.ancho || 450;
        const partLength = data.length || data.largo || 700;
        const partQty = data.quantity || data.cant || 1;
        const partGrain = data.grain || data.veta || 'none';
        const defaultMat = document.getElementById('sheetMaterial')?.value.trim() || 'ROBLE PROVENZAL 15';
        const defaultThick = parseFloat(document.getElementById('sheetThickness')?.value) || 15;
        const partMaterial = (data.material || defaultMat).trim().toUpperCase();
        const partThickness = parseFloat(data.thickness) || defaultThick;

        tr.dataset.material = partMaterial;
        tr.dataset.thickness = String(partThickness);

        const partColorInfo = getMelamineColorInfo(partMaterial);
        const swatchBg = partColorInfo.image
            ? `background-color:${partColorInfo.hex};background-image:url('${encodeURI(partColorInfo.image)}');`
            : `background-color:${partColorInfo.hex};`;

        tr.innerHTML = `
            <td class="text-center">
                <input type="text" class="form-input part-item-code" value="${escapeHtml(partItem)}" ${isCustomItem ? 'data-user-edited="1"' : ''} title="Código de Ítem">
            </td>
            <td>
                <div style="display: flex; align-items: center; gap: 6px;">
                    ${isImported ? '<span class="badge-source-imported" title="Pieza importada masivamente">Excel</span>' : ''}
                    <div class="part-material-select-wrap" title="Seleccionar o cambiar material/melamina de esta pieza (${escapeHtml(partMaterial)} · ${partColorInfo.hex})">
                        <span class="part-melamine-swatch" style="${swatchBg}"></span>
                        <select class="part-material-select" aria-label="Material de la pieza">
                            ${buildPartMaterialOptionsHtml(partMaterial)}
                        </select>
                    </div>
                    <input type="text" class="form-input part-name" value="${escapeHtml(partName)}" placeholder="Descripción de pieza...">
                </div>
            </td>
            <td>
                <div class="input-unit-wrap">
                    <input type="number" class="form-input part-width" value="${partWidth}" min="10" max="4000" step="1" title="Ancho (mm)">
                </div>
            </td>
            <td>
                <div class="input-unit-wrap">
                    <input type="number" class="form-input part-length" value="${partLength}" min="10" max="4000" step="1" title="Largo (mm)">
                </div>
            </td>
            <td class="text-center">
                <select class="form-select part-grain ${partGrain !== 'none' ? 'has-grain' : ''}" title="Sentido de la veta para la seccionadora">
                    <option value="none" ${partGrain === 'none' ? 'selected' : ''}>🔄 Sin Veta</option>
                    <option value="longitudinal" ${partGrain === 'longitudinal' ? 'selected' : ''}>↔ Veta Largo</option>
                    <option value="transversal" ${partGrain === 'transversal' ? 'selected' : ''}>↕ Veta Ancho</option>
                </select>
            </td>
            <td>
                <div class="qty-control-wrap">
                    <input type="number" class="form-input part-qty" value="${partQty}" min="1" max="999" step="1">
                </div>
            </td>
            <td class="text-center" style="white-space: nowrap;">
                <button type="button" class="btn-duplicate-row" title="Duplicar / Copiar esta pieza">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button type="button" class="btn-delete-row" title="Eliminar fila">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>
                </button>
            </td>
        `;

        const matSelect = tr.querySelector('.part-material-select');
        const matSwatch = tr.querySelector('.part-melamine-swatch');
        const matWrap = tr.querySelector('.part-material-select-wrap');
        if (matSelect) {
            matSelect.addEventListener('change', () => {
                const chosenName = (matSelect.value || 'ROBLE PROVENZAL 15').trim().toUpperCase();
                const spec = findOrCreateMelamineSpec(chosenName);
                tr.dataset.material = spec.name.toUpperCase();
                tr.dataset.thickness = String(spec.thickness || 18);
                const cInfo = getMelamineColorInfo(spec.name);
                if (matSwatch) {
                    matSwatch.style.backgroundColor = cInfo.hex || '#c89d66';
                    matSwatch.style.backgroundImage = cInfo.image ? `url("${encodeURI(cInfo.image)}")` : 'none';
                }
                if (matWrap) {
                    matWrap.title = `Material de esta pieza: ${spec.name} [${spec.code}] · Color ${cInfo.hex}`;
                }
                updateJobMelaminesBar();
                if (activeViewMode === '3d') refresh3DStudio();
                showNotification(`Material de "${tr.querySelector('.part-name')?.value || 'pieza'}" cambiado a: ${spec.name} (${cInfo.hex})`, 'info');
            });
        }

        const itemInput = tr.querySelector('.part-item-code');
        if (itemInput) {
            itemInput.addEventListener('input', () => {
                itemInput.dataset.userEdited = '1';
                if (activeViewMode === '3d') refresh3DStudio();
            });
        }

        tr.querySelector('.part-grain').addEventListener('change', (e) => {
            e.target.classList.toggle('has-grain', e.target.value !== 'none');
            if (activeViewMode === '3d') refresh3DStudio();
        });

        tr.querySelector('.btn-duplicate-row').addEventListener('click', () => {
            const itemCode = tr.querySelector('.part-item-code')?.value.trim() || '';
            const name = tr.querySelector('.part-name')?.value.trim() || 'Pieza';
            const width = parseFloat(tr.querySelector('.part-width')?.value) || 450;
            const length = parseFloat(tr.querySelector('.part-length')?.value) || 700;
            const qty = parseInt(tr.querySelector('.part-qty')?.value, 10) || 1;
            const grain = tr.querySelector('.part-grain')?.value || 'none';

            addPartRow({
                item: itemCode ? itemCode + 'B' : undefined,
                name: name + ' (Copia)',
                width: width,
                length: length,
                quantity: qty,
                grain: grain,
                material: tr.dataset.material,
                thickness: tr.dataset.thickness
            });
            if (activeViewMode === '3d') refresh3DStudio();
            showNotification(`Pieza "${name}" duplicada.`, 'success');
        });

        tr.querySelector('.btn-delete-row').addEventListener('click', () => {
            tr.remove();
            reindexRows();
            checkEmptyState();
            updateTotalPartsBadge();
            updateJobMelaminesBar();
            if (activeViewMode === '3d') refresh3DStudio();
        });

        tr.querySelectorAll('input, select').forEach(el => {
            el.addEventListener('input', () => {
                updateTotalPartsBadge();
                if (activeViewMode === '3d') refresh3DStudio();
            });
        });

        tbody.appendChild(tr);
        reindexRows();
        updateTotalPartsBadge();
        updateJobMelaminesBar();
    }

    function clearTable() {
        const tbody = document.getElementById('partsTableBody');
        if (tbody) tbody.innerHTML = '';
        const presetSelector = document.getElementById('presetSelector');
        if (presetSelector) presetSelector.value = '';
        const banner = document.getElementById('importedPiecesBanner');
        if (banner) banner.style.display = 'none';

        // Reset KPIs to clean state
        const statSheets = document.getElementById('statTotalSheets');
        if (statSheets) statSheets.textContent = '-';
        const statEff = document.getElementById('statGlobalEfficiency');
        if (statEff) statEff.textContent = '-%';
        const statUsed = document.getElementById('statUsedArea');
        if (statUsed) statUsed.textContent = '- m²';
        const statWaste = document.getElementById('statWasteArea');
        if (statWaste) statWaste.textContent = '- m²';
        const statCuts = document.getElementById('statTotalCuts');
        if (statCuts) statCuts.textContent = '-';

        // Hide navigation and export bars
        const nav = document.getElementById('canvasNavigation');
        if (nav) nav.style.display = 'none';
        const exportBar = document.getElementById('exportBar');
        if (exportBar) exportBar.style.display = 'none';

        // Reset canvas to clean state
        currentSolution = null;
        if (renderer) {
            renderer.sheetData = null;
            renderer.render();
        }

        checkEmptyState();
        updateTotalPartsBadge();
        activeMelamineFilter = 'ALL';
        updateJobMelaminesBar();
    }

    function loadPreset(presetKey) {
        const items = PRESETS[presetKey];
        if (!items) return;

        clearTable();
        items.forEach(item => addPartRow(item));
        const presetSelector = document.getElementById('presetSelector');
        if (presetSelector) presetSelector.value = presetKey;
        runOptimization();
    }

    // ============================================================
    // MELAMINE CATALOG & MULTI-MELAMINE ENGINE
    // ============================================================

    function initMelamineCatalog() {
        try {
            const saved = localStorage.getItem('selco_melamine_catalog_v2_masisa');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (Array.isArray(parsed) && parsed.length > 0) {
                    melamineCatalog = parsed;
                }
            }
        } catch (e) {
            console.warn('Error loading melamine catalog from localStorage:', e);
        }

        if (!melamineCatalog || melamineCatalog.length === 0) {
            melamineCatalog = DEFAULT_MELAMINE_CATALOG.map(m => ({ ...m }));
            saveMelamineCatalogToStorage();
        } else if (Array.isArray(window.MASISA_OFFICIAL_CATALOG)) {
            // Ensure all 53 official Masisa colors are merged in with their hex & texture image
            let updated = false;
            window.MASISA_OFFICIAL_CATALOG.forEach(mas => {
                const existing = melamineCatalog.find(m => m.code === mas.code || m.name.toUpperCase() === mas.name.toUpperCase());
                if (!existing) {
                    melamineCatalog.push({ ...mas });
                    updated = true;
                } else if (!existing.hex || !existing.image) {
                    existing.hex = mas.hex;
                    existing.image = mas.image;
                    existing.brand = mas.brand;
                    updated = true;
                }
            });
            if (updated) saveMelamineCatalogToStorage();
        }

        renderMelamineCatalogSelect();
        updateActiveMelamineSwatch();
    }

    function saveMelamineCatalogToStorage() {
        try {
            localStorage.setItem('selco_melamine_catalog_v2_masisa', JSON.stringify(melamineCatalog));
        } catch (e) {
            console.warn('Error saving melamine catalog:', e);
        }
        renderMelamineCatalogSelect();
        updateActiveMelamineSwatch();
    }

    function getMelamineColorInfo(materialName) {
        const clean = String(materialName || '').trim().toUpperCase();
        const found = melamineCatalog.find(m => m.name.toUpperCase() === clean || m.code.toUpperCase() === clean) ||
                      melamineCatalog.find(m => clean.includes(m.name.toUpperCase()) || m.name.toUpperCase().includes(clean));
        if (found) {
            return {
                hex: found.hex || '#c89d66',
                image: found.image || '',
                name: found.name,
                code: found.code,
                brand: found.brand || 'Masisa'
            };
        }
        return { hex: '#c89d66', image: '', name: clean || 'ROBLE PROVENZAL 15', code: '002ROB15', brand: 'Masisa' };
    }

    function updateActiveMelamineSwatch() {
        const swatch = document.getElementById('activeMelamineSwatch');
        if (!swatch) return;
        const currentMat = document.getElementById('sheetMaterial')?.value || 'ROBLE PROVENZAL 15';
        const info = getMelamineColorInfo(currentMat);
        swatch.style.backgroundColor = info.hex || '#c89d66';
        if (info.image) {
            swatch.style.backgroundImage = `url("${encodeURI(info.image)}")`;
        } else {
            swatch.style.backgroundImage = 'none';
        }
        swatch.title = `${info.name} [${info.code}] · Color: ${info.hex} (Clic para copiar color)`;
    }

    function generateDosJobCode(nameStr, thicknessVal, seqNum = 1) {
        const clean = String(nameStr || 'MEL').toUpperCase().replace(/[^A-Z]/g, '');
        const prefix = clean.substring(0, 3).padEnd(3, 'X');
        const th = Math.round(parseFloat(thicknessVal) || 18);
        const num = String(seqNum).padStart(3, '0').slice(-3);
        return `${num}${prefix}${th}`.substring(0, 8);
    }

    function findOrCreateMelamineSpec(materialName, fallbackThickness = 18) {
        const cleanName = String(materialName || '').trim().toUpperCase();
        if (!cleanName) {
            return {
                code: document.getElementById('jobCode')?.value.trim().toUpperCase() || '002ROB15',
                name: document.getElementById('sheetMaterial')?.value.trim().toUpperCase() || 'ROBLE PROVENZAL 15',
                brand: 'Taller',
                length: parseFloat(document.getElementById('sheetLength')?.value) || 2500,
                width: parseFloat(document.getElementById('sheetWidth')?.value) || 1830,
                thickness: parseFloat(document.getElementById('sheetThickness')?.value) || 15
            };
        }

        // Exact or partial match in catalog
        let found = melamineCatalog.find(m => m.name.toUpperCase() === cleanName || m.code.toUpperCase() === cleanName);
        if (!found) {
            found = melamineCatalog.find(m => cleanName.includes(m.name.toUpperCase()) || m.name.toUpperCase().includes(cleanName));
        }

        if (found) {
            return { ...found };
        }

        // Extract thickness from name if present (e.g. "ROBLE 15" -> 15, "BLANCO 18" -> 18, "DUR 3" -> 3)
        const numMatch = cleanName.match(/\b(3|5\.5|9|12|15|18|25|30)\b/);
        const inferredThick = numMatch ? parseFloat(numMatch[1]) : (parseFloat(fallbackThickness) || 18);
        const newSpec = {
            code: generateDosJobCode(cleanName, inferredThick, melamineCatalog.length + 1),
            name: cleanName.substring(0, 23),
            brand: 'Importada',
            length: parseFloat(document.getElementById('sheetLength')?.value) || 2500,
            width: parseFloat(document.getElementById('sheetWidth')?.value) || 1830,
            thickness: inferredThick
        };

        melamineCatalog.push(newSpec);
        saveMelamineCatalogToStorage();
        return newSpec;
    }

    function buildPartMaterialOptionsHtml(selectedMaterial) {
        const cleanSel = String(selectedMaterial || '').trim().toUpperCase();
        let hasMatch = false;
        const options = melamineCatalog.map(m => {
            const mUpper = m.name.toUpperCase();
            const isSel = !hasMatch && (mUpper === cleanSel || m.code.toUpperCase() === cleanSel);
            if (isSel) hasMatch = true;
            return `<option value="${escapeHtml(mUpper)}" ${isSel ? 'selected' : ''}>${escapeHtml(m.name)} (${m.thickness}mm)</option>`;
        });
        if (!hasMatch && cleanSel) {
            options.unshift(`<option value="${escapeHtml(cleanSel)}" selected>${escapeHtml(cleanSel)}</option>`);
        }
        return options.join('');
    }

    function refreshAllPartRowMaterialSelects() {
        const rows = document.querySelectorAll('#partsTableBody tr.part-row');
        rows.forEach(r => {
            const mat = (r.dataset.material || 'ROBLE PROVENZAL 15').trim().toUpperCase();
            const sel = r.querySelector('.part-material-select');
            const swatch = r.querySelector('.part-melamine-swatch');
            const wrap = r.querySelector('.part-material-select-wrap');
            const cInfo = getMelamineColorInfo(mat);
            if (sel) {
                sel.innerHTML = buildPartMaterialOptionsHtml(mat);
            }
            if (swatch) {
                swatch.style.backgroundColor = cInfo.hex || '#c89d66';
                swatch.style.backgroundImage = cInfo.image ? `url("${encodeURI(cInfo.image)}")` : 'none';
            }
            if (wrap) {
                wrap.title = `Material de esta pieza: ${mat} [${cInfo.code}] · Color ${cInfo.hex}`;
            }
        });
    }

    function renderMelamineCatalogSelect() {
        const select = document.getElementById('melamineCatalogSelect');
        const countBadge = document.getElementById('badgeMelamineCatalogCount');
        const modalBadge = document.getElementById('melamineModalCountBadge');

        if (countBadge) countBadge.textContent = `${melamineCatalog.length} melaminas`;
        if (modalBadge) modalBadge.textContent = `${melamineCatalog.length} melaminas cargadas`;

        if (!select) return;
        const currentMat = (document.getElementById('sheetMaterial')?.value || '').trim().toUpperCase();

        select.innerHTML = melamineCatalog.map((m, idx) => {
            const isSelected = m.name.toUpperCase() === currentMat;
            return `<option value="${idx}" ${isSelected ? 'selected' : ''}>[${escapeHtml(m.code)}] ${escapeHtml(m.name)} — ${m.length}×${m.width} mm (${m.thickness} mm) ${m.brand ? '· ' + escapeHtml(m.brand) : ''}</option>`;
        }).join('');

        refreshAllPartRowMaterialSelects();
    }

    function applyMelamineToForm(mel, shouldOptimize = false) {
        if (!mel) return;
        if (document.getElementById('sheetLength')) document.getElementById('sheetLength').value = mel.length || 2500;
        if (document.getElementById('sheetWidth')) document.getElementById('sheetWidth').value = mel.width || 1830;
        if (document.getElementById('sheetThickness')) document.getElementById('sheetThickness').value = mel.thickness || 18;
        if (document.getElementById('sheetMaterial')) document.getElementById('sheetMaterial').value = (mel.name || 'MELAMINA').toUpperCase();
        updateActiveMelamineSwatch();

        // If all rows in the table share a single melamine, update them to this newly selected melamine
        const rows = Array.from(document.querySelectorAll('#partsTableBody tr.part-row'));
        const uniqueMats = new Set(rows.map(r => (r.dataset.material || '').toUpperCase()).filter(Boolean));
        if (uniqueMats.size <= 1) {
            rows.forEach(r => {
                r.dataset.material = mel.name.toUpperCase();
                r.dataset.thickness = String(mel.thickness);
            });
            refreshAllPartRowMaterialSelects();
            updateJobMelaminesBar();
        }

        if (studio3D) {
            refresh3DStudio();
        }

        showNotification(`Melamina seleccionada: ${mel.name} · Color ${mel.hex || ''} (${mel.length}×${mel.width}×${mel.thickness}mm) [${mel.code}]`, 'info');
        if (shouldOptimize && rows.length > 0) {
            runOptimization();
        }
    }

    function copyActiveMelamineColor() {
        const currentMat = document.getElementById('sheetMaterial')?.value || 'ROBLE PROVENZAL 15';
        const info = getMelamineColorInfo(currentMat);
        const textToCopy = `${info.code}\t${info.name}\t${info.brand}\t${info.hex}`;
        copyToClipboard(textToCopy, `🎨 Color copiado: ${info.name} (${info.hex}) [${info.code}]`);
    }

    function copyAllCatalogColorsToClipboard() {
        const lines = ['Codigo_Selco\tNombre_Melamina\tMarca_Categoria\tColor_HEX\tLargo_mm\tAncho_mm\tEspesor_mm'];
        melamineCatalog.forEach(m => {
            lines.push(`${m.code}\t${m.name}\t${m.brand || 'Masisa'}\t${m.hex || '#c89d66'}\t${m.length}\t${m.width}\t${m.thickness}`);
        });
        copyToClipboard(lines.join('\r\n'), `📋 ¡${melamineCatalog.length} melaminas y sus colores HEX copiados al portapapeles!`);
    }

    function loadMasisaOfficialCatalogToSystem() {
        if (!Array.isArray(window.MASISA_OFFICIAL_CATALOG)) return;
        let added = 0;
        window.MASISA_OFFICIAL_CATALOG.forEach(mas => {
            const existingIdx = melamineCatalog.findIndex(m => m.code === mas.code || m.name.toUpperCase() === mas.name.toUpperCase());
            if (existingIdx >= 0) {
                melamineCatalog[existingIdx] = { ...melamineCatalog[existingIdx], ...mas };
            } else {
                melamineCatalog.push({ ...mas });
                added++;
            }
        });
        saveMelamineCatalogToStorage();
        renderMelamineCatalogModalTable();
        showNotification(`🎨 ¡Catálogo Oficial Masisa (53 melaminas con sus colores y texturas) cargado con éxito!`, 'success');
    }

    function saveCurrentFormMelamineToCatalog() {
        const length = parseFloat(document.getElementById('sheetLength')?.value) || 2500;
        const width = parseFloat(document.getElementById('sheetWidth')?.value) || 1830;
        const thickness = parseFloat(document.getElementById('sheetThickness')?.value) || 18;
        const name = (document.getElementById('sheetMaterial')?.value || 'MELAMINA').trim().toUpperCase();
        const selectedIdx = parseInt(document.getElementById('melamineCatalogSelect')?.value, 10);
        const selectedMel = Number.isInteger(selectedIdx) ? melamineCatalog[selectedIdx] : null;
        const code = (selectedMel && selectedMel.name.toUpperCase() === name)
            ? selectedMel.code
            : generateDosJobCode(name, thickness, melamineCatalog.length + 1);

        const existingIdx = melamineCatalog.findIndex(m => m.name.toUpperCase() === name || m.code.toUpperCase() === code);
        if (existingIdx >= 0) {
            melamineCatalog[existingIdx] = { ...melamineCatalog[existingIdx], code, name, length, width, thickness };
            showNotification(`Melamina "${name}" actualizada en el catálogo.`, 'success');
        } else {
            melamineCatalog.unshift({ code, name, brand: 'Personalizada', length, width, thickness });
            showNotification(`Melamina "${name}" [${code}] guardada en el catálogo.`, 'success');
        }

        saveMelamineCatalogToStorage();
    }

    function openMelamineCatalogModal() {
        const modal = document.getElementById('melamineCatalogModalBackdrop');
        if (!modal) return;
        modal.style.display = 'flex';
        renderMelamineCatalogModalTable();
        updateMelaminePasteCounter();
    }

    function closeMelamineCatalogModal() {
        const modal = document.getElementById('melamineCatalogModalBackdrop');
        if (modal) modal.style.display = 'none';
    }

    function renderMelamineCatalogModalTable() {
        const tbody = document.getElementById('melamineCatalogTableBody');
        if (!tbody) return;

        const query = (document.getElementById('melamineSearchInput')?.value || '').trim().toLowerCase();
        const filtered = melamineCatalog.map((m, idx) => ({ ...m, idx })).filter(m => {
            if (!query) return true;
            return (m.name || '').toLowerCase().includes(query) ||
                   (m.code || '').toLowerCase().includes(query) ||
                   (m.brand || '').toLowerCase().includes(query) ||
                   String(m.thickness).includes(query);
        });

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align: center; padding: 1.5rem; color: var(--text-muted);">No se encontraron melaminas con ese filtro.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(m => {
            const hex = m.hex || '#c89d66';
            const bgStyle = m.image
                ? `background-color: ${hex}; background-image: url("${encodeURI(m.image)}"); background-size: cover; background-position: center;`
                : `background-color: ${hex};`;
            return `
            <tr data-cat-idx="${m.idx}">
                <td class="text-center">
                    <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
                        <div class="cat-swatch-box" style="width: 34px; height: 28px; border-radius: 5px; border: 1.5px solid rgba(255,255,255,0.4); ${bgStyle} cursor: pointer; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.4);" title="Clic para copiar color ${hex} (${escapeHtml(m.name)})"></div>
                        <input type="color" class="cat-edit-hex" value="${hex}" title="Editar color HEX (${hex})" style="width: 22px; height: 22px; padding: 0; border: none; background: transparent; cursor: pointer;">
                    </div>
                </td>
                <td>
                    <input type="text" class="form-input cat-edit-code" value="${escapeHtml(m.code)}" maxlength="8" style="font-family: 'JetBrains Mono', monospace; font-weight: 700; color: #38bdf8; text-align: center; padding: 0.32rem 0.3rem;">
                </td>
                <td>
                    <input type="text" class="form-input cat-edit-name" value="${escapeHtml(m.name)}" maxlength="23" style="font-weight: 600; padding: 0.32rem 0.5rem;">
                </td>
                <td>
                    <input type="text" class="form-input cat-edit-brand" value="${escapeHtml(m.brand || '')}" placeholder="Marca..." style="padding: 0.32rem 0.45rem; font-size: 0.78rem;">
                </td>
                <td>
                    <input type="number" class="form-input cat-edit-length" value="${m.length}" min="500" max="6000" style="text-align: center; padding: 0.32rem 0.25rem;">
                </td>
                <td>
                    <input type="number" class="form-input cat-edit-width" value="${m.width}" min="500" max="4000" style="text-align: center; padding: 0.32rem 0.25rem;">
                </td>
                <td>
                    <input type="number" class="form-input cat-edit-thick" value="${m.thickness}" min="1" max="100" step="0.5" style="text-align: center; color: #fbbf24; font-weight: 700; padding: 0.32rem 0.2rem;">
                </td>
                <td class="text-center" style="white-space: nowrap;">
                    <button type="button" class="btn btn-sm btn-secondary btn-copy-melamine-color" style="padding: 0.25rem 0.45rem !important; font-size: 0.68rem !important;" title="Copiar nombre, código y color HEX (${hex})">📋 Color</button>
                    <button type="button" class="btn btn-sm btn-accent btn-use-melamine" style="padding: 0.25rem 0.5rem !important; font-size: 0.7rem !important;" title="Seleccionar esta melamina en la placa actual">Usar</button>
                    <button type="button" class="btn-delete-row btn-del-melamine" title="Eliminar del catálogo">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                    </button>
                </td>
            </tr>
        `}).join('');

        tbody.querySelectorAll('tr[data-cat-idx]').forEach(tr => {
            const idx = parseInt(tr.dataset.catIdx, 10);
            tr.querySelectorAll('input').forEach(inp => {
                inp.addEventListener('change', () => {
                    if (!melamineCatalog[idx]) return;
                    melamineCatalog[idx].code = (tr.querySelector('.cat-edit-code')?.value || '001MEL18').trim().toUpperCase();
                    melamineCatalog[idx].name = (tr.querySelector('.cat-edit-name')?.value || 'MELAMINA').trim().toUpperCase();
                    melamineCatalog[idx].brand = (tr.querySelector('.cat-edit-brand')?.value || '').trim();
                    melamineCatalog[idx].length = parseFloat(tr.querySelector('.cat-edit-length')?.value) || 2500;
                    melamineCatalog[idx].width = parseFloat(tr.querySelector('.cat-edit-width')?.value) || 1830;
                    melamineCatalog[idx].thickness = parseFloat(tr.querySelector('.cat-edit-thick')?.value) || 18;
                    const hexVal = tr.querySelector('.cat-edit-hex')?.value;
                    if (hexVal) {
                        melamineCatalog[idx].hex = hexVal;
                        const box = tr.querySelector('.cat-swatch-box');
                        if (box) box.style.backgroundColor = hexVal;
                    }
                    saveMelamineCatalogToStorage();
                });
            });

            const copyAction = () => {
                const m = melamineCatalog[idx];
                if (!m) return;
                const txt = `${m.code}\t${m.name}\t${m.brand || 'Masisa'}\t${m.hex || '#c89d66'}`;
                copyToClipboard(txt, `🎨 Color copiado: ${m.name} (${m.hex || '#c89d66'}) [${m.code}]`);
            };

            tr.querySelector('.cat-swatch-box')?.addEventListener('click', copyAction);
            tr.querySelector('.btn-copy-melamine-color')?.addEventListener('click', copyAction);

            tr.querySelector('.btn-use-melamine')?.addEventListener('click', () => {
                if (melamineCatalog[idx]) {
                    applyMelamineToForm(melamineCatalog[idx], true);
                    closeMelamineCatalogModal();
                }
            });

            tr.querySelector('.btn-del-melamine')?.addEventListener('click', () => {
                melamineCatalog.splice(idx, 1);
                saveMelamineCatalogToStorage();
                renderMelamineCatalogModalTable();
            });
        });
    }

    function loadMelaminePasteSample() {
        const area = document.getElementById('melaminePasteArea');
        if (!area) return;
        area.value =
`Código\tNombre Melamina\tMarca\tLargo\tAncho\tEspesor
002ROB15\tROBLE PROVENZAL 15\tFaplac\t2500\t1830\t15
002CAR18\tCARVALLO 18\tMasisa\t2500\t1830\t18
109BLA15\tBLANCA 15\tSadepan\t2500\t1830\t15
002DUR3\tDUR BLANCO 3\tChapadur\t2500\t1830\t3
020 roble\tROBLE DAKAR 18\tFaplac\t2750\t1830\t18
021 ceniza\tGRIS CENIZA 18\tEgger\t2750\t1830\t18
022 lino\tLINO CANCUN 18\tMasisa\t2500\t1830\t18
023 haya\tHAYA NATURAL 15\tSadepan\t2500\t1830\t15
024 wengue\tWENGUE 18\tFaplac\t2750\t1830\t18
025 ebano\tEBANO NEGRO 18\tEgger\t2750\t1830\t18`;
        updateMelaminePasteCounter();
    }

    function parseBulkMelaminesText(rawText) {
        if (!rawText || !rawText.trim()) return [];
        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
        const parsed = [];

        lines.forEach((line, idx) => {
            const low = line.toLowerCase();
            if (idx === 0 && (low.includes('nombre') || low.includes('melamina') || low.includes('largo') || low.includes('espesor'))) {
                return; // skip header row
            }

            let cols = [];
            if (line.includes('\t')) cols = line.split('\t');
            else if (line.includes(';')) cols = line.split(';');
            else if (line.includes('|')) cols = line.split('|');
            else if (line.includes(',')) cols = line.split(',');
            else cols = line.split(/\s{2,}/);

            cols = cols.map(c => c.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
            if (cols.length === 0) return;

            let code = '';
            let name = '';
            let brand = 'Catálogo';
            let length = 2500;
            let width = 1830;
            let thickness = 18;

            // Find numeric columns vs text columns
            const nums = [];
            const texts = [];
            cols.forEach(c => {
                const n = cleanNumericValue(c);
                if (!isNaN(n) && isFinite(n) && /^\d+(?:[.,]\d+)?\s*(?:mm)?$/i.test(c)) {
                    nums.push(n);
                } else {
                    texts.push(c);
                }
            });

            // Assign dimensions from nums
            const largeDims = nums.filter(n => n >= 400).sort((a, b) => b - a);
            const smallDims = nums.filter(n => n > 0 && n <= 100);

            if (largeDims.length >= 2) {
                length = Math.round(largeDims[0]);
                width = Math.round(largeDims[1]);
            }
            if (smallDims.length >= 1) {
                thickness = smallDims[0];
            }

            // Assign code, name, brand from texts
            if (texts.length === 1) {
                name = texts[0].toUpperCase();
            } else if (texts.length >= 2) {
                if (texts[0].length <= 9 && /\d/.test(texts[0]) && !texts[0].includes(' ')) {
                    code = texts[0].toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 8);
                    name = texts[1].toUpperCase();
                    if (texts[2]) brand = texts[2];
                } else {
                    name = texts[0].toUpperCase();
                    brand = texts[1];
                }
            }

            if (!name) return;

            // Infer thickness from name if not explicitly provided
            if (smallDims.length === 0) {
                const thMatch = name.match(/\b(3|5\.5|9|12|15|18|25|30)\b/);
                if (thMatch) thickness = parseFloat(thMatch[1]);
            }

            if (!code) {
                code = generateDosJobCode(name, thickness, melamineCatalog.length + parsed.length + 1);
            }

            parsed.push({
                code: code.substring(0, 8),
                name: name.substring(0, 23),
                brand,
                length,
                width,
                thickness
            });
        });

        return parsed;
    }

    function updateMelaminePasteCounter() {
        const area = document.getElementById('melaminePasteArea');
        const info = document.getElementById('melaminePastePreviewInfo');
        if (!area || !info) return;
        const items = parseBulkMelaminesText(area.value);
        info.textContent = items.length > 0 ? `✨ ${items.length} melaminas detectadas listas para importar` : '';
    }

    function importBulkMelamines(replaceExisting = false) {
        const area = document.getElementById('melaminePasteArea');
        const items = parseBulkMelaminesText(area?.value || '');
        if (items.length === 0) {
            showNotification('Pega primero tu listado de melaminas o haz clic en "Ver Ejemplo de Planilla".', 'warning');
            return;
        }

        if (replaceExisting) {
            melamineCatalog = items;
        } else {
            items.forEach(it => {
                const existingIdx = melamineCatalog.findIndex(m => m.name.toUpperCase() === it.name.toUpperCase() || m.code.toUpperCase() === it.code.toUpperCase());
                if (existingIdx >= 0) {
                    melamineCatalog[existingIdx] = it;
                } else {
                    melamineCatalog.push(it);
                }
            });
        }

        saveMelamineCatalogToStorage();
        renderMelamineCatalogModalTable();
        if (area) area.value = '';
        updateMelaminePasteCounter();
        showNotification(`¡${items.length} melaminas importadas masivamente al catálogo!`, 'success');
    }

    function handleMelamineExcelFile(file) {
        if (!file) return;
        const lower = file.name.toLowerCase();
        if (lower.endsWith('.xlsx') || lower.endsWith('.xls')) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = new Uint8Array(e.target.result);
                    const wb = XLSX.read(data, { type: 'array' });
                    const allLines = [];
                    wb.SheetNames.forEach(sName => {
                        const tsv = XLSX.utils.sheet_to_csv(wb.Sheets[sName], { FS: '\t' });
                        if (tsv && tsv.trim()) allLines.push(tsv.trim());
                    });
                    const area = document.getElementById('melaminePasteArea');
                    if (area) {
                        area.value = allLines.join('\n');
                        updateMelaminePasteCounter();
                        importBulkMelamines(false);
                    }
                } catch (err) {
                    showNotification('Error al leer Excel de melaminas: ' + err.message, 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = (e) => {
                const area = document.getElementById('melaminePasteArea');
                if (area) {
                    area.value = e.target.result || '';
                    updateMelaminePasteCounter();
                    importBulkMelamines(false);
                }
            };
            reader.readAsText(file);
        }
    }

    function loadFullCommercialCatalog() {
        const extraCommercial = [
            ...DEFAULT_MELAMINE_CATALOG,
            { code: '018DAK18', name: 'ROBLE DAKAR 18', brand: 'Faplac', length: 2750, width: 1830, thickness: 18 },
            { code: '019CEN18', name: 'GRIS CENIZA 18', brand: 'Egger', length: 2750, width: 1830, thickness: 18 },
            { code: '020CAN18', name: 'LINO CANCUN 18', brand: 'Masisa', length: 2500, width: 1830, thickness: 18 },
            { code: '021HAY15', name: 'HAYA NATURAL 15', brand: 'Sadepan', length: 2500, width: 1830, thickness: 15 },
            { code: '022WEN18', name: 'WENGUE 18', brand: 'Faplac', length: 2750, width: 1830, thickness: 18 },
            { code: '023EBA18', name: 'EBANO NEGRO 18', brand: 'Egger', length: 2750, width: 1830, thickness: 18 },
            { code: '024CAM18', name: 'CAMEL 18', brand: 'Faplac', length: 2750, width: 1830, thickness: 18 },
            { code: '025VIS18', name: 'VISON 18', brand: 'Egger', length: 2750, width: 1830, thickness: 18 },
            { code: '026ALM18', name: 'ALMENDRA 18', brand: 'Masisa', length: 2500, width: 1830, thickness: 18 },
            { code: '027CED18', name: 'CEDRO 18', brand: 'Faplac', length: 2750, width: 1830, thickness: 18 },
            { code: '028CER18', name: 'CEREZO 18', brand: 'Sadepan', length: 2500, width: 1830, thickness: 18 },
            { code: '029BNE18', name: 'BLANCO NATURA 18', brand: 'Faplac', length: 2750, width: 1830, thickness: 18 },
            { code: '030FNR3',  name: 'FONDO ROBLE 3', brand: 'Chapadur', length: 2500, width: 1830, thickness: 3 }
        ];

        let added = 0;
        extraCommercial.forEach(it => {
            const exists = melamineCatalog.some(m => m.name.toUpperCase() === it.name.toUpperCase() || m.code.toUpperCase() === it.code.toUpperCase());
            if (!exists) {
                melamineCatalog.push({ ...it });
                added++;
            }
        });

        saveMelamineCatalogToStorage();
        renderMelamineCatalogModalTable();
        showNotification(`¡Catálogo completo cargado! (${melamineCatalog.length} melaminas disponibles en total).`, 'success');
    }

    function addNewMelamineRowInCatalog() {
        const nextNum = melamineCatalog.length + 1;
        melamineCatalog.unshift({
            code: `0${String(nextNum).padStart(2, '0')}MEL18`.substring(0, 8),
            name: `NUEVA MELAMINA ${nextNum}`,
            brand: 'Taller',
            length: 2500,
            width: 1830,
            thickness: 18
        });
        saveMelamineCatalogToStorage();
        renderMelamineCatalogModalTable();
    }

    function exportMelamineCatalogCsv() {
        const lines = ['Codigo_Selco\tNombre_Melamina\tMarca_Categoria\tColor_HEX\tLargo_mm\tAncho_mm\tEspesor_mm'];
        melamineCatalog.forEach(m => {
            lines.push(`${m.code}\t${m.name}\t${m.brand || ''}\t${m.hex || '#c89d66'}\t${m.length}\t${m.width}\t${m.thickness}`);
        });
        const blob = new Blob([lines.join('\r\n')], { type: 'text/tab-separated-values;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'Catalogo_Melaminas_Masisa_Selco.tsv';
        a.click();
        URL.revokeObjectURL(a.href);
        showNotification('Catálogo de melaminas y colores exportado.', 'success');
    }

    function updateJobMelaminesBar() {
        const bar = document.getElementById('jobMelaminesBar');
        const pillsContainer = document.getElementById('jobMelaminesPills');
        const summary = document.getElementById('jobMelaminesSummary');
        if (!bar || !pillsContainer) return;

        const rows = Array.from(document.querySelectorAll('#partsTableBody tr.part-row'));
        if (rows.length === 0) {
            bar.style.display = 'none';
            return;
        }

        const groups = {};
        let totalPieces = 0;
        rows.forEach(r => {
            const mat = (r.dataset.material || document.getElementById('sheetMaterial')?.value || 'MELAMINA').trim().toUpperCase();
            const q = parseInt(r.querySelector('.part-qty')?.value, 10) || 1;
            if (!groups[mat]) groups[mat] = { name: mat, count: 0, rows: 0 };
            groups[mat].count += q;
            groups[mat].rows += 1;
            totalPieces += q;
        });

        const matKeys = Object.keys(groups);
        bar.style.display = 'flex';

        if (summary) {
            summary.textContent = matKeys.length > 1
                ? `✨ ${matKeys.length} melaminas distintas detectadas — Se optimizarán todas en lote generando sus archivos Selco individuales`
                : `1 melamina activa en este corte (haz clic en la etiqueta de cualquier fila o usa Carga Masiva para mezclar varias melaminas)`;
        }

        let html = `
            <button type="button" class="job-melamine-pill ${activeMelamineFilter === 'ALL' ? 'active' : ''}" data-mat-filter="ALL">
                <span>📚 Todas las Melaminas (${matKeys.length})</span>
                <span style="opacity: 0.85;">· ${totalPieces} pzs</span>
            </button>
        `;

        matKeys.forEach(mat => {
            const g = groups[mat];
            const isAct = activeMelamineFilter === mat;
            const cInfo = getMelamineColorInfo(mat);
            html += `
                <button type="button" class="job-melamine-pill ${isAct ? 'active' : ''}" data-mat-filter="${escapeHtml(mat)}" title="Color HEX: ${cInfo.hex}">
                    <span style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${cInfo.hex};border:1.5px solid rgba(255,255,255,0.6);"></span>
                    <span>${escapeHtml(mat)}</span>
                    <span style="color: #7dd3fc;">(${g.count} pzs)</span>
                </button>
            `;
        });

        pillsContainer.innerHTML = html;

        pillsContainer.querySelectorAll('.job-melamine-pill').forEach(btn => {
            btn.addEventListener('click', () => {
                activeMelamineFilter = btn.dataset.matFilter || 'ALL';
                rows.forEach(r => {
                    const rowMat = (r.dataset.material || '').trim().toUpperCase();
                    r.style.display = (activeMelamineFilter === 'ALL' || rowMat === activeMelamineFilter) ? '' : 'none';
                });
                if (activeMelamineFilter !== 'ALL') {
                    const spec = findOrCreateMelamineSpec(activeMelamineFilter);
                    applyMelamineToForm(spec, false);
                }
                updateJobMelaminesBar();
            });
        });
    }

    function updateTotalPartsBadge() {
        const rows = document.querySelectorAll('#partsTableBody tr.part-row');
        let totalCount = 0;
        let totalArea = 0;

        rows.forEach(r => {
            const l = parseFloat(r.querySelector('.part-length')?.value) || 0;
            const w = parseFloat(r.querySelector('.part-width')?.value) || 0;
            const q = parseInt(r.querySelector('.part-qty')?.value, 10) || 0;
            totalCount += q;
            totalArea += (l * w * q) / 1000000;
        });

        const badgeParts = document.getElementById('badgeTotalParts');
        if (badgeParts) badgeParts.textContent = `${totalCount} piezas`;

        const badgeArea = document.getElementById('badgeTotalArea');
        if (badgeArea) badgeArea.textContent = `${totalArea.toFixed(2)} m²`;

        const badgeHeader = document.getElementById('badgeHeaderCount');
        const badgeHeaderText = document.getElementById('badgeHeaderCountText');
        const textStr = `${totalCount} piezas (${rows.length} filas)`;
        if (badgeHeaderText) {
            badgeHeaderText.textContent = textStr;
        } else if (badgeHeader) {
            badgeHeader.innerHTML = `<span class="pulse-dot-cyan"></span><span>${textStr}</span>`;
        }
    }

    function getPartsFromTable() {
        const rows = document.querySelectorAll('#partsTableBody tr.part-row');
        const parts = [];
        const defaultMat = (document.getElementById('sheetMaterial')?.value || 'ROBLE PROVENZAL 15').trim().toUpperCase();
        const defaultThick = parseFloat(document.getElementById('sheetThickness')?.value) || 15;

        rows.forEach((r, idx) => {
            if (activeMelamineFilter !== 'ALL' && (r.dataset.material || '').toUpperCase() !== activeMelamineFilter) {
                return;
            }
            const item = r.querySelector('.part-item-code')?.value.trim() || String(idx + 1);
            const name = r.querySelector('.part-name')?.value.trim();
            const width = parseFloat(r.querySelector('.part-width')?.value);
            const length = parseFloat(r.querySelector('.part-length')?.value);
            const quantity = parseInt(r.querySelector('.part-qty')?.value, 10) || 1;
            const grain = r.querySelector('.part-grain')?.value || 'none';
            const material = (r.dataset.material || defaultMat).trim().toUpperCase();
            const thickness = parseFloat(r.dataset.thickness) || defaultThick;

            if (name && length > 0 && width > 0 && quantity > 0) {
                parts.push({
                    item: item,
                    name: name,
                    descripcion: name,
                    width: width,
                    ancho: width,
                    length: length,
                    largo: length,
                    quantity: quantity,
                    grain: grain,
                    veta: grain,
                    canRotate: grain === 'none',
                    material: material,
                    thickness: thickness
                });
            }
        });

        return parts;
    }

    let optimizationTimer = null;

    function runOptimization() {
        const sheetLength = parseFloat(document.getElementById('sheetLength')?.value) || 2500;
        const sheetWidth = parseFloat(document.getElementById('sheetWidth')?.value) || 1830;
        const sheetThickness = parseFloat(document.getElementById('sheetThickness')?.value) || 18;
        const materialName = document.getElementById('sheetMaterial')?.value.trim().toUpperCase() || 'MELAMINA 18';
        const typedOrder = document.getElementById('jobCode')?.value.trim().toUpperCase() || '';
        const jobCode = typedOrder || getMelamineColorInfo(materialName).code || 'TRABAJO';

        const kerf = parseFloat(document.getElementById('sawKerf')?.value) || 4.4;
        const trim = parseFloat(document.getElementById('sheetTrim')?.value) || 10;
        const batchStrips = document.getElementById('chkBatchStrips')?.checked ?? true;

        const parts = getPartsFromTable();

        if (parts.length === 0) {
            showNotification('Agrega al menos una pieza válida para optimizar.', 'warning');
            return;
        }

        const btnOpt = document.getElementById('btnOptimize');
        if (btnOpt && !btnOpt.dataset.originalHtml) {
            btnOpt.dataset.originalHtml = btnOpt.innerHTML;
        }
        const originalText = btnOpt ? (btnOpt.dataset.originalHtml || btnOpt.innerHTML) : '';
        if (btnOpt) {
            btnOpt.disabled = true;
            btnOpt.innerHTML = `<span class="spinner"></span> Optimizando...`;
        }

        if (optimizationTimer) {
            clearTimeout(optimizationTimer);
        }

        optimizationTimer = setTimeout(() => {
            optimizationTimer = null;
            try {
                const options = {
                    kerf: kerf,
                    trim: trim,
                    batchStrips: batchStrips,
                    iterations: 35
                };

                // Group pieces by Melamina so if there are multiple melamines, ALL of them get optimized into their respective Selco plates!
                const groupsMap = {};
                parts.forEach(p => {
                    const mKey = (p.material || materialName).trim().toUpperCase();
                    if (!groupsMap[mKey]) groupsMap[mKey] = [];
                    groupsMap[mKey].push(p);
                });

                const groupKeys = Object.keys(groupsMap);
                let combinedSolution = null;

                if (groupKeys.length <= 1) {
                    const singleMat = groupKeys[0] || materialName;
                    const spec = (singleMat === materialName)
                        ? { length: sheetLength, width: sheetWidth, thickness: sheetThickness, name: materialName, code: jobCode }
                        : findOrCreateMelamineSpec(singleMat, parts[0]?.thickness || sheetThickness);

                    const sheetConfig = {
                        length: spec.length || sheetLength,
                        width: spec.width || sheetWidth,
                        thickness: spec.thickness || sheetThickness,
                        material: spec.name || materialName,
                        jobName: typedOrder || spec.code || jobCode
                    };

                    combinedSolution = optimizer.optimize(sheetConfig, parts, options);
                } else {
                    // Multi-Melamine Batch Optimization
                    const allSheets = [];
                    let totalParts = 0;
                    let placedParts = 0;
                    let totalSheetAreaM2 = 0;
                    let totalPartsAreaM2 = 0;
                    let totalWasteAreaM2 = 0;
                    let totalCuts = 0;

                    groupKeys.forEach(mKey => {
                        const groupParts = groupsMap[mKey];
                        const spec = findOrCreateMelamineSpec(mKey, groupParts[0]?.thickness || sheetThickness);
                        const sheetConfig = {
                            length: spec.length || sheetLength,
                            width: spec.width || sheetWidth,
                            thickness: spec.thickness || sheetThickness,
                            material: spec.name,
                            jobName: spec.code
                        };

                        const subSol = optimizer.optimize(sheetConfig, groupParts, options);
                        if (subSol && subSol.sheets && subSol.sheets.length > 0) {
                            subSol.sheets.forEach(s => {
                                s.melamineGroup = spec.name;
                                allSheets.push(s);
                            });
                            totalParts += subSol.stats.totalParts || 0;
                            placedParts += subSol.stats.placedParts || 0;
                            totalSheetAreaM2 += parseFloat(subSol.stats.totalSheetAreaM2) || 0;
                            totalPartsAreaM2 += parseFloat(subSol.stats.totalPartsAreaM2) || 0;
                            totalWasteAreaM2 += parseFloat(subSol.stats.totalWasteAreaM2) || 0;
                            totalCuts += subSol.stats.totalCuts || 0;
                        }
                    });

                    const globalEff = totalSheetAreaM2 > 0 ? ((totalPartsAreaM2 / totalSheetAreaM2) * 100).toFixed(1) : '0.0';
                    combinedSolution = {
                        success: allSheets.length > 0,
                        isMultiMelamine: true,
                        melamineCount: groupKeys.length,
                        sheets: allSheets,
                        stats: {
                            totalSheets: allSheets.length,
                            totalParts,
                            placedParts,
                            totalSheetAreaM2: totalSheetAreaM2.toFixed(2),
                            totalPartsAreaM2: totalPartsAreaM2.toFixed(2),
                            totalWasteAreaM2: totalWasteAreaM2.toFixed(2),
                            globalEfficiency: globalEff,
                            totalCuts
                        }
                    };
                }

                if (!combinedSolution || (!combinedSolution.success && (!combinedSolution.sheets || combinedSolution.sheets.length === 0))) {
                    showNotification(combinedSolution?.error || 'Error al optimizar piezas.', 'error');
                    return;
                }

                currentSolution = combinedSolution;
                activeSheetIndex = 0;

                renderOptimizationResults(combinedSolution);
                if (studio3D) {
                    refresh3DStudio();
                }

                if (groupKeys.length > 1) {
                    showNotification(`¡Lote Multi-Melamina optimizado! ${groupKeys.length} melaminas (${combinedSolution.sheets.length} placas en total) con ${combinedSolution.stats.globalEfficiency}% de aprovechamiento.`, 'success');
                } else {
                    showNotification(`¡Optimización lista! ${combinedSolution.sheets.length} placa(s) calculada(s) con ${combinedSolution.stats.globalEfficiency}% rendimiento.`, 'success');
                }

            } catch (err) {
                console.error(err);
                showNotification('Error durante la optimización: ' + err.message, 'error');
            } finally {
                if (btnOpt) {
                    btnOpt.disabled = false;
                    btnOpt.innerHTML = originalText;
                }
            }
        }, 100);
    }

    function renderOptimizationResults(solution) {
        document.getElementById('statTotalSheets').textContent = solution.sheets.length;
        document.getElementById('statGlobalEfficiency').textContent = `${solution.stats.globalEfficiency}%`;
        document.getElementById('statUsedArea').textContent = `${solution.stats.totalPartsAreaM2} m²`;
        document.getElementById('statWasteArea').textContent = `${solution.stats.totalWasteAreaM2} m²`;
        document.getElementById('statTotalCuts').textContent = solution.stats.totalCuts;

        const select = document.getElementById('sheetSelectDropdown');
        select.innerHTML = '';

        solution.sheets.forEach((s, idx) => {
            const opt = document.createElement('option');
            opt.value = idx;
            const efficiency = s.pieces.length > 0 ? 
                (((s.pieces.reduce((sum, p) => sum + p.width * p.height, 0)) / (s.sheet.length * s.sheet.width)) * 100).toFixed(1) : 0;
            const matTag = s.sheet?.material ? `[${s.sheet.material}] ` : '';
            opt.textContent = `Placa ${idx + 1} de ${solution.sheets.length} · ${matTag}(${s.selcoFile?.filename || 'P' + (idx+1)}) - ${efficiency}%`;
            select.appendChild(opt);
        });

        document.getElementById('exportBar').style.display = 'flex';
        document.getElementById('canvasNavigation').style.display = 'flex';

        selectSheet(0);
    }

    function selectSheet(index) {
        if (!currentSolution || !currentSolution.sheets[index]) return;

        activeSheetIndex = index;
        document.getElementById('sheetSelectDropdown').value = index;

        const sheetObj = currentSolution.sheets[index];
        const matLabel = sheetObj.sheet?.material ? ` · ${sheetObj.sheet.material}` : '';

        document.getElementById('currentSheetBadge').textContent = 
            `Placa ${index + 1} de ${currentSolution.sheets.length}: ${sheetObj.selcoFile?.filename || 'P' + (index + 1)}${matLabel}`;

        renderer.loadSheet(sheetObj);

        document.getElementById('btnPrevSheet').disabled = (index === 0);
        document.getElementById('btnNextSheet').disabled = (index === currentSolution.sheets.length - 1);
    }

    function openCodeModal() {
        if (!currentSolution || !currentSolution.sheets[activeSheetIndex]) {
            showNotification('No hay placa seleccionada.', 'warning');
            return;
        }

        const sheetObj = currentSolution.sheets[activeSheetIndex];
        const selcoFile = sheetObj.selcoFile;

        document.getElementById('modalFileTitle').textContent = `Código Selco WNT 600 - ${selcoFile.filename}`;
        document.getElementById('selcoCodePreview').textContent = selcoFile.content;
        document.getElementById('codeModalBackdrop').style.display = 'flex';
    }

    function closeModal() {
        document.getElementById('codeModalBackdrop').style.display = 'none';
    }

    function copyToClipboard(text, successMsg = '¡Copiado al portapapeles con éxito! 📋') {
        if (!text) {
            showNotification('No hay contenido para copiar.', 'warning');
            return;
        }

        if (navigator.clipboard && window.isSecureContext) {
            navigator.clipboard.writeText(text)
                .then(() => {
                    showNotification(successMsg, 'success');
                })
                .catch(() => {
                    fallbackCopyText(text, successMsg);
                });
            return;
        }

        fallbackCopyText(text, successMsg);
    }

    function fallbackCopyText(text, successMsg) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            textArea.style.position = "fixed";
            textArea.style.top = "-9999px";
            textArea.style.left = "-9999px";
            textArea.setAttribute("readonly", "");
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();
            textArea.setSelectionRange(0, 999999);
            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);

            if (successful) {
                showNotification(successMsg, 'success');
            } else {
                showNotification('Por favor selecciona el texto y presiona Ctrl+C.', 'info');
            }
        } catch (err) {
            console.error('Fallback copy error:', err);
            showNotification('Por favor selecciona el texto y presiona Ctrl+C.', 'info');
        }
    }

    function copyModalText() {
        const text = document.getElementById('selcoCodePreview')?.textContent || '';
        copyToClipboard(text, '¡Código Selco copiado al portapapeles! 📋');
    }

    function copyPartsTableToClipboard() {
        const parts = getPartsFromTable();
        if (parts.length === 0) {
            showNotification('No hay piezas en la lista para copiar.', 'warning');
            return;
        }

        const lines = ['Ítem\tDescripción\tAncho\tLargo\tVeta\tCantidad'];
        parts.forEach(p => {
            const grainStr = p.grain === 'none' ? 'Sin' : (p.grain === 'longitudinal' ? 'Largo' : 'Ancho');
            lines.push(`${p.item}\t${p.name}\t${p.width}\t${p.length}\t${grainStr}\t${p.quantity}`);
        });

        const tsvText = lines.join('\n');
        copyToClipboard(tsvText, `¡${parts.length} filas copiadas al portapapeles (Ítem, Descripción, Ancho, Largo, Veta)!`);
    }

    function downloadCurrentSelcoFile() {
        if (!currentSolution || !currentSolution.sheets[activeSheetIndex]) return;

        const sheetObj = currentSolution.sheets[activeSheetIndex];
        const file = sheetObj.selcoFile;

        const blob = new Blob([file.content], { type: 'text/plain;charset=windows-1252' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = file.filename;
        a.click();
        URL.revokeObjectURL(a.href);

        showNotification(`Archivo ${file.filename} descargado.`, 'success');
    }

    async function downloadAllZip() {
        if (!currentSolution || !currentSolution.sheets.length) return;

        const jobName = document.getElementById('jobCode')?.value.trim() || 'SELCO_JOB';
        const files = currentSolution.sheets.map(s => s.selcoFile);

        if (window.JSZip) {
            const zip = new JSZip();
            files.forEach(f => {
                zip.file(f.filename, f.content);
            });

            const content = await zip.generateAsync({ type: 'blob' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(content);
            a.download = `${jobName}.zip`;
            a.click();
            URL.revokeObjectURL(a.href);

            showNotification(`¡Lote ${jobName}.zip con ${files.length} archivo(s) descargado!`, 'success');
        } else {
            fetch('api.php?action=download_zip', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ jobName: jobName, files: files })
            })
            .then(res => res.blob())
            .then(blob => {
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `${jobName}.zip`;
                a.click();
                URL.revokeObjectURL(a.href);
                showNotification(`¡Lote ${jobName}.zip descargado!`, 'success');
            })
            .catch(err => {
                console.error(err);
                showNotification('Error al empaquetar ZIP: ' + err.message, 'error');
            });
        }
    }

    function saveFilesToServer() {
        if (!currentSolution || !currentSolution.sheets.length) return;

        const jobName = document.getElementById('jobCode')?.value.trim() || 'SELCO_JOB';
        const files = currentSolution.sheets.map(s => s.selcoFile);

        fetch('api.php?action=save_files', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ jobName: jobName, files: files })
        })
        .then(res => res.json())
        .then(data => {
            if (data.success) {
                const where = data.directory || `export/${data.jobName}`;
                showNotification(`Archivos guardados (${data.saved.length}) en ${where}.`, 'success');
            } else {
                showNotification('Error al guardar: ' + (data.error || 'Desconocido'), 'error');
            }
        })
        .catch(err => {
            console.error(err);
            showNotification('Error al comunicar con el servidor: ' + err.message, 'error');
        });
    }

    // Embedded Selco factory reference files for 100% offline standalone execution (no server needed)
    const EMBEDDED_SAMPLES = {
        "002CAR18.001": "B_SCH\r\nB_DAT\r\n\tNM=\"002CAR18.001\"\r\n\tCMM=\"\"\r\n\tMAT=\"CARVALLO 18 (1830x2500)\"\r\n\tDAY=\"\"\r\n\tOPZ=\"\"\r\n\tX=250000\r\n\tY=183000\r\n\tZ=1800\r\n\tHP=9000\r\n\tVL=0\r\n\tVT=0\r\n\tQTA=1\r\n\tESE=0\r\nE_DAT\r\nB_CUT\r\n\tCUT=1\r\n\t\tCOD=\"4\"\r\n\t\tDIM=57000\r\n\t\tQTA=1\r\n\tCUT=2\r\n\t\tCOD=\"5\"\r\n\t\tDIM=18000\r\n\t\tQTA=1\r\n\tCUT=3\r\n\t\tCOD=\"5\"\r\n\t\tDIM=66000\r\n\t\tQTA=2\r\n\tCUT=4\r\n\t\tCOD=\"Z1\"\r\n\t\tDIM=29700\r\n\t\tQTA=1\r\nE_CUT\r\nE_SCH",
        "002DUR3.001": "B_SCH\r\nB_DAT\r\n\tNM=\"002DUR3.001\"\r\n\tCMM=\"\"\r\n\tMAT=\"DUR BLANCO 3 (1830x2500\"\r\n\tDAY=\"\"\r\n\tOPZ=\"\"\r\n\tX=250000\r\n\tY=183000\r\n\tZ=300\r\n\tHP=9000\r\n\tVL=0\r\n\tVT=0\r\n\tQTA=1\r\n\tESE=0\r\nE_DAT\r\nB_CUT\r\n\tCUT=1\r\n\t\tCOD=\"4\"\r\n\t\tDIM=50800\r\n\t\tQTA=1\r\n\tCUT=2\r\n\t\tCOD=\"5\"\r\n\t\tDIM=58500\r\n\t\tQTA=1\r\nE_CUT\r\nE_SCH",
        "002ROB15.001": "B_SCH\r\nB_DAT\r\n\tNM=\"002ROB15.001\"\r\n\tCMM=\"\"\r\n\tMAT=\"ROBLE PROVENZAL 15 (183\"\r\n\tDAY=\"\"\r\n\tOPZ=\"\"\r\n\tX=250000\r\n\tY=183000\r\n\tZ=1500\r\n\tHP=9000\r\n\tVL=0\r\n\tVT=0\r\n\tQTA=1\r\n\tESE=0\r\nE_DAT\r\nB_CUT\r\n\tCUT=1\r\n\t\tCOD=\"4\"\r\n\t\tDIM=7000\r\n\t\tQTA=1\r\n\tCUT=2\r\n\t\tCOD=\"5\"\r\n\t\tDIM=47000\r\n\t\tQTA=4\r\n\tCUT=3\r\n\t\tCOD=\"5\"\r\n\t\tDIM=51000\r\n\t\tQTA=1\r\n\tCUT=4\r\n\t\tCOD=\"Z1\"\r\n\t\tDIM=5000\r\n\t\tQTA=1\r\n\tCUT=5\r\n\t\tCOD=\"4\"\r\n\t\tDIM=7000\r\n\t\tQTA=1\r\n\tCUT=6\r\n\t\tCOD=\"5\"\r\n\t\tDIM=166700\r\n\t\tQTA=1\r\n\tCUT=7\r\n\t\tCOD=\"5\"\r\n\t\tDIM=51000\r\n\t\tQTA=1\r\n\tCUT=8\r\n\t\tCOD=\"Z1\"\r\n\t\tDIM=5000\r\n\t\tQTA=1\r\n\tCUT=9\r\n\t\tCOD=\"4\"\r\n\t\tDIM=7000\r\n\t\tQTA=2\r\n\tCUT=10\r\n\t\tCOD=\"5\"\r\n\t\tDIM=47000\r\n\t\tQTA=2\r\n\tCUT=11\r\n\t\tCOD=\"5\"\r\n\t\tDIM=144600\r\n\t\tQTA=1\r\n\tCUT=12\r\n\t\tCOD=\"4\"\r\n\t\tDIM=50000\r\n\t\tQTA=1\r\n\tCUT=13\r\n\t\tCOD=\"5\"\r\n\t\tDIM=180000\r\n\t\tQTA=1\r\n\tCUT=14\r\n\t\tCOD=\"5\"\r\n\t\tDIM=62000\r\n\t\tQTA=1\r\n\tCUT=15\r\n\t\tCOD=\"Z1\"\r\n\t\tDIM=48500\r\n\t\tQTA=1\r\n\tCUT=16\r\n\t\tCOD=\"4\"\r\n\t\tDIM=48500\r\n\t\tQTA=2\r\n\tCUT=17\r\n\t\tCOD=\"5\"\r\n\t\tDIM=40000\r\n\t\tQTA=2\r\n\tCUT=18\r\n\t\tCOD=\"5\"\r\n\t\tDIM=62000\r\n\t\tQTA=1\r\n\tCUT=19\r\n\t\tCOD=\"5\"\r\n\t\tDIM=100000\r\n\t\tQTA=1\r\nE_CUT\r\nE_SCH",
        "002ROB15.002": "B_SCH\r\nB_DAT\r\n\tNM=\"002ROB15.002\"\r\n\tCMM=\"\"\r\n\tMAT=\"ROBLE PROVENZAL 15 (183\"\r\n\tDAY=\"\"\r\n\tOPZ=\"\"\r\n\tX=250000\r\n\tY=183000\r\n\tZ=1500\r\n\tHP=9000\r\n\tVL=0\r\n\tVT=0\r\n\tQTA=1\r\n\tESE=0\r\nE_DAT\r\nB_CUT\r\n\tCUT=1\r\n\t\tCOD=\"4\"\r\n\t\tDIM=7000\r\n\t\tQTA=1\r\n\tCUT=2\r\n\t\tCOD=\"5\"\r\n\t\tDIM=47000\r\n\t\tQTA=1\r\n\tCUT=3\r\n\t\tCOD=\"5\"\r\n\t\tDIM=166700\r\n\t\tQTA=1\r\n\tCUT=4\r\n\t\tCOD=\"4\"\r\n\t\tDIM=9300\r\n\t\tQTA=1\r\n\tCUT=5\r\n\t\tCOD=\"5\"\r\n\t\tDIM=32000\r\n\t\tQTA=1\r\n\tCUT=6\r\n\t\tCOD=\"5\"\r\n\t\tDIM=97000\r\n\t\tQTA=2\r\n\tCUT=7\r\n\t\tCOD=\"4\"\r\n\t\tDIM=9300\r\n\t\tQTA=1\r\n\tCUT=8\r\n\t\tCOD=\"5\"\r\n\t\tDIM=32000\r\n\t\tQTA=1\r\n\tCUT=9\r\n\t\tCOD=\"4\"\r\n\t\tDIM=50000\r\n\t\tQTA=1\r\n\tCUT=10\r\n\t\tCOD=\"5\"\r\n\t\tDIM=180000\r\n\t\tQTA=1\r\n\tCUT=11\r\n\t\tCOD=\"5\"\r\n\t\tDIM=62000\r\n\t\tQTA=1\r\n\tCUT=12\r\n\t\tCOD=\"Z1\"\r\n\t\tDIM=48500\r\n\t\tQTA=1\r\n\tCUT=13\r\n\t\tCOD=\"4\"\r\n\t\tDIM=99700\r\n\t\tQTA=1\r\n\tCUT=14\r\n\t\tCOD=\"5\"\r\n\t\tDIM=22300\r\n\t\tQTA=2\r\n\tCUT=15\r\n\t\tCOD=\"5\"\r\n\t\tDIM=22300\r\n\t\tQTA=1\r\n\tCUT=16\r\n\t\tCOD=\"Z1\"\r\n\t\tDIM=34700\r\n\t\tQTA=2\r\n\tCUT=17\r\n\t\tCOD=\"5\"\r\n\t\tDIM=144600\r\n\t\tQTA=1\r\n\tCUT=18\r\n\t\tCOD=\"Z1\"\r\n\t\tDIM=48500\r\n\t\tQTA=1\r\n\tCUT=19\r\n\t\tCOD=\"Z1\"\r\n\t\tDIM=50000\r\n\t\tQTA=1\r\nE_CUT\r\nE_SCH",
        "002ROB15.003": "B_SCH\r\nB_DAT\r\n\tNM=\"002ROB15.003\"\r\n\tCMM=\"\"\r\n\tMAT=\"ROBLE PROVENZAL 15 (183\"\r\n\tDAY=\"\"\r\n\tOPZ=\"\"\r\n\tX=250000\r\n\tY=183000\r\n\tZ=1500\r\n\tHP=9000\r\n\tVL=0\r\n\tVT=0\r\n\tQTA=1\r\n\tESE=0\r\nE_DAT\r\nB_CUT\r\n\tCUT=1\r\n\t\tCOD=\"4\"\r\n\t\tDIM=50000\r\n\t\tQTA=1\r\n\tCUT=2\r\n\t\tCOD=\"5\"\r\n\t\tDIM=180000\r\n\t\tQTA=1\r\n\tCUT=3\r\n\t\tCOD=\"4\"\r\n\t\tDIM=48500\r\n\t\tQTA=1\r\n\tCUT=4\r\n\t\tCOD=\"4\"\r\n\t\tDIM=50000\r\n\t\tQTA=1\r\n\tCUT=5\r\n\t\tCOD=\"5\"\r\n\t\tDIM=166700\r\n\t\tQTA=1\r\nE_CUT\r\nE_SCH",
        "109BLA15.002": "B_SCH\r\nB_DAT\r\n\tNM=\"109BLA15.002\"\r\n\tCMM=\"\"\r\n\tMAT=\"BLANCA 15 (1830x2500)  \"\r\n\tDAY=\"\"\r\n\tOPZ=\"\"\r\n\tX=250000\r\n\tY=183000\r\n\tZ=1500\r\n\tHP=9000\r\n\tVL=0\r\n\tVT=0\r\n\tQTA=1\r\n\tESE=0\r\nE_DAT\r\nB_CUT\r\n\tCUT=1\r\n\t\tCOD=\"4\"\r\n\t\tDIM=34500\r\n\t\tQTA=2\r\n\tCUT=2\r\n\t\tCOD=\"5\"\r\n\t\tDIM=67000\r\n\t\tQTA=2\r\n\tCUT=3\r\n\t\tCOD=\"4\"\r\n\t\tDIM=37000\r\n\t\tQTA=2\r\n\tCUT=4\r\n\t\tCOD=\"5\"\r\n\t\tDIM=105000\r\n\t\tQTA=2\r\nE_CUT\r\nE_SCH"
    };

    // ============================================================
    // FACTORY SAMPLES VIEWER & LOADER
    // ============================================================
    function populateSampleSelect(filenames) {
        const select = document.getElementById('referenceFileSelect');
        if (!select) return;

        select.innerHTML = '<option value="">-- Ver archivos de referencia de fábrica --</option>';
        filenames.forEach(fn => {
            const opt = document.createElement('option');
            opt.value = fn;
            opt.textContent = `${fn} (Selco WNT 600)`;
            select.appendChild(opt);
        });
    }

    function loadSampleList() {
        fetch('api.php?action=list_samples')
            .then(res => res.json())
            .then(data => {
                if (data.success && data.samples && data.samples.length > 0) {
                    populateSampleSelect(data.samples.map(s => s.filename));
                } else {
                    populateSampleSelect(Object.keys(EMBEDDED_SAMPLES));
                }
            })
            .catch(() => {
                // Standalone offline execution fallback
                populateSampleSelect(Object.keys(EMBEDDED_SAMPLES));
            });
    }

    function loadReferenceFile(filename) {
        // First try server API, if offline use embedded dictionary
        fetch(`api.php?action=read_file&filename=${encodeURIComponent(filename)}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.content) {
                    applyReferenceContent(filename, data.content);
                } else if (EMBEDDED_SAMPLES[filename]) {
                    applyReferenceContent(filename, EMBEDDED_SAMPLES[filename]);
                } else {
                    showNotification('No se pudo leer el archivo: ' + (data.error || 'Desconocido'), 'error');
                }
            })
            .catch(() => {
                if (EMBEDDED_SAMPLES[filename]) {
                    applyReferenceContent(filename, EMBEDDED_SAMPLES[filename]);
                } else {
                    showNotification(`Error al cargar archivo de fábrica: ${filename}`, 'error');
                }
            });
    }

    function applyReferenceContent(filename, rawContent) {
        const parsed = SelcoParser.parse(rawContent);
        parsed.rawContent = rawContent;
        renderParsedReference(parsed);
        showNotification(`Archivo ${filename} cargado e interpretado visualmente.`, 'info');
    }

    function renderParsedReference(parsed) {
        // Crucial: attach geometry properties to the root object for renderer
        parsed.pieces = parsed.geometry.pieces;
        parsed.wasteAreas = parsed.geometry.wasteAreas;
        parsed.strips = parsed.geometry.strips;

        currentSolution = {
            success: true,
            direction: 'longitudinal',
            sheets: [parsed],
            stats: {
                totalSheets: 1,
                totalParts: parsed.geometry.pieces.length,
                placedParts: parsed.geometry.pieces.length,
                totalSheetAreaM2: parsed.geometry.stats.totalSheetAreaM2,
                totalPartsAreaM2: parsed.geometry.stats.usedAreaM2,
                totalWasteAreaM2: parsed.geometry.stats.wasteAreaM2,
                globalEfficiency: parsed.geometry.stats.efficiencyPercent,
                totalCuts: parsed.cuts.length
            }
        };

        // Attach selcoFile for export / viewing
        parsed.selcoFile = {
            filename: parsed.name,
            content: parsed.rawContent || SelcoParser.generate(parsed, parsed.name.split('.')[0], 1).content
        };

        // Update sheet parameters inputs to match this factory file
        if (parsed.sheet) {
            if (document.getElementById('sheetLength')) document.getElementById('sheetLength').value = parsed.sheet.x;
            if (document.getElementById('sheetWidth')) document.getElementById('sheetWidth').value = parsed.sheet.y;
            if (document.getElementById('sheetThickness')) document.getElementById('sheetThickness').value = parsed.sheet.z;
            if (document.getElementById('sheetMaterial')) document.getElementById('sheetMaterial').value = parsed.material;
            if (document.getElementById('jobCode')) document.getElementById('jobCode').value = parsed.name.split('.')[0];
        }

        // Render KPI metrics
        document.getElementById('statTotalSheets').textContent = '1';
        document.getElementById('statGlobalEfficiency').textContent = `${parsed.geometry.stats.efficiencyPercent}%`;
        document.getElementById('statUsedArea').textContent = `${parsed.geometry.stats.usedAreaM2} m²`;
        document.getElementById('statWasteArea').textContent = `${parsed.geometry.stats.wasteAreaM2} m²`;
        document.getElementById('statTotalCuts').textContent = parsed.cuts.length;

        document.getElementById('sheetSelectDropdown').innerHTML = `
            <option value="0">${parsed.name} (${parsed.material}) - ${parsed.geometry.stats.efficiencyPercent}%</option>
        `;

        document.getElementById('exportBar').style.display = 'flex';
        document.getElementById('canvasNavigation').style.display = 'flex';
        document.getElementById('currentSheetBadge').textContent = `Fábrica: ${parsed.name} (${parsed.material})`;

        // Render 2D map on Canvas
        renderer.loadSheet(parsed);

        // Populate parts table with pieces from this factory file
        clearTable();
        const groupedPieces = {};
        parsed.geometry.pieces.forEach(p => {
            if (p.isScrap) return;
            const w = Math.round(p.width);
            const h = Math.round(p.height);
            const key = `${w}x${h}`;
            if (!groupedPieces[key]) {
                groupedPieces[key] = {
                    name: `Pieza ${w}x${h}`,
                    length: Math.max(w, h),
                    width: Math.min(w, h),
                    quantity: 0,
                    canRotate: true,
                    grain: 'none'
                };
            }
            groupedPieces[key].quantity++;
        });

        Object.values(groupedPieces).forEach(g => addPartRow(g));
    }

    function setupFileDragAndDrop() {
        const dropZone = document.body;

        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            dropZone.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
            }, false);
        });

        dropZone.addEventListener('drop', (e) => {
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                const lowerName = file.name.toLowerCase();

                // Check if file is spreadsheet / piece table
                if (lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls') || lowerName.endsWith('.csv') || lowerName.endsWith('.tsv')) {
                    handleExcelFile(file);
                    return;
                }

                // Check if it is a Selco cutting pattern reference file
                const reader = new FileReader();
                reader.onload = (event) => {
                    try {
                        const content = event.target.result;
                        if (content.includes('B_SCH') || content.includes('[General]') || lowerName.endsWith('.cpc') || lowerName.endsWith('.001') || lowerName.endsWith('.002') || lowerName.endsWith('.003')) {
                            const parsed = SelcoParser.parse(content);
                            parsed.name = file.name;
                            renderParsedReference(parsed);
                            showNotification(`Archivo Selco ${file.name} importado y visualizado correctamente.`, 'success');
                        } else {
                            // Try treating as piece list
                            handleExcelFile(file);
                        }
                    } catch (err) {
                        handleExcelFile(file);
                    }
                };
                reader.readAsText(file);
            }
        });
    }

    function handleExcelFile(file) {
        if (!file) return;
        const lowerName = file.name.toLowerCase();
        const isExcel = lowerName.endsWith('.xlsx') || lowerName.endsWith('.xls');

        if (isExcel) {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    if (typeof XLSX === 'undefined') {
                        showNotification('Librería XLSX no disponible en el navegador.', 'error');
                        return;
                    }
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    if (!workbook.SheetNames || workbook.SheetNames.length === 0) {
                        showNotification('El archivo Excel no contiene hojas de datos.', 'warning');
                        return;
                    }

                    // Support multi-sheet Excel workbooks (e.g. one sheet per Melamine)
                    if (workbook.SheetNames.length > 1) {
                        const combinedLines = [];
                        let headerAdded = false;
                        workbook.SheetNames.forEach(sName => {
                            const sheet = workbook.Sheets[sName];
                            const rawTsv = XLSX.utils.sheet_to_csv(sheet, { FS: "\t" });
                            const lines = rawTsv.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
                            lines.forEach((line, lIdx) => {
                                const low = line.toLowerCase();
                                const isHdr = lIdx === 0 && (low.includes('descrip') || low.includes('pieza') || low.includes('ancho') || low.includes('largo'));
                                if (isHdr) {
                                    if (!headerAdded) {
                                        combinedLines.push(low.includes('material') || low.includes('melamina') ? line : `${line}\tMelamina`);
                                        headerAdded = true;
                                    }
                                } else {
                                    combinedLines.push(`${line}\t${sName.trim().toUpperCase()}`);
                                }
                            });
                        });
                        openPasteModal(combinedLines.join('\n'));
                        showNotification(`Archivo "${file.name}" con ${workbook.SheetNames.length} hojas (melaminas) cargado exitosamente.`, 'success');
                    } else {
                        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                        const tsv = XLSX.utils.sheet_to_csv(firstSheet, { FS: "\t" });
                        openPasteModal(tsv);
                        showNotification(`Archivo "${file.name}" cargado exitosamente. Revisa la vista previa y confirma la importación.`, 'success');
                    }
                } catch (err) {
                    console.error('Error al procesar archivo Excel:', err);
                    showNotification('No se pudo procesar el archivo Excel: ' + err.message, 'error');
                }
            };
            reader.readAsArrayBuffer(file);
        } else {
            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const text = e.target.result;
                    openPasteModal(text);
                    showNotification(`Archivo "${file.name}" cargado exitosamente. Revisa la vista previa y confirma la importación.`, 'success');
                } catch (err) {
                    console.error('Error al leer el archivo:', err);
                    showNotification('No se pudo leer el archivo: ' + err.message, 'error');
                }
            };
            reader.readAsText(file);
        }
    }

    // ============================================================
    // ENHANCED BULK IMPORT & COPY-PASTE ENGINE (EXCEL / CSV)
    // ============================================================

    function handleGlobalPaste(e) {
        const clipboardData = e.clipboardData || window.clipboardData;
        if (!clipboardData) return;

        const text = clipboardData.getData('text');
        if (!text || text.trim() === '') return;

        const activeEl = document.activeElement;
        const activeTag = (activeEl?.tagName || '').toLowerCase();

        // If user is already inside the bulk paste textarea, let standard paste occur
        if (activeEl?.id === 'pasteArea') {
            return;
        }

        // Check if the clipboard text represents multiple cells/lines from Excel/Sheets
        const isTabularData = text.includes('\t') || 
                              text.includes(';') || 
                              (text.includes('\n') && text.trim().split('\n').length > 1);

        if (isTabularData) {
            e.preventDefault();
            openPasteModal(text);
            showNotification('¡Datos de planilla detectados! Revisa la vista previa y confirma.', 'info');
            return;
        }

        // If simple single-line text and user is inside an input, let default browser paste occur
        if (activeTag === 'input' || activeTag === 'textarea' || activeTag === 'select') {
            return;
        }
    }

    function openPasteModal(initialText = '') {
        const modal = document.getElementById('pasteModalBackdrop');
        const area = document.getElementById('pasteArea');
        if (!modal || !area) return;

        if (initialText) {
            area.value = initialText.trim();
        }

        modal.style.display = 'flex';
        updatePastePreview();

        setTimeout(() => {
            area.focus();
            if (initialText) area.select();
        }, 80);
    }

    function closePasteModal() {
        const modal = document.getElementById('pasteModalBackdrop');
        if (modal) modal.style.display = 'none';
    }

    let currentAutoMappedRoles = null;
    let currentPastedAnalysis = null;

    function loadPasteSample(type) {
        const area = document.getElementById('pasteArea');
        if (!area) return;

        if (type === 'multi') {
            area.value =
`Ítem\tDescripción\tAncho\tLargo\tVeta\tCantidad\tMaterial
1\tLateral Izq Casco\t580\t720\tSin\t1\tBLANCA 15
2\tLateral Der Casco\t580\t720\tSin\t1\tBLANCA 15
3\tPiso Bajo Mesada\t580\t864\tSin\t1\tBLANCA 15
4\tEstantes Interiores\t550\t862\tSin\t2\tBLANCA 15
5\tFajas de Amarre\t100\t864\tSin\t2\tBLANCA 15
6\tPuerta Frente Izq\t446\t716\tLargo\t1\tROBLE PROVENZAL 15
7\tPuerta Frente Der\t446\t716\tLargo\t1\tROBLE PROVENZAL 15
8\tFrente Cajón Superior\t176\t896\tLargo\t2\tROBLE PROVENZAL 15
9\tZócalo Vista Roble\t100\t900\tLargo\t1\tROBLE PROVENZAL 15
10\tFondo Trasero Mueble\t716\t896\tSin\t1\tDUR BLANCO 3
11\tFondo Base Cajones\t450\t820\tSin\t2\tDUR BLANCO 3`;
        } else if (type === 'cocina') {
            area.value = 
`Ítem\tDescripción\tAncho\tLargo\tVeta\tCantidad\tMaterial
1\tLateral Izquierdo\t580\t720\tLargo\t1\tROBLE PROVENZAL 15
2\tLateral Derecho\t580\t720\tLargo\t1\tROBLE PROVENZAL 15
3\tPiso Mueble\t580\t864\tSin\t1\tROBLE PROVENZAL 15
4\tEstante Móvil\t550\t862\tSin\t1\tROBLE PROVENZAL 15
5\tFaja Superior Frontal\t100\t864\tLargo\t1\tROBLE PROVENZAL 15
6\tFaja Superior Trasera\t100\t864\tLargo\t1\tROBLE PROVENZAL 15
7\tPuerta Izquierda\t446\t716\tLargo\t1\tROBLE PROVENZAL 15
8\tPuerta Derecha\t446\t716\tLargo\t1\tROBLE PROVENZAL 15
9\tZócalo Frontal\t100\t900\tLargo\t1\tROBLE PROVENZAL 15`;
        } else if (type === 'placard') {
            area.value = 
`Ítem\tDescripción\tAncho\tLargo\tVeta\tCantidad\tMaterial
1\tLateral Ropero Izq\t550\t2000\tLargo\t1\tCARVALLO 18
2\tLateral Ropero Der\t550\t2000\tLargo\t1\tCARVALLO 18
3\tDivisión Interior\t550\t1900\tLargo\t1\tCARVALLO 18
4\tPiso y Techo\t550\t1200\tSin\t2\tCARVALLO 18
5\tEstantes Ropa\t530\t580\tSin\t4\tCARVALLO 18
6\tPuerta Principal 1\t595\t1980\tLargo\t1\tCARVALLO 18
7\tPuerta Principal 2\t595\t1980\tLargo\t1\tCARVALLO 18`;
        }
        currentAutoMappedRoles = null;
        updatePastePreview();
    }

    function cleanNumericValue(val) {
        if (typeof val === 'number') return val;
        if (!val) return NaN;
        const s = String(val).trim().replace(/mm$/i, '').replace(/cm$/i, '').replace(/,/, '.').replace(/[^0-9.]/g, '');
        return parseFloat(s);
    }

    function detectGrainValue(val, fallback = 'none') {
        if (!val) return fallback;
        const s = String(val).toLowerCase().trim();
        if (s.includes('sin') || s.includes('no') || s === '0' || s === 'gira' || s === 'libre' || s === 'ninguna') {
            return 'none';
        }
        if (s.includes('trans') || s.includes('ancho') || s === 'a' || s === 'y') {
            return 'transversal';
        }
        if (s.includes('long') || s.includes('largo') || s.includes('con') || s.includes('veta') || s === 'si' || s === 'sí' || s === '1' || s === 'l' || s === 'x') {
            return 'longitudinal';
        }
        return fallback;
    }

    function parseAndDetectTable(rawText, defaultGrain = 'none', customRoles = null) {
        if (!rawText || !rawText.trim()) {
            return { pieces: [], roles: [], isHeader: false, rawRows: [], headerLabels: [], detectedMaterial: null, detectedThickness: null };
        }

        const lines = rawText.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
        if (lines.length === 0) {
            return { pieces: [], roles: [], isHeader: false, rawRows: [], headerLabels: [], detectedMaterial: null, detectedThickness: null };
        }

        // Tokenize rows by common tabular delimiters
        const rawRows = lines.map(line => {
            let cols = [];
            if (line.includes('\t')) cols = line.split('\t');
            else if (line.includes(';')) cols = line.split(';');
            else if (line.includes('|')) cols = line.split('|');
            else if (line.includes(',') && (line.match(/,/g) || []).length >= 2) cols = line.split(',');
            else cols = line.split(/\s{2,}|\t/);
            return cols.map(c => c.trim().replace(/^["\x27]|["\x27]$/g, ''));
        }).filter(r => r.length > 0 && r.some(c => c !== ''));

        if (rawRows.length === 0) {
            return { pieces: [], roles: [], isHeader: false, rawRows: [], headerLabels: [], detectedMaterial: null, detectedThickness: null };
        }

        const numCols = Math.max(...rawRows.map(r => r.length));
        rawRows.forEach(r => { while (r.length < numCols) r.push(''); });

        // If only 1 column, check if it contains dimension expressions (e.g. Lateral 720x580 2)
        if (numCols === 1) {
            const pieces = [];
            let itemIndex = 1;
            rawRows.forEach(r => {
                const line = r[0];
                const dimMatch = line.match(/(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?\s*[xX*×]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?/);
                if (dimMatch) {
                    const len = parseFloat(dimMatch[1].replace(',', '.'));
                    const wid = parseFloat(dimMatch[2].replace(',', '.'));
                    const remaining = line.replace(dimMatch[0], ' ').trim();
                    const qtyMatch = remaining.match(/(?:cant\.?|cantidad|x)?\s*(\d+)/i);
                    const q = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
                    const n = remaining.replace(/(?:cant\.?|cantidad|x)?\s*\d+/i, '').trim() || `Pieza ${itemIndex}`;
                    if (len > 0 && wid > 0) {
                        pieces.push({
                            name: n,
                            length: Math.round(len),
                            width: Math.round(wid),
                            quantity: Math.max(1, q),
                            grain: defaultGrain,
                            canRotate: defaultGrain === 'none'
                        });
                        itemIndex++;
                    }
                }
            });

            return {
                pieces,
                roles: ['name'],
                isHeader: false,
                rawRows,
                headerLabels: ['Línea'],
                detectedMaterial: null,
                detectedThickness: null
            };
        }

        // Header detection: check row 0
        const firstRowLower = rawRows[0].map(c => c.toLowerCase());
        const headerKeywords = [
            'pieza', 'nombre', 'descrip', 'detalle', 'item', 'largo', 'ancho', 'cant',
            'veta', 'espesor', 'material', 'pos', 'codigo', 'código', 'length', 'width', 'qty',
            'fibra', 'giro', 'color', 'dim', 'medida', 'part', 'label', 'rotulo', 'rótulo'
        ];
        let headerMatches = 0;
        firstRowLower.forEach(c => {
            if (headerKeywords.some(hk => c.includes(hk))) headerMatches++;
        });

        const isHeader = headerMatches >= 2 || (rawRows.length > 1 && headerMatches >= 1 && !firstRowLower.some(c => /^\d{2,}$/.test(c)));
        const headerLabels = isHeader ? [...rawRows[0]] : rawRows[0].map((_, i) => `Columna ${i + 1}`);

        let colRoles = new Array(numCols).fill(null);
        const assignedRoles = new Set();

        // 1. If user has customized column roles, respect them
        const formatSelect = document.getElementById('pasteColFormat')?.value || 'auto';
        if (customRoles && Array.isArray(customRoles) && customRoles.length === numCols) {
            colRoles = [...customRoles];
            colRoles.forEach(r => { if (r && r !== 'ignore') assignedRoles.add(r); });
        } else if (formatSelect === 'item_desc_w_l_v' && numCols >= 4) {
            colRoles[0] = 'item'; assignedRoles.add('item');
            colRoles[1] = 'name'; assignedRoles.add('name');
            colRoles[2] = 'width'; assignedRoles.add('width');
            colRoles[3] = 'length'; assignedRoles.add('length');
            if (numCols >= 5) { colRoles[4] = 'grain'; assignedRoles.add('grain'); }
            if (numCols >= 6) { colRoles[5] = 'qty'; assignedRoles.add('qty'); }
        } else if (isHeader) {
            // Intelligent Score-Based Header Matching
            function scoreHeader(headerStr, role) {
                const h = headerStr.toLowerCase().trim();
                if (role === 'item') {
                    if (h === 'item' || h === 'ítem' || h === 'id' || h === 'pos' || h === 'n°' || h === 'nro' || h === 'cod' || h === 'código' || h === 'codigo') return 12;
                    if (h.includes('item') || h.includes('ítem') || h.includes('codigo') || h.includes('código')) return 9;
                    return 0;
                }
                if (role === 'name') {
                    if (h.includes('descrip') || h.includes('pieza') || h.includes('detalle') || h.includes('nombre')) return 12;
                    if (h.includes('etiqueta') || h.includes('label') || h.includes('part') || h.includes('rotulo') || h.includes('rótulo')) return 6;
                    return 0;
                }
                if (role === 'width') {
                    if (h.includes('ancho') || h.includes('profundidad') || h.includes('width')) return 12;
                    if (h.includes('dim y') || h.includes('medida y') || h.includes('dim 2') || h.includes('medida 2') || h.includes('dim2') || h.includes('medida2')) return 8;
                    if (h === 'y' || h === 'a' || h === 'w') return 5;
                    return 0;
                }
                if (role === 'length') {
                    if (h.includes('largo') || h.includes('longitud') || h.includes('length') || h.includes('alto')) return 12;
                    if (h.includes('dim x') || h.includes('medida x') || h.includes('dim 1') || h.includes('medida 1') || h.includes('dim1') || h.includes('medida1')) return 8;
                    if (h === 'x' || h === 'l') return 5;
                    return 0;
                }
                if (role === 'grain') {
                    if (h.includes('sentido veta') || h.includes('sentido') || h.includes('veta')) return 12;
                    if (h.includes('fibra') || h.includes('grain') || h.includes('giro') || h.includes('rotar') || h.includes('orientacion') || h.includes('orientación')) return 9;
                    return 0;
                }
                if (role === 'qty') {
                    if (h.includes('cantidad') || h.includes('cant') || h.includes('qty')) return 11;
                    if (h.includes('unidades') || h.includes('piezas') || h.includes('count')) return 8;
                    if (h === 'u' || h === 'c' || h === 'q') return 4;
                    return 0;
                }
                if (role === 'material') {
                    if (h.includes('material') || h.includes('melamina') || h.includes('placa')) return 11;
                    if (h.includes('color') || h.includes('acabado') || h.includes('diseño')) return 8;
                    if (h === 'mat' || h === 'mel') return 6;
                    return 0;
                }
                if (role === 'thickness') {
                    if (h.includes('espesor') || h.includes('grosor') || h.includes('thick')) return 10;
                    if (h.includes('esp') || h === 'z') return 5;
                    return 0;
                }
                return 0;
            }

            const rolesToCheck = ['item', 'name', 'width', 'length', 'grain', 'qty', 'material', 'thickness'];
            rolesToCheck.forEach(role => {
                let bestIdx = -1, bestScore = 0;
                firstRowLower.forEach((h, idx) => {
                    if (colRoles[idx] !== null) return;
                    const score = scoreHeader(h, role);
                    if (score > bestScore) {
                        bestScore = score;
                        bestIdx = idx;
                    }
                });
                if (bestIdx >= 0 && bestScore > 0) {
                    colRoles[bestIdx] = role;
                    assignedRoles.add(role);
                }
            });
        }

        // 2. Statistical / Heuristic Analysis for unassigned columns
        const dataStartRow = isHeader ? 1 : 0;
        const dataRows = rawRows.slice(dataStartRow);

        if (dataRows.length > 0) {
            const stats = [];
            for (let c = 0; c < numCols; c++) {
                let numCount = 0, sum = 0, min = Infinity, max = -Infinity;
                let grainHits = 0, textLens = [];
                let isSeq = true;
                let expectedSeq = 1;

                dataRows.forEach(r => {
                    const val = r[c] || '';
                    if (!val) return;
                    const num = cleanNumericValue(val);
                    if (!isNaN(num) && isFinite(num) && val.replace(/[^0-9]/g, '').length > 0) {
                        numCount++;
                        sum += num;
                        if (num < min) min = num;
                        if (num > max) max = num;
                        if (parseInt(num, 10) !== expectedSeq) isSeq = false;
                        expectedSeq++;
                    } else {
                        textLens.push(val.length);
                        isSeq = false;
                    }

                    const low = val.toLowerCase();
                    if (['si', 'no', 'veta', 'long', 'trans', 'largo', 'ancho', 'con veta', 'sin veta'].some(w => low.includes(w))) {
                        grainHits++;
                    }
                });

                stats.push({
                    idx: c,
                    numCount,
                    ratio: dataRows.length > 0 ? numCount / dataRows.length : 0,
                    avg: numCount > 0 ? sum / numCount : 0,
                    min,
                    max,
                    grainHits,
                    isSequentialIndex: isSeq && numCount >= 2,
                    avgTextLen: textLens.length > 0 ? textLens.reduce((a, b) => a + b, 0) / textLens.length : 0
                });
            }

            // Detect item column if unassigned (sequential index or first short column)
            if (!assignedRoles.has('item')) {
                const seqCol = stats.find(s => colRoles[s.idx] === null && (s.isSequentialIndex || (s.idx === 0 && s.max <= 999 && s.avg <= 200)));
                if (seqCol) {
                    colRoles[seqCol.idx] = 'item';
                    assignedRoles.add('item');
                }
            }

            // Detect grain column if unassigned
            if (!assignedRoles.has('grain')) {
                const grainCol = stats.find(s => colRoles[s.idx] === null && s.grainHits >= Math.max(1, dataRows.length * 0.3));
                if (grainCol) {
                    colRoles[grainCol.idx] = 'grain';
                    assignedRoles.add('grain');
                }
            }

            // Detect dimensions (Width and Length — Default standard order: Ancho first, Largo second when unlabelled)
            if (!assignedRoles.has('length') || !assignedRoles.has('width')) {
                const dimCandidates = stats.filter(s => colRoles[s.idx] === null && !s.isSequentialIndex && s.ratio >= 0.6 && s.max >= 50);
                if (dimCandidates.length >= 2) {
                    const c1 = dimCandidates[0];
                    const c2 = dimCandidates[1];
                    if (!assignedRoles.has('width') && !assignedRoles.has('length')) {
                        colRoles[c1.idx] = 'width'; assignedRoles.add('width');
                        colRoles[c2.idx] = 'length'; assignedRoles.add('length');
                    } else if (!assignedRoles.has('width')) {
                        colRoles[c1.idx] = 'width'; assignedRoles.add('width');
                    } else if (!assignedRoles.has('length')) {
                        colRoles[c1.idx] = 'length'; assignedRoles.add('length');
                    }
                } else if (dimCandidates.length === 1) {
                    if (!assignedRoles.has('width')) {
                        colRoles[dimCandidates[0].idx] = 'width'; assignedRoles.add('width');
                    } else if (!assignedRoles.has('length')) {
                        colRoles[dimCandidates[0].idx] = 'length'; assignedRoles.add('length');
                    }
                }
            }

            // Detect Quantity column (small integer <= 150, not sequential index)
            if (!assignedRoles.has('qty')) {
                const qtyCand = stats.find(s => colRoles[s.idx] === null && !s.isSequentialIndex && s.ratio >= 0.6 && s.max <= 150 && s.avg <= 50);
                if (qtyCand) {
                    colRoles[qtyCand.idx] = 'qty';
                    assignedRoles.add('qty');
                }
            }

            // Detect Piece Name (lowest numeric ratio, text with highest character length)
            if (!assignedRoles.has('name')) {
                const textCands = stats.filter(s => colRoles[s.idx] === null && s.ratio < 0.5);
                textCands.sort((a, b) => b.avgTextLen - a.avgTextLen);
                if (textCands.length > 0) {
                    colRoles[textCands[0].idx] = 'name';
                    assignedRoles.add('name');
                }
            }
        }

        // Fill unassigned columns as ignore
        for (let i = 0; i < numCols; i++) {
            if (!colRoles[i]) colRoles[i] = 'ignore';
        }

        // 3. Build pieces list from mapped roles
        const itemCol = colRoles.indexOf('item');
        const nameCol = colRoles.indexOf('name');
        const lenCol = colRoles.indexOf('length');
        const widCol = colRoles.indexOf('width');
        const qtyCol = colRoles.indexOf('qty');
        const grainCol = colRoles.indexOf('grain');
        const matCol = colRoles.indexOf('material');
        const thickCol = colRoles.indexOf('thickness');

        let detectedMaterial = null;
        let detectedThickness = null;
        const detectedMelaminesMap = {};
        const fallbackMat = (document.getElementById('sheetMaterial')?.value || 'ROBLE PROVENZAL 15').trim().toUpperCase();
        const fallbackThick = parseFloat(document.getElementById('sheetThickness')?.value) || 15;

        const pieces = [];
        let pieceIdx = 1;

        dataRows.forEach(r => {
            let itemVal = itemCol >= 0 && r[itemCol] ? String(r[itemCol]).trim() : String(pieceIdx);
            let length = lenCol >= 0 ? cleanNumericValue(r[lenCol]) : 0;
            let width = widCol >= 0 ? cleanNumericValue(r[widCol]) : 0;
            let qty = qtyCol >= 0 ? parseInt(cleanNumericValue(r[qtyCol]), 10) || 1 : 1;
            let name = nameCol >= 0 ? (r[nameCol] || '').trim() : `Pieza ${pieceIdx}`;
            let grain = grainCol >= 0 ? detectGrainValue(r[grainCol], defaultGrain) : defaultGrain;
            let rowMat = matCol >= 0 && r[matCol] ? String(r[matCol]).trim().toUpperCase() : '';
            let rowThick = thickCol >= 0 && r[thickCol] ? cleanNumericValue(r[thickCol]) : NaN;

            if (rowMat && rowMat.length > 1) {
                if (!detectedMaterial) detectedMaterial = rowMat;
                detectedMelaminesMap[rowMat] = (detectedMelaminesMap[rowMat] || 0) + Math.max(1, qty);
            }
            if (!isNaN(rowThick) && rowThick > 0 && rowThick <= 100) {
                if (!detectedThickness) detectedThickness = rowThick;
            }

            if (length > 0 && width > 0) {
                pieces.push({
                    item: itemVal || String(pieceIdx),
                    name: name || `Pieza ${pieceIdx}`,
                    width: Math.round(width),
                    length: Math.round(length),
                    quantity: Math.max(1, qty),
                    grain: grain,
                    canRotate: grain === 'none',
                    material: rowMat || fallbackMat,
                    thickness: (!isNaN(rowThick) && rowThick > 0) ? rowThick : fallbackThick
                });
                pieceIdx++;
            }
        });

        return {
            pieces,
            roles: colRoles,
            isHeader,
            rawRows,
            headerLabels,
            detectedMaterial,
            detectedThickness,
            detectedMelamines: detectedMelaminesMap
        };
    }

    function parsePasteText(rawText, colFormat = 'auto', defaultGrain = 'none') {
        const analysis = parseAndDetectTable(rawText, defaultGrain, currentAutoMappedRoles);
        return analysis.pieces;
    }

    function updatePastePreview(overrideRoles = null) {
        const text = document.getElementById('pasteArea')?.value || '';
        const defaultGrain = document.getElementById('pasteDefaultGrain')?.value || 'none';

        if (overrideRoles) {
            currentAutoMappedRoles = overrideRoles;
        }

        const analysis = parseAndDetectTable(text, defaultGrain, currentAutoMappedRoles);
        currentPastedAnalysis = analysis;
        currentAutoMappedRoles = analysis.roles;

        const mapperSection = document.getElementById('colMapperSection');
        const mapperGrid = document.getElementById('colMapperGrid');
        const metaBanner = document.getElementById('detectedMetaBanner');
        const metaText = document.getElementById('detectedMetaText');
        const tbody = document.getElementById('pastePreviewBody');
        const badge = document.getElementById('pastePreviewBadge');
        const btnText = document.getElementById('btnApplyCountText');

        if (!tbody || !badge || !btnText) return;

        // Render Column Mapping Grid
        if (mapperSection && mapperGrid && analysis.roles && analysis.roles.length > 0 && text.trim().length > 0) {
            mapperSection.style.display = 'block';
            mapperGrid.innerHTML = analysis.roles.map((role, idx) => {
                const headerLabel = analysis.headerLabels[idx] || `Col ${idx + 1}`;
                const dataStart = analysis.isHeader ? 1 : 0;
                const sampleVal = analysis.rawRows[dataStart] ? analysis.rawRows[dataStart][idx] : '';
                const isActive = role !== 'ignore';

                return `
                    <div class="col-mapper-card ${isActive ? 'active-role' : ''}">
                        <div class="col-mapper-name" title="${escapeHtml(headerLabel)}">
                            <span>Col ${idx + 1}:</span>
                            <strong style="color: #38bdf8;">${escapeHtml(headerLabel)}</strong>
                        </div>
                        <select class="col-mapper-select" data-col-idx="${idx}">
                            <option value="item" ${role === 'item' ? 'selected' : ''}>#️⃣ Ítem / Código</option>
                            <option value="name" ${role === 'name' ? 'selected' : ''}>🏷️ Descripción</option>
                            <option value="width" ${role === 'width' ? 'selected' : ''}>↕ Ancho (mm)</option>
                            <option value="length" ${role === 'length' ? 'selected' : ''}>↔ Largo (mm)</option>
                            <option value="grain" ${role === 'grain' ? 'selected' : ''}>🔄 Veta</option>
                            <option value="qty" ${role === 'qty' ? 'selected' : ''}>🔢 Cantidad</option>
                            <option value="material" ${role === 'material' ? 'selected' : ''}>🎨 Melamina / Material</option>
                            <option value="thickness" ${role === 'thickness' ? 'selected' : ''}>📏 Espesor (mm)</option>
                            <option value="ignore" ${role === 'ignore' ? 'selected' : ''}>🚫 Ignorar Columna</option>
                        </select>
                        <div class="col-sample-preview" title="Muestra: ${escapeHtml(sampleVal || '')}">
                            Muestra: ${escapeHtml(sampleVal || '-')}
                        </div>
                    </div>
                `;
            }).join('');

            // Bind change listeners to column dropdowns
            mapperGrid.querySelectorAll('.col-mapper-select').forEach(sel => {
                sel.addEventListener('change', (e) => {
                    const colIdx = parseInt(e.target.dataset.colIdx, 10);
                    const newRole = e.target.value;
                    const newRoles = [...currentAutoMappedRoles];
                    newRoles[colIdx] = newRole;
                    updatePastePreview(newRoles);
                });
            });
        } else if (mapperSection) {
            mapperSection.style.display = 'none';
        }

        // Render Detected Material / Multi-Melamine Banner
        if (metaBanner && metaText) {
            const melKeys = Object.keys(analysis.detectedMelamines || {});
            const hasThickness = Boolean(analysis.detectedThickness);
            if (melKeys.length > 1) {
                metaBanner.style.display = 'flex';
                const summaryBadges = melKeys.map(k => `<strong style="color: #6ee7b7;">${escapeHtml(k)} (${analysis.detectedMelamines[k]} pzs)</strong>`).join(', ');
                metaText.innerHTML = `<strong>🎨 ${melKeys.length} Melaminas detectadas en la planilla:</strong> ${summaryBadges} — Se optimizarán todas automáticamente.`;
            } else if (melKeys.length === 1 || hasThickness) {
                metaBanner.style.display = 'flex';
                let desc = '<strong>Detectado en la planilla:</strong> ';
                if (melKeys.length === 1) desc += `Melamina: <strong style="color: #6ee7b7;">"${escapeHtml(melKeys[0])}"</strong> `;
                if (hasThickness) desc += `| Espesor: <strong style="color: #6ee7b7;">${analysis.detectedThickness} mm</strong>`;
                metaText.innerHTML = desc;
            } else {
                metaBanner.style.display = 'none';
            }
        }

        const items = analysis.pieces;

        if (items.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1.25rem;">Pega datos arriba o sube un archivo Excel para ver la vista previa en tiempo real.</td></tr>`;
            badge.textContent = '0 piezas detectadas';
            badge.style.background = 'rgba(100, 116, 139, 0.2)';
            badge.style.color = '#94a3b8';
            btnText.textContent = 'Importar Piezas';
            return;
        }

        const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);
        const melCount = Object.keys(analysis.detectedMelamines || {}).length;
        badge.textContent = melCount > 1
            ? `✨ ${items.length} filas / ${totalQty} piezas en ${melCount} Melaminas`
            : `✨ ${items.length} filas / ${totalQty} piezas detectadas automáticamente`;
        badge.style.background = 'rgba(16, 185, 129, 0.2)';
        badge.style.color = '#34d399';
        btnText.textContent = melCount > 1 ? `Importar ${totalQty} Piezas (${melCount} Melaminas)` : `Importar ${totalQty} Piezas`;

        let currentPasteMaterialOverrides = {};

        const previewRows = items.slice(0, 30);
        tbody.innerHTML = previewRows.map((it, idx) => {
            const grainLabel = it.grain === 'none' ? '🔄 Sin Veta' : (it.grain === 'longitudinal' ? '↔ Veta Largo' : '↕ Veta Ancho');
            const matVal = (it.material || document.getElementById('sheetMaterial')?.value || 'ROBLE PROVENZAL 15').trim().toUpperCase();
            const cInfo = getMelamineColorInfo(matVal);
            const swatchBg = cInfo.image
                ? `background-color:${cInfo.hex};background-image:url('${encodeURI(cInfo.image)}');`
                : `background-color:${cInfo.hex};`;
            return `
                <tr data-preview-idx="${idx}">
                    <td style="color: #38bdf8; font-weight: 700;">${escapeHtml(it.item || String(idx + 1))}</td>
                    <td><strong style="color: #93c5fd;">${escapeHtml(it.name)}</strong></td>
                    <td style="color: #38bdf8; font-weight: 600;">${it.width} mm</td>
                    <td style="color: #38bdf8; font-weight: 600;">${it.length} mm</td>
                    <td style="color: var(--text-secondary); font-size: 0.74rem;">${grainLabel}</td>
                    <td><span class="badge-count" style="font-size: 0.72rem; font-weight: 700;">x${it.quantity}</span></td>
                    <td>
                        <div class="part-material-select-wrap" style="padding: 0.1rem 0.28rem;">
                            <span class="part-melamine-swatch" style="${swatchBg}"></span>
                            <select class="part-material-select preview-row-mat-select" data-preview-idx="${idx}" style="max-width: 145px;">
                                ${buildPartMaterialOptionsHtml(matVal)}
                            </select>
                        </div>
                    </td>
                </tr>
            `;
        }).join('');

        tbody.querySelectorAll('.preview-row-mat-select').forEach(sel => {
            sel.addEventListener('change', () => {
                const idx = parseInt(sel.dataset.previewIdx, 10);
                const newMat = sel.value;
                window._pastePreviewMatOverrides = window._pastePreviewMatOverrides || {};
                window._pastePreviewMatOverrides[idx] = newMat;
                const cInfo = getMelamineColorInfo(newMat);
                const sw = sel.closest('.part-material-select-wrap')?.querySelector('.part-melamine-swatch');
                if (sw) {
                    sw.style.backgroundColor = cInfo.hex || '#c89d66';
                    sw.style.backgroundImage = cInfo.image ? `url("${encodeURI(cInfo.image)}")` : 'none';
                }
            });
        });

        if (items.length > 30) {
            tbody.innerHTML += `<tr><td colspan="7" style="text-align: center; color: var(--accent-cyan); font-weight: 600; padding: 0.5rem;">... y ${items.length - 30} piezas más</td></tr>`;
        }
    }

    function applyPasteData() {
        const text = document.getElementById('pasteArea')?.value || '';
        const defaultGrain = document.getElementById('pasteDefaultGrain')?.value || 'none';

        const analysis = parseAndDetectTable(text, defaultGrain, currentAutoMappedRoles);
        const items = analysis.pieces;

        if (items.length === 0) {
            showNotification('No se detectaron piezas válidas para importar. Revisa el texto pegado.', 'warning');
            return;
        }

        const melKeys = Object.keys(analysis.detectedMelamines || {});
        // Register all detected melamines in the catalog automatically
        melKeys.forEach(mName => {
            findOrCreateMelamineSpec(mName, analysis.detectedThickness || 18);
        });

        // Apply detected material / thickness to sheet parameters if checked
        const chkApply = document.getElementById('chkApplyMaterialThickness');
        let metaMsg = '';
        if (chkApply && chkApply.checked) {
            if (melKeys.length > 1) {
                metaMsg = `${melKeys.length} Melaminas (${melKeys.join(', ')})`;
            } else if (analysis.detectedMaterial && document.getElementById('sheetMaterial')) {
                const spec = findOrCreateMelamineSpec(analysis.detectedMaterial, analysis.detectedThickness || 18);
                applyMelamineToForm(spec, false);
                metaMsg += `Melamina: "${spec.name}" [${spec.code}]`;
            }
            if (analysis.detectedThickness && document.getElementById('sheetThickness') && melKeys.length <= 1) {
                document.getElementById('sheetThickness').value = analysis.detectedThickness;
                if (metaMsg) metaMsg += ' | ';
                metaMsg += `Espesor: ${analysis.detectedThickness} mm`;
            }
        }

        const modeRadio = document.querySelector('input[name="pasteMode"]:checked');
        const isReplace = modeRadio ? modeRadio.value === 'replace' : true;

        if (isReplace) {
            clearTable();
        }

        // Add each imported piece with isImported = true (respecting any dropdown changes in preview)
        const overrides = window._pastePreviewMatOverrides || {};
        items.forEach((it, idx) => {
            if (overrides[idx]) {
                it.material = overrides[idx];
            }
            addPartRow(it, true);
        });
        window._pastePreviewMatOverrides = {};

        closePasteModal();

        const totalQty = items.reduce((sum, it) => sum + it.quantity, 0);

        // Display the dedicated Imported Pieces Banner right above the table
        const banner = document.getElementById('importedPiecesBanner');
        const tag = document.getElementById('importedBannerTag');
        const src = document.getElementById('importedBannerSource');
        const details = document.getElementById('importedBannerDetails');

        if (banner) {
            banner.style.display = 'flex';
            if (tag) tag.textContent = `${totalQty} piezas (${items.length} filas)`;
            if (src) src.textContent = isReplace ? 'Planilla Excel' : 'Piezas Agregadas';
            if (details) {
                let det = `Se importaron <strong>${totalQty} piezas</strong> en <strong>${items.length} filas</strong> con campos auto-detectados.`;
                if (metaMsg) {
                    det += ` <span style="color: #6ee7b7; font-weight: 600;">(${metaMsg})</span>`;
                }
                details.innerHTML = det;
            }
        }

        // Auto-scroll table to top so all newly imported pieces are immediately visible
        const wrapper = document.getElementById('partsTableWrapper');
        if (wrapper) wrapper.scrollTop = 0;

        // Update header badge
        const badgeHeader = document.getElementById('badgeHeaderCount');
        if (badgeHeader) {
            const allRows = document.querySelectorAll('#partsTableBody tr.part-row');
            badgeHeader.innerHTML = `<span class="pulse-dot-cyan"></span><span id="badgeHeaderCountText">✨ ${totalQty} piezas (${allRows.length} filas) [Importadas]</span>`;
        }

        // Automatically run 2D Guillotine optimization so user sees the cuts immediately
        runOptimization();

        let msg = `¡Carga masiva exitosa! ${totalQty} piezas importadas y listas para cortar.`;
        if (metaMsg) {
            msg += ` ${metaMsg}.`;
        }
        showNotification(msg, 'success');
    }

    function escapeHtml(str) {
        return (str || '').replace(/[&<>"']/g, m => ({
            '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
        }[m]));
    }

    function showNotification(message, type = 'info') {
        const toast = document.getElementById('appToast');
        if (!toast) return;

        toast.className = `app-toast toast-${type}`;
        toast.innerHTML = message;
        toast.style.display = 'block';

        clearTimeout(toast._timeout);
        toast._timeout = setTimeout(() => {
            toast.style.display = 'none';
        }, 4500);
    }

})();
