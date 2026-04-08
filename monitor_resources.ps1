# =============================================================================
# monitor_resources.ps1 -- InsightEd Local Resource Monitor (Windows)
# Usage:  powershell -ExecutionPolicy Bypass -File monitor_resources.ps1 [-Once] [-Verbose]
# Logs CPU/RAM every 5 min (default), alerts if free RAM below 10%
# =============================================================================
param(
    [int]$Interval = 300,
    [switch]$Verbose,
    [switch]$Once
)

$DEBUG_VERBOSE = $Verbose.IsPresent
$LOG_FILE = "$PSScriptRoot\resource_monitor.log"
$RAM_ALERT_PCT = 10

# Protected processes -- never suggest terminating
$PROTECTED = @('MsMpEng','MsSense','lsass','winlogon','csrss','smss',
               'services','svchost','System','Antigravity','claude','node',
               'powershell','ssh','OpenSSH')

function Write-Log {
    param([string]$Msg, [string]$Level = "INFO")
    $ts   = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $line = "[$ts] [$Level] $Msg"
    Add-Content -Path $LOG_FILE -Value $line -ErrorAction SilentlyContinue
    switch ($Level) {
        "WARN"  { Write-Host $line -ForegroundColor Yellow }
        "CRIT"  { Write-Host $line -ForegroundColor Red    }
        "OK"    { Write-Host $line -ForegroundColor Green  }
        default { Write-Host $line }
    }
}

function Get-MemoryStats {
    $os      = Get-WmiObject Win32_OperatingSystem
    $total   = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
    $free    = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
    $usedPct = [math]::Round((($os.TotalVisibleMemorySize - $os.FreePhysicalMemory) / $os.TotalVisibleMemorySize) * 100, 1)
    $freePct = [math]::Round(($os.FreePhysicalMemory / $os.TotalVisibleMemorySize) * 100, 1)
    return [PSCustomObject]@{ TotalGB = $total; FreeGB = $free; UsedPct = $usedPct; FreePct = $freePct }
}

function Get-CpuUsage {
    try {
        $cpu = (Get-WmiObject Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
        return [math]::Round($cpu, 1)
    } catch { return 0 }
}

function Invoke-MemCheck {
    $mem = Get-MemoryStats
    $cpu = Get-CpuUsage
    $msg = "CPU: ${cpu}% | RAM: $($mem.UsedPct)% used ($($mem.FreeGB) GB free of $($mem.TotalGB) GB)"

    if ($mem.FreePct -le $RAM_ALERT_PCT) {
        Write-Log "CRITICAL -- $msg" "CRIT"
        Write-Log "Top memory consumers:" "CRIT"
        Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 10 |
            ForEach-Object {
                $isProtected = $PROTECTED -contains $_.Name
                $flag = if ($isProtected) { "[PROTECTED]" } else { "[killable?]" }
                Write-Log ("  {0,-30} {1,7}MB  {2}" -f $_.Name, [math]::Round($_.WorkingSet64/1MB,1), $flag)
            }
    } elseif ($mem.UsedPct -ge 90) {
        Write-Log "WARNING -- $msg" "WARN"
    } else {
        Write-Log "OK -- $msg" "OK"
    }

    if ($DEBUG_VERBOSE) {
        Write-Log "--- Top 15 processes by RAM ---"
        Get-Process | Sort-Object WorkingSet64 -Descending | Select-Object -First 15 |
            ForEach-Object {
                Write-Log ("  {0,-30} PID:{1,6}  RAM:{2,7}MB  CPU:{3,8}s" -f `
                    $_.Name, $_.Id, [math]::Round($_.WorkingSet64/1MB,1), [math]::Round($_.CPU,1))
            }
    }
}

# --- Entry Point ---
Write-Log "========================================="
Write-Log "InsightEd Local Resource Monitor Started"
Write-Log "Interval: ${Interval}s | Alert: free RAM below ${RAM_ALERT_PCT}%"
Write-Log "Log: $LOG_FILE"
Write-Log "========================================="

if ($Once) {
    Invoke-MemCheck
} else {
    while ($true) {
        Invoke-MemCheck
        Start-Sleep -Seconds $Interval
    }
}
