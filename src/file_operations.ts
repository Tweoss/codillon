export function downloadWatFile(
  lines: string[],
  filename: string = "program.wat",
) {
  // Create WAT content with proper formatting
  const watContent = lines.join("\n");

  // Create a blob with the content
  const blob = new Blob([watContent], { type: "text/plain;charset=utf-8" });

  // Create a temporary download link
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;

  // Trigger the download
  document.body.appendChild(link);
  link.click();

  // Clean up
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function createFileInput(
  onFileLoad: (content: string, filename: string) => void,
): HTMLInputElement {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".wat,.wast";
  input.style.display = "none";

  input.addEventListener("change", async (event) => {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;

    // Validate file extension
    const validExtensions = [".wat", ".wast"];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));
    if (!validExtensions.includes(fileExtension)) {
      alert(
        `Invalid file type. Please select a .wat or .wast file.\nSelected file: ${file.name}`,
      );
      input.value = "";
      return;
    }

    // Validate file size (limit to 1MB)
    const maxSize = 1024 * 1024; // 1MB
    if (file.size > maxSize) {
      alert(
        `File is too large. Maximum file size is 1MB.\nSelected file size: ${(file.size / 1024).toFixed(2)}KB`,
      );
      input.value = "";
      return;
    }

    try {
      const content = await file.text();
      onFileLoad(content, file.name);
    } catch (error) {
      console.error("Error reading file:", error);
      alert("Error reading file. Please ensure it's a valid text file.");
    }

    // Reset the input so the same file can be selected again
    input.value = "";
  });

  return input;
}

export function parseWatContent(content: string): string[] {
  // Basic validation
  if (!content || typeof content !== "string") {
    throw new Error("Invalid file content");
  }

  // Check for common file format issues
  const trimmedContent = content.trim();
  if (trimmedContent.length === 0) {
    return [];
  }

  // Check if it looks like a WAT file (should have at least one function)
  if (
    !trimmedContent.includes("(func") &&
    !trimmedContent.includes("(module")
  ) {
    console.warn("File does not appear to contain WebAssembly text format");
  }

  // Split by newlines and filter out empty lines
  return content
    .split("\n")
    .map((line) => line.trimEnd()) // Remove trailing whitespace but preserve indentation
    .filter((line) => line.trim() !== "");
}
