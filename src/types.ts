export interface CachedPage {
  id: string;
  title: string;
  text: string;
  fetchedAt: number;
}

export interface PageSummary {
  id: string;
  title: string;
  url: string;
}

export interface PageContent {
  id: string;
  title: string;
  text: string;
}

export interface DraftResult {
  pageId: string;
  title: string;
  draftUrl: string;
}
