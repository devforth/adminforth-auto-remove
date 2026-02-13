export type AutoRemoveMode = 'count-based' | 'time-based';

/**
 * count-based 100, 1k, 1kk, 1m
 */
export type HumanNumber = string;

/**
 * s
 * min
 * h
 * d 
 * w 
 * mon
 * y 
 */
export type HumanDuration = string;

export interface PluginOptions {
  createdAtField: string;

  /**
   * - count-based: Delete items > maxItems
   * - time-based: Delete age > maxAge
   */
  mode: AutoRemoveMode;

  /**
   * for count-based mode (100', '1k', '10k', '1m')
   */
  keepAtLeast?: HumanNumber;

  /**
    * For count-based mode, keep at least X items even if they are older than maxItems (100', '1k', '10k', '1m')
    */
  minItemsKeep?: HumanNumber;

  /**
   * Max age of item for time-based mode ('1d', '7d', '1mon', '1y')
   */
  deleteOlderThan?: HumanDuration;

  /**
   * Interval for running cleanup (e.g. '1h', '1d')
   * Default '1d'
   */
  interval?: HumanDuration;
}
