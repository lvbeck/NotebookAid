# NotebookAid icon

Updated after Jin Lu requested strictly equal stroke widths and matching Thunderbird icons on 2026-10-09.

`notebookaid.svg` is now entirely vector-based. The gradient and rounded rectangle are copied verbatim from the supplied desktop `icon.svg`.

The N uses one continuous path with a constant outer stroke-width of 8 units. All three straight segments have the same perpendicular width. A nested 5.4-unit stroke adds a silver face inside the outline. Horizontal clipping trims the ends; junctions overlap as in a standard N. Raster antialiasing varies with pixel size, but the geometry does not taper. No generative texture or letter extraction is used.

`notebookaid-*.png` provide raster sizes from 16 to 512 pixels. `notebookaid.ico` contains nine PNG frames from 16 to 256 pixels for Windows. Regenerate from the master using Electron:

```powershell
node_modules/electron/dist/electron.exe scripts/render-icon.cjs
```

The EXE uses the ICO, windows use the 256px PNG, the tray uses the ICO, and the application header uses the 64px PNG. The render script also writes identical PNG bytes to thunderbird/icons for the addon manager and toolbar button. Normal build/package commands consume these checked-in generated resources without requesting image generation.
