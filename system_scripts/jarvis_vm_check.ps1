$mem = Get-CimInstance Win32_OperatingSystem | Select-Object @{N='FreeGB';E={[math]::Round($_.FreePhysicalMemory/1MB,2)}}, @{N='TotalGB';E={[math]::Round($_.TotalVisibleMemorySize/1MB,2)}}
$disk = Get-CimInstance Win32_LogicalDisk -Filter "DeviceID='C:'" | Select-Object @{N='FreeGB';E={[math]::Round($_.FreeSpace/1GB,2)}}, @{N='TotalGB';E={[math]::Round($_.Size/1GB,2)}}
$cpu = (Get-Counter '\Processor(_Total)\% Processor Time' -ErrorAction SilentlyContinue).CounterSamples.CookedValue

$report = @{
    Memory = $mem
    Disk = $disk
    CPU = $cpu
}

$report | ConvertTo-Json | Out-File -FilePath "tmp_vm_out.json"
