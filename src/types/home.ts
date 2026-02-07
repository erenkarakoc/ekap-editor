export interface RecentFile {
  id: string;
  name: string;
  lastOpened: number;
  path?: string;
  size?: number;
}

export interface SessionSummary {
  id: string;
  fileName: string;
  isDirty: boolean;
}
