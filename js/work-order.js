/**
 * Industrial Production Work Order & Cutting Blueprint Generator
 * Generates printable A4/PDF Orden de Trabajo (Executive Summary + Per-Board Blueprints + Cut Sequences + Label Stickers)
 * and exports multi-format Selco WNT 600 CNC files (.001/.002, .OPT, .XML OSI).
 */

(function (window) {
    'use strict';

    const WorkOrderGenerator = {
        /**
         * Generates an SVG technical blueprint for a single optimized sheet.
         */
        generateBoardBlueprintSVG(sheetObj, boardIdx, totalBoards, kerf = 4.4, trim = 10) {
            const sheetL = sheetObj.sheet.length || sheetObj.sheet.x || 2500;
            const sheetW = sheetObj.sheet.width || sheetObj.sheet.y || 1830;

            const colors = [
                '#dbeafe', '#dcfce7', '#fef3c7', '#ede9fe', '#ffe4e6',
                '#e0f2fe', '#f3e8ff', '#ccfbf1', '#ffedd5', '#e2e8f0'
            ];

            const svg = [];
            svg.push(`<svg viewBox="-50 -45 ${sheetL + 90} ${sheetW + 85}" width="100%" height="auto" xmlns="http://www.w3.org/2000/svg" style="background:#ffffff; font-family:Inter, -apple-system, BlinkMacSystemFont, sans-serif;">`);
            svg.push(`
                <defs>
                    <pattern id="scrapHatch_${boardIdx}" width="35" height="35" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                        <line x1="0" y1="0" x2="0" y2="35" stroke="#fca5a5" stroke-width="3" />
                    </pattern>
                </defs>
            `);

            // Outer Dimension Cota Top
            svg.push(`<line x1="0" y1="-18" x2="${sheetL}" y2="-18" stroke="#0f172a" stroke-width="2" />`);
            svg.push(`<line x1="0" y1="-26" x2="0" y2="-10" stroke="#0f172a" stroke-width="2" />`);
            svg.push(`<line x1="${sheetL}" y1="-26" x2="${sheetL}" y2="-10" stroke="#0f172a" stroke-width="2" />`);
            svg.push(`<text x="${sheetL / 2}" y="-24" fill="#0f172a" font-size="22" font-weight="800" text-anchor="middle">LARGO PLACA X: ${Math.round(sheetL)} mm</text>`);

            // Outer Dimension Cota Left
            svg.push(`<line x1="-18" y1="0" x2="-18" y2="${sheetW}" stroke="#0f172a" stroke-width="2" />`);
            svg.push(`<line x1="-26" y1="0" x2="-10" y2="0" stroke="#0f172a" stroke-width="2" />`);
            svg.push(`<line x1="-26" y1="${sheetW}" x2="-10" y2="${sheetW}" stroke="#0f172a" stroke-width="2" />`);
            svg.push(`<g transform="translate(-26, ${sheetW / 2}) rotate(-90)"><text x="0" y="0" fill="#0f172a" font-size="22" font-weight="800" text-anchor="middle">ANCHO PLACA Y: ${Math.round(sheetW)} mm</text></g>`);

            // Master Board Rectangle
            svg.push(`<rect x="0" y="0" width="${sheetL}" height="${sheetW}" fill="#f8fafc" stroke="#0f172a" stroke-width="4" />`);

            // Usable Trim Margin
            if (trim > 0) {
                svg.push(`<rect x="${trim}" y="${trim}" width="${sheetL - 2 * trim}" height="${sheetW - 2 * trim}" fill="none" stroke="#64748b" stroke-width="2" stroke-dasharray="10,8" />`);
            }

            // Waste / Offcut Areas
            (sheetObj.wasteAreas || []).forEach((w, wIdx) => {
                svg.push(`<rect x="${w.x}" y="${w.y}" width="${w.width}" height="${w.height}" fill="#fef2f2" stroke="#ef4444" stroke-width="1.5" />`);
                svg.push(`<rect x="${w.x}" y="${w.y}" width="${w.width}" height="${w.height}" fill="url(#scrapHatch_${boardIdx})" />`);
                if (w.width >= 150 && w.height >= 90) {
                    const cx = w.x + w.width / 2;
                    const cy = w.y + w.height / 2;
                    svg.push(`<rect x="${cx - 110}" y="${cy - 22}" width="220" height="44" rx="5" fill="#ffffff" stroke="#ef4444" stroke-width="1.5" />`);
                    svg.push(`<text x="${cx}" y="${cy - 4}" fill="#b91c1c" font-size="15" font-weight="800" text-anchor="middle">RETAZO #${wIdx + 1}</text>`);
                    svg.push(`<text x="${cx}" y="${cy + 14}" fill="#7f1d1d" font-size="14" font-weight="700" text-anchor="middle">${Math.round(w.width)} × ${Math.round(w.height)} mm</text>`);
                }
            });

            // Placed Pieces
            (sheetObj.pieces || []).forEach((p, idx) => {
                const col = colors[idx % colors.length];
                const itemCode = p.item || `${idx + 1}`;
                svg.push(`<rect x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" fill="${col}" stroke="#0f172a" stroke-width="2.5" />`);

                // Item Corner Badge
                const bW = Math.min(75, p.width * 0.35);
                const bH = Math.min(34, p.height * 0.35);
                if (bW >= 24 && bH >= 16) {
                    svg.push(`<rect x="${p.x + 4}" y="${p.y + 4}" width="${bW}" height="${bH}" rx="4" fill="#0f172a" />`);
                    svg.push(`<text x="${p.x + 4 + bW / 2}" y="${p.y + 4 + bH * 0.68}" fill="#ffffff" font-size="${Math.min(18, bH * 0.65)}" font-weight="800" text-anchor="middle">${this.escapeXml(itemCode)}</text>`);
                }

                const cx = p.x + p.width / 2;
                const cy = p.y + p.height / 2;
                const labelStr = this.escapeXml(p.name || `Pieza ${idx + 1}`);
                const dimStr = `${Math.round(p.width)} × ${Math.round(p.height)}`;
                const grainIcon = p.grain === 'longitudinal' ? '↔ Veta' : (p.grain === 'transversal' ? '↕ Veta' : (p.rotated ? '↻ 90°' : ''));

                if (p.width < 130 && p.height >= 220) {
                    const fSz = Math.min(22, p.width * 0.32);
                    svg.push(`<g transform="translate(${cx}, ${cy}) rotate(-90)">`);
                    svg.push(`<text x="0" y="-4" fill="#0f172a" font-size="${fSz}" font-weight="800" text-anchor="middle">${labelStr}</text>`);
                    svg.push(`<text x="0" y="${fSz}" fill="#1e3a8a" font-size="${fSz * 0.88}" font-weight="700" text-anchor="middle">${dimStr} ${grainIcon}</text>`);
                    svg.push(`</g>`);
                } else if (p.width >= 140 && p.height >= 75) {
                    const fSz = Math.min(26, p.width / 10, p.height / 3.8);
                    svg.push(`<text x="${cx}" y="${cy - fSz * 0.35}" fill="#0f172a" font-size="${fSz}" font-weight="800" text-anchor="middle">${labelStr}</text>`);
                    svg.push(`<text x="${cx}" y="${cy + fSz * 0.85}" fill="#1e3a8a" font-size="${fSz * 0.88}" font-weight="700" text-anchor="middle">${dimStr} mm ${grainIcon}</text>`);
                } else if (p.width >= 60 && p.height >= 30) {
                    const fSz = Math.min(16, p.height * 0.45, p.width / 8);
                    svg.push(`<text x="${cx}" y="${cy + fSz * 0.35}" fill="#0f172a" font-size="${fSz}" font-weight="800" text-anchor="middle">${dimStr}</text>`);
                }
            });

            // Guillotine Cut Sequence Indicators
            let currentY = trim;
            let stepNum = 1;
            const strips = sheetObj.processedStrips || [];
            const isLong = sheetObj.direction !== 'transversal';

            strips.forEach((st) => {
                for (let q = 0; q < (st.qta || 1); q++) {
                    const linePos = currentY + st.height;
                    if (isLong && linePos < sheetW) {
                        svg.push(`<line x1="0" y1="${linePos}" x2="${sheetL}" y2="${linePos}" stroke="#dc2626" stroke-width="2.5" stroke-dasharray="12,6" />`);
                        svg.push(`<circle cx="${sheetL - 25}" cy="${linePos}" r="16" fill="#dc2626" stroke="#ffffff" stroke-width="2" />`);
                        svg.push(`<text x="${sheetL - 25}" y="${linePos + 5}" fill="#ffffff" font-size="14" font-weight="900" text-anchor="middle">${stepNum++}</text>`);
                    }
                    currentY += st.height + kerf;
                }
            });

            svg.push(`</svg>`);
            return svg.join('\n');
        },

        /**
         * Opens a printable & downloadable HTML Production Work Order window.
         */
        openWorkOrderWindow(solution, sheetConfig, partsList, options = {}) {
            if (!solution || !solution.sheets || solution.sheets.length === 0) return;

            const now = new Date();
            const dateStr = now.toLocaleDateString('es-CL');
            const timeStr = now.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
            const orderCode = sheetConfig.jobName || '002ROB15';
            const materialName = sheetConfig.material || 'MELAMINA 18';
            const kerf = options.kerf || 4.4;
            const trim = options.trim || 10;

            const totalBoards = solution.sheets.length;
            const totalParts = solution.stats.placedParts || 0;
            const globalEff = solution.stats.globalEfficiency || 0;
            const usedM2 = solution.stats.totalPartsAreaM2 || 0;
            const wasteM2 = solution.stats.totalWasteAreaM2 || 0;
            const totalCuts = solution.stats.totalCuts || 0;

            const html = [];
            html.push(`<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Orden de Trabajo y Esquema de Corte Selco WNT 600 - ${orderCode}</title>
    <style>
        @page { size: A4 portrait; margin: 10mm; }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #0f172a; }
        body { background: #e2e8f0; padding: 20px; }
        .top-toolbar { max-width: 980px; margin: 0 auto 20px auto; background: #0f172a; color: #ffffff; padding: 14px 22px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 10px 25px rgba(0,0,0,0.2); }
        .top-toolbar h1 { font-size: 1.05rem; font-weight: 800; color: #f8fafc; }
        .top-toolbar span { color: #38bdf8; font-family: monospace; }
        .toolbar-btns { display: flex; gap: 10px; }
        .btn-action { background: #10b981; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 800; font-size: 0.9rem; cursor: pointer; display: inline-flex; align-items: center; gap: 6px; }
        .btn-action:hover { background: #059669; }
        .btn-secondary { background: #2563eb; }
        .btn-secondary:hover { background: #1d4ed8; }
        .page-sheet { background: #ffffff; max-width: 980px; margin: 0 auto 28px auto; padding: 26px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.08); page-break-after: always; }
        .page-sheet:last-child { page-break-after: auto; }
        .doc-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid #0f172a; padding-bottom: 14px; margin-bottom: 18px; }
        .doc-brand { font-size: 1.55rem; font-weight: 900; text-transform: uppercase; letter-spacing: -0.02em; }
        .doc-sub { font-size: 0.88rem; font-weight: 700; color: #0284c7; text-transform: uppercase; margin-top: 3px; }
        .doc-meta { text-align: right; font-size: 0.84rem; line-height: 1.5; }
        .badge-order { background: #0f172a; color: #fff; padding: 4px 10px; border-radius: 4px; font-weight: 800; font-family: monospace; font-size: 0.9rem; display: inline-block; margin-bottom: 4px; }
        .sec-title { font-size: 0.9rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.04em; color: #334155; border-bottom: 2px solid #cbd5e1; padding-bottom: 5px; margin: 16px 0 12px 0; }
        .kpi-row { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; margin-bottom: 18px; }
        .kpi-box { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px; text-align: center; }
        .kpi-box .lbl { font-size: 0.72rem; font-weight: 800; text-transform: uppercase; color: #64748b; }
        .kpi-box .val { font-size: 1.5rem; font-weight: 900; color: #0f172a; margin-top: 4px; font-family: monospace; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 0.82rem; margin-bottom: 16px; }
        .data-table th { background: #0f172a; color: #ffffff; padding: 8px 10px; text-align: left; font-weight: 700; text-transform: uppercase; font-size: 0.75rem; }
        .data-table td { padding: 7px 10px; border-bottom: 1px solid #cbd5e1; border-right: 1px solid #e2e8f0; }
        .data-table tr:nth-child(even) { background: #f8fafc; }
        .blueprint-frame { border: 2px solid #0f172a; border-radius: 8px; padding: 12px; background: #fff; margin-bottom: 14px; text-align: center; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px; }
        .panel-box { background: #f8fafc; border: 1.5px solid #cbd5e1; border-radius: 8px; padding: 12px; font-size: 0.8rem; }
        .panel-box h4 { font-size: 0.82rem; font-weight: 800; text-transform: uppercase; margin-bottom: 8px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; }
        .sign-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 26px; padding-top: 14px; border-top: 2px solid #0f172a; text-align: center; font-size: 0.8rem; }
        .sign-line { border-top: 1px solid #64748b; margin-top: 32px; padding-top: 5px; }
        .check-sq { display: inline-block; width: 16px; height: 16px; border: 2px solid #0f172a; border-radius: 3px; }
        .labels-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
        .sticker-card { border: 1.5px dashed #0f172a; border-radius: 6px; padding: 10px; background: #fff; font-size: 0.76rem; }
        @media print {
            body { background: #fff !important; padding: 0 !important; }
            .top-toolbar { display: none !important; }
            .page-sheet { box-shadow: none !important; margin: 0 0 15px 0 !important; padding: 0 !important; max-width: 100% !important; }
        }
    </style>
</head>
<body>
    <div class="top-toolbar">
        <div>
            <h1>ORDEN DE TRABAJO INDUSTRIAL &bull; SECCIONADORA SELCO WNT 600 &bull; <span>${orderCode}</span></h1>
        </div>
        <div class="toolbar-btns">
            <button class="btn-action" onclick="window.print()">🖨️ IMPRIMIR ORDEN DE TRABAJO / GUARDAR PDF</button>
        </div>
    </div>`);

            // PAGE 1: MASTER PRODUCTION WORK ORDER & CUTLIST BOM
            html.push(`
    <div class="page-sheet">
        <div class="doc-header">
            <div>
                <div class="doc-brand">ORDEN DE PRODUCCIÓN Y SECCIONADO CNC</div>
                <div class="doc-sub">Máquina: Biesse Selco WNT 600 &bull; Archivos Generados: ${orderCode}.001 a .${String(totalBoards).padStart(3, '0')}</div>
            </div>
            <div class="doc-meta">
                <span class="badge-order">OT: ${orderCode}</span><br>
                <strong>Fecha / Hora:</strong> ${dateStr} ${timeStr}<br>
                <strong>Material:</strong> ${this.escapeXml(materialName)} (${sheetConfig.thickness} mm)
            </div>
        </div>

        <div class="sec-title">1. Resumen de Optimización de Placas</div>
        <div class="kpi-row">
            <div class="kpi-box"><div class="lbl">Placas a Cortar</div><div class="val" style="color:#0284c7;">${totalBoards}</div></div>
            <div class="kpi-box"><div class="lbl">Aprovechamiento</div><div class="val" style="color:#059669;">${globalEff}%</div></div>
            <div class="kpi-box"><div class="lbl">Total Piezas</div><div class="val">${totalParts}</div></div>
            <div class="kpi-box"><div class="lbl">Área Útil / Merma</div><div class="val" style="font-size:1.15rem;">${usedM2} / ${wasteM2} m²</div></div>
            <div class="kpi-box"><div class="lbl">Pasadas Sierra</div><div class="val">${totalCuts}</div></div>
        </div>

        <div class="sec-title">2. Especificación de Materia Prima y Parámetros Selco WNT 600</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th>Material Tablero</th>
                    <th>Dimensiones Placa (Largo × Ancho)</th>
                    <th>Espesor (Z)</th>
                    <th>Disco Sierra (Kerf)</th>
                    <th>Refilo Perimetral</th>
                    <th>Cantidad Placas</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td><strong>${this.escapeXml(materialName)}</strong></td>
                    <td><strong>${sheetConfig.length} × ${sheetConfig.width} mm</strong></td>
                    <td>${sheetConfig.thickness} mm</td>
                    <td>${kerf} mm</td>
                    <td>${trim} mm</td>
                    <td><strong style="color:#0284c7; font-size:0.95rem;">${totalBoards} Placa(s)</strong></td>
                </tr>
            </tbody>
        </table>

        <div class="sec-title">3. Planilla General de Despiece para Producción (Ítem, Descripción, Ancho, Largo, Veta)</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width:70px;">Ítem</th>
                    <th>Descripción de la Pieza</th>
                    <th style="width:110px;">Ancho (mm)</th>
                    <th style="width:110px;">Largo (mm)</th>
                    <th style="width:75px; text-align:center;">Cant.</th>
                    <th style="width:130px;">Sentido Veta</th>
                    <th style="width:95px;">Área (m²)</th>
                    <th style="width:55px; text-align:center;">Control</th>
                </tr>
            </thead>
            <tbody>`);

            (partsList || []).forEach((p, idx) => {
                const itemCode = p.item || `${idx + 1}`;
                const grainText = p.grain === 'longitudinal'
                    ? '↔ Con Veta (Largo)'
                    : (p.grain === 'transversal' ? '↕ Con Veta (Ancho)' : '🔄 Sin Veta (Gira)');
                const areaM2 = ((p.width * p.length * p.quantity) / 1000000).toFixed(3);
                html.push(`
                <tr>
                    <td style="font-family:monospace; font-weight:800;">${this.escapeXml(itemCode)}</td>
                    <td><strong>${this.escapeXml(p.name)}</strong></td>
                    <td style="font-family:monospace; font-weight:700; color:#1e3a8a;">${Math.round(p.width)} mm</td>
                    <td style="font-family:monospace; font-weight:700; color:#1e3a8a;">${Math.round(p.length)} mm</td>
                    <td style="text-align:center; font-weight:800;">${p.quantity}</td>
                    <td>${grainText}</td>
                    <td style="font-family:monospace;">${areaM2} m²</td>
                    <td style="text-align:center;"><span class="check-sq"></span></td>
                </tr>`);
            });

            html.push(`
            </tbody>
        </table>

        <div class="sign-grid">
            <div><strong>Oficina Técnica / Programación CNC</strong><div class="sign-line">Firma y Fecha</div></div>
            <div><strong>Operador Seccionadora Selco WNT 600</strong><div class="sign-line">Firma y Conformidad</div></div>
            <div><strong>Control de Calidad / Enchapado</strong><div class="sign-line">Recepción de Piezas</div></div>
        </div>
    </div>`);

            // PAGES 2+: PER-BOARD CUTTING SCHEME & SELCO SEQUENCE
            solution.sheets.forEach((sheetObj, sIdx) => {
                const boardNum = sIdx + 1;
                const selcoFilename = sheetObj.selcoFile ? sheetObj.selcoFile.filename : `${orderCode}.${String(boardNum).padStart(3, '0')}`;
                const svgDiagram = this.generateBoardBlueprintSVG(sheetObj, boardNum, totalBoards, kerf, trim);

                const boardUsedArea = (sheetObj.pieces || []).reduce((acc, p) => acc + (p.width * p.height), 0);
                const boardTotalArea = sheetConfig.length * sheetConfig.width;
                const boardEff = boardTotalArea > 0 ? ((boardUsedArea / boardTotalArea) * 100).toFixed(1) : '0.0';

                html.push(`
    <div class="page-sheet">
        <div class="doc-header" style="border-bottom-color:#0284c7;">
            <div>
                <div class="doc-brand" style="font-size:1.35rem;">ESQUEMA DE CORTE &bull; PLACA #${boardNum} DE ${totalBoards}</div>
                <div class="doc-sub">Archivo Máquina Selco WNT 600: <strong>${selcoFilename}</strong> &bull; Material: ${this.escapeXml(materialName)}</div>
            </div>
            <div class="doc-meta">
                <span class="badge-order" style="background:#0284c7;">ARCHIVO CNC: ${selcoFilename}</span><br>
                <strong>Aprovechamiento Placa:</strong> <span style="color:#059669; font-weight:900;">${boardEff}%</span> &bull; <strong>Piezas:</strong> ${(sheetObj.pieces || []).length}
            </div>
        </div>

        <div class="blueprint-frame">
            ${svgDiagram}
        </div>

        <div class="two-col">
            <div class="panel-box">
                <h4>🪚 Secuencia de Corte Selco WNT 600 (Bloque B_CUT)</h4>
                <ol style="padding-left:18px; line-height:1.55;">`);

                const strips = sheetObj.processedStrips || [];
                strips.forEach((st, stIdx) => {
                    const cutsDesc = (st.cuts || []).map(c => `${c.qta}×${Math.round(c.length)}mm`).join(' + ');
                    html.push(`<li><strong>Tira #${stIdx + 1} (COD="4"):</strong> Cortar ${st.qta} tira(s) de ancho <strong>${Math.round(st.height)} mm</strong> &rarr; Tronzar (COD="5"): ${cutsDesc}</li>`);
                });

                html.push(`
                </ol>
            </div>
            <div class="panel-box">
                <h4>📦 Retazos Sobrantes en esta Placa</h4>`);

                if (sheetObj.wasteAreas && sheetObj.wasteAreas.length > 0) {
                    html.push(`<ul style="padding-left:18px; line-height:1.55;">`);
                    sheetObj.wasteAreas.forEach((w, wIdx) => {
                        const areaOff = ((w.width * w.height) / 1000000).toFixed(2);
                        html.push(`<li><strong>Retazo #${wIdx + 1}:</strong> Medida <strong>${Math.round(w.width)} × ${Math.round(w.height)} mm</strong> (${areaOff} m²)</li>`);
                    });
                    html.push(`</ul>`);
                } else {
                    html.push(`<p style="color:#64748b;">Sin retazos recuperables en esta placa.</p>`);
                }

                html.push(`
            </div>
        </div>

        <div class="sec-title">Piezas Contenidas en Placa #${boardNum} (${selcoFilename})</div>
        <table class="data-table">
            <thead>
                <tr>
                    <th style="width:65px;">Ítem</th>
                    <th>Descripción</th>
                    <th style="width:120px;">Ancho Corte</th>
                    <th style="width:120px;">Largo Corte</th>
                    <th style="width:130px;">Coordenada (X, Y)</th>
                    <th style="width:110px;">Orientación</th>
                    <th style="width:55px; text-align:center;">OK</th>
                </tr>
            </thead>
            <tbody>`);

                (sheetObj.pieces || []).forEach((p, pIdx) => {
                    const itemCode = p.item || `${pIdx + 1}`;
                    const orient = p.rotated ? 'Rotada 90°' : 'Normal (0°)';
                    html.push(`
                <tr>
                    <td style="font-family:monospace; font-weight:800;">${this.escapeXml(itemCode)}</td>
                    <td><strong>${this.escapeXml(p.name)}</strong></td>
                    <td style="font-family:monospace; font-weight:700;">${Math.round(p.height)} mm</td>
                    <td style="font-family:monospace; font-weight:700;">${Math.round(p.width)} mm</td>
                    <td style="font-family:monospace;">X:${Math.round(p.x)} / Y:${Math.round(p.y)}</td>
                    <td>${orient}</td>
                    <td style="text-align:center;"><span class="check-sq"></span></td>
                </tr>`);
                });

                html.push(`
            </tbody>
        </table>
    </div>`);
            });

            // FINAL PAGE: PRINTABLE PART LABELS / STICKERS FOR WORKSHOP IDENTIFICATION
            html.push(`
    <div class="page-sheet">
        <div class="doc-header">
            <div>
                <div class="doc-brand" style="font-size:1.35rem;">ETIQUETAS IDENTIFICADORAS DE PIEZAS CORTADAS</div>
                <div class="doc-sub">Para rotulado al pie de la seccionadora Selco WNT 600 &bull; Orden: ${orderCode}</div>
            </div>
            <div class="doc-meta">
                <span class="badge-order">ETIQUETAS (${totalParts} PZ)</span>
            </div>
        </div>
        <div class="labels-grid">`);

            solution.sheets.forEach((sheetObj, sIdx) => {
                const bNum = sIdx + 1;
                (sheetObj.pieces || []).forEach((p, pIdx) => {
                    const itemCode = p.item || `${pIdx + 1}`;
                    html.push(`
            <div class="sticker-card">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #0f172a; padding-bottom:3px; margin-bottom:4px;">
                    <strong style="font-family:monospace; background:#0f172a; color:#fff; padding:1px 6px; border-radius:3px;">ÍTEM: ${this.escapeXml(itemCode)}</strong>
                    <span style="font-family:monospace; font-weight:700; color:#0284c7;">PLACA #${bNum}</span>
                </div>
                <div style="font-weight:800; font-size:0.86rem; margin-bottom:3px;">${this.escapeXml(p.name)}</div>
                <div style="font-family:monospace; font-size:0.84rem; font-weight:800; color:#1e3a8a;">
                    ANCHO: ${Math.round(p.height)} × LARGO: ${Math.round(p.width)} mm
                </div>
                <div style="font-size:0.7rem; color:#475569; margin-top:3px;">
                    Mat: ${this.escapeXml(materialName)} (${sheetConfig.thickness}mm) | OT: ${orderCode}
                </div>
            </div>`);
                });
            });

            html.push(`
        </div>
    </div>
</body>
</html>`);

            const fullHtml = html.join('\n');
            const win = window.open('', '_blank');
            if (win) {
                win.document.open();
                win.document.write(fullHtml);
                win.document.close();
            } else {
                // Fallback download if popup blocked
                const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `Orden_Trabajo_${orderCode}.html`;
                a.click();
            }
        },

        /**
         * Generates Biesse Selco OSI XML Link file content (.xml) from current solution.
         */
        generateSelcoOsiXml(solution, sheetConfig, partsList, options = {}) {
            const orderCode = sheetConfig.jobName || '002ROB15';
            const matName = sheetConfig.material || 'MELAMINA 18';
            const kerf = options.kerf || 4.4;
            const trim = options.trim || 10;
            const nowIso = new Date().toISOString().slice(0, 19).replace('T', ' ');

            const xml = [];
            xml.push(`<?xml version="1.0" encoding="UTF-8"?>`);
            xml.push(`<BiesseCuttingOrder version="3.1" machine="Selco_WNT600" date="${nowIso}">`);
            xml.push(`  <OrderHeader>`);
            xml.push(`    <OrderID>${this.escapeXml(orderCode)}</OrderID>`);
            xml.push(`    <TotalBoards>${solution.sheets.length}</TotalBoards>`);
            xml.push(`    <TotalPieces>${solution.stats.placedParts}</TotalPieces>`);
            xml.push(`    <GlobalYieldPct>${solution.stats.globalEfficiency}</GlobalYieldPct>`);
            xml.push(`  </OrderHeader>`);
            xml.push(`  <Materials>`);
            xml.push(`    <Material id="MAT01" code="${this.escapeXml(matName)}" length="${sheetConfig.length}" width="${sheetConfig.width}" thickness="${sheetConfig.thickness}" kerf="${kerf}" trim="${trim}" />`);
            xml.push(`  </Materials>`);
            xml.push(`  <CuttingList>`);
            (partsList || []).forEach((p, idx) => {
                const itemCode = p.item || `${idx + 1}`;
                const grainFlag = p.grain === 'none' ? '0' : '1';
                xml.push(`    <Part item="${this.escapeXml(itemCode)}" description="${this.escapeXml(p.name)}" width="${p.width}" length="${p.length}" quantity="${p.quantity}" grain="${grainFlag}" />`);
            });
            xml.push(`  </CuttingList>`);
            xml.push(`  <Patterns>`);
            solution.sheets.forEach((s, idx) => {
                const patFile = s.selcoFile ? s.selcoFile.filename : `${orderCode}.${String(idx + 1).padStart(3, '0')}`;
                xml.push(`    <Pattern index="${idx + 1}" programFile="${this.escapeXml(patFile)}" length="${sheetConfig.length}" width="${sheetConfig.width}">`);
                (s.pieces || []).forEach((p, pIdx) => {
                    xml.push(`      <Placement id="${pIdx + 1}" item="${this.escapeXml(p.item || String(pIdx + 1))}" name="${this.escapeXml(p.name)}" x="${p.x}" y="${p.y}" width="${p.width}" height="${p.height}" rotated="${p.rotated ? 1 : 0}" />`);
                });
                xml.push(`    </Pattern>`);
            });
            xml.push(`  </Patterns>`);
            xml.push(`</BiesseCuttingOrder>`);
            return xml.join('\r\n');
        },

        escapeXml(str) {
            return String(str || '').replace(/[&<>"']/g, m => ({
                '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
            }[m]));
        }
    };

    window.WorkOrderGenerator = WorkOrderGenerator;
})(window);
