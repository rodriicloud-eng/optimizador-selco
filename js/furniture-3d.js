/**
 * Industrial 3D Furniture & Cutlist Studio (Three.js r128)
 * Inspired by open-source CAD/CAM references:
 * - hilca44/c3cad (Parametric 3D furniture body & exploded views)
 * - RajwanYair/WoodworkingShop (Cabinet configurator + BOM cutlist)
 * - craftpixels/parametric-3d-cutist-generator (3D model to sheet optimization)
 */

(function (window) {
    'use strict';

    class Furniture3DStudio {
        constructor(containerElement, infoOverlayElement) {
            this.container = containerElement;
            this.infoOverlay = infoOverlayElement;
            this.scene = null;
            this.camera = null;
            this.renderer = null;
            this.controls = null;
            this.furnitureGroup = null;
            this.raycaster = null;
            this.mouse = null;

            this.explodeFactor = 0.0; // 0.0 (Assembled) to 1.0 (Exploded)
            this.showWireframe = false;
            this.showLabels3D = true;
            this.doorsOpen = false;
            this.selectedMesh = null;
            this.partMeshes = [];
            this.labelSprites = [];
            this.currentMode = 'cutlist'; // 'cutlist' (reconstruct from table) or 'parametric' (generator)

            this.materialPresets = {
                roble: { color: 0xc89d66, roughness: 0.55, metalness: 0.05, edgeColor: 0x8c6239, name: 'Roble Provenzal' },
                blanco: { color: 0xf1f5f9, roughness: 0.35, metalness: 0.02, edgeColor: 0x94a3b8, name: 'Blanco Liso' },
                carvallo: { color: 0xb57c4a, roughness: 0.5, metalness: 0.05, edgeColor: 0x784922, name: 'Carvallo Natural' },
                grafito: { color: 0x334155, roughness: 0.4, metalness: 0.08, edgeColor: 0x1e293b, name: 'Gris Grafito' },
                nogal: { color: 0x6e472b, roughness: 0.6, metalness: 0.05, edgeColor: 0x422814, name: 'Nogal Habano' }
            };
            this.activeMaterialKey = 'roble';

            this.initScene();
        }

        initScene() {
            if (!this.container || typeof THREE === 'undefined') return;

            const width = this.container.clientWidth || 800;
            const height = this.container.clientHeight || 520;

            this.scene = new THREE.Scene();
            this.scene.background = new THREE.Color(0x0b1120);

            this.camera = new THREE.PerspectiveCamera(42, width / height, 10, 25000);
            this.camera.position.set(1850, 1450, 2350);

            this.renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
            this.renderer.setSize(width, height);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

            // Clear container and mount canvas
            this.container.innerHTML = '';
            this.container.appendChild(this.renderer.domElement);

            if (THREE.OrbitControls) {
                this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
                this.controls.enableDamping = true;
                this.controls.dampingFactor = 0.08;
                this.controls.target.set(0, 450, 0);
                this.controls.maxPolarAngle = Math.PI / 2 + 0.15;
                this.controls.minDistance = 300;
                this.controls.maxDistance = 9000;
            }

            // Lighting setup
            const ambientLight = new THREE.AmbientLight(0xffffff, 0.68);
            this.scene.add(ambientLight);

            const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.75);
            dirLight1.position.set(1800, 2800, 2200);
            dirLight1.castShadow = true;
            dirLight1.shadow.mapSize.width = 2048;
            dirLight1.shadow.mapSize.height = 2048;
            this.scene.add(dirLight1);

            const dirLight2 = new THREE.DirectionalLight(0x93c5fd, 0.35);
            dirLight2.position.set(-1800, 1200, -1400);
            this.scene.add(dirLight2);

            // Workshop floor grid
            const gridHelper = new THREE.GridHelper(4000, 40, 0x38bdf8, 0x1e293b);
            gridHelper.position.y = -2;
            this.scene.add(gridHelper);

            // Coordinate Axes helper (subtle)
            const axesHelper = new THREE.AxesHelper(350);
            axesHelper.position.set(-1800, 0, -1800);
            this.scene.add(axesHelper);

            this.furnitureGroup = new THREE.Group();
            this.scene.add(this.furnitureGroup);

            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();

            // Interaction events
            this.renderer.domElement.addEventListener('click', (e) => this.onCanvasClick(e));
            window.addEventListener('resize', () => this.resize());

            this.animate();
        }

        resize() {
            if (!this.container || !this.renderer || !this.camera) return;
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            if (width <= 0 || height <= 0) return;

            this.camera.aspect = width / height;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(width, height);
        }

        animate() {
            requestAnimationFrame(() => this.animate());
            if (this.controls) this.controls.update();
            if (this.renderer && this.scene && this.camera) {
                this.renderer.render(this.scene, this.camera);
            }
        }

        setMaterialTheme(materialString) {
            const s = (materialString || '').toLowerCase();
            if (s.includes('blanco') || s.includes('blanca') || s.includes('white')) {
                this.activeMaterialKey = 'blanco';
            } else if (s.includes('carvallo') || s.includes('haya') || s.includes('cerezo')) {
                this.activeMaterialKey = 'carvallo';
            } else if (s.includes('grafito') || s.includes('gris') || s.includes('negro') || s.includes('antracita')) {
                this.activeMaterialKey = 'grafito';
            } else if (s.includes('nogal') || s.includes('habano') || s.includes('wengue')) {
                this.activeMaterialKey = 'nogal';
            } else {
                this.activeMaterialKey = 'roble';
            }
        }

        createWoodTexture(baseHex, hasGrain = true) {
            const canvas = document.createElement('canvas');
            canvas.width = 512;
            canvas.height = 512;
            const ctx = canvas.getContext('2d');

            const color = new THREE.Color(baseHex);
            const r = Math.floor(color.r * 255);
            const g = Math.floor(color.g * 255);
            const b = Math.floor(color.b * 255);

            ctx.fillStyle = `rgb(${r},${g},${b})`;
            ctx.fillRect(0, 0, 512, 512);

            if (hasGrain && this.activeMaterialKey !== 'blanco' && this.activeMaterialKey !== 'grafito') {
                ctx.strokeStyle = `rgba(${Math.max(0, r - 35)}, ${Math.max(0, g - 35)}, ${Math.max(0, b - 35)}, 0.16)`;
                ctx.lineWidth = 2;
                for (let i = 0; i < 90; i++) {
                    const y = Math.random() * 512;
                    ctx.beginPath();
                    ctx.moveTo(0, y);
                    ctx.bezierCurveTo(170, y + (Math.random() - 0.5) * 18, 340, y + (Math.random() - 0.5) * 18, 512, y);
                    ctx.stroke();
                }
            }

            const texture = new THREE.CanvasTexture(canvas);
            texture.wrapS = THREE.RepeatWrapping;
            texture.wrapT = THREE.RepeatWrapping;
            return texture;
        }

        /**
         * Classifies a piece from the cutlist into a 3D structural role based on its description & dimensions.
         */
        classifyPieceRole(piece) {
            const desc = (piece.name || piece.description || '').toLowerCase();
            if (desc.includes('lateral') || desc.includes('costado') || desc.includes('parante')) {
                if (desc.includes('izq')) return 'left_side';
                if (desc.includes('der')) return 'right_side';
                return 'side';
            }
            if (desc.includes('divisi') || desc.includes('vertical') || desc.includes('tabique') || desc.includes('central')) {
                return 'divider';
            }
            if (desc.includes('piso') || desc.includes('base') || desc.includes('inferior')) {
                return 'bottom';
            }
            if (desc.includes('techo') || desc.includes('tapa') || desc.includes('cubierta') || desc.includes('superior')) {
                return 'top';
            }
            if (desc.includes('faja') || desc.includes('amarre') || desc.includes('liston') || desc.includes('listón') || desc.includes('regla')) {
                return 'stretcher';
            }
            if (desc.includes('zocalo') || desc.includes('zócalo') || desc.includes('banquina')) {
                return 'plinth';
            }
            if (desc.includes('estante') || desc.includes('repisa') || desc.includes('bandeja') || desc.includes('entrepaño')) {
                return 'shelf';
            }
            if (desc.includes('puerta') || desc.includes('hoja')) {
                if (desc.includes('izq')) return 'door_left';
                if (desc.includes('der')) return 'door_right';
                return 'door';
            }
            if (desc.includes('cajon') || desc.includes('cajón') || desc.includes('frente')) {
                return 'drawer_front';
            }
            if (desc.includes('fondo') || desc.includes('trasera') || desc.includes('espalda')) {
                return 'back';
            }
            return 'generic';
        }

        /**
         * Builds the 3D exploded/assembled model directly from the user's cutlist table
         * (fields: item, name/description, width, length, quantity, grain)
         */
        buildFromCutlist(partsList, thicknessOrOpts = 18, materialName = 'ROBLE PROVENZAL 18') {
            if (!this.furnitureGroup) return;
            let thickness = 18;
            let matStr = materialName;
            let defaultHex = null;
            if (thicknessOrOpts && typeof thicknessOrOpts === 'object') {
                thickness = Number(thicknessOrOpts.thickness) || 18;
                matStr = thicknessOrOpts.finish || thicknessOrOpts.materialName || materialName;
                defaultHex = thicknessOrOpts.hexColor || null;
            } else {
                thickness = Number(thicknessOrOpts) || 18;
            }
            this.setMaterialTheme(matStr);

            // Clear existing 3D meshes
            while (this.furnitureGroup.children.length > 0) {
                const child = this.furnitureGroup.children[0];
                this.furnitureGroup.remove(child);
            }
            this.partMeshes = [];
            this.labelSprites = [];
            this.selectedMesh = null;

            // Expand individual units up to a safe cap for 3D assembly
            const expanded = [];
            (partsList || []).forEach((p, idx) => {
                const qty = Math.min(parseInt(p.quantity, 10) || 1, 16);
                const role = this.classifyPieceRole(p);
                for (let q = 0; q < qty; q++) {
                    expanded.push({
                        itemCode: p.item || `${idx + 1}`,
                        name: p.name || `Pieza ${idx + 1}`,
                        width: parseFloat(p.width) || 400,
                        length: parseFloat(p.length) || 600,
                        grain: p.grain || 'none',
                        hexColor: p.hexColor || defaultHex,
                        role: role,
                        unitIndex: q,
                        totalUnits: qty
                    });
                }
            });

            if (expanded.length === 0) {
                this.updateOverlayInfo(null);
                return;
            }

            // Determine overall cabinet envelope from structural parts
            const sides = expanded.filter(p => ['left_side', 'right_side', 'side'].includes(p.role));
            const horizontals = expanded.filter(p => ['bottom', 'top', 'shelf', 'stretcher', 'plinth'].includes(p.role));

            let cabinetHeight = 750;
            let cabinetDepth = 560;
            let cabinetWidth = 900;

            if (sides.length > 0) {
                cabinetHeight = Math.max(...sides.map(s => Math.max(s.length, s.width)));
                cabinetDepth = Math.max(...sides.map(s => Math.min(s.length, s.width)));
            }
            if (horizontals.length > 0) {
                const maxHoriz = Math.max(...horizontals.map(h => Math.max(h.length, h.width)));
                cabinetWidth = maxHoriz + thickness * 2;
            } else {
                cabinetWidth = Math.max(600, Math.min(1800, cabinetHeight * 0.9));
            }

            const T = Number(thickness) || 18;
            const halfW = cabinetWidth / 2;
            const halfD = cabinetDepth / 2;

            // Role counters for smart positioning
            let sideCount = 0;
            let shelfCount = 0;
            let dividerCount = 0;
            let stretcherCount = 0;
            let doorCount = 0;
            let drawerCount = 0;
            let genericCount = 0;

            const totalShelves = expanded.filter(p => p.role === 'shelf').length;
            const totalDividers = expanded.filter(p => p.role === 'divider').length;
            const totalDrawers = expanded.filter(p => p.role === 'drawer_front').length;
            const totalDoors = expanded.filter(p => ['door', 'door_left', 'door_right'].includes(p.role)).length;

            expanded.forEach((p, idx) => {
                const dimMax = Math.max(p.length, p.width);
                const dimMin = Math.min(p.length, p.width);

                let boxW = dimMax, boxH = T, boxD = dimMin;
                let posX = 0, posY = T / 2, posZ = 0;
                let expVec = new THREE.Vector3(0, 0, 0);
                let colorAccent = null;

                switch (p.role) {
                    case 'left_side':
                    case 'right_side':
                    case 'side': {
                        const isLeft = p.role === 'left_side' || (p.role === 'side' && sideCount % 2 === 0);
                        boxW = T;
                        boxH = dimMax;
                        boxD = dimMin;
                        const offsetExtra = Math.floor(sideCount / 2) * (T + 45);
                        posX = isLeft ? (-halfW + T / 2 - offsetExtra) : (halfW - T / 2 + offsetExtra);
                        posY = boxH / 2;
                        posZ = 0;
                        expVec.set(isLeft ? -320 - offsetExtra : 320 + offsetExtra, 0, 0);
                        sideCount++;
                        break;
                    }
                    case 'divider': {
                        boxW = T;
                        boxH = dimMax;
                        boxD = dimMin;
                        const span = cabinetWidth - 2 * T;
                        posX = -span / 2 + ((dividerCount + 1) / (totalDividers + 1)) * span;
                        posY = boxH / 2 + T;
                        posZ = 0;
                        expVec.set(0, 220, -180);
                        dividerCount++;
                        break;
                    }
                    case 'bottom': {
                        boxW = dimMax;
                        boxH = T;
                        boxD = dimMin;
                        posX = 0;
                        posY = T / 2 + 80; // Above plinth
                        posZ = 0;
                        expVec.set(0, -240, 0);
                        break;
                    }
                    case 'top': {
                        boxW = dimMax;
                        boxH = T;
                        boxD = dimMin;
                        posX = 0;
                        posY = cabinetHeight - T / 2;
                        posZ = 0;
                        expVec.set(0, 320, 0);
                        break;
                    }
                    case 'stretcher': {
                        boxW = dimMax;
                        boxH = T;
                        boxD = dimMin;
                        posX = 0;
                        posY = cabinetHeight - T / 2;
                        posZ = (stretcherCount % 2 === 0) ? (halfD - boxD / 2 - 10) : (-halfD + boxD / 2 + 10);
                        expVec.set(0, 340, (stretcherCount % 2 === 0) ? 160 : -160);
                        stretcherCount++;
                        break;
                    }
                    case 'plinth': {
                        boxW = dimMax;
                        boxH = dimMin;
                        boxD = T;
                        posX = 0;
                        posY = boxH / 2;
                        posZ = halfD - 35;
                        expVec.set(0, -280, 260);
                        break;
                    }
                    case 'shelf': {
                        boxW = dimMax;
                        boxH = T;
                        boxD = dimMin;
                        posX = 0;
                        const usableH = Math.max(300, cabinetHeight - 160);
                        posY = 120 + ((shelfCount + 1) / (totalShelves + 1)) * usableH;
                        posZ = 0;
                        expVec.set(0, 80 * (shelfCount - totalShelves / 2), 260);
                        shelfCount++;
                        break;
                    }
                    case 'door_left':
                    case 'door_right':
                    case 'door': {
                        boxW = p.width < p.length ? p.width : p.length;
                        boxH = Math.max(p.length, p.width);
                        boxD = T;
                        const isLeftDoor = p.role === 'door_left' || (p.role === 'door' && doorCount % 2 === 0);
                        if (totalDoors === 1) {
                            posX = 0;
                        } else {
                            posX = isLeftDoor ? (-boxW / 2 - 2) : (boxW / 2 + 2);
                        }
                        posY = boxH / 2 + 80;
                        posZ = halfD + T / 2 + 4;
                        if (this.doorsOpen) {
                            posZ += 140;
                            posX += isLeftDoor ? -120 : 120;
                        }
                        expVec.set(isLeftDoor ? -160 : 160, 0, 440);
                        colorAccent = 0x38bdf8;
                        doorCount++;
                        break;
                    }
                    case 'drawer_front': {
                        boxW = Math.max(p.length, p.width);
                        boxH = Math.min(p.length, p.width);
                        boxD = T;
                        posX = 0;
                        const topStart = cabinetHeight - boxH / 2 - 20;
                        posY = topStart - drawerCount * (boxH + 6);
                        posZ = halfD + T / 2 + 4 + (this.doorsOpen ? 180 : 0);
                        expVec.set(0, 60 * (totalDrawers - drawerCount), 480);
                        colorAccent = 0x34d399;
                        drawerCount++;
                        break;
                    }
                    case 'back': {
                        boxW = dimMax;
                        boxH = dimMin;
                        boxD = Math.min(T, 6);
                        posX = 0;
                        posY = cabinetHeight / 2;
                        posZ = -halfD - boxD / 2;
                        expVec.set(0, 0, -400);
                        break;
                    }
                    default: {
                        // Arrange generic panels neatly on a virtual rack/stack beside or inside the assembly
                        const isVerticalPanel = dimMax >= 900 && dimMin >= 350;
                        if (isVerticalPanel) {
                            boxW = T;
                            boxH = dimMax;
                            boxD = dimMin;
                            posX = -halfW + (genericCount * 85) % cabinetWidth;
                            posY = boxH / 2;
                            posZ = 0;
                            expVec.set((genericCount - 2) * 140, 120, 180);
                        } else {
                            boxW = dimMax;
                            boxH = T;
                            boxD = dimMin;
                            posX = 0;
                            posY = 140 + genericCount * (T + 95);
                            posZ = 0;
                            expVec.set(0, genericCount * 70, 280);
                        }
                        genericCount++;
                        break;
                    }
                }

                this.addPanelMesh({
                    itemCode: p.itemCode,
                    name: p.name,
                    role: p.role,
                    realLength: p.length,
                    realWidth: p.width,
                    thickness: T,
                    grain: p.grain,
                    hexColor: p.hexColor,
                    boxW,
                    boxH,
                    boxD,
                    basePos: new THREE.Vector3(posX, posY, posZ),
                    explodeVec: expVec,
                    colorAccent
                });
            });

            this.applyExplodeFactor(this.explodeFactor);
            this.fitCameraToAssembly();
        }

        /**
         * Generates a complete parametric cabinet (Kitchen Base, Wardrobe, Bookcase, Office Desk)
         * and returns the exact cutlist array ready to import into the table & Selco optimizer!
         */
        generateParametricCabinet(config = {}) {
            const type = config.type || 'bajo_mesada';
            const totalW = Number(config.width) || 900;
            const totalH = Number(config.height) || 720;
            const totalD = Number(config.depth) || 580;
            const T = Number(config.thickness) || 18;
            const shelvesCount = Number(config.shelves ?? 1);
            const doorsCount = Number(config.doors ?? 2);
            const drawersCount = Number(config.drawers ?? 0);
            const plinthH = type === 'alacena' ? 0 : (Number(config.plinth ?? 80));

            const internalW = totalW - 2 * T;
            const bodyH = totalH - plinthH;

            const generatedParts = [];
            let itemIdx = 1;

            const pushPart = (desc, w, l, qty, grain) => {
                generatedParts.push({
                    item: `M${String(itemIdx++).padStart(2, '0')}`,
                    name: desc,
                    width: Math.round(w),
                    length: Math.round(l),
                    quantity: qty,
                    grain: grain,
                    canRotate: grain === 'none'
                });
            };

            // 1. Laterales Izquierdo y Derecho
            pushPart('Lateral Izquierdo', totalD, totalH, 1, 'longitudinal');
            pushPart('Lateral Derecho', totalD, totalH, 1, 'longitudinal');

            // 2. Piso Inferior
            pushPart('Piso Inferior', totalD, internalW, 1, 'none');

            // 3. Techo o Fajas Superiores
            if (type === 'bajo_mesada') {
                pushPart('Faja Superior Frontal', 100, internalW, 1, 'none');
                pushPart('Faja Superior Trasera', 100, internalW, 1, 'none');
            } else {
                pushPart('Techo Superior', totalD, internalW, 1, 'none');
            }

            // 4. Zócalo Frontal
            if (plinthH > 0) {
                pushPart('Zócalo Frontal', plinthH, internalW, 1, 'longitudinal');
            }

            // 5. División Central (si es ropero ancho > 1100mm)
            if (type === 'placard' && totalW >= 1100) {
                pushPart('División Central Vertical', totalD - 20, bodyH - 2 * T, 1, 'longitudinal');
            }

            // 6. Estantes Interiores
            if (shelvesCount > 0) {
                const shelfW = (type === 'placard' && totalW >= 1100) ? (internalW - T) / 2 : internalW;
                const totalShelfUnits = (type === 'placard' && totalW >= 1100) ? shelvesCount * 2 : shelvesCount;
                pushPart('Estante Móvil Interior', totalD - 25, shelfW - 2, totalShelfUnits, 'none');
            }

            // 7. Frentes de Cajón
            let remainingFrontH = bodyH - 6;
            if (drawersCount > 0) {
                const drawerH = Math.min(200, Math.floor((bodyH * 0.45) / drawersCount));
                pushPart('Frente de Cajón', drawerH - 4, totalW - 6, drawersCount, 'longitudinal');
                remainingFrontH -= drawersCount * drawerH;
            }

            // 8. Puertas Frontales
            if (doorsCount > 0 && remainingFrontH > 120) {
                const doorW = Math.floor((totalW - 4 - (doorsCount - 1) * 4) / doorsCount);
                const doorH = remainingFrontH;
                if (doorsCount === 2) {
                    pushPart('Puerta Izquierda', doorW, doorH, 1, 'longitudinal');
                    pushPart('Puerta Derecha', doorW, doorH, 1, 'longitudinal');
                } else {
                    pushPart('Puerta Frontal', doorW, doorH, doorsCount, 'longitudinal');
                }
            }

            return generatedParts;
        }

        addPanelMesh(panelData) {
            const preset = this.materialPresets[this.activeMaterialKey] || this.materialPresets.roble;
            const hasGrain = panelData.grain !== 'none';
            const targetColor = panelData.hexColor || preset.color;
            const woodTex = this.createWoodTexture(targetColor, hasGrain);

            const geometry = new THREE.BoxGeometry(panelData.boxW, panelData.boxH, panelData.boxD);
            const material = new THREE.MeshStandardMaterial({
                map: woodTex,
                roughness: preset.roughness,
                metalness: preset.metalness,
                wireframe: this.showWireframe
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            mesh.position.copy(panelData.basePos);

            // Crisp technical CAD edge lines
            const edgesGeo = new THREE.EdgesGeometry(geometry);
            const edgeLineMat = new THREE.LineBasicMaterial({
                color: panelData.colorAccent || 0x38bdf8,
                linewidth: 1.5,
                transparent: true,
                opacity: 0.75
            });
            const wireframeEdges = new THREE.LineSegments(edgesGeo, edgeLineMat);
            mesh.add(wireframeEdges);

            // Attach metadata for inspection and explosion
            mesh.userData = {
                itemCode: panelData.itemCode,
                name: panelData.name,
                role: panelData.role,
                realWidth: panelData.realWidth,
                realLength: panelData.realLength,
                thickness: panelData.thickness,
                grain: panelData.grain,
                basePos: panelData.basePos.clone(),
                explodeVec: panelData.explodeVec.clone(),
                edgeLineMat: edgeLineMat
            };

            // Create floating 3D callout badge sprite
            const sprite = this.createCalloutSprite(
                `[${panelData.itemCode}] ${panelData.name}`,
                `${Math.round(panelData.realWidth)} × ${Math.round(panelData.realLength)} mm`
            );
            sprite.position.set(0, 0, 0);
            sprite.visible = this.showLabels3D;
            mesh.add(sprite);
            this.labelSprites.push(sprite);

            this.furnitureGroup.add(mesh);
            this.partMeshes.push(mesh);
        }

        createCalloutSprite(titleText, dimText) {
            const canvas = document.createElement('canvas');
            canvas.width = 320;
            canvas.height = 88;
            const ctx = canvas.getContext('2d');

            // Rounded pill background
            ctx.fillStyle = 'rgba(15, 23, 42, 0.88)';
            ctx.strokeStyle = '#38bdf8';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.roundRect(6, 6, 308, 76, 12);
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#f8fafc';
            ctx.font = 'bold 21px Inter, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(titleText.substring(0, 24), 160, 36);

            ctx.fillStyle = '#38bdf8';
            ctx.font = '600 18px monospace';
            ctx.fillText(dimText, 160, 64);

            const texture = new THREE.CanvasTexture(canvas);
            const spriteMat = new THREE.SpriteMaterial({ map: texture, depthTest: false, transparent: true });
            const sprite = new THREE.Sprite(spriteMat);
            sprite.scale.set(220, 60, 1);
            sprite.renderOrder = 999;
            return sprite;
        }

        applyExplodeFactor(factor) {
            this.explodeFactor = Math.max(0, Math.min(1, parseFloat(factor) || 0));
            this.partMeshes.forEach(mesh => {
                const base = mesh.userData.basePos;
                const exp = mesh.userData.explodeVec;
                mesh.position.set(
                    base.x + exp.x * this.explodeFactor,
                    base.y + exp.y * this.explodeFactor,
                    base.z + exp.z * this.explodeFactor
                );
            });
        }

        toggleLabels(visible) {
            this.showLabels3D = Boolean(visible);
            this.labelSprites.forEach(s => { s.visible = this.showLabels3D; });
        }

        toggleWireframe(enabled) {
            this.showWireframe = Boolean(enabled);
            this.partMeshes.forEach(m => {
                if (m.material) m.material.wireframe = this.showWireframe;
            });
        }

        fitCameraToAssembly() {
            if (!this.camera || !this.controls || this.partMeshes.length === 0) return;

            const box = new THREE.Box3().setFromObject(this.furnitureGroup);
            const center = box.getCenter(new THREE.Vector3());
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z, 600);

            this.controls.target.copy(center);
            this.camera.position.set(
                center.x + maxDim * 1.35,
                center.y + maxDim * 0.95,
                center.z + maxDim * 1.55
            );
            this.controls.update();
        }

        // Method aliases for compatibility
        onResize() { this.resize(); }
        setExplodeFactor(factor) { this.applyExplodeFactor(factor); }
        setShowLabels(visible) { this.toggleLabels(visible); }
        setWireframe(enabled) { this.toggleWireframe(enabled); }
        fitCameraToCabinet() { this.fitCameraToAssembly(); }

        onCanvasClick(event) {
            if (!this.renderer || !this.camera || this.partMeshes.length === 0) return;

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObjects(this.partMeshes, false);

            // Reset previous highlight
            if (this.selectedMesh && this.selectedMesh.userData.edgeLineMat) {
                this.selectedMesh.userData.edgeLineMat.color.setHex(0x38bdf8);
                this.selectedMesh.material.emissive.setHex(0x000000);
            }

            if (intersects.length > 0) {
                const hit = intersects[0].object;
                this.selectedMesh = hit;
                if (hit.userData.edgeLineMat) {
                    hit.userData.edgeLineMat.color.setHex(0xf59e0b);
                }
                hit.material.emissive.setHex(0x1e3a8a);
                this.updateOverlayInfo(hit.userData);
            } else {
                this.selectedMesh = null;
                this.updateOverlayInfo(null);
            }
        }

        updateOverlayInfo(data) {
            if (!this.infoOverlay) return;
            if (!data) {
                this.infoOverlay.innerHTML = `
                    <div style="font-size:0.78rem; color:#94a3b8;">
                        💡 <strong>Interactivo:</strong> Arrastra para rotar 360°, usa la rueda para zoom, mueve el deslizador de <strong>Vista Explosionada</strong> o haz clic en cualquier pieza del mueble para inspeccionar su despiece.
                    </div>
                `;
                return;
            }

            const grainBadge = data.grain === 'none'
                ? '<span style="color:#34d399;">🔄 Sin Veta (Gira)</span>'
                : (data.grain === 'longitudinal' ? '<span style="color:#fbbf24;">↔ Veta al Largo</span>' : '<span style="color:#fbbf24;">↕ Veta al Ancho</span>');

            this.infoOverlay.innerHTML = `
                <div style="display:flex; align-items:center; justify-content:space-between; gap:1rem; flex-wrap:wrap;">
                    <div>
                        <span style="background:#0284c7; color:#fff; font-weight:700; padding:2px 8px; border-radius:4px; font-size:0.75rem; font-family:monospace;">ÍTEM: ${data.itemCode}</span>
                        <strong style="color:#f8fafc; font-size:0.92rem; margin-left:6px;">${data.name}</strong>
                    </div>
                    <div style="display:flex; gap:1.2rem; font-size:0.8rem; color:#cbd5e1; font-family:monospace;">
                        <span><strong>Ancho:</strong> ${Math.round(data.realWidth)} mm</span>
                        <span><strong>Largo:</strong> ${Math.round(data.realLength)} mm</span>
                        <span><strong>Espesor:</strong> ${data.thickness} mm</span>
                        <span>${grainBadge}</span>
                    </div>
                </div>
            `;
        }
    }

    Furniture3DStudio.generateParametricCabinet = Furniture3DStudio.prototype.generateParametricCabinet;
    window.Furniture3DStudio = Furniture3DStudio;
})(window);
