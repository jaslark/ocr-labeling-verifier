export interface OcrItem {
  id: string;
  filename: string; // e.g. "crops/page_1_resized_crop_0.jpg"
  text: string;
  originalText: string;
  comparisonText?: string;
  isVerified: boolean;
  fileHandle: File | null;
  objectUrl: string | null;
}

export type SortOption = 'filename_asc' | 'filename_desc' | 'status_verified' | 'status_unverified';

export interface FilterState {
  search: string;
  sort: SortOption;
  showOnlyUnverified: boolean;
  showOnlyDiffs: boolean;
}