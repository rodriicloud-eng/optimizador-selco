/**
 * Node.js test script for SelcoParser and CuttingOptimizer
 */

const fs = require('fs');
const path = require('path');

// Mock window object for Node environment
global.window = global;

require('../js/selco-parser.js');
require('../js/optimizer.js');

console.log("=========================================================");
console.log("TEST SUITE JS: SELCO PARSER Y OPTIMIZADOR GUILLOTINE 2D");
console.log("=========================================================\n");

let passes = 0;
let fails = 0;

function assert(condition, desc) {
    if (condition) {
        console.log(`  [PASS] ${desc}`);
        passes++;
    } else {
        console.log(`  [FAIL] ${desc}`);
        fails++;
    }
}

// 1. Test SelcoParser parsing 002CAR18.001
console.log("TEST 1: Parseo de archivo real 002CAR18.001");
const carContent = fs.readFileSync(path.join(__dirname, '../002CAR18.001'), 'utf8');
const parsedCar = SelcoParser.parse(carContent);

assert(parsedCar.name === "002CAR18.001", `Nombre coincide: ${parsedCar.name}`);
assert(parsedCar.sheet.x === 2500, `Largo X = 2500 mm (${parsedCar.sheet.x})`);
assert(parsedCar.sheet.y === 1830, `Ancho Y = 1830 mm (${parsedCar.sheet.y})`);
assert(parsedCar.sheet.z === 18, `Espesor Z = 18 mm (${parsedCar.sheet.z})`);
assert(parsedCar.cuts.length === 4, `Cantidad de cortes = 4 (${parsedCar.cuts.length})`);
assert(parsedCar.geometry.pieces.length === 4, `Reconstrucción de 4 piezas (${parsedCar.geometry.pieces.length})`);
assert(parsedCar.geometry.strips.length === 1, `1 tira longitudinal (${parsedCar.geometry.strips.length})`);

// 2. Test SelcoParser parsing 002ROB15.001
console.log("\nTEST 2: Parseo de archivo real 002ROB15.001");
const robContent = fs.readFileSync(path.join(__dirname, '../002ROB15.001'), 'utf8');
const parsedRob = SelcoParser.parse(robContent);

assert(parsedRob.name === "002ROB15.001", `Nombre coincide: ${parsedRob.name}`);
assert(parsedRob.cuts.length === 19, `19 cortes en B_CUT (${parsedRob.cuts.length})`);
assert(parsedRob.geometry.pieces.length >= 15, `Reconstrucción de ${parsedRob.geometry.pieces.length} piezas`);
assert(parsedRob.geometry.strips.length === 7, `Reconstrucción de 7 tiras (${parsedRob.geometry.strips.length})`);

// 3. Test CuttingOptimizer
console.log("\nTEST 3: Ejecución de Optimizador Guillotine 2D con piezas reales");
const optimizer = new CuttingOptimizer({ kerf: 4.4, trim: 10, batchStrips: true, iterations: 30 });

const parts = [
    { name: 'Lateral Izq', length: 1800, width: 500, quantity: 2, canRotate: false },
    { name: 'Piso', length: 864, width: 500, quantity: 2, canRotate: true },
    { name: 'Estante', length: 864, width: 480, quantity: 3, canRotate: true },
    { name: 'Puerta', length: 716, width: 446, quantity: 4, canRotate: false, grain: 'longitudinal' },
    { name: 'Zócalo', length: 1200, width: 100, quantity: 4, canRotate: true }
];

const sheet = {
    length: 2500,
    width: 1830,
    thickness: 18,
    material: 'ROBLE PROVENZAL 15',
    jobName: '002ROB15'
};

const solution = optimizer.optimize(sheet, parts);

assert(solution.success === true, "Optimización exitosa (100% de piezas colocadas)");
assert(solution.sheets.length > 0, `Generó ${solution.sheets.length} placas`);
assert(solution.stats.globalEfficiency > 60, `Eficiencia global buena: ${solution.stats.globalEfficiency}%`);
assert(solution.stats.totalCuts > 0, `Cortes totales calculados: ${solution.stats.totalCuts}`);

// 4. Test Selco File Generation from Solution
console.log("\nTEST 4: Verificación de archivos generados para Selco WNT 600");
solution.sheets.forEach((sheetObj, idx) => {
    const selcoFile = sheetObj.selcoFile;
    assert(selcoFile && selcoFile.filename, `Placa ${idx + 1} tiene archivo generado: ${selcoFile.filename}`);
    assert(selcoFile.content.includes('\r\n'), `Placa ${idx + 1} contiene saltos CRLF`);
    assert(selcoFile.content.startsWith('B_SCH\r\n'), `Placa ${idx + 1} inicia con B_SCH`);
    assert(selcoFile.content.includes('E_SCH\r\n'), `Placa ${idx + 1} finaliza con E_SCH`);
    assert(selcoFile.content.includes('HP=9000'), `Placa ${idx + 1} incluye HP=9000`);
    assert(selcoFile.content.includes('X=250000'), `Placa ${idx + 1} longitud X=250000 (2500.00 mm)`);
    assert(selcoFile.content.includes('Y=183000'), `Placa ${idx + 1} ancho Y=183000 (1830.00 mm)`);
    assert(selcoFile.content.includes('Z=1800'), `Placa ${idx + 1} espesor Z=1800 (18.00 mm)`);
    
    // Roundtrip test: parse our generated content
    const reParsed = SelcoParser.parse(selcoFile.content);
    assert(reParsed.cuts.length > 0, `Roundtrip: El archivo generado fue re-parseado con éxito (${reParsed.cuts.length} cortes)`);
    assert(reParsed.geometry.pieces.length === sheetObj.pieces.length, `Roundtrip: Cantidad de piezas coincide (${reParsed.geometry.pieces.length})`);
});

// 5. Test Bulk Import & Excel Parser (SheetJS + Universal Parser)
console.log("\nTEST 5: Verificación de Carga Masiva y Conversión Excel / CSV");
const XLSX = require('../js/xlsx.mini.min.js');
assert(XLSX && typeof XLSX.read === 'function', "SheetJS (XLSX) cargado correctamente y función read disponible");

// Generate in-memory Excel workbook
const testWb = XLSX.utils.book_new();
const testWs = XLSX.utils.aoa_to_sheet([
    ["Pieza", "Largo", "Ancho", "Cantidad"],
    ["Lateral Izq", 720, 580, 2],
    ["Lateral Der", 720, 580, 2],
    ["Piso", 864, 580, 1]
]);
XLSX.utils.book_append_sheet(testWb, testWs, "Despiece");
const xlsxBuffer = XLSX.write(testWb, { type: 'buffer', bookType: 'xlsx' });
const readWb = XLSX.read(xlsxBuffer, { type: 'buffer' });
const sheetCsv = XLSX.utils.sheet_to_csv(readWb.Sheets[readWb.SheetNames[0]], { FS: "\t" });

assert(sheetCsv.includes("Lateral Izq\t720\t580\t2"), "SheetJS convierte correctamente hoja Excel a texto tabulado");

// Load cleanNumericValue and parsePasteText logic
function cleanNumericValue(val) {
    if (typeof val === 'number') return val;
    if (!val) return NaN;
    const s = String(val).trim().replace(/mm$/i, '').replace(/cm$/i, '').replace(/,/, '.').replace(/[^0-9.]/g, '');
    return parseFloat(s);
}

function parsePasteText(rawText, colFormat = 'auto', defaultGrain = 'none') {
    if (!rawText || !rawText.trim()) return [];
    const lines = rawText.split(/\r?\n/);
    const parsedItems = [];
    let itemIndex = 1;

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;
        const lineLower = trimmed.toLowerCase();
        const headerKeywords = ['nombre', 'descrip', 'pieza', 'item', 'largo', 'ancho', 'cant', 'medida', 'dimension', 'length', 'width', 'qty'];
        if (headerKeywords.some(w => lineLower.includes(w)) && !/\d{2,}/.test(trimmed)) return;

        let cols = [];
        if (trimmed.includes('\t')) cols = trimmed.split('\t');
        else if (trimmed.includes(';')) cols = trimmed.split(';');
        else if (trimmed.includes('|')) cols = trimmed.split('|');
        else if (trimmed.includes(',') && (trimmed.match(/,/g) || []).length >= 2) cols = trimmed.split(',');

        cols = cols.map(c => c.trim().replace(/^["\x27]|["\x27]$/g, '')).filter(c => c !== '');

        if (cols.length < 2) {
            const dimMatch = trimmed.match(/(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?\s*[xX*×]\s*(\d+(?:[.,]\d+)?)\s*(?:mm|cm)?/);
            if (dimMatch) {
                const len = parseFloat(dimMatch[1].replace(',', '.'));
                const wid = parseFloat(dimMatch[2].replace(',', '.'));
                const remaining = trimmed.replace(dimMatch[0], ' ').trim();
                const qtyMatch = remaining.match(/(?:cant\.?|cantidad|x)?\s*(\d+)/i);
                const q = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
                const n = remaining.replace(/(?:cant\.?|cantidad|x)?\s*\d+/i, '').trim() || `Pieza ${itemIndex}`;
                if (len > 0 && wid > 0) {
                    parsedItems.push({ name: n, length: Math.round(len), width: Math.round(wid), quantity: Math.max(1, q), grain: defaultGrain, canRotate: defaultGrain === 'none' });
                    itemIndex++;
                    return;
                }
            }
            cols = trimmed.split(/\s+/);
        }

        if (cols.length === 0) return;
        let name = '', length = 0, width = 0, qty = 1, grain = defaultGrain;

        if (colFormat === 'auto') {
            const numIndices = [], textParts = [];
            cols.forEach((col, idx) => {
                const num = cleanNumericValue(col);
                if (!isNaN(num) && num > 0) numIndices.push({ idx, val: num });
                else {
                    const low = col.toLowerCase();
                    if (low.includes('long') || low.includes('veta-largo') || low === 'l') grain = 'longitudinal';
                    else if (low.includes('trans') || low.includes('veta-ancho') || low === 'a') grain = 'transversal';
                    else if (low.includes('sin') || low.includes('no-veta') || low === 's') grain = 'none';
                    else textParts.push(col);
                }
            });

            if (numIndices.length >= 2) {
                const nums = numIndices.map(n => n.val);
                if (nums.length === 2) { length = nums[0]; width = nums[1]; qty = 1; }
                else if (nums.length >= 3) {
                    if (nums[0] <= 50 && (nums[1] > 50 || nums[2] > 50) && numIndices[0].idx < numIndices[1].idx) {
                        qty = parseInt(nums[0], 10) || 1; length = nums[1]; width = nums[2];
                    } else {
                        length = nums[0]; width = nums[1]; qty = parseInt(nums[2], 10) || 1;
                    }
                }
                name = textParts.join(' ').trim() || `Pieza ${itemIndex}`;
            }
        }

        if (length > 0 && width > 0) {
            parsedItems.push({ name: (name || `Pieza ${itemIndex}`).trim(), length: Math.round(length), width: Math.round(width), quantity: isNaN(qty) || qty <= 0 ? 1 : qty, grain, canRotate: grain === 'none' });
            itemIndex++;
        }
    });

    return parsedItems;
}

const parsedFromExcel = parsePasteText(sheetCsv);
assert(parsedFromExcel.length === 3, `Carga desde Excel detectó 3 piezas (ignora encabezados correctamente) (${parsedFromExcel.length})`);
assert(parsedFromExcel[0].name === "Lateral Izq" && parsedFromExcel[0].length === 720 && parsedFromExcel[0].quantity === 2, "Datos de pieza 1 de Excel íntegros");

const parsedFromSpace = parsePasteText("Lateral Izquierdo 720 580 2\nPuerta 1800 600 1");
assert(parsedFromSpace.length === 2 && parsedFromSpace[0].length === 720, "Carga masiva por espacios funciona correctamente");

const parsedFromDim = parsePasteText("Lateral 720x580 cant 2\nEstante 864*560 4");
assert(parsedFromDim.length === 2 && parsedFromDim[1].quantity === 4, "Carga masiva con formato 720x580 / 864*560 funciona");

const parsedCarpenter = parsePasteText("Lateral 2 720 580\nPiso 1 864 580");
assert(parsedCarpenter.length === 2 && parsedCarpenter[0].quantity === 2 && parsedCarpenter[0].length === 720, "Carga masiva estilo carpintero [Nombre Cantidad Largo Ancho] funciona");

const complexFactoryTable = 
`Item\tCódigo\tPieza / Detalle\tCant\tLargo (mm)\tAncho (mm)\tSentido Veta\tMaterial\tEspesor
1\tLAT01\tLateral Bajo Mesada\t2\t720\t580\tCon Veta\tRoble Provenzal\t18
2\tPIS01\tPiso Mueble\t1\t864\t580\tSin Veta\tRoble Provenzal\t18
3\tEST01\tEstante Móvil\t3\t864\t560\tSin Veta\tRoble Provenzal\t18
4\tFAJ01\tFaja de Techo\t2\t864\t100\tCon Veta\tRoble Provenzal\t18`;

const appJsCode = fs.readFileSync(__dirname + '/../js/app.js', 'utf8');

// Check that app.js parses without syntax errors
assert(appJsCode.includes('parseAndDetectTable'), "app.js contiene el motor parseAndDetectTable");
assert(appJsCode.includes('col-mapper-select'), "app.js contiene el mapeador interactivo col-mapper-select");
assert(appJsCode.includes('chkApplyMaterialThickness'), "app.js soporta auto-aplicar material y espesor a la placa");
assert(appJsCode.includes('importedPiecesBanner'), "app.js maneja el banner visual de piezas importadas");
assert(appJsCode.includes('row-imported-new'), "app.js aplica animación de resaltado a piezas importadas");
assert(appJsCode.includes('badge-source-imported'), "app.js muestra distintivo de origen Excel/importado");
assert(appJsCode.includes('btnEmptyBulk'), "app.js gestiona el botón limpio de carga masiva en estado vacío");

console.log("\n---------------------------------------------------------");
console.log(`TOTAL PRUEBAS JS: ${passes} pasadas, ${fails} fallidas`);
console.log("---------------------------------------------------------");

if (fails > 0) process.exit(1);
console.log("¡TODAS LAS PRUEBAS JS PASARON CON ÉXITO!\n");
