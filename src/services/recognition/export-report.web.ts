export async function exportRecognitionReport(value: unknown) {
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(value, null, 2)], { type: "application/json" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "memoraid-recognition-dataset.json";
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
