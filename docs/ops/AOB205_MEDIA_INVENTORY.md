# AOB205 media inventory

Read-only search on this laptop (2026-09-02). No files were hashed, copied, or processed.

## This laptop (`C:\Users\bcvol`)

Searched by name only, depth ≤ 4:

- `C:\Users\bcvol\Desktop`
- `C:\Users\bcvol\Documents`
- `C:\Users\bcvol\Downloads`
- `C:\Users\bcvol\Desktop\Slate360_Exports` (contains only `backend/` + `frontend/` source trees from 2025-08-21)
- `C:\s360`

**Result: no folder or file named AOB205 / AOB-205 / AOB 205.**

AOB205 exists in product docs as an ASU classroom (~41×30 ft, drawings, failed stills-vs-video twin run). That is design history, not capture media on this machine.

## Recommendation

**HouseWalk remains the only live commercial walk** until AOB205 media is located.

AOB205 would be the stronger *construction* demo **if** Brian’s desktop has horizon-locked 360, drawings, and no operator-in-frame kitchen clutter. Do not switch the public proof until that media is inventoried and a CLIENT proxy exists.

## Command for Brian’s desktop (`C:\Users\Brian PC`)

Paste in PowerShell. Read-only. Does not hash the disk.

```powershell
$root = "C:\Users\Brian PC\Desktop"
$out  = Join-Path $env:USERPROFILE "Desktop\AOB205-inventory.txt"
$rx   = '(?i)AOB[\s_-]?205|\bAOB\b.*\b205\b'
$hits = Get-ChildItem -LiteralPath $root -Recurse -Force -Depth 5 -ErrorAction SilentlyContinue |
  Where-Object { $_.Name -match $rx }
$hits | Select-Object FullName, Mode, Length, CreationTime, LastWriteTime |
  Format-Table -AutoSize | Out-String -Width 240 | Tee-Object $out
foreach ($hit in $hits | Where-Object { $_.PSIsContainer }) {
  "`n==== $($hit.FullName) ====" | Tee-Object $out -Append
  Get-ChildItem -LiteralPath $hit.FullName -Recurse -Force -Depth 3 -ErrorAction SilentlyContinue |
    Select-Object FullName, Length, Extension, CreationTime |
    Format-Table -AutoSize | Out-String -Width 240 | Tee-Object $out -Append
  $files = Get-ChildItem -LiteralPath $hit.FullName -Recurse -File -Force -ErrorAction SilentlyContinue
  $groups = $files | Group-Object Extension | Sort-Object Count -Descending
  $groups | ForEach-Object { "{0,6}  {1,10:N0} bytes  {2}" -f $_.Count, (($_.Group | Measure-Object Length -Sum).Sum), $_.Name }
  $want = '\.(mp4|mov|insv|jpg|jpeg|dng|heic|pdf|ply|glb|spz|json|jsonl|s360depth)$'
  $files | Where-Object { $_.Name -match $want -or $_.Name -match '(?i)lidar_poses|lidar_traj|thermal|drone' } |
    Select-Object FullName, Length, CreationTime | Format-Table -AutoSize
}
Write-Host "Wrote $out"
```

Send `AOB205-inventory.txt` back. Do not process the media until that list exists.
