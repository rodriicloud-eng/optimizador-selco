<?php
declare(strict_types=1);

/**
 * Backend API for Selco WNT 600 Melamine Optimizer
 * Handles file saving, ZIP creation, and reading sample/reference files.
 */

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$baseDir = __DIR__;
$exportDir = $baseDir . '/export';

if (!is_dir($exportDir)) {
    mkdir($exportDir, 0775, true);
}

try {
    switch ($action) {
        case 'list_samples':
            // List reference .001, .002, etc. files in the base directory
            $sampleFiles = [];
            $files = glob($baseDir . '/*.[0-9][0-9][0-9]');
            if ($files !== false) {
                foreach ($files as $file) {
                    $basename = basename($file);
                    $content = file_get_contents($file);
                    $sampleFiles[] = [
                        'filename' => $basename,
                        'size' => filesize($file),
                        'modified' => date('Y-m-d H:i:s', filemtime($file)),
                        'content' => $content,
                    ];
                }
            }
            echo json_encode(['success' => true, 'samples' => $sampleFiles], JSON_UNESCAPED_UNICODE);
            break;

        case 'read_file':
            $filename = basename((string)($_GET['filename'] ?? ''));
            $path = $baseDir . '/' . $filename;
            if (!$filename || !file_exists($path)) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Archivo no encontrado: ' . $filename]);
                exit;
            }
            $content = file_get_contents($path);
            echo json_encode([
                'success' => true,
                'filename' => $filename,
                'content' => $content,
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'save_files':
            // Save generated Selco files to the export directory
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input) || empty($input['files'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No se recibieron archivos válidos']);
                exit;
            }

            $jobName = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)($input['jobName'] ?? 'JOB'));
            $jobDir = $exportDir . '/' . $jobName;
            if (!is_dir($jobDir)) {
                mkdir($jobDir, 0775, true);
            }

            $saved = [];
            foreach ($input['files'] as $file) {
                $filename = basename((string)($file['filename'] ?? ''));
                $content = (string)($file['content'] ?? '');
                if (!$filename || $content === '') {
                    continue;
                }
                // Ensure CRLF line endings
                $crlfContent = str_replace(["\r\n", "\r", "\n"], "\r\n", $content);
                $filePath = $jobDir . '/' . $filename;
                file_put_contents($filePath, $crlfContent);
                $saved[] = [
                    'filename' => $filename,
                    'path' => $filePath,
                    'size' => strlen($crlfContent),
                ];
            }

            echo json_encode([
                'success' => true,
                'jobName' => $jobName,
                'directory' => $jobDir,
                'saved' => $saved,
                'count' => count($saved),
            ], JSON_UNESCAPED_UNICODE);
            break;

        case 'download_zip':
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input) || empty($input['files'])) {
                http_response_code(400);
                echo json_encode(['success' => false, 'error' => 'No hay archivos para empaquetar']);
                exit;
            }

            $jobName = preg_replace('/[^a-zA-Z0-9_\-]/', '', (string)($input['jobName'] ?? 'SELCO_OPTIMIZADO'));
            $zipPath = tempnam(sys_get_temp_dir(), 'selco_') . '.zip';
            $zip = new ZipArchive();
            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                http_response_code(500);
                echo json_encode(['success' => false, 'error' => 'No se pudo crear el archivo ZIP']);
                exit;
            }

            foreach ($input['files'] as $file) {
                $filename = basename((string)($file['filename'] ?? ''));
                $content = (string)($file['content'] ?? '');
                if (!$filename || $content === '') {
                    continue;
                }
                $crlfContent = str_replace(["\r\n", "\r", "\n"], "\r\n", $content);
                $zip->addFromString($filename, $crlfContent);
            }
            $zip->close();

            $zipData = file_get_contents($zipPath);
            unlink($zipPath);

            header('Content-Type: application/zip');
            header('Content-Disposition: attachment; filename="' . $jobName . '.zip"');
            header('Content-Length: ' . strlen($zipData));
            echo $zipData;
            exit;

        default:
            echo json_encode([
                'success' => true,
                'service' => 'Optimizador Selco WNT600 API',
                'status' => 'online',
                'version' => '1.0.0',
            ]);
            break;
    }
} catch (Throwable $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
    ]);
}
