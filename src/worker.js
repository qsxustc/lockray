import { analyze, toMarkdown } from "./core.js";
self.onmessage = ({ data }) => {
  try {
    const report = analyze(data.before, data.after);
    self.postMessage({ id: data.id, report, markdown: toMarkdown(report) });
  } catch (error) {
    self.postMessage({
      id: data.id,
      error: String(
        error.message || "Unable to compare these lockfiles.",
      ).slice(0, 600),
    });
  }
};
