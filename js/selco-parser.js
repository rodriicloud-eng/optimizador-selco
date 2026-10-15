/**
 * Selco WNT 600 / OSI / Optiplanning File Parser & Generator
 * Handles reading and writing of .001, .002, .003 cutting pattern files.
 */

(function (window) {
    'use strict';

    const SelcoParser = {
        /**
         * Pads or truncates string to exactly 23 characters for MAT field.
         */
        formatMaterialName(name) {
            let str = (name || 'MELAMINA 18').trim();
            if (str.length > 23) {
                return str.substring(0, 23);
            }
            return str.padEnd(23, ' ');
        },

        /**
         * Converts millimeter value to Selco internal units (0.01 mm / hundredths of mm)
         */
        toSelcoUnits(mm) {
            return Math.round(Number(mm) * 100);
        },

        /**
         * Converts Selco internal units (0.01 mm) to millimeters
         */
        fromSelcoUnits(units) {
            return Number(units) / 100.0;
        },

        /**
         * Parses a Selco / Optiplanning pattern file content into a structured pattern object.
         */
        parse(content) {
            if (!content || typeof content !== 'string') {
                throw new Error('El contenido del archivo está vacío.');
            }

            const cleanText = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

            // Extract Header / B_DAT attributes
            const nmMatch = cleanText.match(/NM="([^"]*)"/);
            const cmmMatch = cleanText.match(/CMM="([^"]*)"/);
            const matMatch = cleanText.match(/MAT="([^"]*)"/);
            const dayMatch = cleanText.match(/DAY="([^"]*)"/);
            const opzMatch = cleanText.match(/OPZ="([^"]*)"/);

            const xMatch = cleanText.match(/\bX=(\d+)/);
            const yMatch = cleanText.match(/\bY=(\d+)/);
            const zMatch = cleanText.match(/\bZ=(\d+)/);
            const hpMatch = cleanText.match(/\bHP=(\d+)/);
            const vlMatch = cleanText.match(/\bVL=(\d+)/);
            const vtMatch = cleanText.match(/\bVT=(\d+)/);
            const qtaMatch = cleanText.match(/\bQTA=(\d+)/);
            const eseMatch = cleanText.match(/\bESE=(\d+)/);

            const sheetX = xMatch ? this.fromSelcoUnits(xMatch[1]) : 2500;
            const sheetY = yMatch ? this.fromSelcoUnits(yMatch[1]) : 1830;
            const sheetZ = zMatch ? this.fromSelcoUnits(zMatch[1]) : 18;
            const sheetQty = qtaMatch ? parseInt(qtaMatch[1], 10) : 1;

            // Extract Cuts: CUT=1\n\tCOD="..."\n\tDIM=...\n\tQTA=...
            const cutRegex = /CUT=(\d+)\s+COD="([^"]+)"\s+DIM=(\d+)\s+QTA=(\d+)/g;
            const cuts = [];
            let match;

            while ((match = cutRegex.exec(cleanText)) !== null) {
                cuts.push({
                    cutIndex: parseInt(match[1], 10),
                    cod: match[2].trim(),
                    dim: this.fromSelcoUnits(match[3]),
                    qta: parseInt(match[4], 10)
                });
            }

            // Reconstruct 2D Geometry (strips, pieces, offcuts)
            const geometry = this.reconstructGeometry(sheetX, sheetY, cuts);

            return {
                name: nmMatch ? nmMatch[1] : 'DESCONOCIDO.001',
                comment: cmmMatch ? cmmMatch[1] : '',
                material: matMatch ? matMatch[1].trim() : '',
                rawMaterial: matMatch ? matMatch[1] : '',
                day: dayMatch ? dayMatch[1] : '',
                options: opzMatch ? opzMatch[1] : '',
                sheet: {
                    x: sheetX,
                    y: sheetY,
                    z: sheetZ,
                    hp: hpMatch ? this.fromSelcoUnits(hpMatch[1]) : 90,
                    vl: vlMatch ? parseInt(vlMatch[1], 10) : 0,
                    vt: vtMatch ? parseInt(vtMatch[1], 10) : 0,
                    qta: sheetQty,
                    ese: eseMatch ? parseInt(eseMatch[1], 10) : 0
                },
                cuts: cuts,
                geometry: geometry
            };
        },

        /**
         * Reconstructs 2D layout boxes from Selco cuts (COD="4", COD="5", COD="Z1", COD="1", COD="2").
         */
        reconstructGeometry(sheetX, sheetY, cuts) {
            const strips = [];
            const pieces = [];
            const wasteAreas = [];

            let currentStrip = null;
            let currentY = 0;
            let pieceCounter = 1;

            for (let i = 0; i < cuts.length; i++) {
                const cut = cuts[i];

                if (cut.cod === '4' || cut.cod === '1') {
                    // New Rip Strip (or Head strip)
                    // If multiple strips of same width, handle repetition
                    for (let s = 0; s < cut.qta; s++) {
                        const strip = {
                            stripIndex: strips.length + 1,
                            cutIndex: cut.cutIndex,
                            cod: cut.cod,
                            x: 0,
                            y: currentY,
                            width: sheetX,
                            height: cut.dim,
                            pieces: [],
                            currentX: 0
                        };
                        strips.push(strip);
                        currentStrip = strip;
                        currentY += cut.dim;
                    }
                } else if (cut.cod === '5' || cut.cod === 'Z1' || cut.cod === '2') {
                    // Piece cross-cut along the active strip
                    if (currentStrip) {
                        for (let q = 0; q < cut.qta; q++) {
                            const pieceWidth = cut.dim;
                            const pieceHeight = currentStrip.height;
                            const pieceX = currentStrip.currentX;
                            const pieceY = currentStrip.y;
                            const pieceLabel = cut.cod === 'Z1' ? 'Sobrante' : `Pz #${pieces.length + 1}`;
                            const piece = {
                                id: `p_${pieces.length + 1}`,
                                cutIndex: cut.cutIndex,
                                cod: cut.cod,
                                x: pieceX,
                                y: pieceY,
                                width: pieceWidth,
                                height: pieceHeight,
                                isScrap: cut.cod === 'Z1',
                                label: pieceLabel,
                                name: pieceLabel
                            };

                            currentStrip.pieces.push(piece);
                            pieces.push(piece);
                            currentStrip.currentX += pieceWidth;
                        }
                    }
                }
            }

            // Identify waste/remainder on each strip and overall sheet
            strips.forEach(strip => {
                const remainingWidth = sheetX - strip.currentX;
                if (remainingWidth > 1) { // more than 1mm
                    wasteAreas.push({
                        type: 'strip_remainder',
                        x: strip.currentX,
                        y: strip.y,
                        width: remainingWidth,
                        height: strip.height,
                        label: `Retazo ${Math.round(remainingWidth)}x${Math.round(strip.height)}`
                    });
                }
            });

            const remainingHeight = sheetY - currentY;
            if (remainingHeight > 1) {
                wasteAreas.push({
                    type: 'sheet_remainder',
                    x: 0,
                    y: currentY,
                    width: sheetX,
                    height: remainingHeight,
                    label: `Retazo Mayor ${Math.round(sheetX)}x${Math.round(remainingHeight)}`
                });
            }

            // Calculate total piece area and waste percentage
            const totalSheetArea = sheetX * sheetY;
            const totalPieceArea = pieces.reduce((sum, p) => sum + (p.width * p.height), 0);
            const efficiency = totalSheetArea > 0 ? (totalPieceArea / totalSheetArea) * 100 : 0;

            return {
                strips: strips,
                pieces: pieces,
                wasteAreas: wasteAreas,
                stats: {
                    totalPieces: pieces.length,
                    totalSheetAreaM2: (totalSheetArea / 1000000).toFixed(3),
                    usedAreaM2: (totalPieceArea / 1000000).toFixed(3),
                    wasteAreaM2: ((totalSheetArea - totalPieceArea) / 1000000).toFixed(3),
                    efficiencyPercent: efficiency.toFixed(1)
                }
            };
        },

        /**
         * Generates the official Selco WNT 600 / OSI cutting file content (.001, .002, etc.)
         *
         * @param {Object} pattern - Optimized layout data
         * @param {string} jobName - Base job name (e.g. "002ROB15")
         * @param {number} patternIndex - 1-based index (e.g. 1 -> .001)
         * @returns {string} Raw file text with CRLF and tabs.
         */
        generate(pattern, jobName = '001TRB18', patternIndex = 1) {
            const ext = String(patternIndex).padStart(3, '0');
            // DOS 8.3 filename base (max 8 characters before dot)
            const cleanJob = jobName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().substring(0, 8);
            const filename = `${cleanJob}.${ext}`;

            const matName = this.formatMaterialName(pattern.material || 'MELAMINA 18');
            const dayStr = pattern.date || '';
            const cmmStr = (pattern.comment || '').substring(0, 40);

            const xUnits = this.toSelcoUnits(pattern.sheet.length || pattern.sheet.x || 2500);
            const yUnits = this.toSelcoUnits(pattern.sheet.width || pattern.sheet.y || 1830);
            const zUnits = this.toSelcoUnits(pattern.sheet.thickness || pattern.sheet.z || 18);
            const qtaUnits = pattern.sheetQty || 1;

            const lines = [];
            lines.push('B_SCH');
            lines.push('B_DAT');
            lines.push(`\tNM="${filename}"`);
            lines.push(`\tCMM="${cmmStr}"`);
            lines.push(`\tMAT="${matName}"`);
            lines.push(`\tDAY="${dayStr}"`);
            lines.push('\tOPZ=""');
            lines.push(`\tX=${xUnits}`);
            lines.push(`\tY=${yUnits}`);
            lines.push(`\tZ=${zUnits}`);
            lines.push('\tHP=9000');
            lines.push('\tVL=0');
            lines.push('\tVT=0');
            lines.push(`\tQTA=${qtaUnits}`);
            lines.push('\tESE=0');
            lines.push('E_DAT');
            lines.push('B_CUT');

            // Generate B_CUT sequence
            let cutIndex = 1;
            const strips = pattern.strips || [];

            for (let i = 0; i < strips.length; i++) {
                const strip = strips[i];

                // Rip Cut (Tira longitudinal)
                const stripDimUnits = this.toSelcoUnits(strip.height);
                const stripQty = strip.qta || 1;
                const stripCod = strip.cod || '4';

                lines.push(`\tCUT=${cutIndex++}`);
                lines.push(`\t\tCOD="${stripCod}"`);
                lines.push(`\t\tDIM=${stripDimUnits}`);
                lines.push(`\t\tQTA=${stripQty}`);

                // Cross cuts along this strip
                const cutsInStrip = strip.cuts || [];
                for (let j = 0; j < cutsInStrip.length; j++) {
                    const c = cutsInStrip[j];
                    const pieceDimUnits = this.toSelcoUnits(c.length);
                    const pieceQty = c.qta || 1;
                    const pieceCod = c.cod || '5';

                    lines.push(`\tCUT=${cutIndex++}`);
                    lines.push(`\t\tCOD="${pieceCod}"`);
                    lines.push(`\t\tDIM=${pieceDimUnits}`);
                    lines.push(`\t\tQTA=${pieceQty}`);
                }
            }

            lines.push('E_CUT');
            lines.push('E_SCH');

            // Join with standard DOS/Windows CRLF
            return {
                filename: filename,
                content: lines.join('\r\n') + '\r\n'
            };
        }
    };

    window.SelcoParser = SelcoParser;
})(window);
