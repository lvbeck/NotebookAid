$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing
$workspace = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$bitmap = [Drawing.Bitmap]::new(656, 1256, [Drawing.Imaging.PixelFormat]::Format24bppRgb)
$graphics = [Drawing.Graphics]::FromImage($bitmap)
$graphics.SmoothingMode = [Drawing.Drawing2D.SmoothingMode]::AntiAlias
$graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
$graphics.TextRenderingHint = [Drawing.Text.TextRenderingHint]::AntiAliasGridFit
$graphics.ScaleTransform(4, 4)
$background = [Drawing.Drawing2D.LinearGradientBrush]::new([Drawing.Point]::new(0, 0), [Drawing.Point]::new(164, 314), [Drawing.ColorTranslator]::FromHtml('#18263c'), [Drawing.ColorTranslator]::FromHtml('#6550a3'))
$glow = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(22, 180, 219, 255))
$paper = [Drawing.SolidBrush]::new([Drawing.Color]::FromArgb(22, 255, 255, 255))
$white = [Drawing.SolidBrush]::new([Drawing.Color]::White)
$outline = [Drawing.Pen]::new([Drawing.Color]::FromArgb(160, 225, 233, 255), 1.5)
$line = [Drawing.Pen]::new([Drawing.Color]::FromArgb(200, 225, 233, 255), 3)
$font = [Drawing.Font]::new('Segoe UI', 16, [Drawing.FontStyle]::Bold, [Drawing.GraphicsUnit]::Pixel)
$logo = [Drawing.Image]::FromFile((Join-Path $workspace 'assets/notebookaid-256.png'))
try {
    $graphics.FillRectangle($background, 0, 0, 164, 314)
    $graphics.FillEllipse($glow, -80, -65, 245, 245)
    $graphics.FillEllipse($glow, 62, 190, 160, 160)
    $graphics.FillRectangle($paper, 29, 64, 106, 148)
    $graphics.DrawRectangle($outline, 29, 64, 106, 148)
    $graphics.DrawLine($outline, 37, 64, 37, 212)
    $graphics.DrawLine($line, 51, 87, 113, 87)
    $graphics.DrawLine($line, 51, 101, 99, 101)
    $graphics.DrawImage($logo, 52, 121, 62, 62)
    $size = $graphics.MeasureString('NotebookAid', $font)
    $graphics.DrawString('NotebookAid', $font, $white, (164 - $size.Width) / 2, 239)
    $graphics.DrawLine($outline, 58, 275, 106, 275)
    $bitmap.Save((Join-Path $workspace 'assets/installer-sidebar.bmp'), [Drawing.Imaging.ImageFormat]::Bmp)
    $bitmap.Save((Join-Path $workspace 'assets/installer-sidebar.png'), [Drawing.Imaging.ImageFormat]::Png)
} finally {
    $logo.Dispose(); $font.Dispose(); $line.Dispose(); $outline.Dispose(); $white.Dispose(); $paper.Dispose(); $glow.Dispose(); $background.Dispose(); $graphics.Dispose(); $bitmap.Dispose()
}
