/**
 * Industrial 2D Guillotine Cutting Stock Optimizer for Beam Saws (Selco WNT 600)
 * Generates optimal strip-based guillotine cutting layouts respecting grain, kerf, trims, and machine batching.
 */

(function (window) {
    'use strict';

    class CuttingOptimizer {
        constructor(config = {}) {
            this.config = Object.assign({
                kerf: 4.4,             // Espesor de disco / Sierra (mm)
                trim: 10.0,            // Refilo perimétrico (mm)
                defaultLength: 2500,   // Placa default largo (mm)
                defaultWidth: 1830,    // Placa default ancho (mm)
                defaultThickness: 18,  // Placa espesor (mm)
                batchStrips: true,     // Agrupar tiras idénticas (QTA > 1 en COD="4")
                iterations: 35         // Iteraciones de búsqueda estocástica
            }, config);
        }

        /**
         * Main optimization function.
         * @param {Object} sheetConfig - { length, width, thickness, material, jobName }
         * @param {Array} partsList - [ { id, name, length, width, quantity, canRotate, grain } ]
         * @param {Object} customOptions - Optional overrides
         */
        optimize(sheetConfig, partsList, customOptions = {}) {
            const opts = Object.assign({}, this.config, customOptions);
            const sheet = {
                length: Number(sheetConfig.length || opts.defaultLength),
                width: Number(sheetConfig.width || opts.defaultWidth),
                thickness: Number(sheetConfig.thickness || opts.defaultThickness),
                material: sheetConfig.material || 'MELAMINA 18',
                jobName: sheetConfig.jobName || 'JOB001'
            };

            // Expand all parts based on quantity
            const expandedParts = [];
            let uid = 1;

            (partsList || []).forEach(p => {
                const qty = parseInt(p.quantity, 10) || 1;
                const len = parseFloat(p.length) || 0;
                const wid = parseFloat(p.width) || 0;
                const canRot = p.canRotate !== false; // default true if not specified
                const grain = p.grain || 'none'; // 'none', 'longitudinal', 'transversal'

                if (len <= 0 || wid <= 0) return;

                for (let q = 0; q < qty; q++) {
                    expandedParts.push({
                        origId: p.id || `P${uid}`,
                        uniqueId: `part_${uid++}`,
                        item: p.item || String(uid - 1),
                        name: p.name || `Pieza ${uid}`,
                        length: len,
                        width: wid,
                        canRotate: grain === 'none' ? canRot : false,
                        grain: grain,
                        area: len * wid
                    });
                }
            });

            if (expandedParts.length === 0) {
                return {
                    success: false,
                    error: 'No se ingresaron piezas válidas para optimizar.',
                    sheets: [],
                    stats: {}
                };
            }

            // Verify if any piece exceeds the usable sheet dimensions
            const usableL = sheet.length - 2 * opts.trim;
            const usableW = sheet.width - 2 * opts.trim;

            for (const part of expandedParts) {
                const fitsNormal = part.length <= usableL && part.width <= usableW;
                const fitsRotated = part.canRotate && (part.width <= usableL && part.length <= usableW);

                if (!fitsNormal && !fitsRotated) {
                    return {
                        success: false,
                        error: `La pieza "${part.name}" (${part.length}x${part.width} mm) excede las dimensiones útiles de la placa (${usableL}x${usableW} mm considerando refilos de ${opts.trim} mm).`,
                        sheets: [],
                        stats: {}
                    };
                }
            }

            // Run multi-heuristic guillotine optimization
            let bestSolution = null;

            // Strategy 1: Longitudinal ripping (along Length X, cuts along Width Y)
            const solLong = this.solveGuillotine(sheet, expandedParts, opts, 'longitudinal');
            bestSolution = solLong;

            // Strategy 2: Transversal ripping (along Width Y, cuts along Length X)
            const solTrans = this.solveGuillotine(sheet, expandedParts, opts, 'transversal');
            if (this.isBetterSolution(solTrans, bestSolution)) {
                bestSolution = solTrans;
            }

            // Strategy 3: Heuristic permutations & stochastic local search
            const sortingFunctions = [
                (a, b) => b.area - a.area, // Best Area Decreasing
                (a, b) => Math.max(b.length, b.width) - Math.max(a.length, a.width), // Longest side
                (a, b) => Math.min(b.length, b.width) - Math.min(a.length, a.width), // Shortest side
                (a, b) => (b.length + b.width) - (a.length + a.width) // Perimeter
            ];

            for (const sortFn of sortingFunctions) {
                const sorted = [...expandedParts].sort(sortFn);
                const sL = this.solveGuillotine(sheet, sorted, opts, 'longitudinal');
                if (this.isBetterSolution(sL, bestSolution)) bestSolution = sL;

                const sT = this.solveGuillotine(sheet, sorted, opts, 'transversal');
                if (this.isBetterSolution(sT, bestSolution)) bestSolution = sT;
            }

            // Run quick stochastic iterations
            for (let iter = 0; iter < opts.iterations; iter++) {
                const shuffled = this.shuffleWithBias([...expandedParts]);
                const dir = iter % 2 === 0 ? 'longitudinal' : 'transversal';
                const sol = this.solveGuillotine(sheet, shuffled, opts, dir);
                if (this.isBetterSolution(sol, bestSolution)) {
                    bestSolution = sol;
                }
            }

            // Post-process solution: batch consecutive identical strips if enabled
            this.finalizeSolution(bestSolution, sheet, opts);

            return bestSolution;
        }

        /**
         * Evaluates if solution A is superior to solution B.
         * Criteria:
         * 1) Fewer sheets is top priority
         * 2) Higher efficiency %
         * 3) Fewer total cuts
         */
        isBetterSolution(solA, solB) {
            if (!solB) return true;
            if (!solA || !solA.success) return false;

            if (solA.sheets.length < solB.sheets.length) return true;
            if (solA.sheets.length > solB.sheets.length) return false;

            if (solA.stats.globalEfficiency > solB.stats.globalEfficiency + 0.2) return true;
            if (solA.stats.globalEfficiency < solB.stats.globalEfficiency - 0.2) return false;

            return solA.stats.totalCuts < solB.stats.totalCuts;
        }

        /**
         * Shuffles array with slight randomness favoring larger pieces first.
         */
        shuffleWithBias(array) {
            return array.sort((a, b) => {
                const base = b.area - a.area;
                const noise = (Math.random() - 0.5) * a.area * 0.4;
                return base + noise;
            });
        }

        /**
         * Core 2D Guillotine Strip-Packing Algorithm.
         */
        solveGuillotine(sheet, partsList, opts, primaryDirection = 'longitudinal') {
            const isLong = primaryDirection === 'longitudinal';
            const sheetL = sheet.length;
            const sheetW = sheet.width;
            const trim = opts.trim;
            const kerf = opts.kerf;

            // Define strip orientation
            // In longitudinal ripping: strip length is sheetL - 2*trim, max sheet width is sheetW - 2*trim
            const stripCapacityLength = isLong ? (sheetL - 2 * trim) : (sheetW - 2 * trim);
            const sheetCapacityWidth = isLong ? (sheetW - 2 * trim) : (sheetL - 2 * trim);

            const unplaced = partsList.map(p => Object.assign({}, p));
            const sheets = [];

            while (unplaced.length > 0) {
                const currentSheetStrips = [];
                let currentSheetUsedWidth = 0;

                // Build strips for this sheet until sheet width is full
                while (unplaced.length > 0) {
                    const remainingSheetWidth = sheetCapacityWidth - currentSheetUsedWidth;
                    if (remainingSheetWidth <= 1) break;

                    // Choose strip height based on the best candidate piece
                    let bestPieceIdx = -1;
                    let bestOrientation = null;
                    let bestHeight = 0;

                    for (let i = 0; i < unplaced.length; i++) {
                        const p = unplaced[i];
                        // Try normal orientation
                        const h1 = isLong ? p.width : p.length;
                        const l1 = isLong ? p.length : p.width;

                        if (h1 <= remainingSheetWidth && l1 <= stripCapacityLength) {
                            if (h1 > bestHeight) {
                                bestHeight = h1;
                                bestPieceIdx = i;
                                bestOrientation = { length: l1, height: h1, rotated: false };
                            }
                        }

                        // Try rotated orientation if allowed
                        if (p.canRotate) {
                            const h2 = isLong ? p.length : p.width;
                            const l2 = isLong ? p.width : p.length;

                            if (h2 <= remainingSheetWidth && l2 <= stripCapacityLength) {
                                if (h2 > bestHeight) {
                                    bestHeight = h2;
                                    bestPieceIdx = i;
                                    bestOrientation = { length: l2, height: h2, rotated: true };
                                }
                            }
                        }
                    }

                    if (bestPieceIdx === -1) {
                        // No piece can fit in the remaining width of this sheet
                        break;
                    }

                    // We have our strip height!
                    const stripHeight = bestHeight;
                    const stripPieces = [];
                    let currentStripUsedLength = 0;

                    // Greedily pack as many pieces as possible into this strip
                    for (let i = 0; i < unplaced.length; ) {
                        const p = unplaced[i];
                        const remainingStripLength = stripCapacityLength - currentStripUsedLength;
                        if (remainingStripLength <= 1) break;

                        let placed = false;

                        // Check if fits without rotation
                        const h1 = isLong ? p.width : p.length;
                        const l1 = isLong ? p.length : p.width;
                        const requiredL1 = stripPieces.length === 0 ? l1 : l1 + kerf;

                        // Check if fits with rotation
                        const h2 = isLong ? p.length : p.width;
                        const l2 = isLong ? p.width : p.length;
                        const requiredL2 = stripPieces.length === 0 ? l2 : l2 + kerf;

                        let chosen = null;

                        // We prefer pieces whose height exactly matches stripHeight or is very close
                        const match1 = (h1 <= stripHeight && requiredL1 <= remainingStripLength);
                        const match2 = (p.canRotate && h2 <= stripHeight && requiredL2 <= remainingStripLength);

                        if (match1 && match2) {
                            // Pick whichever has closer height to stripHeight to avoid vertical waste
                            const diff1 = stripHeight - h1;
                            const diff2 = stripHeight - h2;
                            if (diff1 <= diff2) {
                                chosen = { length: l1, height: h1, reqLength: requiredL1, rotated: false };
                            } else {
                                chosen = { length: l2, height: h2, reqLength: requiredL2, rotated: true };
                            }
                        } else if (match1) {
                            chosen = { length: l1, height: h1, reqLength: requiredL1, rotated: false };
                        } else if (match2) {
                            chosen = { length: l2, height: h2, reqLength: requiredL2, rotated: true };
                        }

                        if (chosen) {
                            stripPieces.push({
                                origId: p.origId,
                                uniqueId: p.uniqueId,
                                item: p.item,
                                name: p.name,
                                length: chosen.length,
                                height: chosen.height,
                                rotated: chosen.rotated,
                                grain: p.grain
                            });
                            currentStripUsedLength += chosen.reqLength;
                            unplaced.splice(i, 1);
                            placed = true;
                        } else {
                            i++;
                        }
                    }

                    if (stripPieces.length > 0) {
                        currentSheetStrips.push({
                            height: stripHeight,
                            pieces: stripPieces,
                            usedLength: currentStripUsedLength,
                            cod: '4',
                            qta: 1
                        });

                        const stripRequiredWidth = (currentSheetStrips.length === 1 ? stripHeight : stripHeight + kerf);
                        currentSheetUsedWidth += stripRequiredWidth;
                    } else {
                        break;
                    }
                }

                if (currentSheetStrips.length === 0) {
                    // Safety break to prevent infinite loops if a piece cannot be placed
                    break;
                }

                sheets.push({
                    sheetIndex: sheets.length + 1,
                    direction: primaryDirection,
                    strips: currentSheetStrips
                });
            }

            // Calculate overall stats
            const totalPartsCount = partsList.length;
            const placedPartsCount = totalPartsCount - unplaced.length;

            const totalSheetAreaM2 = sheets.length * (sheetL * sheetW / 1000000);
            const totalPartsAreaM2 = partsList.reduce((sum, p) => sum + (p.length * p.width / 1000000), 0);
            const globalEfficiency = totalSheetAreaM2 > 0 ? (totalPartsAreaM2 / totalSheetAreaM2) * 100 : 0;

            return {
                success: unplaced.length === 0,
                direction: primaryDirection,
                sheets: sheets,
                unplaced: unplaced,
                stats: {
                    totalSheets: sheets.length,
                    totalParts: totalPartsCount,
                    placedParts: placedPartsCount,
                    totalSheetAreaM2: Number(totalSheetAreaM2.toFixed(3)),
                    totalPartsAreaM2: Number(totalPartsAreaM2.toFixed(3)),
                    totalWasteAreaM2: Number(Math.max(0, totalSheetAreaM2 - totalPartsAreaM2).toFixed(3)),
                    globalEfficiency: Number(globalEfficiency.toFixed(1)),
                    totalCuts: 0
                }
            };
        }

        /**
         * Post-processes the best solution:
         * 1) Groups identical consecutive strips (QTA > 1 in COD="4")
         * 2) Generates precise 2D coordinates (x, y, w, h) for every piece, trim, and waste
         * 3) Formats Selco machine files (.001, .002, ...)
         */
        finalizeSolution(solution, sheet, opts) {
            if (!solution || !solution.sheets) return;

            const sheetL = sheet.length;
            const sheetW = sheet.width;
            const trim = opts.trim;
            const kerf = opts.kerf;
            let totalCutsCount = 0;

            solution.sheets.forEach((sheetObj, sheetIdx) => {
                const isLong = sheetObj.direction === 'longitudinal';
                const processedStrips = [];
                const allPlacedPieces = [];
                const wasteAreas = [];

                // Step 1: Batch identical consecutive strips if option is enabled
                const rawStrips = sheetObj.strips;
                let currentY = trim;

                for (let i = 0; i < rawStrips.length; i++) {
                    const strip = rawStrips[i];
                    let qta = 1;

                    if (opts.batchStrips) {
                        while (i + 1 < rawStrips.length && this.areStripsIdentical(strip, rawStrips[i + 1])) {
                            qta++;
                            i++;
                        }
                    }

                    // Format cuts array for Selco file generator
                    const cuts = [];
                    // Group identical consecutive pieces in the strip for QTA in COD="5"
                    for (let pIdx = 0; pIdx < strip.pieces.length; pIdx++) {
                        const piece = strip.pieces[pIdx];
                        let pieceQta = 1;

                        while (pIdx + 1 < strip.pieces.length && strip.pieces[pIdx + 1].length === piece.length) {
                            pieceQta++;
                            pIdx++;
                        }

                        cuts.push({
                            length: piece.length,
                            qta: pieceQta,
                            cod: '5'
                        });
                        totalCutsCount += pieceQta;
                    }

                    processedStrips.push({
                        height: strip.height,
                        qta: qta,
                        cod: '4',
                        cuts: cuts,
                        pieces: strip.pieces
                    });
                    totalCutsCount += qta;

                    // Step 2: Compute 2D visual coordinates for rendering
                    for (let rep = 0; rep < qta; rep++) {
                        let currentX = trim;
                        const stripY = currentY;

                        for (let pIdx = 0; pIdx < strip.pieces.length; pIdx++) {
                            const p = strip.pieces[pIdx];
                            const pieceW = isLong ? p.length : strip.height;
                            const pieceH = isLong ? strip.height : p.length;
                            const pieceX = isLong ? currentX : stripY;
                            const pieceY = isLong ? stripY : currentX;

                            allPlacedPieces.push({
                                id: p.uniqueId,
                                item: p.item,
                                name: p.name,
                                x: pieceX,
                                y: pieceY,
                                width: pieceW,
                                height: pieceH,
                                rotated: p.rotated,
                                grain: p.grain,
                                stripIndex: processedStrips.length
                            });

                            currentX += p.length + kerf;
                        }

                        // Check for strip remainder offcut
                        const maxStripL = isLong ? (sheetL - trim) : (sheetW - trim);
                        const remainderL = maxStripL - (currentX - kerf);

                        if (remainderL > 5) { // more than 5mm
                            const wasteW = isLong ? remainderL : strip.height;
                            const wasteH = isLong ? strip.height : remainderL;
                            const wasteX = isLong ? (currentX - kerf) : stripY;
                            const wasteY = isLong ? stripY : (currentX - kerf);

                            wasteAreas.push({
                                type: 'strip_offcut',
                                x: wasteX,
                                y: wasteY,
                                width: wasteW,
                                height: wasteH,
                                label: `Retazo ${Math.round(wasteW)}x${Math.round(wasteH)}`
                            });
                        }

                        currentY += strip.height + kerf;
                    }
                }

                // Check for sheet bottom remainder offcut
                const maxSheetW = isLong ? (sheetW - trim) : (sheetL - trim);
                const remainderW = maxSheetW - (currentY - kerf);

                if (remainderW > 5) {
                    const wasteW = isLong ? (sheetL - 2 * trim) : remainderW;
                    const wasteH = isLong ? remainderW : (sheetW - 2 * trim);
                    const wasteX = trim;
                    const wasteY = isLong ? (currentY - kerf) : trim;

                    wasteAreas.push({
                        type: 'sheet_offcut',
                        x: wasteX,
                        y: wasteY,
                        width: wasteW,
                        height: wasteH,
                        label: `Retazo Mayor ${Math.round(wasteW)}x${Math.round(wasteH)}`
                    });
                }

                // Attach to sheetObj
                sheetObj.processedStrips = processedStrips;
                sheetObj.pieces = allPlacedPieces;
                sheetObj.wasteAreas = wasteAreas;
                sheetObj.sheet = sheet;

                // Step 3: Generate exact Selco .001, .002, etc. machine file
                const patternIndex = sheetIdx + 1;
                const patternData = {
                    material: sheet.material,
                    comment: `Optimizador Selco - Placa ${patternIndex}`,
                    sheet: sheet,
                    sheetQty: 1,
                    strips: processedStrips
                };

                const selcoFile = SelcoParser.generate(patternData, sheet.jobName, patternIndex);
                sheetObj.selcoFile = selcoFile;
            });

            solution.stats.totalCuts = totalCutsCount;
        }

        /**
         * Checks if two strips have identical heights and piece cut sequences.
         */
        areStripsIdentical(s1, s2) {
            if (s1.height !== s2.height) return false;
            if (s1.pieces.length !== s2.pieces.length) return false;

            for (let i = 0; i < s1.pieces.length; i++) {
                if (s1.pieces[i].length !== s2.pieces[i].length) return false;
            }
            return true;
        }
    }

    window.CuttingOptimizer = CuttingOptimizer;
})(window);
