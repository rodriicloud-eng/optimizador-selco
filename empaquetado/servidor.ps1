# Servidor local del Optimizador Selco. No muestra ventana.
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$port = 8085
$prefix = "http://127.0.0.1:$port/"

function Test-PortOpen {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $client.Connect("127.0.0.1", $port)
        $client.Close()
        return $true
    } catch {
        return $false
    }
}

function Open-App {
    Start-Process $prefix
}

if (Test-PortOpen) {
    Open-App
    exit 0
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add($prefix)
try {
    $listener.Start()
} catch {
    Start-Process (Join-Path $root "index.html")
    exit 0
}

Open-App

function Send-Bytes($response, $bytes, $contentType, $status) {
    $response.StatusCode = $status
    $response.ContentType = $contentType
    $response.ContentLength64 = $bytes.Length
    $response.OutputStream.Write($bytes, 0, $bytes.Length)
    $response.OutputStream.Close()
}

function Send-Text($response, $text, $contentType, $status) {
    $bytes = [System.Text.Encoding]::UTF8.GetBytes($text)
    Send-Bytes $response $bytes $contentType $status
}

function Send-Json($response, $obj, $status) {
    $json = $obj | ConvertTo-Json -Depth 6 -Compress
    Send-Text $response $json "application/json; charset=utf-8" $status
}

function Get-Mime($path) {
    switch ([IO.Path]::GetExtension($path).ToLowerInvariant()) {
        ".html" { return "text/html; charset=utf-8" }
        ".htm"  { return "text/html; charset=utf-8" }
        ".js"   { return "text/javascript; charset=utf-8" }
        ".css"  { return "text/css; charset=utf-8" }
        ".json" { return "application/json; charset=utf-8" }
        ".png"  { return "image/png" }
        ".jpg"  { return "image/jpeg" }
        ".jpeg" { return "image/jpeg" }
        ".gif"  { return "image/gif" }
        ".webp" { return "image/webp" }
        ".svg"  { return "image/svg+xml" }
        ".ico"  { return "image/x-icon" }
        ".txt"  { return "text/plain; charset=utf-8" }
        ".csv"  { return "text/csv; charset=utf-8" }
        ".xml"  { return "application/xml" }
        ".zip"  { return "application/zip" }
        default { return "application/octet-stream" }
    }
}

function Save-SelcoFiles($request, $response) {
    $reader = New-Object System.IO.StreamReader($request.InputStream, [System.Text.Encoding]::UTF8)
    $raw = $reader.ReadToEnd()
    $reader.Close()
    $input = $raw | ConvertFrom-Json
    if (-not $input -or -not $input.files) {
        Send-Json $response @{ success = $false; error = "No se recibieron archivos" } 400
        return
    }
    $jobName = [regex]::Replace([string]$input.jobName, "[^a-zA-Z0-9_\-]", "")
    if ([string]::IsNullOrWhiteSpace($jobName)) { $jobName = "SELCO_JOB" }
    $docs = [Environment]::GetFolderPath("MyDocuments")
    $jobDir = Join-Path (Join-Path (Join-Path $docs "Optimizador_Selco") "export") $jobName
    New-Item -ItemType Directory -Force -Path $jobDir | Out-Null
    $saved = @()
    foreach ($file in $input.files) {
        $filename = [IO.Path]::GetFileName([string]$file.filename)
        $content = [string]$file.content
        if ([string]::IsNullOrWhiteSpace($filename) -or [string]::IsNullOrWhiteSpace($content)) { continue }
        $crlf = ($content -replace "`r`n", "`n" -replace "`n", "`r`n")
        $dest = Join-Path $jobDir $filename
        [IO.File]::WriteAllText($dest, $crlf)
        $saved += @{ filename = $filename; path = $dest; size = $crlf.Length }
    }
    Send-Json $response @{
        success = $true
        jobName = $jobName
        directory = $jobDir
        saved = $saved
        count = $saved.Count
    } 200
}

while ($listener.IsListening) {
    $context = $listener.GetContext()
    $request = $context.Request
    $response = $context.Response
    try {
        $urlPath = [Uri]::UnescapeDataString($request.Url.AbsolutePath)
        if ($urlPath -eq "/api.php") {
            $action = [string]$request.QueryString["action"]
            if ($action -eq "save_files") {
                Save-SelcoFiles $request $response
            } else {
                Send-Json $response @{ success = $true; service = "Optimizador Selco"; status = "online" } 200
            }
            continue
        }
        if ($urlPath -eq "/" -or [string]::IsNullOrWhiteSpace($urlPath)) { $urlPath = "/index.html" }
        $relative = $urlPath.TrimStart("/").Replace("/", [IO.Path]::DirectorySeparatorChar)
        $full = [IO.Path]::GetFullPath((Join-Path $root $relative))
        $rootFull = [IO.Path]::GetFullPath($root)
        if (-not $full.StartsWith($rootFull, [StringComparison]::OrdinalIgnoreCase) -or -not (Test-Path -LiteralPath $full -PathType Leaf)) {
            Send-Text $response "No encontrado" "text/plain; charset=utf-8" 404
            continue
        }
        $bytes = [IO.File]::ReadAllBytes($full)
        Send-Bytes $response $bytes (Get-Mime $full) 200
    } catch {
        try { Send-Text $response $_.Exception.Message "text/plain; charset=utf-8" 500 } catch {}
    }
}
