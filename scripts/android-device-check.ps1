#Requires -Version 5.1
<#
.SYNOPSIS
    Verifies Android physical device connectivity, authorization, hardware specs, and app status.
.DESCRIPTION
    Safely locates ADB, checks device connection, extracts device telemetry (model, Android version,
    API level, ABI, RAM capacity), and checks whether com.offlineai.phoneassistant is installed.
    Never unlocks screens, alters security settings, or deletes files.
.PARAMETER DeviceId
    Specific ADB serial/transport ID. If omitted, auto-selects if exactly 1 authorized device is connected.
.PARAMETER RequireAppInstalled
    Fails if com.offlineai.phoneassistant is not currently installed on the target device.
.PARAMETER AdbPath
    Custom path to adb.exe. If omitted, searches standard SDK locations and PATH.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\android-device-check.ps1
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\android-device-check.ps1 -DeviceId kjizrsgekfsglvgi -RequireAppInstalled
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$DeviceId = "",

    [Parameter(Mandatory = $false)]
    [switch]$RequireAppInstalled,

    [Parameter(Mandatory = $false)]
    [string]$AdbPath = ""
)

$ErrorActionPreference = "Stop"

function Find-AdbExecutable {
    param([string]$ExplicitPath)

    if ($ExplicitPath -and (Test-Path $ExplicitPath)) {
        return $ExplicitPath
    }

    $candidates = @(
        $ExplicitPath,
        "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe",
        "$env:ANDROID_HOME\platform-tools\adb.exe",
        "$env:ANDROID_SDK_ROOT\platform-tools\adb.exe"
    )

    foreach ($path in $candidates) {
        if ($path -and (Test-Path $path)) {
            return $path
        }
    }

    $cmd = Get-Command "adb" -ErrorAction SilentlyContinue
    if ($cmd) {
        return $cmd.Source
    }

    return $null
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Pocket Cleaner - Android Device Verification Check" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# 1. Locate ADB
$adb = Find-AdbExecutable -ExplicitPath $AdbPath
if (-not $adb) {
    Write-Error "[FAIL] ADB executable could not be found. Please ensure Android SDK platform-tools are installed."
    exit 1
}
Write-Host "[OK] ADB located: $adb" -ForegroundColor Green

# 2. Query attached devices
$devicesOutput = & $adb devices -l
$lines = $devicesOutput -split "`r?`n" | Where-Object { $_ -match "\S" }
$deviceLines = $lines | Where-Object { $_ -notmatch "^List of devices attached" -and $_ -notmatch "^\*" }

if (-not $deviceLines -or $deviceLines.Count -eq 0) {
    Write-Error "[FAIL] No Android devices found via ADB. Ensure USB debugging is enabled on device and cable is firmly connected."
    exit 1
}

$deviceList = @()
foreach ($line in $deviceLines) {
    $parts = -split $line
    $serial = $parts[0]
    $state = $parts[1]
    $deviceList += [PSCustomObject]@{
        Serial = $serial
        State  = $state
        Raw    = $line
    }
}

# 3. Select target device
$target = $null
if ($DeviceId) {
    $target = $deviceList | Where-Object { $_.Serial -eq $DeviceId }
    if (-not $target) {
        Write-Error "[FAIL] Specified DeviceId '$DeviceId' is not among connected devices:`n$($deviceLines -join "`n")"
        exit 1
    }
} else {
    $authorized = @($deviceList | Where-Object { $_.State -eq "device" })
    if ($authorized.Count -eq 1) {
        $target = $authorized[0]
    } elseif ($authorized.Count -gt 1) {
        Write-Error "[FAIL] Multiple authorized devices attached. Please specify -DeviceId parameter with one of:`n$($authorized.Serial -join "`n")"
        exit 2
    } else {
        $unauth = @($deviceList | Where-Object { $_.State -eq "unauthorized" })
        if ($unauth.Count -gt 0) {
            Write-Error "[FAIL] Device '$($unauth[0].Serial)' is unauthorized. Unlock phone and tap 'Allow USB debugging' prompt."
            exit 1
        }
        Write-Error "[FAIL] Connected device is in state '$($deviceList[0].State)'. Expected 'device'."
        exit 1
    }
}

if ($target.State -ne "device") {
    Write-Error "[FAIL] Target device '$($target.Serial)' is not authorized (State: $($target.State))."
    exit 1
}

Write-Host "[OK] Target Device Selected: $($target.Serial)" -ForegroundColor Green

# 4. Extract hardware and OS diagnostics
$model        = (& $adb -s $target.Serial shell getprop ro.product.model).Trim()
$manufacturer = (& $adb -s $target.Serial shell getprop ro.product.manufacturer).Trim()
$productName  = (& $adb -s $target.Serial shell getprop ro.product.name).Trim()
$androidVer   = (& $adb -s $target.Serial shell getprop ro.build.version.release).Trim()
$apiLevel     = (& $adb -s $target.Serial shell getprop ro.build.version.sdk).Trim()
$abi          = (& $adb -s $target.Serial shell getprop ro.product.cpu.abi).Trim()

# Query RAM via /proc/meminfo
$memInfo = & $adb -s $target.Serial shell cat /proc/meminfo
$memTotalLine = $memInfo | Where-Object { $_ -match "^MemTotal:\s+(\d+)\s+kB" }
$totalRamGb = "Unknown"
if ($memTotalLine -match "^MemTotal:\s+(\d+)\s+kB") {
    $kb = [double]$Matches[1]
    $gbDecimal = [math]::Round(($kb * 1024) / 1000000000, 2)
    $giBinary = [math]::Round(($kb * 1024) / (1024*1024*1024), 2)
    $totalRamGb = "$gbDecimal GB decimal / $giBinary GiB binary ($kb kB total)"
}

Write-Host "------------------------------------------------------------" -ForegroundColor Gray
Write-Host " Device Telemetry:" -ForegroundColor Yellow
Write-Host "   Manufacturer:  $manufacturer"
Write-Host "   Model:         $model ($productName)"
Write-Host "   Android OS:    $androidVer (API $apiLevel)"
Write-Host "   Architecture:  $abi"
Write-Host "   Total RAM:     $totalRamGb"
Write-Host "------------------------------------------------------------" -ForegroundColor Gray

# 5. Check Package Status
$appPackage = "com.offlineai.phoneassistant"
$pmPathOutput = & $adb -s $target.Serial shell pm path $appPackage
$isInstalled = ($pmPathOutput -and $pmPathOutput -match "package:")

if ($isInstalled) {
    Write-Host "[OK] Application '$appPackage' is INSTALLED on device." -ForegroundColor Green
    Write-Host "     APK Path: $pmPathOutput" -ForegroundColor DarkGray
} else {
    Write-Host "[INFO] Application '$appPackage' is NOT currently installed." -ForegroundColor Yellow
    if ($RequireAppInstalled) {
        Write-Error "[FAIL] Required package '$appPackage' is not installed."
        exit 1
    }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Device Check Result: PASS" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Cyan

exit 0
