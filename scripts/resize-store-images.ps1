Add-Type -AssemblyName System.Drawing

$targetDir = "c:\Users\sunit\Desktop\GitIdentity\store_assets"
if (!(Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir | Out-Null
}

function Resize-File($src, $destName, $width, $height) {
    $srcImg = [System.Drawing.Image]::FromFile($src)
    $bmp = New-Object System.Drawing.Bitmap($width, $height)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.DrawImage($srcImg, 0, 0, $width, $height)
    $destPath = Join-Path $targetDir $destName
    $bmp.Save($destPath, [System.Drawing.Imaging.ImageFormat]::Png)
    $g.Dispose()
    $bmp.Dispose()
    $srcImg.Dispose()
    Write-Host "Created: $destPath ($width x $height)"
}

Resize-File "C:\Users\sunit\.gemini\antigravity-ide\brain\0e0e20c6-427f-4d36-a4f7-9db12d2e621c\store_logo_box_art_1790599934155.png" "1_1_Box_Art_Logo_1080x1080.png" 1080 1080
Resize-File "C:\Users\sunit\.gemini\antigravity-ide\brain\0e0e20c6-427f-4d36-a4f7-9db12d2e621c\store_logo_box_art_1790599934155.png" "App_Tile_Icon_300x300.png" 300 300
Resize-File "C:\Users\sunit\.gemini\antigravity-ide\brain\0e0e20c6-427f-4d36-a4f7-9db12d2e621c\store_logo_box_art_1790599934155.png" "App_Tile_Icon_150x150.png" 150 150
Resize-File "C:\Users\sunit\.gemini\antigravity-ide\brain\0e0e20c6-427f-4d36-a4f7-9db12d2e621c\store_logo_box_art_1790599934155.png" "App_Tile_Icon_71x71.png" 71 71
Resize-File "C:\Users\sunit\.gemini\antigravity-ide\brain\0e0e20c6-427f-4d36-a4f7-9db12d2e621c\store_poster_art_1790600030378.png" "2_3_Poster_Art_1080x1620.png" 1080 1620
Resize-File "C:\Users\sunit\.gemini\antigravity-ide\brain\0e0e20c6-427f-4d36-a4f7-9db12d2e621c\store_screenshot_1_1790600118388.png" "Screenshot_1_MainUI_1920x1080.png" 1920 1080
Resize-File "C:\Users\sunit\.gemini\antigravity-ide\brain\0e0e20c6-427f-4d36-a4f7-9db12d2e621c\store_screenshot_2_1790600152394.png" "Screenshot_2_RepoManager_1920x1080.png" 1920 1080
