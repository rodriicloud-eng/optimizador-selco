/**
 * Interactive 2D Canvas Renderer for Selco Cutting Patterns
 * Supports Pan & Zoom, Retina scaling, hover tooltips, cut lines, and offcut hatches.
 */

(function (window) {
    'use strict';

    class CuttingCanvasRenderer {
        constructor(canvasElement, tooltipElement) {
            this.canvas = canvasElement;
            this.ctx = canvasElement.getContext('2d');
            this.tooltip = tooltipElement;

            // Viewport & Pan/Zoom State
            this.scale = 1;
            this.offsetX = 40;
            this.offsetY = 40;
            this.isDragging = false;
            this.dragStartX = 0;
            this.dragStartY = 0;

            // Current sheet / pattern data
            this.sheetData = null;
            this.hoveredPiece = null;

            // Palette of distinguishable colors for pieces
            this.pieceColors = [
                { bg: '#3b82f6', border: '#2563eb', text: '#ffffff' }, // Electric Blue
                { bg: '#10b981', border: '#059669', text: '#ffffff' }, // Emerald Green
                { bg: '#f59e0b', border: '#d97706', text: '#ffffff' }, // Amber
                { bg: '#8b5cf6', border: '#7c3aed', text: '#ffffff' }, // Violet
                { bg: '#06b6d4', border: '#0891b2', text: '#ffffff' }, // Cyan
                { bg: '#ec4899', border: '#db2777', text: '#ffffff' }, // Pink
                { bg: '#14b8a6', border: '#0d9488', text: '#ffffff' }, // Teal
                { bg: '#f97316', border: '#ea580c', text: '#ffffff' }, // Orange
                { bg: '#6366f1', border: '#4f46e5', text: '#ffffff' }, // Indigo
                { bg: '#84cc16', border: '#65a30d', text: '#ffffff' }, // Lime
            ];

            this.initEvents();
        }

        initEvents() {
            // Resize handling
            window.addEventListener('resize', () => {
                this.resizeCanvas();
                this.render();
            });

            // Mouse pan
            this.canvas.addEventListener('mousedown', (e) => {
                this.isDragging = true;
                this.dragStartX = e.clientX - this.offsetX;
                this.dragStartY = e.clientY - this.offsetY;
                this.canvas.style.cursor = 'grabbing';
            });

            window.addEventListener('mousemove', (e) => {
                if (this.isDragging) {
                    this.offsetX = e.clientX - this.dragStartX;
                    this.offsetY = e.clientY - this.dragStartY;
                    this.render();
                } else {
                    this.handleHover(e);
                }
            });

            window.addEventListener('mouseup', () => {
                this.isDragging = false;
                this.canvas.style.cursor = 'grab';
            });

            // Mouse wheel zoom
            this.canvas.addEventListener('wheel', (e) => {
                e.preventDefault();
                const zoomFactor = 1.1;
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;

                const prevScale = this.scale;
                let newScale = e.deltaY < 0 ? prevScale * zoomFactor : prevScale / zoomFactor;
                newScale = Math.max(0.1, Math.min(newScale, 10));

                // Zoom centered on mouse
                this.offsetX = mouseX - (mouseX - this.offsetX) * (newScale / prevScale);
                this.offsetY = mouseY - (mouseY - this.offsetY) * (newScale / prevScale);
                this.scale = newScale;

                this.render();
            }, { passive: false });

            // Touch events for tablets / workshop touch screens
            let lastTouchDist = 0;
            this.canvas.addEventListener('touchstart', (e) => {
                if (e.touches.length === 1) {
                    this.isDragging = true;
                    this.dragStartX = e.touches[0].clientX - this.offsetX;
                    this.dragStartY = e.touches[0].clientY - this.offsetY;
                } else if (e.touches.length === 2) {
                    lastTouchDist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                }
            }, { passive: true });

            this.canvas.addEventListener('touchmove', (e) => {
                if (e.touches.length === 1 && this.isDragging) {
                    this.offsetX = e.touches[0].clientX - this.dragStartX;
                    this.offsetY = e.touches[0].clientY - this.dragStartY;
                    this.render();
                } else if (e.touches.length === 2) {
                    const dist = Math.hypot(
                        e.touches[0].clientX - e.touches[1].clientX,
                        e.touches[0].clientY - e.touches[1].clientY
                    );
                    if (lastTouchDist > 0) {
                        const factor = dist / lastTouchDist;
                        this.scale = Math.max(0.1, Math.min(this.scale * factor, 10));
                        this.render();
                    }
                    lastTouchDist = dist;
                }
            }, { passive: true });

            this.canvas.addEventListener('touchend', () => {
                this.isDragging = false;
                lastTouchDist = 0;
            });
        }

        resizeCanvas() {
            const parent = this.canvas.parentElement;
            if (!parent) return;

            const rect = parent.getBoundingClientRect();
            const dpr = window.devicePixelRatio || 1;

            this.canvas.width = rect.width * dpr;
            this.canvas.height = rect.height * dpr;
            this.canvas.style.width = `${rect.width}px`;
            this.canvas.style.height = `${rect.height}px`;

            this.ctx.resetTransform();
            this.ctx.scale(dpr, dpr);
        }

        /**
         * Loads and fits sheet data into the view.
         */
        loadSheet(sheetData) {
            this.sheetData = sheetData;
            this.resizeCanvas();
            this.fitToScreen();
        }

        /**
         * Automatically calculates scale and offsets to center the plate on canvas.
         */
        fitToScreen() {
            if (!this.sheetData) return;

            const sheetW = this.sheetData.sheet.length || this.sheetData.sheet.x || 2500;
            const sheetH = this.sheetData.sheet.width || this.sheetData.sheet.y || 1830;

            const parent = this.canvas.parentElement;
            const availW = (parent ? parent.clientWidth : 800) - 80;
            const availH = (parent ? parent.clientHeight : 500) - 80;

            const scaleX = availW / sheetW;
            const scaleY = availH / sheetH;

            this.scale = Math.min(scaleX, scaleY);
            this.offsetX = Math.max(40, (availW + 80 - sheetW * this.scale) / 2);
            this.offsetY = Math.max(40, (availH + 80 - sheetH * this.scale) / 2);

            this.render();
        }

        zoomIn() {
            this.scale = Math.min(this.scale * 1.25, 10);
            this.render();
        }

        zoomOut() {
            this.scale = Math.max(this.scale / 1.25, 0.1);
            this.render();
        }

        /**
         * Main render loop.
         */
        render() {
            const ctx = this.ctx;
            const width = this.canvas.clientWidth;
            const height = this.canvas.clientHeight;

            ctx.clearRect(0, 0, width, height);

            if (!this.sheetData) {
                this.renderEmptyState(ctx, width, height);
                return;
            }

            ctx.save();
            ctx.translate(this.offsetX, this.offsetY);
            ctx.scale(this.scale, this.scale);

            const sheetW = this.sheetData.sheet.length || this.sheetData.sheet.x || 2500;
            const sheetH = this.sheetData.sheet.width || this.sheetData.sheet.y || 1830;

            // 1. Draw Master Sheet background
            this.drawSheetBase(ctx, sheetW, sheetH);

            // 2. Draw Waste / Offcuts
            this.drawWasteAreas(ctx);

            // 3. Draw Placed Pieces
            this.drawPieces(ctx);

            // 4. Draw Guillotine Cut Lines & Sequence Labels
            this.drawCutLines(ctx, sheetW, sheetH);

            // 5. Draw Sheet Dimensions (Cotas)
            this.drawDimensionLines(ctx, sheetW, sheetH);

            ctx.restore();
        }

        renderEmptyState(ctx, width, height) {
            ctx.save();
            ctx.fillStyle = '#64748b';
            ctx.font = '500 14px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('Plano de corte 2D listo. Agrega o importa piezas para optimizar.', width / 2, height / 2);
            ctx.restore();
        }

        drawSheetBase(ctx, width, height) {
            // Shadow
            ctx.save();
            ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
            ctx.shadowBlur = 18 / this.scale;
            ctx.shadowOffsetX = 4 / this.scale;
            ctx.shadowOffsetY = 6 / this.scale;

            // Sheet material base
            ctx.fillStyle = '#1e293b';
            ctx.fillRect(0, 0, width, height);
            ctx.restore();

            // Border
            ctx.strokeStyle = '#475569';
            ctx.lineWidth = 2 / this.scale;
            ctx.strokeRect(0, 0, width, height);

            // Trim guideline (Refilo)
            const trim = 10;
            ctx.save();
            ctx.setLineDash([8 / this.scale, 6 / this.scale]);
            ctx.strokeStyle = '#334155';
            ctx.lineWidth = 1 / this.scale;
            ctx.strokeRect(trim, trim, width - 2 * trim, height - 2 * trim);
            ctx.restore();
        }

        drawWasteAreas(ctx) {
            const wasteAreas = this.sheetData.wasteAreas || [];

            wasteAreas.forEach(waste => {
                ctx.save();
                ctx.fillStyle = 'rgba(239, 68, 68, 0.08)'; // Subtle red/slate tint
                ctx.fillRect(waste.x, waste.y, waste.width, waste.height);

                // Diagonal Hatching
                ctx.strokeStyle = 'rgba(239, 68, 68, 0.25)';
                ctx.lineWidth = 1 / this.scale;
                ctx.beginPath();

                const step = 25;
                for (let x = waste.x - waste.height; x < waste.x + waste.width; x += step) {
                    const x1 = Math.max(waste.x, x);
                    const y1 = waste.y + (x1 - x);
                    const y2 = Math.min(waste.y + waste.height, waste.y + (waste.x + waste.width - x));
                    const x2 = x + (y2 - waste.y);

                    if (x1 < waste.x + waste.width && y1 < waste.y + waste.height) {
                        ctx.moveTo(x1, y1);
                        ctx.lineTo(x2, y2);
                    }
                }
                ctx.stroke();

                // Offcut label if large enough
                if (waste.width > 70 && waste.height > 40) {
                    ctx.fillStyle = '#f87171';
                    ctx.font = `bold ${Math.max(10, Math.min(13, 14 / this.scale))}px Inter, sans-serif`;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText(waste.label || 'Sobrante', waste.x + waste.width / 2, waste.y + waste.height / 2);
                }

                ctx.restore();
            });
        }

        drawPieces(ctx) {
            const pieces = this.sheetData.pieces || [];

            pieces.forEach((piece, index) => {
                const isHovered = this.hoveredPiece && this.hoveredPiece.id === piece.id;
                const palette = this.pieceColors[index % this.pieceColors.length];

                ctx.save();

                // Glow on hover
                if (isHovered) {
                    ctx.shadowColor = '#60a5fa';
                    ctx.shadowBlur = 15 / this.scale;
                }

                // Piece background
                ctx.fillStyle = isHovered ? '#3b82f6' : palette.bg;
                ctx.globalAlpha = isHovered ? 0.95 : 0.85;
                ctx.fillRect(piece.x, piece.y, piece.width, piece.height);

                // Piece border
                ctx.globalAlpha = 1.0;
                ctx.strokeStyle = isHovered ? '#93c5fd' : palette.border;
                ctx.lineWidth = isHovered ? (3 / this.scale) : (1.5 / this.scale);
                ctx.strokeRect(piece.x, piece.y, piece.width, piece.height);

                // Text labels (Item Badge, Piece Name & Dimensions)
                if (piece.width > 40 && piece.height > 25) {
                    const itemTag = piece.item ? `[${piece.item}] ` : '';
                    ctx.fillStyle = palette.text;
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';

                    const fontSize = Math.max(9, Math.min(14, Math.min(piece.width / 10, piece.height / 4) / this.scale));
                    ctx.font = `600 ${fontSize}px Inter, sans-serif`;

                    const centerX = piece.x + piece.width / 2;
                    const centerY = piece.y + piece.height / 2;

                    if (piece.height > 45) {
                        ctx.fillText(`${itemTag}${piece.name}`, centerX, centerY - fontSize * 0.7);
                        ctx.font = `400 ${fontSize * 0.85}px 'JetBrains Mono', monospace`;
                        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                        ctx.fillText(`${Math.round(piece.width)} x ${Math.round(piece.height)}`, centerX, centerY + fontSize * 0.7);
                    } else {
                        ctx.fillText(`${itemTag}${Math.round(piece.width)}x${Math.round(piece.height)}`, centerX, centerY);
                    }
                }

                ctx.restore();
            });
        }

        drawCutLines(ctx, sheetW, sheetH) {
            const strips = this.sheetData.strips || this.sheetData.geometry?.strips || [];

            strips.forEach(strip => {
                // Cut line between strips (Fase 1: Longitudinal Rip Cut)
                const lineY = strip.y + strip.height;
                if (lineY < sheetH) {
                    ctx.save();
                    ctx.strokeStyle = '#38bdf8'; // Sky blue
                    ctx.lineWidth = 1.5 / this.scale;
                    ctx.beginPath();
                    ctx.moveTo(0, lineY);
                    ctx.lineTo(sheetW, lineY);
                    ctx.stroke();

                    // Cut Tag badge
                    const tagText = `Fase 1: Ancho ${Math.round(strip.height)} mm`;
                    this.drawCutBadge(ctx, tagText, 30, lineY, '#0284c7');
                    ctx.restore();
                }

                // Cross cuts inside strip (Fase 2)
                let currentX = strip.x || 0;
                const piecesInStrip = strip.pieces || [];

                piecesInStrip.forEach((p, pIdx) => {
                    currentX += p.width;
                    if (pIdx < piecesInStrip.length - 1 || currentX < sheetW) {
                        ctx.save();
                        ctx.strokeStyle = p.isSpecial ? '#c084fc' : '#fb923c'; // Orange for crosscut, violet for Z1
                        ctx.setLineDash([6 / this.scale, 4 / this.scale]);
                        ctx.lineWidth = 1.5 / this.scale;
                        ctx.beginPath();
                        ctx.moveTo(currentX, strip.y);
                        ctx.lineTo(currentX, strip.y + strip.height);
                        ctx.stroke();
                        ctx.restore();
                    }
                });
            });
        }

        drawCutBadge(ctx, text, x, y, bgColor) {
            ctx.save();
            ctx.font = `bold ${Math.max(8, 10 / this.scale)}px 'JetBrains Mono', monospace`;
            const textMetrics = ctx.measureText(text);
            const padX = 6 / this.scale;
            const padY = 3 / this.scale;
            const badgeW = textMetrics.width + padX * 2;
            const badgeH = 14 / this.scale;

            ctx.fillStyle = bgColor;
            ctx.beginPath();
            ctx.roundRect(x, y - badgeH / 2, badgeW, badgeH, 3 / this.scale);
            ctx.fill();

            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x + padX, y);
            ctx.restore();
        }

        drawDimensionLines(ctx, width, height) {
            ctx.save();
            ctx.strokeStyle = '#94a3b8';
            ctx.fillStyle = '#cbd5e1';
            ctx.lineWidth = 1 / this.scale;
            ctx.font = `500 ${Math.max(10, 12 / this.scale)}px 'JetBrains Mono', monospace`;
            ctx.textAlign = 'center';

            // Top dimension (Sheet length)
            const topY = -15;
            ctx.beginPath();
            ctx.moveTo(0, topY);
            ctx.lineTo(width, topY);
            ctx.stroke();
            ctx.fillText(`${Math.round(width)} mm`, width / 2, topY - 6);

            // Left dimension (Sheet width)
            const leftX = -15;
            ctx.beginPath();
            ctx.moveTo(leftX, 0);
            ctx.lineTo(leftX, height);
            ctx.stroke();

            ctx.save();
            ctx.translate(leftX - 8, height / 2);
            ctx.rotate(-Math.PI / 2);
            ctx.fillText(`${Math.round(height)} mm`, 0, 0);
            ctx.restore();

            ctx.restore();
        }

        handleHover(e) {
            if (!this.sheetData || this.isDragging) return;

            const rect = this.canvas.getBoundingClientRect();
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;

            // Transform canvas mouse coordinates to plate space
            const plateX = (mouseX - this.offsetX) / this.scale;
            const plateY = (mouseY - this.offsetY) / this.scale;

            const pieces = this.sheetData.pieces || [];
            let hit = null;

            for (let i = pieces.length - 1; i >= 0; i--) {
                const p = pieces[i];
                if (plateX >= p.x && plateX <= p.x + p.width &&
                    plateY >= p.y && plateY <= p.y + p.height) {
                    hit = p;
                    break;
                }
            }

            if (hit !== this.hoveredPiece) {
                this.hoveredPiece = hit;
                this.render();
            }

            // Update tooltip position and content
            if (hit && this.tooltip) {
                this.tooltip.style.display = 'block';
                this.tooltip.style.left = `${e.clientX + 14}px`;
                this.tooltip.style.top = `${e.clientY + 14}px`;
                this.tooltip.innerHTML = `
                    <div class="tooltip-title">${hit.item ? `[Ítem ${hit.item}] ` : ''}${hit.name}</div>
                    <div class="tooltip-row"><span>Ancho × Largo:</span> <strong>${Math.round(hit.height)} × ${Math.round(hit.width)} mm</strong></div>
                    <div class="tooltip-row"><span>Área:</span> <strong>${((hit.width * hit.height) / 1000000).toFixed(3)} m²</strong></div>
                    <div class="tooltip-row"><span>Posición:</span> <strong>X: ${Math.round(hit.x)}, Y: ${Math.round(hit.y)}</strong></div>
                    ${hit.rotated ? '<div class="tooltip-badge">Rotada 90°</div>' : ''}
                    ${hit.isSpecial ? '<div class="tooltip-badge z1">Subcorte Z1</div>' : ''}
                `;
            } else if (this.tooltip) {
                this.tooltip.style.display = 'none';
            }
        }
    }

    window.CuttingCanvasRenderer = CuttingCanvasRenderer;
})(window);
