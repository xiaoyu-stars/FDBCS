export interface DatabaseInfo {
  name: string;
  hasFasta: boolean;
  hasMetadata: boolean;
  indexExists: boolean;
  status: "ready" | "pending" | "incomplete";
}

export interface SequenceRecord {
  accession: string;
  header: string;
  offset: number;
  length: number;
  taxonomy: string;
  metadata: string;
}

export interface TaxonomyStats {
  [level: string]: {
    [name: string]: number;
  };
}

export interface OverviewStats {
  totalSequences: number;
  uniqueTaxonomies: number;
  totalBasePairs: number;
  avgLength: number;
  maxLength: number;
  minLength: number;
}
