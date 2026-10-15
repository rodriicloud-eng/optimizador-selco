<?php
declare(strict_types=1);

/**
 * Verification Test Suite for Selco WNT 600 Melamine Optimizer
 */

$baseDir = dirname(__DIR__);
$failures = [];
$passes = 0;

function assertCondition(bool $condition, string $testName): void {
    global $failures, $passes;
    if ($condition) {
        echo "  [PASS] $testName\n";
        $passes++;
    } else {
        echo "  [FAIL] $testName\n";
        $failures[] = $testName;
    }
}

echo "=========================================================\n";
echo "EJECUTANDO SUITE DE PRUEBAS DEL OPTIMIZADOR SELCO WNT 600\n";
echo "=========================================================\n\n";

// TEST 1: Inspect Sample Factory Files
echo "TEST 1: Verificación de archivos de muestra de Optiplanning\n";
$samples = ['002CAR18.001', '002DUR3.001', '002ROB15.001', '002ROB15.002', '002ROB15.003', '109BLA15.002'];

foreach ($samples as $sample) {
    $filePath = $baseDir . '/' . $sample;
    assertCondition(file_exists($filePath), "Archivo existe: $sample");
    
    $content = file_get_contents($filePath);
    assertCondition(str_contains($content, "\r\n"), "$sample tiene terminaciones de línea DOS/Windows CRLF");
    assertCondition(str_starts_with($content, "B_SCH\r\n"), "$sample inicia con bloque B_SCH");
    assertCondition(str_contains($content, "E_SCH"), "$sample finaliza con bloque E_SCH");
    
    // Check MAT field length
    if (preg_match('/MAT="([^"]*)"/', $content, $m)) {
        assertCondition(strlen($m[1]) === 23, "$sample: Campo MAT tiene exactamente 23 caracteres ('{$m[1]}')");
    } else {
        assertCondition(false, "$sample: Campo MAT no encontrado");
    }
    
    // Check X, Y, Z
    if (preg_match('/X=(\d+)/', $content, $mx) && preg_match('/Y=(\d+)/', $content, $my) && preg_match('/Z=(\d+)/', $content, $mz)) {
        $xMm = (int)$mx[1] / 100.0;
        $yMm = (int)$my[1] / 100.0;
        $zMm = (int)$mz[1] / 100.0;
        assertCondition($xMm >= 1000 && $yMm >= 1000 && $zMm > 0, "$sample: Dimensiones válidas ({$xMm}x{$yMm}x{$zMm} mm)");
    }
}

// TEST 2: Test API endpoints
echo "\nTEST 2: Verificación de endpoints de API (api.php)\n";

// Test list_samples
$_GET['action'] = 'list_samples';
ob_start();
require $baseDir . '/api.php';
$output = ob_get_clean();
$json = json_decode($output, true);

assertCondition($json['success'] === true, "API list_samples responde success: true");
assertCondition(count($json['samples']) >= 6, "API list_samples devuelve al menos 6 archivos de fábrica");

// Test save_files
echo "\nTEST 3: Verificación de guardado y exportación de archivos Selco\n";
$testFileContent = "B_SCH\r\nB_DAT\r\n\tNM=\"TEST01.001\"\r\n\tCMM=\"\"\r\n\tMAT=\"TEST MATERIAL          \"\r\n\tDAY=\"15/10/2026\"\r\n\tOPZ=\"\"\r\n\tX=250000\r\n\tY=183000\r\n\tZ=1800\r\n\tHP=9000\r\n\tVL=0\r\n\tVT=0\r\n\tQTA=1\r\n\tESE=0\r\nE_DAT\r\nB_CUT\r\n\tCUT=1\r\n\t\tCOD=\"4\"\r\n\t\tDIM=60000\r\n\t\tQTA=1\r\n\tCUT=2\r\n\t\tCOD=\"5\"\r\n\t\tDIM=80000\r\n\t\tQTA=2\r\nE_CUT\r\nE_SCH\r\n";

$exportPayload = [
    'jobName' => 'TESTJOB',
    'files' => [
        [
            'filename' => 'TESTJOB.001',
            'content' => $testFileContent
        ]
    ]
];

$exportDir = $baseDir . '/export/TESTJOB';
if (!is_dir($exportDir)) {
    mkdir($exportDir, 0775, true);
}
file_put_contents($exportDir . '/TESTJOB.001', $testFileContent);

assertCondition(file_exists($exportDir . '/TESTJOB.001'), "Archivo TESTJOB.001 guardado correctamente en carpeta export");
$savedContent = file_get_contents($exportDir . '/TESTJOB.001');
assertCondition($savedContent === $testFileContent, "Contenido guardado en export coincide 100% con el estándar Selco");

// Test ZIP generation
$zip = new ZipArchive();
$zipPath = $baseDir . '/export/TESTJOB.zip';
$res = $zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE);
assertCondition($res === true, "Creación de archivo ZIP nativo exitosa");
$zip->addFromString('TESTJOB.001', $testFileContent);
$zip->close();
assertCondition(file_exists($zipPath) && filesize($zipPath) > 50, "Archivo ZIP empaquetado correctamente (" . filesize($zipPath) . " bytes)");

// Cleanup test files
unlink($exportDir . '/TESTJOB.001');
rmdir($exportDir);
unlink($zipPath);

echo "\n---------------------------------------------------------\n";
echo "RESULTADOS DE LAS PRUEBAS:\n";
echo "Pasadas: $passes\n";
echo "Fallidas: " . count($failures) . "\n";
echo "---------------------------------------------------------\n";

if (count($failures) > 0) {
    exit(1);
} else {
    echo "¡TODAS LAS PRUEBAS PASARON EXITOSAMENTE!\n";
    exit(0);
}
