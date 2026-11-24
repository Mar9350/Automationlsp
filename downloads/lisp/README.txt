Put .lsp files in this folder.

Then open script.js, find the tool in TOOLS and change   href: "#"   to the file path:
  href: "downloads/lisp/GAPCHECK.lsp"

- Use forward slashes /.
- Spaces in file names: write %20, e.g.
    href: "downloads/lisp/BULK%20POLYLINE%20Q4.lsp"
    href: "downloads/lisp/hatch%20delete(hdel).lsp"
- Tools whose href is still "#" keep a disabled Download button.
- Opened from a folder, a .lsp may open as text: right-click Download > Save link as.
