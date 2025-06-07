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
  // Split by newlines and filter out empty lines
  return content.split("\n").filter((line) => line.trim() !== "");
}
