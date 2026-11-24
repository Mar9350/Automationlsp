/* =====================================================================
   ProCAD Automation — script.js
   1. DATA: CONFIG, CATEGORIES, TIMELINE, TOOLS
   2. LOGIC (no edits needed to add a tool)
   Facts come from ProCAD_Automation_Story_and_User_Guide_v3.pptx.
   Unknown values are the literal string "TODO". Unconfirmed file names: "TODO-confirm: <ID>.lsp".

   TO MAKE A TOOL DOWNLOADABLE
   1. Put the file in downloads/lisp/ (or downloads/python/ for .exe).
   2. Set that tool's href, e.g. href: "downloads/lisp/GAPCHECK.lsp".
   Tools whose href is still "#" keep a disabled Download button.
   ===================================================================== */

var CONFIG = {
  DOWNLOADS_ENABLED: true,           // false = every Download button disabled, whatever the href
  DOWNLOAD_HINT: "Download link coming soon",
  SHOW_CLIENT_NAMES: true,           // false = "Client Data Export" / "Client Spell Check"
  SCREENS: [],                       // ids with assets/screens/<id>.<ext>, e.g. ["gapcheck"]
  SCREEN_EXT: "gif",
  STAGES: ["Prepare", "Clean", "Map", "QA", "Export"],
  AXIS: { startYear: 2024, endYear: 2026 }    // ruler range, one tick per quarter
};

/* shape: circle | square | triangle. color: token name in styles.css (--cat-<color>).
   outline: true = drawn as an outline only (no fill). */
var CATEGORIES = [
  { id: "cleanup",   name: "Drawing Cleanup",         shape: "circle",   color: "red",    outline: false },
  { id: "blocks",    name: "Block Management",        shape: "square",   color: "blue",   outline: false },
  { id: "qa",        name: "QA & Standards",          shape: "triangle", color: "yellow", outline: false },
  { id: "mapping",   name: "Mapping & Geometry",      shape: "square",   color: "ink",    outline: false },
  { id: "data",      name: "Data & Productivity",     shape: "triangle", color: "grey",   outline: false },
  { id: "community", name: "Adopted Community Tools", shape: "circle",   color: "ink",    outline: true },
  { id: "python",    name: "Python Software",         shape: "triangle", color: "ink",    outline: true }
];

/* quarter: 1–4, or null when only the year is known (the node then spans the year). */
var TIMELINE = [
  { id: "2024-q1", year: 2024, quarter: 1, category: "cleanup", title: "Hatch Delete",
    text: "Hatches hidden inside blocks made drawings heavy, and removing them meant editing every block. HDEL removes them from the block definitions in one command. It is the first tool on the timeline.",
    diagram: "hatch", before: "Manual cleanup", after: "One command" },
  { id: "2024-q2", year: 2024, quarter: 2, category: "cleanup", title: "Layer cleanup and block text",
    text: "LAYCLEAN cleans up layers in one command, with a keyword setup for each client. TXTDELBLK clears text from selected blocks. AREACHECK finds discrepancies between spaces and interior zones.",
    diagram: "layers", before: "Mixed client layers", after: "Standard layers" },
  { id: "2024-q3", year: 2024, quarter: 3, category: "qa", title: "Gap check",
    text: "GAPCHECK is introduced to the team so gaps between polylines stay at zero. It hatches between space and zone boundaries, so any gap shows itself before peer review.",
    diagram: "gap", before: "Hidden gap", after: "Zero gap" },
  { id: "2025-q1", year: 2025, quarter: 1, category: "data", title: "First data export",
    text: "An early version of the AutoCAD-to-Excel data export. Space data starts coming out of the drawing instead of being rebuilt by hand in Excel.",
    diagram: "export", before: "Typed by hand", after: "Exported" },
  { id: "2025-q2", year: 2025, quarter: 2, category: "mapping", title: "Bulk polyline",
    text: "BULK POLYLINE (command Q4) creates boundaries from room labels in one run. Each label is the seed point for its room, so BOUNDARY no longer runs one room at a time.",
    diagram: "boundary", before: "One room at a time", after: "One run" },
  { id: "2025-q3", year: 2025, quarter: 3, category: "data", title: "Client data export v3.3",
    text: "The client data export reaches v3.3, with deeper logic so every space record is captured. It reads space polylines, area, centroid and labels, and writes a CSV with building and floor.",
    diagram: "data", before: "Records missed", after: "Every record" },
  { id: "2026", year: 2026, quarter: null, category: "python", title: "The toolkit expands",
    text: "New routines join the toolkit: GCDONUT, GRIDNUM, SMARTSELECT, DUPTYPE, GAPSCANFIX and more. Automation moves beyond LISP into standalone Python tools: ImageToDXF, CenterToText and TextTranslator.",
    diagram: "toolkit", before: "AutoLISP", after: "AutoLISP + Python" }
];

/* Fields: id, name, command, type ("LSP"|"Python"), category, shape, file, href, chapter,
   flags (["client"] | ["leemac"]), stage, alias (optional, used when client names are hidden),
   description, problem, approach, action, why, steps[], beforeRun */
var TOOLS = [
  /* Drawing Cleanup */
  { id: "layclean", name: "LAYCLEAN", command: "LAYCLEAN", type: "LSP", category: "cleanup", shape: "circle",
    file: "TODO-confirm: LAYCLEAN.lsp", href: "#", chapter: "2024-q2", flags: [], stage: "Clean",
    description: "Moves objects to standard layers based on keywords in the layer names.",
    problem: "As-built drawings arrive with many inconsistent client layers that have to match Serraview standards.",
    approach: "Use keywords in the existing layer names to decide where each object belongs.",
    action: "Checks every layer name against a keyword list and moves objects to standard layers such as A-ARCH and FFE_FURNISHINGS.",
    why: "Every coordinator starts from the same clean layer structure. The keyword list can be adapted for other tools.",
    steps: ["Open the as-built drawing.", "Type LAYCLEAN and press Enter.", "Wait for the completion alert.", "In Layer Properties, check for layers that matched no keyword.", "Move leftover objects by hand, then run PURGE."],
    beforeRun: "To add keywords, open LAYCLEAN.lsp in Notepad, type the keyword and target layer inside the quotation marks, keep the parentheses, save and reload." },
  { id: "hdel", name: "HDEL", command: "HDEL", type: "LSP", category: "cleanup", shape: "circle",
    file: "hatch delete(hdel).lsp", href: "#", chapter: "2024-q1", flags: [], stage: "Clean",
    description: "Deletes hatches inside block definitions without opening any block.",
    problem: "Hatches hidden inside blocks make drawings heavy and cluttered. Removing them means editing each block.",
    approach: "Remove the hatches straight from the block definitions.",
    action: "Goes through every block, deletes the hatches inside it and regenerates the drawing.",
    why: "Lighter, cleaner backgrounds for mapping. This was the first tool on the timeline.",
    steps: ["Open the drawing.", "Type HDEL and press Enter.", "Wait while it goes through all blocks.", "Read the completion alert.", "Check that blocks now show without hatches."],
    beforeRun: "HDEL changes block definitions, so every copy of a block is affected. Save a copy if you may need the hatches later." },
  { id: "pdel", name: "PDEL", command: "PDEL", type: "LSP", category: "cleanup", shape: "circle",
    file: "TODO-confirm: PDEL.lsp", href: "#", chapter: "", flags: [], stage: "Clean",
    description: "Finds unwanted objects and removes them in one pass.",
    problem: "Unwanted objects are found and deleted piece by piece during drawing preparation.",
    approach: "Turn the repeated delete routine into one command.",
    action: "Finds the unwanted objects and removes them in one pass.",
    why: "Faster preparation with less repetitive clicking.",
    steps: ["Open the drawing.", "Type PDEL and press Enter.", "Follow the command-line prompts.", "Check that only the intended objects were removed.", "Save the drawing."],
    beforeRun: "The first time you use PDEL on a new client drawing, run it on a copy." },
  { id: "xrdetachall", name: "XRDETACHALL", command: "XRDETACHALL", type: "LSP", category: "cleanup", shape: "circle",
    file: "TODO-confirm: XRDETACHALL.lsp", href: "#", chapter: "", flags: [], stage: "Prepare",
    description: "Detaches every external reference, including stuck ones.",
    problem: "Some external references get stuck: Detach is greyed out.",
    approach: "Clean the hidden reference data first, then detach everything.",
    action: "Removes leftover reference objects and dictionaries, detaches all Xrefs (DWG, image, PDF, DWF, DGN) and regenerates.",
    why: "Drawings hand off cleanly, without stubborn reference errors.",
    steps: ["Open the drawing with the stuck reference.", "In External References, confirm Detach is greyed out.", "Type XRDETACHALL and press Enter.", "Wait for it to finish and regenerate.", "Reopen External References and confirm the list is clean."],
    beforeRun: "This detaches ALL references. Bind any Xref you need before running." },
  { id: "wiperem", name: "WIPEREM", command: "WIPEREM", type: "LSP", category: "cleanup", shape: "circle",
    file: "TODO-confirm: WIPEREM.lsp", href: "#", chapter: "", flags: [], stage: "Clean",
    description: "Deletes every wipeout in the drawing in one run.",
    problem: "Wipeouts hide the linework underneath and confuse mapping and QA.",
    approach: "Remove all wipeouts so the real geometry is visible.",
    action: "Finds wipeout objects and deletes them in one run.",
    why: "Coordinators see every line they need to map.",
    steps: ["Open the drawing.", "Type WIPEREM and press Enter.", "Wait for it to finish.", "Run REGEN and check that hidden linework now shows.", "Save the drawing."],
    beforeRun: "If wipeouts sit inside blocks, run BLKCLEAN or explode the blocks first." },

  /* Block Management */
  { id: "txtdelblk", name: "TXTDELBLK", command: "TXTDELBLK", type: "LSP", category: "blocks", shape: "square",
    file: "TODO-confirm: TXTDELBLK.lsp", href: "#", chapter: "2024-q2", flags: [], stage: "Clean",
    description: "Deletes text, MText and attributes inside the blocks you select.",
    problem: "Text, MText and attributes inside blocks put unwanted labels on the plan.",
    approach: "Edit the selected block definitions at once instead of running REFEDIT on each.",
    action: "Deletes all TEXT, MTEXT and ATTRIBUTE entities inside the selected block definitions.",
    why: "Cleaner plans without opening each block.",
    steps: ["Open the drawing.", "Type TXTDELBLK and press Enter.", "Select the blocks to clean.", "Press Enter to confirm.", "Check that their text is gone."],
    beforeRun: "Only the selected blocks change, but every copy of those blocks is affected." },
  { id: "delblocktext", name: "DELBLOCKTEXT", command: "DELBLOCKTEXT", type: "LSP", category: "blocks", shape: "square",
    file: "TODO-confirm: DELBLOCKTEXT.lsp", href: "#", chapter: "", flags: [], stage: "Clean",
    description: "Deletes text inside blocks across the whole drawing.",
    problem: "Block text often needs clearing across the whole drawing, not just selected blocks.",
    approach: "Apply the TXTDELBLK idea to the whole drawing.",
    action: "Deletes text found inside blocks across the drawing.",
    why: "Consistent, label-free backgrounds before mapping starts.",
    steps: ["Open the drawing.", "Type DELBLOCKTEXT and press Enter.", "Follow the prompts.", "Wait for it to finish.", "Check the drawing and save."],
    beforeRun: "Use TXTDELBLK when you only want to clean some blocks." },
  { id: "blkclean", name: "BLKCLEAN", command: "BLKCLEAN", type: "LSP", category: "blocks", shape: "square",
    file: "BLKCLEAN_v2.lsp", href: "#", chapter: "", flags: [], stage: "Clean",
    description: "Cleans block definitions so they meet ProCAD standards.",
    problem: "Client blocks arrive with messy, inconsistent contents.",
    approach: "Clean each block once, at the definition, so every copy follows.",
    action: "Cleans block definitions so they are ready for ProCAD standards.",
    why: "Stable, predictable blocks across client drawings. Version 2 includes fixes from real drawings.",
    steps: ["Open the drawing.", "Type BLKCLEAN and press Enter.", "Select blocks or the whole drawing.", "Wait for it to finish.", "Check a few blocks, then save."],
    beforeRun: "Load BLKCLEAN_v2.lsp and remove the older version from the Startup Suite." },
  { id: "unanon", name: "UNANON", command: "UNANON", type: "LSP", category: "blocks", shape: "square",
    file: "TODO-confirm: UNANON.lsp", href: "#", chapter: "", flags: [], stage: "Prepare",
    description: "Turns anonymous (*U) blocks into named blocks.",
    problem: "Anonymous (*U) blocks are hard to edit, rename or manage.",
    approach: "Give anonymous blocks real names so they behave like normal blocks.",
    action: "Converts anonymous blocks into named block definitions.",
    why: "Blocks become editable, selectable and easier to clean.",
    steps: ["Open the drawing.", "Type UNANON and press Enter.", "Select blocks, or let it process the drawing.", "Wait for it to finish.", "Check the new names in Properties or BEDIT."],
    beforeRun: "Run UNANON before the other block tools so they can work on the converted blocks." },
  { id: "blockname", name: "BLOCKNAME", command: "BLOCKNAME", type: "LSP", category: "blocks", shape: "square",
    file: "TODO-confirm: BLOCKNAME.lsp", href: "#", chapter: "", flags: [], stage: "Prepare",
    description: "Shows block names quickly for review.",
    problem: "Finding a block's name means digging through the Properties palette.",
    approach: "Show the name quickly and clearly.",
    action: "Shows block names so they can be reviewed fast.",
    why: "Faster block review and clearer talk about blocks.",
    steps: ["Open the drawing.", "Type BLOCKNAME and press Enter.", "Select the blocks to check.", "Read the names.", "Use them with other block tools or in your notes."],
    beforeRun: "Useful before running BLKSETLAYREF or BLKCLEAN." },
  { id: "blksetlayref", name: "BLKSETLAYREF", command: "BLKSETLAYREF", type: "LSP", category: "blocks", shape: "square",
    file: "TODO-confirm: BLKSETLAYREF.lsp", href: "#", chapter: "", flags: [], stage: "Clean",
    description: "Puts the objects inside blocks on one standard reference layer.",
    problem: "Objects inside blocks sit on random layers, so turning layers off or freezing them misbehaves.",
    approach: "Standardize the layers inside blocks in one step.",
    action: "Sets the objects inside blocks to a standard reference layer.",
    why: "Layer on, off and freeze behave as expected.",
    steps: ["Open the drawing.", "Type BLKSETLAYREF and press Enter.", "Select the blocks to update.", "Press Enter and wait.", "Test by turning the layer off and on."],
    beforeRun: "Every copy of the selected blocks is affected." },

  /* QA & Standards */
  { id: "spellcheck", name: "SPELLCHECK", alias: "Client Spell Check", command: "SPELLCHECKBOEING", type: "LSP", category: "qa", shape: "triangle",
    file: "TODO-confirm: SPELLCHECK.lsp", href: "#", chapter: "", flags: ["client"], stage: "QA",
    description: "Flags space-type labels that don't match the approved client list.",
    problem: "Space-type labels with typos or extra spaces cause upload errors.",
    approach: "Check every label against the approved client space-type list.",
    action: "Checks text on SV-TXT-TYPE, trims extra spaces, colors non-matching entries cyan and adds them to a selection set.",
    why: "Clean, client-approved space data before upload.",
    steps: ["Open the mapped drawing.", "Type SPELLCHECKBOEING and press Enter.", "Wait for the check.", "Review every label highlighted in cyan.", "Correct each to the approved space type.", "Run again until nothing is highlighted."],
    beforeRun: "To add space types, open SPELLCHECK.lsp in Notepad, add the type to the list in quotation marks, save and reload." },
  { id: "gapcheck", name: "GAPCHECK", command: "GAPCHECK", type: "LSP", category: "qa", shape: "triangle",
    file: "TODO-confirm: GAPCHECK.lsp", href: "#", chapter: "2024-q3", flags: [], stage: "QA",
    description: "Highlights gaps between space and zone boundaries.",
    problem: "Tiny gaps between space and zone boundaries are almost impossible to see.",
    approach: "Hatch between the boundaries. Any gap shows itself.",
    action: "Hatches the area between space and zone polylines so gaps are highlighted.",
    why: "Boundary defects are found before peer review.",
    steps: ["Make sure space and zone polylines are closed.", "Turn off or freeze all layers except sv_space and sv_zone.", "Type GAPCHECK and press Enter.", "The highlighted hatch areas are the gaps.", "Fix each gap, delete the temporary hatch and run again."],
    beforeRun: "Works only when sv_space and sv_zone are the only layers on." },
  { id: "gapscanfix", name: "GAPSCANFIX", command: "GAPSCANFIX", type: "LSP", category: "qa", shape: "triangle",
    file: "GapScanFix_v1.1.lsp", href: "#", chapter: "2026", flags: [], stage: "QA",
    description: "Scans space boundaries for gaps and fixes them.",
    problem: "GAPCHECK finds gaps, but fixing them is still manual.",
    approach: "Go further: scan for the gaps and repair them.",
    action: "Scans space boundaries for gaps and applies fixes.",
    why: "Fewer correction rounds between production and QA.",
    steps: ["Make sure space polylines are closed.", "Type GAPSCANFIX and press Enter.", "Select the layers or polylines when prompted.", "Review the gaps found and fixed.", "Run GAPCHECK to confirm."],
    beforeRun: "Load GapScanFix_v1.1.lsp. Always review the fixes before upload." },
  { id: "areacheck", name: "AREACHECK", command: "AREACHECK", type: "LSP", category: "qa", shape: "triangle",
    file: "TODO-confirm: AREACHECK.lsp", href: "#", chapter: "2024-q2", flags: [], stage: "QA",
    description: "Checks spaces against interior zones and shows the exceptions.",
    problem: "Spaces don't always line up with interior zones.",
    approach: "Automate the space-to-zone check.",
    action: "Checks spaces against interior zones and shows the exceptions.",
    why: "Stronger spatial QA before upload.",
    steps: ["Open the mapped drawing.", "Type AREACHECK and press Enter.", "Follow the prompts.", "Review each flagged space.", "Fix the boundaries and check again."],
    beforeRun: "Polylines must be closed." },
  { id: "duptype", name: "DUPTYPE", command: "DUPTYPE / DUPTYPENEXT", type: "LSP", category: "qa", shape: "triangle",
    file: "TODO-confirm: DUPTYPE.lsp", href: "#", chapter: "2026", flags: [], stage: "QA",
    description: "Finds rooms with duplicate labels and walks you through them.",
    problem: "Rooms can carry duplicate or conflicting space-type labels.",
    approach: "Find the problem rooms and step through them one by one.",
    action: "Flags rooms with duplicate labels. DUPTYPENEXT zooms to each problem room and selects its labels.",
    why: "Label conflicts become a guided review, not a manual hunt.",
    steps: ["Open the mapped drawing.", "Type DUPTYPE and press Enter.", "Read how many problem rooms were found.", "Type DUPTYPENEXT to zoom to the first one.", "Fix the labels and repeat DUPTYPENEXT until done."],
    beforeRun: "Before first use, type DUPTYPE before loading. If AutoCAD says \"Unknown command\", the name is free. Replace the older labelcheck.lsp in the Startup Suite." },
  { id: "wsdlay", name: "WSDLAY", command: "WSDLAY", type: "LSP", category: "qa", shape: "triangle",
    file: "TODO-confirm: WSDLAY.lsp", href: "#", chapter: "", flags: ["client"], stage: "Export",
    description: "Converts standard layers into the required WSD layers.",
    problem: "Final WSD drawings need exact client layer standards.",
    approach: "Put the final layer conversion into one command.",
    action: "Converts base or standard layers into the required WSD layers.",
    why: "Consistent indoor-mapping deliverables across the team.",
    steps: ["Finish mapping and QA.", "Type WSDLAY and press Enter.", "Wait for the conversion.", "Check the layer list against the WSD standard.", "Fix exceptions by hand, then save."],
    beforeRun: "Run WSDLAY only as the final step." },

  /* Mapping & Geometry */
  { id: "bulkpolyline", name: "BULK POLYLINE", command: "Q4", type: "LSP", category: "mapping", shape: "square",
    file: "BULK POLYLINE Q4.lsp", href: "#", chapter: "2025-q2", flags: [], stage: "Map",
    description: "Creates room boundaries from room labels in one run.",
    problem: "Space boundaries are made one room at a time with BOUNDARY.",
    approach: "Use each room label as the seed point for its boundary.",
    action: "Creates a closed boundary polyline at each selected TEXT or MTEXT insertion point, then removes the temporary construction lines.",
    why: "Many spaces are polylined in one run, the same way every time.",
    steps: ["Make sure each room has one label inside it.", "Type Q4 and press Enter.", "Select the TEXT or MTEXT in the rooms.", "Press Enter and wait.", "Check the polylines and fix any room that failed."],
    beforeRun: "Select only one text per closed area, or you will get duplicate polylines." },
  { id: "xlinem2p", name: "XLINE with M2P", command: "X1 / X2", type: "LSP", category: "mapping", shape: "square",
    file: "TODO-confirm: XLINEM2P.lsp", href: "#", chapter: "", flags: [], stage: "Map",
    description: "Draws construction lines through the midpoint of two points.",
    problem: "A construction line through a midpoint needs Shift + right-click > Mid Between 2 Points every time.",
    approach: "Build the midpoint snap into the command.",
    action: "X1 draws one Xline through the midpoint of two picked points. X2 draws Xlines through two sets of midpoints.",
    why: "Faster, more precise layout during mapping.",
    steps: ["Type X1 and press Enter.", "Pick the first point, then the second.", "The Xline is placed through the midpoint.", "For two lines, type X2 and pick two pairs of points.", "Use the Xlines as guides, then delete them."],
    beforeRun: "Turn on Object Snap so your picks land on wall corners." },
  { id: "gcdonut", name: "GCDONUT", command: "GCDONUT", type: "LSP", category: "mapping", shape: "square",
    file: "TODO-confirm: GCDONUT.lsp", href: "#", chapter: "2026", flags: [], stage: "Map",
    description: "Places a donut at the true center of each closed polyline.",
    problem: "Markers need to sit at the true center of irregular spaces.",
    approach: "Use the area centroid, not the visual center.",
    action: "Places a donut at the area centroid of each closed polyline on the selected layers.",
    why: "Consistent marker placement on every shape.",
    steps: ["Type GCDONUT and press Enter.", "Choose the layers of the closed polylines.", "Wait while the donuts are placed.", "Check the GC-DONUT layer.", "Use the donuts as center references."],
    beforeRun: "Only closed polylines are processed. Output layer: GC-DONUT." },
  { id: "stypestag", name: "STYPESTAG", command: "STYPESTAG", type: "LSP", category: "mapping", shape: "square",
    file: "TODO-confirm: STYPESTAG.lsp", href: "#", chapter: "", flags: [], stage: "Map",
    description: "Tags space polylines with their space types.",
    problem: "Space types are tagged to each space by hand.",
    approach: "Let the drawing tag each space with its type.",
    action: "Tags space polylines with their space types.",
    why: "Consistent space-type data, ready for export and upload.",
    steps: ["Open the mapped drawing.", "Type STYPESTAG and press Enter.", "Choose the space and text layers.", "Wait for the tagging.", "Check a few spaces, then save."],
    beforeRun: "Each space needs exactly one space-type label inside it." },
  { id: "gridnum", name: "GRIDNUM", command: "GRIDNUM", type: "LSP", category: "mapping", shape: "square",
    file: "TODO-confirm: GRIDNUM.lsp", href: "#", chapter: "2026", flags: [], stage: "Map",
    description: "Numbers every space from the grid in one run.",
    problem: "Space numbers are read off the grid and typed into each space.",
    approach: "Let the grid and the space polyline decide the number.",
    action: "Reads the grid, finds each space polyline and places the space number inside it in one run.",
    why: "Faster, more consistent space numbering.",
    steps: ["Open the drawing with the grid and space polylines.", "Type GRIDNUM and press Enter.", "In the dialog, choose the grid, space and output layers.", "Run it.", "Check the numbers and fix any exceptions."],
    beforeRun: "Space polylines must be closed." },

  /* Data & Productivity */
  { id: "boeingdataexport", name: "BOEING DATA EXPORT", alias: "Client Data Export", command: "TODO", type: "LSP", category: "data", shape: "triangle",
    file: "BOEINGDATAEXPORT_V3.3.lsp", href: "#", chapter: "2025-q3", flags: ["client"], stage: "Export",
    description: "Writes space area, centroid and labels to a CSV with building and floor.",
    problem: "Space data is rebuilt by hand in Excel.",
    approach: "Read geometry and labels together and write the data out.",
    action: "Reads SV-SPACE polylines, calculates area (sq ft) and centroid, reads name and type text, finds the PL-AREATYPE, and writes a CSV with building and floor.",
    why: "Reliable, consistently formatted Boeing data.",
    steps: ["Name the file using the building and floor convention.", "Check that spaces are closed and labeled.", "Run the export command.", "Choose where to save the CSV.", "Open it in Excel and review."],
    beforeRun: "Building and floor are read from the file name, so name the file correctly first." },
  { id: "msddataexport", name: "MSDDATAEXPORT", command: "MSDDATAEXPORT", type: "LSP", category: "data", shape: "triangle",
    file: "TODO-confirm: MSDDATAEXPORT.lsp", href: "#", chapter: "", flags: ["client"], stage: "Export",
    description: "Exports MSD space data to a structured file.",
    problem: "MSD also needs structured space data out of CAD.",
    approach: "Reuse the export pattern for a second client.",
    action: "Exports MSD space data from the drawing into a structured file.",
    why: "One good idea scaled to another client.",
    steps: ["Check that spaces are closed and labeled.", "Type MSDDATAEXPORT and press Enter.", "Follow the prompts.", "Choose where to save the file.", "Open and review it in Excel."],
    beforeRun: "Follow MSD layer and naming standards before exporting." },
  { id: "layerstates", name: "LAYER STATE SHORTCUTS", command: "Q1 / Q2 / Q3", type: "LSP", category: "data", shape: "triangle",
    file: "TODO-confirm: LAYERSTATES.lsp", href: "#", chapter: "", flags: [], stage: "Prepare",
    description: "Restores the three most-used layer states with short commands.",
    problem: "Switching layer states means opening the Layer States Manager every time.",
    approach: "Give the three most-used states their own short commands.",
    action: "Q1 restores ALL LAYERS, Q2 restores SPACE BPOLY and Q3 restores SV UPLOAD.",
    why: "Everyone switches views the same way.",
    steps: ["Make sure the drawing has the three layer states saved.", "Type Q1 to show all layers.", "Type Q2 for the space boundary view.", "Type Q3 for the Serraview upload view.", "Keep working in the restored view."],
    beforeRun: "State names must match exactly: ALL LAYERS, SPACE BPOLY, SV UPLOAD. The older version used L1 / L2 / L3." },
  { id: "slon", name: "SLON", command: "SLON", type: "LSP", category: "data", shape: "triangle",
    file: "TODO-confirm: SLON.lsp", href: "#", chapter: "", flags: [], stage: "Prepare",
    description: "Turns the review layers back on in one step.",
    problem: "Turning the right layers back on is repetitive.",
    approach: "One short command brings them back.",
    action: "Turns on the layers needed for review in one step.",
    why: "Quicker, consistent review setup.",
    steps: ["Type SLON and press Enter.", "The layers turn on.", "Continue your review."],
    beforeRun: "Use after isolating layers for checks such as GAPCHECK." },
  { id: "smartselect", name: "SMARTSELECT", command: "SMARTSELECT", type: "LSP", category: "data", shape: "triangle",
    file: "TODO-confirm: SMARTSELECT.lsp", href: "#", chapter: "2026", flags: [], stage: "Prepare",
    description: "Selects similar objects by shape, length, area or size.",
    problem: "Select Similar can't match objects by shape, length, area or size.",
    approach: "Let the user decide what \"similar\" means.",
    action: "Selects matching objects using checkbox criteria: shape, length, area and size.",
    why: "Complex selections become fast and precise.",
    steps: ["Select one or more sample objects.", "Type SMARTSELECT and press Enter.", "Tick the criteria to match.", "Click OK.", "All matches are selected. Continue with your command."],
    beforeRun: "Fewer criteria give a wider selection. More criteria give a stricter match." },

  /* Adopted Community Tools */
  { id: "numinc", name: "NUMINC", command: "NUMINC", type: "LSP", category: "community", shape: "circle",
    file: "NumIncV3-9.lsp", href: "#", chapter: "", flags: ["leemac"], stage: "Map",
    description: "Places incrementing numbers or text with prefix, suffix and step.",
    problem: "Numbering by hand is slow and skips or repeats numbers.",
    approach: "Adopt a proven community tool instead of building one.",
    action: "Places incrementing numbers or text with prefix, suffix and step options.",
    why: "Reliable numbering from a trusted, well-tested tool.",
    steps: ["Type NUMINC and press Enter.", "Set the start number, step, prefix and suffix.", "Set the text style and layer.", "Click OK and pick the placement points.", "Press Enter or Esc to finish."],
    beforeRun: "Load NumIncV3-9.lsp. Keep Lee Mac's header in the file." },
  { id: "bfind", name: "BFIND", command: "BFIND", type: "LSP", category: "community", shape: "circle",
    file: "BFindV2-0.lsp", href: "#", chapter: "", flags: ["leemac"], stage: "Prepare",
    description: "Finds and replaces text across many drawings in one run.",
    problem: "Text corrections are needed across many drawings at once.",
    approach: "Use a proven batch find-and-replace tool.",
    action: "Finds and replaces text across multiple drawings in one run.",
    why: "Large text changes, handled consistently.",
    steps: ["Type BFIND and press Enter.", "Enter the text to find and its replacement.", "Choose the drawings or folder.", "Click Run.", "Review the report, then open a few drawings to check."],
    beforeRun: "Load BFindV2-0.lsp. Back up the drawings first." },

  /* Python Software */
  { id: "imagetodxf", name: "ImageToDXF", command: "ImageToDXF.exe", type: "Python", category: "python", shape: "triangle",
    file: "ImageToDXF.exe", href: "#", chapter: "2026", flags: [], stage: "Prepare",
    description: "Turns a floor-plan image into a DXF.",
    problem: "Some floors arrive only as images, with no CAD file.",
    approach: "Turn the image into usable CAD linework.",
    action: "Reads a floor-plan image and generates a DXF.",
    why: "Image-only floors can enter the normal CAD workflow.",
    steps: ["Double-click ImageToDXF.exe.", "Click Open and choose the image (PNG or JPG).", "Adjust the settings and preview.", "Click Export and choose where to save the DXF.", "Open it in AutoCAD, scale to a known dimension and clean up."],
    beforeRun: "Clear, high-resolution images give the best linework." },
  { id: "centertotext", name: "CenterToText", command: "CenterToText.exe", type: "Python", category: "python", shape: "triangle",
    file: "CenterToText.exe", href: "#", chapter: "2026", flags: [], stage: "Map",
    description: "Moves or places text at the center of each space.",
    problem: "Text is moved to the center of each space by hand.",
    approach: "Let the geometry find the center and place the text there.",
    action: "Finds the center of each space and places or moves the text there.",
    why: "Neat, consistent labels in every space.",
    steps: ["Double-click CenterToText.exe.", "Open the DXF file.", "Choose the space layer and the text layer.", "Click Run.", "Save the DXF and check it in AutoCAD."],
    beforeRun: "Save the drawing as DXF and close it in AutoCAD first." },
  { id: "texttranslator", name: "TextTranslator", command: "TextTranslator.exe", type: "Python", category: "python", shape: "triangle",
    file: "TextTranslator.exe", href: "#", chapter: "2026", flags: [], stage: "Prepare",
    description: "Translates drawing text into another language.",
    problem: "Drawings from global sites arrive with labels in other languages.",
    approach: "Translate drawing text without retyping it.",
    action: "Reads drawing text and produces translated labels.",
    why: "Global floors become readable and mappable faster.",
    steps: ["Double-click TextTranslator.exe.", "Open the DXF file.", "Choose the source and target languages.", "Click Translate and review.", "Save the translated DXF and check it in AutoCAD."],
    beforeRun: "Always review translated room names and space types before upload." }
];

/* =====================================================================
   LOGIC
   ===================================================================== */
(function () {
  "use strict";

  /* ---------- 1. Utilities ---------- */
  var doc = document;
  function $(s, r) { return (r || doc).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || doc).querySelectorAll(s)); }
  var reduce = !!(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  function esc(v) {
    return String(v == null ? "" : v).replace(/&/g, "&amp;").replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }
  function isTodo(v) { return v == null || v === "" || /^TODO/.test(String(v)); }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function cat(id) { for (var i = 0; i < CATEGORIES.length; i++) if (CATEGORIES[i].id === id) return CATEGORIES[i]; return null; }
  function tool(id) { for (var i = 0; i < TOOLS.length; i++) if (TOOLS[i].id === id) return TOOLS[i]; return null; }
  function chIdx(id) { for (var i = 0; i < TIMELINE.length; i++) if (TIMELINE[i].id === id) return i; return -1; }
  function has(t, f) { return (t.flags || []).indexOf(f) !== -1; }
  function nameOf(t) { return (!CONFIG.SHOW_CLIENT_NAMES && t.alias) ? t.alias : t.name; }
  function plain(s) { return CONFIG.SHOW_CLIENT_NAMES ? String(s) : String(s).replace(/Boeing/gi, "client"); }
  function cmdOf(t) { return isTodo(t.command) ? "TODO" : t.command; }
  function label(ch) { return ch.quarter ? "Q" + ch.quarter + " " + ch.year : String(ch.year); }
  /* Only same-folder relative paths or http(s) URLs; "#" and TODO count as "no link". */
  function linkOf(t) {
    var h = String(t.href || "").trim();
    if (!h || h === "#" || isTodo(h)) return null;
    if (/^https?:\/\//i.test(h)) return h;
    if (/^[a-z][a-z0-9+.-]*:/i.test(h)) return null;
    return h;
  }

  /* Shape marker. Decorative when next to visible text (aria-hidden), labelled otherwise. */
  function shape(c, size, labelled) {
    var s = size || 12, sh = c ? c.shape : "square";
    var cls = "mk mk-" + (c ? c.color : "grey") + (c && c.outline ? " mk-outline" : "");
    var g = sh === "circle" ? '<circle cx="6" cy="6" r="5"/>'
          : sh === "triangle" ? '<path d="M6 1 11 11H1Z"/>'
          : '<rect x="1" y="1" width="10" height="10"/>';
    var a = c ? c.name + ", " + (c.outline ? "outline " : "") + c.color + " " + sh : "Uncategorised";
    return '<svg class="' + cls + '" width="' + s + '" height="' + s + '" viewBox="0 0 12 12" ' +
      (labelled ? 'role="img" aria-label="' + esc(a) + '"' : 'aria-hidden="true" focusable="false" aria-label="' + esc(a) + '"') + ">" + g + "</svg>";
  }
  function chip(t, extra) {
    return '<button type="button" class="chip' + (extra ? " " + extra : "") + '" data-tool="' + esc(t.id) + '">' +
      shape(cat(t.category), 10) + "<code>" + esc(t.type === "Python" ? nameOf(t) : (isTodo(t.command) ? nameOf(t) : t.command)) + "</code>" +
      '<span class="sr-only">, open details</span></button>';
  }

  /* ---------- 2. Derived numbers ---------- */
  var years = TIMELINE.map(function (c) { return c.year; });
  var usedCats = CATEGORIES.filter(function (c) { return TOOLS.some(function (t) { return t.category === c.id; }); });
  var S = {
    total: TOOLS.length,
    lsp: TOOLS.filter(function (t) { return t.type === "LSP"; }).length,
    python: TOOLS.filter(function (t) { return t.type === "Python"; }).length,
    y0: years.length ? Math.min.apply(null, years) : "TODO",
    y1: years.length ? Math.max.apply(null, years) : "TODO"
  };

  /* ---------- 3. Theme switch ---------- */
  function isDark() {
    var a = doc.documentElement.getAttribute("data-theme");
    if (a) return a === "dark";
    return !!(window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches);
  }
  function initTheme() {
    var sw = $("#theme-switch"), saved = null;
    try { saved = localStorage.getItem("pa-theme"); } catch (e) { saved = null; }
    if (saved === "dark" || saved === "light") doc.documentElement.setAttribute("data-theme", saved);
    function sync() { sw.setAttribute("aria-checked", isDark() ? "true" : "false"); }
    sw.addEventListener("click", function () {
      var next = isDark() ? "light" : "dark";
      doc.documentElement.setAttribute("data-theme", next);
      try { localStorage.setItem("pa-theme", next); } catch (e) { /* storage unavailable */ }
      sync();
    });
    sync();
  }

  /* ---------- 4. Hero text ---------- */
  function initText() {
    $("#hero-years").textContent = S.y0 + "\u2013" + S.y1;
    $("#legend-hero").innerHTML = usedCats.map(function (c) {
      return "<li>" + shape(c, 10) + "<span>" + esc(c.name) + "</span></li>";
    }).join("");
  }

  /* ---------- 5. Before/after diagrams ---------- */
  function diagram(ch) {
    var L = 'fill="none" stroke="currentColor" stroke-width="1"', b = "", a = "";
    switch (ch.diagram) {
      case "hatch":
        b = '<rect x="4" y="8" width="64" height="44" ' + L + "/>" + [0, 1, 2, 3, 4, 5].map(function (i) { return '<line x1="' + (4 + i * 10) + '" y1="52" x2="' + (18 + i * 10) + '" y2="8" stroke="currentColor" stroke-width="1"/>'; }).join("");
        a = '<rect x="4" y="8" width="64" height="44" ' + L + "/>"; break;
      case "layers":
        b = [0, 1, 2, 3, 4].map(function (i) { return '<line x1="' + (4 + (i % 3) * 8) + '" y1="' + (12 + i * 9) + '" x2="' + (36 + i * 6) + '" y2="' + (12 + i * 9) + '" stroke="currentColor" stroke-width="2"/>'; }).join("");
        a = [0, 1, 2].map(function (i) { return '<line x1="4" y1="' + (16 + i * 14) + '" x2="68" y2="' + (16 + i * 14) + '" stroke="currentColor" stroke-width="2"/>'; }).join(""); break;
      case "gap":
        b = '<rect x="4" y="8" width="28" height="44" ' + L + '/><rect x="40" y="8" width="28" height="44" ' + L + '/><rect class="dg-acc" x="32" y="8" width="8" height="44"/>';
        a = '<rect x="4" y="8" width="32" height="44" ' + L + '/><rect x="36" y="8" width="32" height="44" ' + L + "/>"; break;
      case "export":
        b = '<rect x="4" y="8" width="64" height="44" ' + L + '/><path d="M12 20h24M12 30h36M12 40h16" stroke="currentColor" stroke-dasharray="2 3"/>';
        a = '<rect x="4" y="8" width="64" height="44" ' + L + '/><path d="M4 19h64M4 30h64M4 41h64M28 8v44" stroke="currentColor"/>'; break;
      case "boundary":
        b = '<rect x="4" y="8" width="64" height="44" ' + L + '/><line x1="36" y1="8" x2="36" y2="52" stroke="currentColor"/><circle cx="20" cy="30" r="2" fill="currentColor"/><circle cx="52" cy="30" r="2" fill="currentColor"/>';
        a = '<rect x="6" y="10" width="28" height="40" fill="none" stroke="currentColor" stroke-width="2.5"/><rect x="38" y="10" width="28" height="40" fill="none" stroke="currentColor" stroke-width="2.5"/>'; break;
      case "data":
        b = [0, 1, 2, 3].map(function (i) { return '<line x1="4" y1="' + (14 + i * 11) + '" x2="68" y2="' + (14 + i * 11) + '" stroke="currentColor"' + (i % 2 ? ' stroke-dasharray="2 4"' : "") + "/>"; }).join("");
        a = [0, 1, 2, 3].map(function (i) { return '<line x1="4" y1="' + (14 + i * 11) + '" x2="68" y2="' + (14 + i * 11) + '" stroke="currentColor"/>'; }).join(""); break;
      case "toolkit":
        b = '<rect x="20" y="14" width="32" height="32" ' + L + "/>";
        a = '<rect x="4" y="14" width="32" height="32" ' + L + '/><path d="M54 14 70 46H38Z" ' + L + "/>"; break;
    }
    return '<svg class="dg" viewBox="0 0 200 72" role="img" aria-label="' + esc("Before: " + ch.before + ". After: " + ch.after + ".") + '">' +
      "<g>" + b + '</g><path class="dg-arr" d="M84 30h28M106 25l6 5-6 5" fill="none" stroke="currentColor"/>' +
      '<g transform="translate(126 0)">' + a + "</g>" +
      '<text x="4" y="68" class="dg-t">BEFORE</text><text x="130" y="68" class="dg-t">AFTER</text></svg>';
  }

  /* ---------- 6. Timeline (ruler on desktop, rail on mobile) ---------- */
  function quarterCol(ch) { return (ch.year - CONFIG.AXIS.startYear) * 4 + (ch.quarter || 1); }
  function renderTimeline() {
    var nYears = CONFIG.AXIS.endYear - CONFIG.AXIS.startYear + 1, cols = nYears * 4;
    var host = $("#axis");
    host.style.setProperty("--cols", cols);
    var ticks = "";
    for (var q = 0; q < cols; q++) {
      var y = CONFIG.AXIS.startYear + Math.floor(q / 4), qn = (q % 4) + 1;
      ticks += '<span class="tick' + (qn === 1 ? " tick-year" : "") + '" style="grid-column:' + (q + 1) + '">' + (qn === 1 ? "<b>" + y + "</b>" : "") + "<i>Q" + qn + "</i></span>";
    }
    var html = '<div class="ruler" aria-hidden="true">' + ticks + "</div>";
    TIMELINE.forEach(function (ch, i) {
      var c = cat(ch.category), col = quarterCol(ch), span = ch.quarter ? 1 : 4;
      var tools = TOOLS.filter(function (t) { return t.chapter === ch.id; });
      html += '<button type="button" class="node' + (span > 1 ? " node-span" : "") + '" id="node-' + esc(ch.id) + '" data-i="' + i + '" aria-expanded="false" aria-controls="ch-' + esc(ch.id) + '" style="grid-column:' + col + " / span " + span + '">' +
        '<span class="node-mark">' + shape(c, 16) + '</span><span class="node-q">' + esc(label(ch)) + '</span><span class="node-t">' + esc(ch.title) + "</span></button>" +
        '<section class="chapter" id="ch-' + esc(ch.id) + '" aria-labelledby="ch-' + esc(ch.id) + '-h" hidden>' +
          '<div class="ch-text"><p class="kicker">' + esc(label(ch)) + " · " + pad(i + 1) + " / " + pad(TIMELINE.length) + "</p>" +
          '<h3 class="ch-h" id="ch-' + esc(ch.id) + '-h">' + esc(ch.title) + "</h3>" +
          '<p class="ch-p">' + esc(plain(ch.text)) + "</p>" +
          '<p class="kicker">Tools introduced</p>' +
          (tools.length ? '<div class="chips">' + tools.map(function (t) { return chip(t); }).join("") + "</div>"
                        : '<p class="muted">This milestone has no separate entry in the toolkit.</p>') +
          "</div>" +
          '<figure class="ch-fig">' + diagram(ch) + "<figcaption>" + esc(ch.before) + " \u2192 " + esc(ch.after) + "</figcaption></figure>" +
        "</section>";
    });
    host.innerHTML = html;
    $$(".node", host).forEach(function (b) {
      b.addEventListener("click", function () { select(+b.getAttribute("data-i"), false); });
      b.addEventListener("keydown", function (e) {
        var k = e.key, i = +b.getAttribute("data-i"), n = null;
        if (k === "ArrowRight" || k === "ArrowDown") n = Math.min(TIMELINE.length - 1, i + 1);
        if (k === "ArrowLeft" || k === "ArrowUp") n = Math.max(0, i - 1);
        if (k === "Home") n = 0;
        if (k === "End") n = TIMELINE.length - 1;
        if (n !== null) { e.preventDefault(); select(n, true); }
      });
    });
    select(0, false);
  }
  function select(i, focus) {
    $$(".node").forEach(function (b, j) {
      var on = j === i;
      b.setAttribute("aria-expanded", String(on));
      b.classList.toggle("is-on", on);
      $("#" + b.getAttribute("aria-controls")).hidden = !on;
    });
    if (focus) $$(".node")[i].focus();
  }

  /* ---------- 7. Toolkit infographics ---------- */
  function renderComposition() {
    var rows = usedCats.map(function (c) { return { c: c, n: TOOLS.filter(function (t) { return t.category === c.id; }).length }; });
    var total = S.total || 1, x = 0;
    var segs = rows.map(function (r) {
      var w = r.n / total * 1000;
      var s = '<rect class="seg seg-' + r.c.color + (r.c.outline ? " seg-outline" : "") + '" x="' + x.toFixed(2) + '" y="0" width="' + w.toFixed(2) + '" height="32"/>';
      x += w; return s;
    }).join("");
    var aria = "Tools per category: " + rows.map(function (r) { return r.c.name + " " + r.n; }).join(", ") + ". Total " + S.total + ".";
    $("#comp-bar").innerHTML = '<svg viewBox="0 0 1000 32" preserveAspectRatio="none" role="img" aria-label="' + esc(aria) + '">' + segs + "</svg>";
    $("#comp-body").innerHTML = rows.map(function (r, i) {
      return "<tr><td class=\"num\">" + pad(i + 1) + "</td><td>" + shape(r.c, 12, true) + "</td><th scope=\"row\">" + esc(r.c.name) + '</th><td class="num">' + r.n + '</td><td class="num">' + Math.round(r.n / total * 100) + "%</td></tr>";
    }).join("");
    $("#comp-total").textContent = String(S.total);
  }
  function renderPipeline() {
    var host = $("#pipe");
    host.innerHTML = CONFIG.STAGES.map(function (s, i) {
      var list = TOOLS.filter(function (t) { return t.stage === s; });
      return '<li class="stage"><div class="stage-h"><span class="stage-n">' + pad(i + 1) + '</span><span class="stage-t">' + esc(s) + '</span><span class="stage-c">' + list.length + '</span></div><div class="chips">' + list.map(function (t) { return chip(t, "pchip"); }).join("") + "</div></li>";
    }).join("");
    var none = TOOLS.filter(function (t) { return CONFIG.STAGES.indexOf(t.stage) === -1; });
    if (none.length) host.insertAdjacentHTML("beforeend", '<li class="stage"><div class="stage-h"><span class="stage-t">Unassigned</span><span class="stage-c">' + none.length + '</span></div><div class="chips">' + none.map(function (t) { return chip(t, "pchip"); }).join("") + "</div></li>");
    function hl(e, on) {
      var c = e.target.closest && e.target.closest(".pchip"); if (!c) return;
      host.classList.toggle("has-hl", on);
      c.classList.toggle("is-hl", on);
    }
    host.addEventListener("mouseover", function (e) { hl(e, true); });
    host.addEventListener("mouseout", function (e) { hl(e, false); });
    host.addEventListener("focusin", function (e) { hl(e, true); });
    host.addEventListener("focusout", function (e) { hl(e, false); });
  }
  function renderRatio() {
    var a = S.lsp, b = S.python, max = Math.max(a, b, 1), side = 160;
    var sa = Math.sqrt(a / max) * side, sb = Math.sqrt(b / max) * side;
    var aria = "Area-proportional squares: AutoLISP " + a + " tools, Python " + b + " tools.";
    $("#ratio").innerHTML = '<svg viewBox="0 0 ' + (side * 2 + 48) + " " + (side + 4) + '" role="img" aria-label="' + esc(aria) + '">' +
      '<rect class="r-a" x="2" y="' + (side + 2 - sa).toFixed(1) + '" width="' + sa.toFixed(1) + '" height="' + sa.toFixed(1) + '"/>' +
      '<rect class="r-b" x="' + (side + 46) + '" y="' + (side + 2 - sb).toFixed(1) + '" width="' + sb.toFixed(1) + '" height="' + sb.toFixed(1) + '"/>' +
      '<line class="r-base" x1="0" y1="' + (side + 2) + '" x2="' + (side * 2 + 48) + '" y2="' + (side + 2) + '"/></svg>';
    $("#ratio-key").innerHTML = '<div><dt><span class="sw sw-a" aria-hidden="true"></span>AutoLISP</dt><dd>' + a + " · " + Math.round(a / (a + b || 1) * 100) + '%</dd></div><div><dt><span class="sw sw-b" aria-hidden="true"></span>Python</dt><dd>' + b + " · " + Math.round(b / (a + b || 1) * 100) + "%</dd></div>";
  }

  /* ---------- 8. Downloads list ---------- */
  var st = { q: "", cat: "all", type: "all", sort: "az" };
  function renderFilters() {
    var host = $("#cat-filters");
    host.innerHTML = '<button type="button" class="fchip" data-cat="all" aria-pressed="true">All</button>' +
      usedCats.map(function (c) { return '<button type="button" class="fchip" data-cat="' + esc(c.id) + '" aria-pressed="false">' + shape(c, 10) + esc(c.name) + "</button>"; }).join("");
    host.addEventListener("click", function (e) {
      var b = e.target.closest(".fchip"); if (!b) return;
      st.cat = b.getAttribute("data-cat");
      $$(".fchip", host).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
      renderList();
    });
    $$("#type-seg button").forEach(function (b) {
      b.addEventListener("click", function () {
        st.type = b.getAttribute("data-type");
        $$("#type-seg button").forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        renderList();
      });
    });
    $("#filters").addEventListener("submit", function (e) { e.preventDefault(); });
    $("#q").addEventListener("input", function (e) { st.q = e.target.value; renderList(); });
    $("#sort").addEventListener("change", function (e) { st.sort = e.target.value; renderList(); });
    $("#reset").addEventListener("click", function () {
      st.q = ""; st.cat = "all"; st.type = "all"; $("#q").value = "";
      $$(".fchip").forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-cat") === "all")); });
      $$("#type-seg button").forEach(function (x) { x.setAttribute("aria-pressed", String(x.getAttribute("data-type") === "all")); });
      renderList(); $("#q").focus();
    });
  }
  function ok(t) {
    if (st.cat !== "all" && t.category !== st.cat) return false;
    if (st.type !== "all" && t.type !== st.type) return false;
    var q = st.q.trim().toLowerCase();
    return !q || [nameOf(t), t.name, t.command, t.description].join(" ").toLowerCase().indexOf(q) !== -1;
  }
  function dlButton(t, cls) {
    var u = CONFIG.DOWNLOADS_ENABLED ? linkOf(t) : null;
    if (u) return '<a class="btn btn-dl ' + (cls || "") + '" href="' + esc(u) + '" download>Download<span class="sr-only"> ' + esc(nameOf(t)) + "</span></a>";
    return '<button type="button" class="btn btn-dl ' + (cls || "") + '" disabled title="' + esc(CONFIG.DOWNLOAD_HINT) + '">Download<span class="sr-only"> ' + esc(nameOf(t)) + ", " + esc(CONFIG.DOWNLOAD_HINT) + "</span></button>";
  }
  function badges(t) {
    return (has(t, "client") ? '<span class="badge">Client-specific</span>' : "") +
           (has(t, "leemac") ? '<span class="badge">Credit: Lee Mac</span>' : "");
  }
  function renderList() {
    var list = TOOLS.filter(ok);
    if (st.sort === "az") list.sort(function (a, b) { return nameOf(a).localeCompare(nameOf(b)); });
    else list.sort(function (a, b) {
      var x = chIdx(a.chapter), y = chIdx(b.chapter);
      x = x < 0 ? 1e3 : x; y = y < 0 ? 1e3 : y;
      return x - y || nameOf(a).localeCompare(nameOf(b));
    });
    $("#count").textContent = list.length + (list.length === 1 ? " tool" : " tools") + " of " + S.total;
    $("#empty").hidden = list.length > 0;
    $("#list-head").hidden = list.length === 0;
    $("#rows").innerHTML = list.map(function (t) {
      var c = cat(t.category), i = chIdx(t.chapter);
      return '<li class="row">' +
        '<span class="r-mk">' + shape(c, 12, true) + "</span>" +
        '<div class="r-name"><h3>' + esc(nameOf(t)) + "</h3><code>" + esc(cmdOf(t)) + "</code></div>" +
        '<p class="r-desc">' + esc(plain(t.description)) + "</p>" +
        '<div class="r-meta"><span class="r-type">' + esc(t.type === "Python" ? "Python" : "LSP") + "</span>" +
          (i >= 0 ? '<span class="r-date">' + esc(label(TIMELINE[i])) + "</span>" : "") + badges(t) + "</div>" +
        '<div class="r-act"><button type="button" class="btn btn-line" data-tool="' + esc(t.id) + '">Details<span class="sr-only"> for ' + esc(nameOf(t)) + "</span></button>" + dlButton(t) + "</div>" +
        "</li>";
    }).join("");
  }
  /* Real download for text files (.lsp) when the site runs over http(s).
     Opened from a folder (file:///), browsers decide; right-click → Save link as always works. */
  function initDownloads() {
    doc.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.btn-dl");
      if (!a || !/^https?:$/.test(location.protocol) || !window.fetch) return;
      e.preventDefault();
      var url = a.getAttribute("href");
      var name = decodeURIComponent(url.split("/").pop().split("?")[0]);
      fetch(url, { credentials: "include" })
        .then(function (r) { if (!r.ok) throw new Error(String(r.status)); return r.blob(); })
        .then(function (blob) {
          var u = URL.createObjectURL(blob), x = doc.createElement("a");
          x.href = u; x.download = name;
          doc.body.appendChild(x); x.click(); x.remove();
          setTimeout(function () { URL.revokeObjectURL(u); }, 1000);
        })
        .catch(function () { window.location.href = url; });
    });
  }

  /* ---------- 9. Tool sheet ---------- */
  var lastFocus = null, typer = null;
  function terminal(t) {
    return '<svg class="term" viewBox="0 0 480 160" role="img" aria-label="' + esc("Command line typing " + cmdOf(t)) + '">' +
      '<rect class="t-bg" width="480" height="160"/>' +
      '<line class="t-rule" x1="0" y1="112" x2="480" y2="112"/>' +
      '<text class="t-dim" x="20" y="44">Regenerating model.</text>' +
      '<text class="t-dim" x="20" y="72">AutoCAD menu utilities loaded.</text>' +
      '<text class="t-txt" x="20" y="142">Command: <tspan class="t-cmd"></tspan><tspan class="t-caret">\u258F</tspan></text></svg>';
  }
  function type(svg, text) {
    if (typer) { clearInterval(typer); typer = null; }
    var span = $(".t-cmd", svg); if (!span) return;
    if (reduce) { span.textContent = text; return; }
    var i = 0; span.textContent = "";
    typer = setInterval(function () { i++; span.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(typer); typer = null; } }, 70);
  }
  function openTool(id, fromHash) {
    var t = tool(id); if (!t) return;
    var sheet = $("#sheet"), c = cat(t.category);
    if (sheet.hidden) lastFocus = doc.activeElement;
    $("#s-mark").innerHTML = shape(c, 20, true);
    $("#s-cat").textContent = c ? c.name : "TODO";
    $("#s-title").textContent = nameOf(t);
    $("#s-cmd").textContent = (t.type === "Python" ? "Run " : "Command ") + cmdOf(t);
    $("#s-badges").innerHTML = '<span class="badge">' + esc(t.type) + "</span>" + badges(t) +
      (chIdx(t.chapter) >= 0 ? '<span class="badge">' + esc(label(TIMELINE[chIdx(t.chapter)])) + "</span>" : "");
    $("#s-problem").textContent = plain(t.problem || "TODO");
    $("#s-approach").textContent = plain(t.approach || "TODO");
    $("#s-action").textContent = plain(t.action || "TODO");
    $("#s-why").textContent = plain(t.why || "TODO");
    $("#s-steps").innerHTML = (t.steps && t.steps.length ? t.steps : ["TODO"]).map(function (s) { return "<li>" + esc(s) + "</li>"; }).join("");
    $("#s-before").textContent = t.beforeRun || "TODO";
    $("#s-file").textContent = t.file || "TODO";
    $("#s-dl").innerHTML = dlButton(t);
    var media = $("#s-media"), cmd = t.type === "Python" ? cmdOf(t) : cmdOf(t).split(" / ")[0];
    media.innerHTML = terminal(t);
    type(media.firstChild, cmd);
    if ((CONFIG.SCREENS || []).indexOf(t.id) !== -1) {
      var img = new Image();
      img.alt = "Screen recording: " + nameOf(t) + " in use";
      img.onload = function () { if ($("#s-title").textContent === nameOf(t)) { if (typer) clearInterval(typer); media.innerHTML = ""; media.appendChild(img); } };
      img.src = "assets/screens/" + encodeURIComponent(t.id) + "." + CONFIG.SCREEN_EXT;
    }
    sheet.hidden = false; $("#scrim").hidden = false;
    requestAnimationFrame(function () { sheet.classList.add("is-open"); });
    doc.body.classList.add("locked");
    $$("body > *:not(#sheet):not(#scrim):not(script)").forEach(function (el) { el.setAttribute("inert", ""); });
    $("#s-body").scrollTop = 0;
    $("#s-close").focus();
    if (!fromHash && location.hash !== "#tool=" + t.id) history.replaceState(null, "", "#tool=" + t.id);
  }
  function closeTool() {
    var sheet = $("#sheet"); if (sheet.hidden) return;
    if (typer) { clearInterval(typer); typer = null; }
    sheet.classList.remove("is-open"); sheet.hidden = true; $("#scrim").hidden = true;
    doc.body.classList.remove("locked");
    $$("[inert]").forEach(function (el) { el.removeAttribute("inert"); });
    if (/^#tool=/.test(location.hash)) history.replaceState(null, "", location.pathname + location.search);
    if (lastFocus && doc.contains(lastFocus) && lastFocus.focus) lastFocus.focus();
  }
  function keys(e) {
    var sheet = $("#sheet"); if (sheet.hidden) return;
    if (e.key === "Escape") { e.preventDefault(); closeTool(); return; }
    if (e.key !== "Tab") return;
    var f = $$('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])', sheet).filter(function (el) { return el.getClientRects().length; });
    if (!f.length) return;
    if (e.shiftKey && doc.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
    else if (!e.shiftKey && doc.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
  }
  function onHash() {
    var m = /^#tool=([a-z0-9_-]+)$/i.exec(location.hash);
    if (m) openTool(m[1].toLowerCase(), true); else closeTool();
  }

  /* ---------- 10. Install segmented control ---------- */
  function initTabs() {
    var tabs = $$('#install-tabs [role="tab"]');
    function pick(t, f) {
      tabs.forEach(function (x) {
        var on = x === t;
        x.setAttribute("aria-selected", String(on)); x.tabIndex = on ? 0 : -1;
        $("#" + x.getAttribute("aria-controls")).hidden = !on;
      });
      if (f) t.focus();
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { pick(t, false); });
      t.addEventListener("keydown", function (e) {
        var n = { ArrowRight: tabs[(i + 1) % tabs.length], ArrowLeft: tabs[(i - 1 + tabs.length) % tabs.length], Home: tabs[0], End: tabs[tabs.length - 1] }[e.key];
        if (n) { e.preventDefault(); pick(n, true); }
      });
    });
  }

  /* ---------- 11. Reveal, nav state ---------- */
  function initMotion() {
    if (reduce || !("IntersectionObserver" in window)) return;
    doc.documentElement.classList.add("motion");
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
    }, { threshold: 0.12 });
    $$(".reveal, .draw").forEach(function (el) { io.observe(el); });
  }
  function initNav() {
    var links = $$(".nav-links a");
    if (!("IntersectionObserver" in window)) return;
    var io = new IntersectionObserver(function (es) {
      es.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) {
          var on = a.getAttribute("href") === "#" + e.target.id;
          a.classList.toggle("is-on", on);
          if (on) a.setAttribute("aria-current", "location"); else a.removeAttribute("aria-current");
        });
      });
    }, { rootMargin: "-40% 0px -55% 0px" });
    links.forEach(function (a) { var s = $(a.getAttribute("href")); if (s) io.observe(s); });
  }

  /* ---------- 12. Boot ---------- */
  function boot() {
    $("#dl-hint").textContent = CONFIG.DOWNLOADS_ENABLED ? "" : CONFIG.DOWNLOAD_HINT;
    initTheme(); initText(); renderTimeline();
    renderComposition(); renderPipeline(); renderRatio();
    renderFilters(); renderList(); initDownloads(); initTabs(); initMotion(); initNav();
    doc.addEventListener("click", function (e) {
      var b = e.target.closest && e.target.closest("[data-tool]");
      if (b && !b.closest("#sheet")) { e.preventDefault(); openTool(b.getAttribute("data-tool")); }
    });
    $("#s-close").addEventListener("click", closeTool);
    $("#scrim").addEventListener("click", closeTool);
    doc.addEventListener("keydown", keys);
    window.addEventListener("hashchange", onHash);
    onHash();
  }
  /* script.js loads at the end of <body>, so the DOM is ready: boot before first paint (no layout shift). */
  if (doc.getElementById("sheet")) boot();   // other pages (play/quiz.html) reuse the data only
})();
