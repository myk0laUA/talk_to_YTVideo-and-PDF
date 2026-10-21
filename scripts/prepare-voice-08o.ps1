# Offline, authored synthetic speech only. Run with Windows PowerShell for System.Speech.
$ErrorActionPreference = 'Stop'
$comparisonDir = Join-Path (Get-Location) 'artifacts/local/08o/inputs'
New-Item -ItemType Directory -Force $comparisonDir | Out-Null
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$format = New-Object System.Speech.AudioFormat.SpeechAudioFormatInfo(48000, [System.Speech.AudioFormat.AudioBitsPerSample]::Sixteen, [System.Speech.AudioFormat.AudioChannel]::Mono)
try {
  $clips = @{
    summary = 'Please summarize the Cedar Loop trail guide.'
    stop = 'Stop.'
    continue = 'Continue, please.'
    question = 'Which bridge is closed, and which route should I use instead?'
  }
  foreach ($name in $clips.Keys) {
    $synth.SetOutputToWaveFile((Join-Path $comparisonDir "$name.wav"), $format)
    $synth.Speak($clips[$name])
    $synth.SetOutputToNull()
  }
} finally { $synth.Dispose() }
