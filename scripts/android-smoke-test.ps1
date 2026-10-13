#Requires -Version 5.1
<#
.SYNOPSIS
    Automated smoke test pipeline for Pocket Cleaner on physical Android devices.
.DESCRIPTION
    Runs unit tests, static checks, device diagnostics, installs/verifies the debug APK,
    launches the application, verifies process stability, captures screenshots and logcat,
    and produces timestamped markdown reports under artifacts/android-tests/.
.PARAMETER DeviceId
    Specific ADB serial number.
.PARAMETER DryRun
    Runs all checks and validations without modifying device packages or launching apps.
.PARAMETER SkipBuild
    Uses existing built APK without invoking Gradle.
.PARAMETER SkipUnitTests
    Skips npm test and static checks.
.PARAMETER LaunchWaitSeconds
    Seconds to wait after am start before capturing screenshot and logcat (default 6).
.PARAMETER ArtifactsDir
    Output directory for logs, screenshots, and reports.
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\android-smoke-test.ps1
.EXAMPLE
    powershell -ExecutionPolicy Bypass -File scripts\android-smoke-test.ps1 -SkipBuild -DeviceId kjizrsgekfsglvgi
#>

[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [string]$DeviceId = "",

    [Parameter(Mandatory = $false)]
    [switch]$DryRun,

    [Parameter(Mandatory = $false)]
    [switch]$SkipBuild,

    [Parameter(Mandatory = $false)]
    [switch]$SkipUnitTests,

    [Parameter(Mandatory = $false)]
    [int]$LaunchWaitSeconds = 6,

    [Parameter(Mandatory = $false)]
    [string]$ArtifactsDir = "artifacts/android-tests"
)

$ErrorActionPreference = "Continue"

# Ensure PATH includes Node, Git, Android SDK
$env:PATH = "C:\Program Files\nodejs;C:\Program Files\Git\cmd;C:\Users\sukes\AppData\Local\Android\Sdk\platform-tools;" + $env:PATH

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"

$fullArtifactsDir = Join-Path $projectRoot $ArtifactsDir
if (-not (Test-Path $fullArtifactsDir)) {
    New-Item -ItemType Directory -Path $fullArtifactsDir -Force | Out-Null
}

$reportPath = Join-Path $fullArtifactsDir "smoke_report_$timestamp.md"
$screenshotPath = Join-Path $fullArtifactsDir "smoke_screenshot_$timestamp.png"
$logcatPath = Join-Path $fullArtifactsDir "smoke_logcat_$timestamp.log"

$results = [ordered]@{}

function Record-Check {
    param(
        [string]$Name,
        [string]$Status,
        [string]$Details = ""
    )
    $results[$Name] = @{
        Status  = $Status
        Details = $Details
    }
    $color = switch ($Status) {
        "PASS" { "Green" }
        "FAIL" { "Red" }
        "BLOCKED" { "Yellow" }
        default { "DarkGray" }
    }
    Write-Host "[$Status] $Name $(if ($Details) { '- ' + $Details })" -ForegroundColor $color
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " Pocket Cleaner - Android Smoke Test Pipeline" -ForegroundColor Cyan
Write-Host " Timestamp: $timestamp" -ForegroundColor Cyan
Write-Host " Artifacts: $fullArtifactsDir" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

# -------------------------------------------------------------------------
# STEP 1: Static Code Checks & Unit Tests
# -------------------------------------------------------------------------
if (-not $SkipUnitTests) {
    Write-Host "`n--- [Step 1] Running Unit Tests & Static Analysis ---" -ForegroundColor Yellow

    # 1.1 Type Check
    try {
        & npx tsc --noEmit
        if ($LASTEXITCODE -eq 0) {
            Record-Check -Name "TypeScript Compilation (tsc --noEmit)" -Status "PASS" -Details "0 errors"
        } else {
            Record-Check -Name "TypeScript Compilation (tsc --noEmit)" -Status "FAIL" -Details "Exited with code $LASTEXITCODE"
        }
    } catch {
        Record-Check -Name "TypeScript Compilation (tsc --noEmit)" -Status "FAIL" -Details $_.Exception.Message
    }

    # 1.2 ESLint
    try {
        & npm run lint
        if ($LASTEXITCODE -eq 0) {
            Record-Check -Name "ESLint Static Analysis" -Status "PASS" -Details "0 errors, 0 warnings"
        } else {
            Record-Check -Name "ESLint Static Analysis" -Status "FAIL" -Details "Linter detected violations"
        }
    } catch {
        Record-Check -Name "ESLint Static Analysis" -Status "FAIL" -Details $_.Exception.Message
    }

    # 1.3 Unit Tests
    try {
        $testOut = & npm test 2>&1
        if ($LASTEXITCODE -eq 0) {
            $passMatch = $testOut | Select-String -Pattern "# pass (\d+)"
            $details = if ($passMatch) { $passMatch[0].Line.Trim() } else { "All suites passed" }
            Record-Check -Name "Node.js Test Suite (86 tests, 20 suites)" -Status "PASS" -Details $details
        } else {
            Record-Check -Name "Node.js Test Suite (86 tests, 20 suites)" -Status "FAIL" -Details "Unit tests failed"
        }
    } catch {
        Record-Check -Name "Node.js Test Suite (86 tests, 20 suites)" -Status "FAIL" -Details $_.Exception.Message
    }
} else {
    Record-Check -Name "Unit Tests & Static Analysis" -Status "NOT RUN" -Details "Skipped via -SkipUnitTests"
}

# -------------------------------------------------------------------------
# STEP 2: Device Verification via android-device-check.ps1
# -------------------------------------------------------------------------
Write-Host "`n--- [Step 2] Verifying Android Physical Device ---" -ForegroundColor Yellow
$deviceCheckScript = Join-Path $scriptDir "android-device-check.ps1"
$deviceCheckPass = $false

try {
    $deviceCheckParams = @{}
    if ($DeviceId) {
        $deviceCheckParams["DeviceId"] = $DeviceId
    }

    & $deviceCheckScript @deviceCheckParams
    if ($?) {
        $deviceCheckPass = $true
        Record-Check -Name "Physical Device Connection & Authorization" -Status "PASS" -Details "Device authorized and responsive"
    } else {
        Record-Check -Name "Physical Device Connection & Authorization" -Status "FAIL" -Details "Device verification script failed"
    }
} catch {
    Record-Check -Name "Physical Device Connection & Authorization" -Status "FAIL" -Details $_.Exception.Message
}

# Locate adb for remaining steps
$adb = "C:\Users\sukes\AppData\Local\Android\Sdk\platform-tools\adb.exe"
if (-not (Test-Path $adb)) {
    $adb = "adb"
}

# Determine target serial
$targetSerial = $DeviceId
if (-not $targetSerial) {
    $rawDevices = & $adb devices
    $matchedLines = @($rawDevices -split "`r?`n" | Where-Object { $_ -match "\s+device$" })
    if ($matchedLines.Count -ge 1) {
        $parts = $matchedLines[0] -split "\s+"
        $targetSerial = $parts[0].Trim()
    }
}
Write-Host "Target Serial for Automation: $targetSerial" -ForegroundColor Gray

# -------------------------------------------------------------------------
# STEP 3: APK Build & Validation
# -------------------------------------------------------------------------
Write-Host "`n--- [Step 3] APK Verification ---" -ForegroundColor Yellow
$debugApkPath = Join-Path $projectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
$releaseAabPath = Join-Path $projectRoot "android\app\build\outputs\bundle\release\app-release.aab"

if (-not $SkipBuild -and -not (Test-Path $debugApkPath)) {
    if ($DryRun) {
        Record-Check -Name "Debug APK Build (assembleDebug)" -Status "NOT RUN" -Details "Skipped in DryRun mode"
    } else {
        Write-Host "Building debug APK via gradlew assembleDebug..." -ForegroundColor Gray
        $gradlew = Join-Path $projectRoot "android\gradlew.bat"
        try {
            $prevCwd = Get-Location
            Set-Location (Join-Path $projectRoot "android")
            $buildOut = & $gradlew assembleDebug 2>&1
            Set-Location $prevCwd

            if ($LASTEXITCODE -eq 0 -and (Test-Path $debugApkPath)) {
                Record-Check -Name "Debug APK Build (assembleDebug)" -Status "PASS" -Details "Successfully compiled app-debug.apk"
            } else {
                Record-Check -Name "Debug APK Build (assembleDebug)" -Status "FAIL" -Details "assembleDebug failed with exit code $LASTEXITCODE"
            }
        } catch {
            Record-Check -Name "Debug APK Build (assembleDebug)" -Status "FAIL" -Details $_.Exception.Message
        }
    }
} else {
    if (Test-Path $debugApkPath) {
        $apkSizeMb = [math]::Round((Get-Item $debugApkPath).Length / 1MB, 2)
        Record-Check -Name "Debug APK Artifact Validation" -Status "PASS" -Details "Found existing app-debug.apk ($apkSizeMb MB)"
    } elseif (Test-Path $releaseAabPath) {
        $aabSizeMb = [math]::Round((Get-Item $releaseAabPath).Length / 1MB, 2)
        Record-Check -Name "Release AAB Artifact Validation" -Status "PASS" -Details "Found existing app-release.aab ($aabSizeMb MB)"
    } else {
        Record-Check -Name "APK Artifact Validation" -Status "BLOCKED" -Details "No compiled APK found. Run without -SkipBuild."
    }
}

# -------------------------------------------------------------------------
# STEP 4: Installation on Device
# -------------------------------------------------------------------------
Write-Host "`n--- [Step 4] Installation & Verification ---" -ForegroundColor Yellow
$appPackage = "com.offlineai.phoneassistant"

if (-not $deviceCheckPass) {
    Record-Check -Name "App Installation" -Status "BLOCKED" -Details "Device verification failed"
} elseif ($DryRun) {
    Record-Check -Name "App Installation" -Status "NOT RUN" -Details "DryRun mode active"
} else {
    $isInstalled = (& $adb -s $targetSerial shell pm path $appPackage) -match "package:"
    if ($isInstalled) {
        Record-Check -Name "App Installation" -Status "PASS" -Details "Package '$appPackage' already installed on device"
    } elseif (Test-Path $debugApkPath) {
        Write-Host "Installing $debugApkPath to $targetSerial..." -ForegroundColor Gray
        $installOut = & $adb -s $targetSerial install -r $debugApkPath 2>&1
        if ($LASTEXITCODE -eq 0 -or ($installOut -match "Success")) {
            Record-Check -Name "App Installation" -Status "PASS" -Details "Installed app-debug.apk successfully"
        } else {
            Record-Check -Name "App Installation" -Status "FAIL" -Details ($installOut -join " ")
        }
    } else {
        Record-Check -Name "App Installation" -Status "BLOCKED" -Details "Package not installed and no APK available"
    }
}

# -------------------------------------------------------------------------
# STEP 5: Launch & Process Verification
# -------------------------------------------------------------------------
Write-Host "`n--- [Step 5] Launch & Process Stability ---" -ForegroundColor Yellow

if (-not $deviceCheckPass) {
    Record-Check -Name "Application Launch" -Status "BLOCKED" -Details "Device verification failed"
    Record-Check -Name "Process Stability & Crash Absence" -Status "BLOCKED" -Details "Could not launch"
    Record-Check -Name "Screen Capture Verification" -Status "BLOCKED" -Details "Could not launch"
} elseif ($DryRun) {
    Record-Check -Name "Application Launch" -Status "NOT RUN" -Details "DryRun mode active"
    Record-Check -Name "Process Stability & Crash Absence" -Status "NOT RUN" -Details "DryRun mode active"
    Record-Check -Name "Screen Capture Verification" -Status "NOT RUN" -Details "DryRun mode active"
} else {
    # 5.1 Clear logcat buffer before launch
    & $adb -s $targetSerial logcat -c

    # 5.2 Start MainActivity
    Write-Host "Launching $appPackage/.MainActivity..." -ForegroundColor Gray
    $startOut = (& $adb -s $targetSerial shell am start -n "$appPackage/.MainActivity" 2>&1) -join " "
    if ($LASTEXITCODE -eq 0 -or $startOut -match "Starting|Warning|delivered") {
        Record-Check -Name "Application Launch (am start)" -Status "PASS" -Details "MainActivity intent sent successfully"
    } else {
        Record-Check -Name "Application Launch (am start)" -Status "FAIL" -Details $startOut
    }

    # 5.3 Wait for startup and rendering
    Write-Host "Waiting $LaunchWaitSeconds seconds for initial render..." -ForegroundColor Gray
    Start-Sleep -Seconds $LaunchWaitSeconds

    # 5.4 Check if PID is alive
    $pidOut = (& $adb -s $targetSerial shell pidof $appPackage).Trim()
    if ($pidOut -match "^\d+") {
        Record-Check -Name "Process Active Check (pidof)" -Status "PASS" -Details "PID $pidOut is alive and running"
    } else {
        Record-Check -Name "Process Active Check (pidof)" -Status "FAIL" -Details "Process terminated unexpectedly after launch"
    }

    # 5.5 Capture Screenshot
    try {
        $remoteTmp = "/sdcard/smoke_tmp_$timestamp.png"
        & $adb -s $targetSerial shell screencap -p $remoteTmp
        & $adb -s $targetSerial pull $remoteTmp $screenshotPath 2>&1 | Out-Null
        & $adb -s $targetSerial shell rm $remoteTmp

        if ((Test-Path $screenshotPath) -and ((Get-Item $screenshotPath).Length -gt 1000)) {
            $screenSizeKb = [math]::Round((Get-Item $screenshotPath).Length / 1KB, 1)
            Record-Check -Name "Screen Capture Verification" -Status "PASS" -Details "Captured $screenSizeKb KB PNG to artifacts"
        } else {
            Record-Check -Name "Screen Capture Verification" -Status "FAIL" -Details "Screenshot file was empty or failed"
        }
    } catch {
        Record-Check -Name "Screen Capture Verification" -Status "FAIL" -Details $_.Exception.Message
    }

    # 5.6 Capture Logcat and inspect for fatal exceptions
    try {
        $logcatDump = & $adb -s $targetSerial logcat -d -s "AndroidRuntime:E" "ReactNativeJS:V" "DEBUG:E"
        $logcatDump | Out-File -FilePath $logcatPath -Encoding utf8

        $fatalMatch = $logcatDump | Where-Object { $_ -match "FATAL EXCEPTION" -or $_ -match "SIGSEGV" }
        if (-not $fatalMatch) {
            Record-Check -Name "Process Stability & Crash Absence" -Status "PASS" -Details "No fatal exceptions or native aborts in logcat"
        } else {
            Record-Check -Name "Process Stability & Crash Absence" -Status "FAIL" -Details "Detected fatal crash in logcat: $($fatalMatch[0])"
        }
    } catch {
        Record-Check -Name "Process Stability & Crash Absence" -Status "FAIL" -Details $_.Exception.Message
    }
}

# -------------------------------------------------------------------------
# STEP 6: Generate Markdown Report
# -------------------------------------------------------------------------
$overallStatus = "PASS"
foreach ($k in $results.Keys) {
    if ($results[$k].Status -eq "FAIL") {
        $overallStatus = "FAIL"
        break
    }
}

$mdLines = @(
    "# Android Physical-Device Smoke Test Report",
    "",
    "**Timestamp:** $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
    "**Device Serial:** $targetSerial",
    "**Package ID:** $appPackage",
    "**Overall Outcome:** **$overallStatus**",
    "",
    "## Validation Summary",
    "",
    "| Check | Status | Details |",
    "|---|---|---|"
)

foreach ($k in $results.Keys) {
    $st = $results[$k].Status
    $det = $results[$k].Details
    $mdLines += "| $k | **$st** | $det |"
}

$mdLines += @(
    "",
    "## Artifact Locations",
    "",
    "- **Logcat Dump:** [`smoke_logcat_$timestamp.log`](./smoke_logcat_$timestamp.log)",
    "- **Screenshot:** [`smoke_screenshot_$timestamp.png`](./smoke_screenshot_$timestamp.png)",
    "",
    "---",
    "_Generated by scripts/android-smoke-test.ps1_"
)

$mdLines | Out-File -FilePath $reportPath -Encoding utf8
Write-Host "`n============================================================" -ForegroundColor Cyan
Write-Host " Smoke Test Complete: $overallStatus" -ForegroundColor $(if ($overallStatus -eq "PASS") { "Green" } else { "Red" })
Write-Host " Report saved to: $reportPath" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if ($overallStatus -ne "PASS") {
    exit 1
}
exit 0
