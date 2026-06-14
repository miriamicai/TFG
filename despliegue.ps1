# Script de despliegue automatico del TFG en Windows

# Antes de ejecutarlo:
# 1. Abrir Docker Desktop
# 2. Abrir Ganache Desktop en http://127.0.0.1:7545
# 3. Usar Chain ID 1337
# 4. Copiar la private key de una cuenta de Ganache

$ErrorActionPreference = "Stop"

function Write-Step($message) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host $message -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Assert-Command($command) {
    if (-not (Get-Command $command -ErrorAction SilentlyContinue)) {
        throw "No se ha encontrado '$command'. Instalalo o anadelo al PATH."
    }
}

function Test-Port($hostName, $port) {
    try {
        $client = New-Object System.Net.Sockets.TcpClient
        $async = $client.BeginConnect($hostName, $port, $null, $null)
        $success = $async.AsyncWaitHandle.WaitOne(1500, $false)

        if ($success) {
            $client.EndConnect($async)
            $client.Close()
            return $true
        }

        $client.Close()
        return $false
    }
    catch {
        return $false
    }
}

function Invoke-Checked($command, $workingDirectory) {
    Write-Host ""
    Write-Host ">> $command" -ForegroundColor Yellow

    Push-Location $workingDirectory
    try {
        cmd /c $command

        if ($LASTEXITCODE -ne 0) {
            throw "El comando ha fallado con codigo ${LASTEXITCODE}: ${command}"
        }
    }
    finally {
        Pop-Location
    }
}

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path

$ContractsDir = Join-Path $Root "contracts"
$BackendDir = Join-Path $Root "backend"
$FrontendDir = Join-Path $Root "frontend"

$PropertiesPath = Join-Path $BackendDir "src\main\resources\application.properties"
$DeployOutputPath = Join-Path $ContractsDir "deploy-output.json"

Write-Step "Comprobando estructura del proyecto y comandos necesarios"

Assert-Command "docker"
Assert-Command "npm"
Assert-Command "node"
Assert-Command "java"

if (-not (Test-Path $ContractsDir)) {
    throw "No existe la carpeta 'contracts'. Ejecuta el script desde la raiz del repositorio."
}

if (-not (Test-Path $BackendDir)) {
    throw "No existe la carpeta 'backend'. Ejecuta el script desde la raiz del repositorio."
}

if (-not (Test-Path $FrontendDir)) {
    throw "No existe la carpeta 'frontend'. Ejecuta el script desde la raiz del repositorio."
}

if (-not (Test-Path $PropertiesPath)) {
    throw "No se ha encontrado backend/src/main/resources/application.properties."
}

Write-Host "Estructura del proyecto correcta." -ForegroundColor Green

Write-Step "Comprobando Ganache"

if (-not (Test-Port "127.0.0.1" 7545)) {
    throw "Ganache no parece estar activo en http://127.0.0.1:7545. Abre Ganache Desktop y vuelve a ejecutar el script."
}

Write-Host "Ganache esta activo en http://127.0.0.1:7545." -ForegroundColor Green

Write-Step "Configurando private key de Ganache"

$privateKey = $env:GANACHE_PRIVATE_KEY

if ([string]::IsNullOrWhiteSpace($privateKey)) {
    $privateKey = Read-Host "Pega la private key de la cuenta de Ganache que quieras usar, empezando por 0x"
}

if (-not $privateKey.StartsWith("0x")) {
    throw "La private key debe empezar por 0x."
}

# Variables temporales solo para esta ejecucion
$env:GANACHE_PRIVATE_KEY = $privateKey
$env:BLOCKCHAIN_PRIVATE_KEY = $privateKey

Write-Host "Private key cargada como variable de entorno temporal. No se guarda en archivos." -ForegroundColor Green

Write-Step "Levantando infraestructura Docker: Mosquitto + simulador IoT"

Invoke-Checked "docker compose up -d --build" $Root

Write-Step "Instalando dependencias de contratos"

if (-not (Test-Path (Join-Path $ContractsDir "node_modules"))) {
    Invoke-Checked "npm install" $ContractsDir
}
else {
    Write-Host "node_modules ya existe en contracts. Se omite npm install." -ForegroundColor DarkYellow
}

Write-Step "Desplegando smart contract en Ganache"

if (Test-Path $DeployOutputPath) {
    Remove-Item $DeployOutputPath -Force
}

Invoke-Checked "npm run deploy" $ContractsDir

if (-not (Test-Path $DeployOutputPath)) {
    throw "No se ha generado contracts/deploy-output.json. Revisa el script de despliegue."
}

$deployJson = Get-Content $DeployOutputPath -Raw | ConvertFrom-Json

$contractAddress = $null

if ($deployJson.contractAddress) {
    $contractAddress = $deployJson.contractAddress
}
elseif ($deployJson.address) {
    $contractAddress = $deployJson.address
}
elseif ($deployJson.CadenaAceite) {
    $contractAddress = $deployJson.CadenaAceite
}

if ([string]::IsNullOrWhiteSpace($contractAddress)) {
    throw "No se ha podido leer la direccion del contrato en deploy-output.json."
}

Write-Host "Contrato desplegado en: $contractAddress" -ForegroundColor Green

Write-Step "Actualizando application.properties del backend"

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$backupPath = "$PropertiesPath.backup-$timestamp"

Copy-Item $PropertiesPath $backupPath -Force
Write-Host "Backup creado en: $backupPath" -ForegroundColor DarkYellow

$content = Get-Content $PropertiesPath -Raw

if ($content -match "blockchain\.enabled=") {
    $content = $content -replace "blockchain\.enabled=.*", "blockchain.enabled=true"
}
else {
    $content += "`r`nblockchain.enabled=true"
}

if ($content -match "blockchain\.node\.url=") {
    $content = $content -replace "blockchain\.node\.url=.*", "blockchain.node.url=http://127.0.0.1:7545"
}
else {
    $content += "`r`nblockchain.node.url=http://127.0.0.1:7545"
}

if ($content -match "blockchain\.contract\.address=") {
    $content = $content -replace "blockchain\.contract\.address=.*", "blockchain.contract.address=$contractAddress"
}
else {
    $content += "`r`nblockchain.contract.address=$contractAddress"
}

if ($content -match "blockchain\.wallet\.privateKey=") {
    $content = $content -replace "blockchain\.wallet\.privateKey=.*", 'blockchain.wallet.privateKey=${BLOCKCHAIN_PRIVATE_KEY}'
}
else {
    $content += "`r`nblockchain.wallet.privateKey=${BLOCKCHAIN_PRIVATE_KEY}"
}

if ($content -match "mqtt\.enabled=") {
    $content = $content -replace "mqtt\.enabled=.*", "mqtt.enabled=true"
}
else {
    $content += "`r`nmqtt.enabled=true"
}

Set-Content -Path $PropertiesPath -Value $content -Encoding UTF8

Write-Host "application.properties actualizado correctamente." -ForegroundColor Green

Write-Step "Instalando dependencias del frontend"

if (-not (Test-Path (Join-Path $FrontendDir "node_modules"))) {
    Invoke-Checked "npm install" $FrontendDir
}
else {
    Write-Host "node_modules ya existe en frontend. Se omite npm install." -ForegroundColor DarkYellow
}

Write-Step "Arrancando backend y frontend"

$backendCommand = @"
cd '$BackendDir'
`$env:BLOCKCHAIN_PRIVATE_KEY='$privateKey'
.\mvnw.cmd spring-boot:run
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $backendCommand

Start-Sleep -Seconds 8

$frontendCommand = @"
cd '$FrontendDir'
npm run dev
"@

Start-Process powershell -ArgumentList "-NoExit", "-Command", $frontendCommand

Write-Step "Proyecto arrancado"

Write-Host "Backend:  http://localhost:8080" -ForegroundColor Green
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Green
Write-Host "H2:       http://localhost:8080/h2-console" -ForegroundColor Green
Write-Host ""
Write-Host "Datos para iniciar sesión en H2:" -ForegroundColor Yellow
Write-Host "JDBC URL: jdbc:h2:mem:trazabilidad"
Write-Host "User: sa"
Write-Host "Password: dejar vacio"
Write-Host ""
Write-Host "Contrato desplegado y configurado: $contractAddress" -ForegroundColor Green
Write-Host ""
Write-Host "Si algo falla, puedes restaurar el backup:" -ForegroundColor Yellow
Write-Host $backupPath