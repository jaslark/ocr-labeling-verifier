import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from "react";
import { Sidebar } from "./components/Sidebar";
import { Editor } from "./components/Editor";
import { OcrItem, FilterState } from "./types";
import { FolderOpen, Download, Loader2, AlertTriangle } from "lucide-react";

// Using API_KEY
const apiKey = process.env.API_KEY;

// Using GEMINI_API_KEY
const geminiApiKey = process.env.GEMINI_API_KEY;

export default function App() {
  const [items, setItems] = useState<OcrItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [isLoading, setIsLoading] = useState(false);
  const [folderName, setFolderName] = useState<string>("");
  const [filters, setFilters] = useState<FilterState>({
    search: "",
    sort: "filename_asc",
    showOnlyUnverified: false,
  });

  // Ref for the legacy file input
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Helper to cleanup old object URLs to prevent memory leaks
  const cleanup = () => {
    items.forEach((item) => {
      if (item.objectUrl) URL.revokeObjectURL(item.objectUrl);
    });
  };

  const handleApiCall = async () => {
    const response = await fetch("https://api.example.com", {
      headers: {
        Authorization: `Bearer ${process.env.API_KEY}`,
        // or
        "x-api-key": process.env.GEMINI_API_KEY,
      },
    });
  };

  // --- 1. MODERN: File System Access API ---
  const handleNativeFolderOpen = async () => {
    try {
      // @ts-ignore
      const dirHandle = await window.showDirectoryPicker();

      cleanup();
      setIsLoading(true);
      setFolderName(dirHandle.name);

      const imageMap = new Map<string, File>();
      let txtFile: File | null = null;

      // 1. Scan Root Directory
      for await (const entry of dirHandle.values()) {
        // Find Text File
        if (entry.kind === "file" && entry.name.endsWith(".txt")) {
          if (
            !txtFile ||
            entry.name.includes("train") ||
            entry.name.includes("gt")
          ) {
            txtFile = await entry.getFile();
          }
        }

        // Find Images
        if (entry.kind === "directory") {
          const dirName = entry.name;
          // @ts-ignore
          for await (const subEntry of entry.values()) {
            if (
              subEntry.kind === "file" &&
              /\.(jpg|jpeg|png|webp)$/i.test(subEntry.name)
            ) {
              const file = await subEntry.getFile();
              const key = `${dirName}/${subEntry.name}`;
              imageMap.set(key, file);
            }
          }
        }
      }

      processFiles(imageMap, txtFile);
    } catch (err: any) {
      // If user cancelled, do nothing.
      if (err.name === "AbortError") return;

      // If API is not supported or other error, throw to trigger fallback
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  // --- 2. LEGACY: Input Type File ---
  const handleLegacyFolderUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsLoading(true);
    try {
      // Set folder name from the first file's path (Root/sub/file)
      const firstPath = files[0].webkitRelativePath;
      const rootName = firstPath.split("/")[0] || "Upload Folder";
      setFolderName(rootName);

      const imageMap = new Map<string, File>();
      let txtFile: File | null = null;

      Array.from(files).forEach((file: any) => {
        // webkitRelativePath: "Root/crops/image.jpg"
        const pathParts = file.webkitRelativePath
          ? file.webkitRelativePath.split("/")
          : [file.name];
        // Relative to dataset root: "crops/image.jpg"
        const relativePath =
          pathParts.length > 1 ? pathParts.slice(1).join("/") : file.name;

        if (file.name.endsWith(".txt")) {
          if (
            !txtFile ||
            file.name.includes("train") ||
            file.name.includes("gt")
          ) {
            txtFile = file;
          }
        } else if (file.type.startsWith("image/")) {
          imageMap.set(relativePath, file);
        }
      });

      processFiles(imageMap, txtFile);
    } catch (err) {
      console.error("Legacy upload error", err);
      alert("Error reading files.");
      setIsLoading(false);
    }
  };

  // --- COMMON: Process Data ---
  const processFiles = async (
    imageMap: Map<string, File>,
    txtFile: File | null
  ) => {
    const newItems: OcrItem[] = [];

    // Parse Text File
    if (txtFile) {
      const textContent = await (txtFile as File).text();
      const lines = textContent.split("\n");

      lines.forEach((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) return;

        const match = trimmed.match(/^(\S+)\s+(.*)$/);
        if (match) {
          const filename = match[1];
          const text = match[2];
          const imageFile = imageMap.get(filename) || null;

          newItems.push({
            id: `item-${idx}`,
            filename,
            text: text.trim(),
            originalText: text.trim(),
            isVerified: false,
            fileHandle: imageFile,
            objectUrl: imageFile ? URL.createObjectURL(imageFile) : null,
          });

          if (imageFile) imageMap.delete(filename);
        }
      });
    }

    // Add Orphans
    let orphanCount = 0;
    imageMap.forEach((file, key) => {
      newItems.push({
        id: `orphan-${orphanCount++}`,
        filename: key,
        text: "",
        originalText: "",
        isVerified: false,
        fileHandle: file,
        objectUrl: URL.createObjectURL(file),
      });
    });

    setItems(newItems);
    if (newItems.length > 0) setSelectedIndex(0);
    setIsLoading(false);
  };

  // --- Main Trigger ---
  const handleOpenFolder = async () => {
    // Try Modern API first
    if ("showDirectoryPicker" in window) {
      try {
        await handleNativeFolderOpen();
        return;
      } catch (err) {
        console.warn(
          "Modern picker failed or rejected, falling back to legacy input.",
          err
        );
      }
    }

    // Fallback to legacy
    if (fileInputRef.current) {
      fileInputRef.current.value = ""; // Reset to allow re-selecting same folder
      fileInputRef.current.click();
    }
  };

  const handleExport = () => {
    if (items.length === 0) return;
    const content = items
      .map((item) => `${item.filename}\t${item.text}`)
      .join("\n");
    const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "rec_gt_train.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filter Logic
  const filteredIndices = useMemo(() => {
    let indices = items.map((_, i) => i);
    if (filters.search) {
      const lowerSearch = filters.search.toLowerCase();
      indices = indices.filter((i) => {
        const item = items[i];
        return (
          item.filename.toLowerCase().includes(lowerSearch) ||
          item.text.toLowerCase().includes(lowerSearch)
        );
      });
    }
    indices.sort((aIdx, bIdx) => {
      const a = items[aIdx];
      const b = items[bIdx];
      switch (filters.sort) {
        case "filename_asc":
          return a.filename.localeCompare(b.filename);
        case "filename_desc":
          return b.filename.localeCompare(a.filename);
        case "status_verified":
          return a.isVerified === b.isVerified ? 0 : a.isVerified ? -1 : 1;
        case "status_unverified":
          return a.isVerified === b.isVerified ? 0 : a.isVerified ? 1 : -1;
        default:
          return 0;
      }
    });
    return indices;
  }, [items, filters]);

  const handleUpdateItem = useCallback(
    (id: string, newText: string, isVerified: boolean) => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, text: newText, isVerified } : item
        )
      );
    },
    []
  );

  const handleNext = () => {
    const visualIndex = filteredIndices.indexOf(selectedIndex);
    if (visualIndex < filteredIndices.length - 1)
      setSelectedIndex(filteredIndices[visualIndex + 1]);
  };

  const handlePrev = () => {
    const visualIndex = filteredIndices.indexOf(selectedIndex);
    if (visualIndex > 0) setSelectedIndex(filteredIndices[visualIndex - 1]);
  };

  // --- RENDER ---

  // Hidden Input for Legacy Fallback
  const HiddenInput = (
    <input
      type="file"
      ref={fileInputRef}
      {...({ webkitdirectory: "", directory: "" } as any)}
      multiple
      className="hidden"
      onChange={handleLegacyFolderUpload}
    />
  );

  // Empty State (Start Screen)
  if (items.length === 0) {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900 gap-8 p-4">
        {HiddenInput}
        <div className="text-center space-y-3 max-w-lg">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
            OCR Verifier
          </h1>
          <div className="text-slate-600 text-lg">
            Verify and correct OCR labels locally.
          </div>
          <p className="text-slate-500 text-sm">
            Supports Chrome, Edge (Folder Access) & All Browsers (Legacy Upload)
          </p>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center gap-4 text-indigo-600 animate-pulse">
            <Loader2 className="h-10 w-10 animate-spin" />
            <span className="text-lg">Reading folder structure...</span>
          </div>
        ) : (
          <button
            onClick={handleOpenFolder}
            className="group relative flex flex-col items-center justify-center h-40 w-72 border-2 border-dashed border-slate-300 rounded-2xl bg-white hover:bg-slate-50 hover:border-indigo-500 hover:shadow-xl hover:shadow-indigo-500/10 transition-all duration-300"
          >
            <FolderOpen className="h-12 w-12 text-slate-400 group-hover:text-indigo-500 transition-colors mb-3" />
            <span className="font-semibold text-slate-700 group-hover:text-slate-900">
              Open Dataset Folder
            </span>
            <span className="text-xs text-slate-500 mt-1">
              Select folder containing 'crops' & txt
            </span>
          </button>
        )}
      </div>
    );
  }

  // Main Workspace
  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden">
      {HiddenInput}
      <Sidebar
        items={items}
        selectedIndex={selectedIndex}
        onSelectItem={setSelectedIndex}
        filters={filters}
        setFilters={setFilters}
        filteredIndices={filteredIndices}
      />

      <div className="flex-1 flex flex-col min-w-0">
        <div className="h-14 border-b border-slate-200 bg-white flex items-center justify-between px-6 shadow-sm z-20">
          <div className="flex items-center gap-4">
            <h2 className="font-bold text-lg text-slate-900 flex items-center gap-2">
              <span className="truncate max-w-[200px] text-indigo-600">
                {folderName}
              </span>
            </h2>
            <span className="bg-slate-100 text-xs text-slate-500 px-3 py-1 rounded-full border border-slate-200">
              {items.filter((i) => i.isVerified).length} / {items.length}{" "}
              Verified
            </span>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenFolder}
              className="flex items-center gap-2 px-3 py-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded transition-colors text-sm"
              title="Switch to another folder"
            >
              <FolderOpen className="h-4 w-4" />
              <span>Switch Folder</span>
            </button>

            <div className="h-4 w-px bg-slate-200 mx-1"></div>

            <button
              onClick={handleExport}
              className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm font-medium transition-colors shadow-sm"
            >
              <Download className="h-4 w-4" />
              Export TXT
            </button>
          </div>
        </div>

        <Editor
          item={items[selectedIndex]}
          onUpdate={handleUpdateItem}
          onNext={handleNext}
          onPrev={handlePrev}
          total={items.length}
          currentIndex={items.indexOf(items[selectedIndex]) + 1}
        />
      </div>
    </div>
  );
}
