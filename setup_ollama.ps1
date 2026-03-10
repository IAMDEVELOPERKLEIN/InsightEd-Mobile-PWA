Write-Host "Downloading Ollama installer..."
Invoke-WebRequest -Uri "https://ollama.com/download/OllamaSetup.exe" -OutFile "OllamaSetup.exe"

Write-Host "Installing Ollama... Please accept any UAC popups that appear."
Start-Process -FilePath ".\OllamaSetup.exe" -Wait

Write-Host "Cleaning up installer..."
Remove-Item "OllamaSetup.exe" -ErrorAction SilentlyContinue

Write-Host "Waiting a few seconds for the Ollama background service to start..."
Start-Sleep -Seconds 10

# Locate ollama executable, usually in LOCALAPPDATA
$ollamaPath = "ollama"
if (-not (Get-Command "ollama" -ErrorAction SilentlyContinue)) {
    $ollamaExe = "$env:LOCALAPPDATA\Programs\Ollama\ollama.exe"
    if (Test-Path $ollamaExe) {
        $ollamaPath = $ollamaExe
    } else {
        Write-Host "Could not find ollama.exe in PATH or default install location. Please run 'ollama pull nomic-embed-text' and 'ollama pull llama3' manually after reopening terminal."
        exit 1
    }
}

Write-Host "Pulling the nomic-embed-text model (for generating embeddings)..."
& $ollamaPath pull nomic-embed-text

Write-Host "Pulling the llama3 model (for chat generation)..."
& $ollamaPath pull llama3

Write-Host "`nSetup complete! You can now verify the chatbot."
