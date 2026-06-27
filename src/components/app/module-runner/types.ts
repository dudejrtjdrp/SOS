export type Source = {
  sourceType: string;
  sourceId: string;
  label: string;
  similarity: number;
};

export type Status = "idle" | "running" | "done" | "error";
