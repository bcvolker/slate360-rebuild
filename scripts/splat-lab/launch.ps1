param(
  [ValidateSet("proven", "lab")]
  [string]$Clone = "proven"
)

$ErrorActionPreference = "Stop"
$logPath = Join-Path $env:TEMP "slate360-splat-lab-launch.log"
function Log([string]$msg) { Add-Content -LiteralPath $logPath -Value ("[{0:HH:mm:ss.fff}] {1}" -f (Get-Date), $msg) }
Log "=== launch start, Clone=$Clone, PID=$PID ==="

try {
  Add-Type -AssemblyName System.Windows.Forms
  $repo = "C:\s360"
  # /splat-lab-desktop is the unguarded, local-only route (no login) — deliberately separate
  # from the hosted /splat-lab, which stays behind the normal account gate for anyone reaching
  # it through the website. See app/splat-lab-desktop/layout.tsx for the localhost check.
  $path = if ($Clone -eq "lab") { "/splat-lab-desktop/lab" } else { "/splat-lab-desktop" }
  $url = "http://localhost:3000$path"
  $npmCmd = "C:\Program Files\nodejs\npm.cmd"
  $edge = "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe"
  if (-not (Test-Path -LiteralPath $edge)) {
    $edge = "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe"
  }

  # Port-level check FIRST (near-instant, never falsely negative) so a slow first-compile
  # response never causes a second `next dev` to be spawned on top of one that is already
  # running — that collision (two processes fighting over :3000) is what made the launcher
  # hang indefinitely with nothing visible on screen (root-caused 2026-09-12).
  function Test-PortOpen {
    try {
      $c = New-Object System.Net.Sockets.TcpClient
      $iar = $c.BeginConnect("127.0.0.1", 3000, $null, $null)
      $ok = $iar.AsyncWaitHandle.WaitOne(400)
      if ($ok -and $c.Connected) { $c.EndConnect($iar); $c.Close(); return $true }
      $c.Close()
      return $false
    } catch { return $false }
  }

  # HTTP check second — a first-compile response in Next.js dev mode can take well past a
  # couple of seconds, so this is generous on purpose, not a bug in itself.
  function Test-DevServerReady {
    try {
      $r = Invoke-WebRequest -Uri "http://localhost:3000/api/deploy-info" -UseBasicParsing -TimeoutSec 10
      return $r.StatusCode -ge 200
    } catch { return $false }
  }

  $portOpen = Test-PortOpen
  Log "port 3000 already open: $portOpen"

  if (-not $portOpen) {
    if (-not (Test-Path -LiteralPath $npmCmd)) {
      Log "npm.cmd missing, showing MessageBox"
      [void][System.Windows.Forms.MessageBox]::Show("Node.js npm.cmd not found. Install Node, then retry.", "Slate360 Splat Lab")
      exit 1
    }
    Log "port free — starting npm run dev"
    Start-Process -FilePath $npmCmd -ArgumentList "run", "dev" -WorkingDirectory $repo -WindowStyle Minimized
  } else {
    Log "port already bound — assuming a dev server is already running, not starting a second one"
  }

  Log "waiting for http readiness..."
  $deadline = (Get-Date).AddMinutes(4)
  $tick = 0
  while (-not (Test-DevServerReady)) {
    $tick++
    if ($tick % 3 -eq 0) { Log "still waiting, tick=$tick" }
    if ((Get-Date) -gt $deadline) {
      Log "deadline hit, showing MessageBox"
      [void][System.Windows.Forms.MessageBox]::Show("Slate360 did not start on http://localhost:3000. Open a terminal in C:\s360 and run npm run dev.", "Slate360 Splat Lab")
      exit 1
    }
    Start-Sleep -Seconds 2
  }
  Log "dev server ready"

  Log "opening browser at $url"
  if (Test-Path -LiteralPath $edge) {
    Start-Process -FilePath $edge -ArgumentList "--app=$url", "--new-window"
  } else {
    Start-Process $url
  }
  Log "=== launch done, exiting 0 ==="
} catch {
  Log "EXCEPTION: $($_ | Out-String)"
  try { [void][System.Windows.Forms.MessageBox]::Show("Slate360 Splat Lab failed to start:`n`n$($_.Exception.Message)", "Slate360 Splat Lab") } catch {}
  exit 1
}
