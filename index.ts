import { AdminForthPlugin, Filters, Sorts, AdminForthDataTypes } from "adminforth";
import type { IAdminForth, IHttpServer, AdminForthResource } from "adminforth";
import type { PluginOptions } from './types.js';
import { parseHumanNumber } from './utils/parseNumber.js';
import { parseDuration } from './utils/parseDuration.js';

export default class AutoRemovePlugin extends AdminForthPlugin {
  options: PluginOptions;
  resource: AdminForthResource;
  timer: NodeJS.Timeout;

  constructor(options: PluginOptions) {
    super(options, import.meta.url);
    this.options = options;
    this.shouldHaveSingleInstancePerWholeApp = () => false;
  }

  instanceUniqueRepresentation(pluginOptions: any) : string {
    return `single`;
  }

  async modifyResourceConfig(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    super.modifyResourceConfig(adminforth, resourceConfig);
    this.resource = resourceConfig;

    const intervalMs = parseDuration(this.options.interval || '1d');
    this.timer = setInterval(() => {
      this.runCleanup(adminforth).catch(console.error);
    }, intervalMs);
  }

  validateConfigAfterDiscover(adminforth: IAdminForth, resourceConfig: AdminForthResource) {
    const col = resourceConfig.columns.find(c => c.name === this.options.createdAtField);
    if (!col) throw new Error(`Field "${this.options.createdAtField}" not found in resource "${resourceConfig.label}"`);
    if (![AdminForthDataTypes.DATE, AdminForthDataTypes.DATETIME].includes(col.type!)) {
      throw new Error(`Field "${this.options.createdAtField}" in resource "${resourceConfig.label}" must be of type DATE or DATETIME`);
    }

    // Check mode-specific options
    if (this.options.mode === 'count-based') {
      if (!this.options.maxItems) {
        throw new Error('maxItems is required for count-based mode');
      }
      if (this.options.minItemsKeep && parseHumanNumber(this.options.minItemsKeep) > parseHumanNumber(this.options.maxItems)) {
        throw new Error(
          `Option "minItemsKeep" (${this.options.minItemsKeep}) cannot be greater than "maxItems" (${this.options.maxItems}). Please set "minItemsKeep" less than or equal to "maxItems`
        );
      }
    }
    if (this.options.mode === 'time-based' && !this.options.maxAge) {
      throw new Error('maxAge is required for time-based mode');
    }
  }

  private async runCleanup(adminforth: IAdminForth) {
    try {
      if (this.options.mode === 'count-based') {
        await this.cleanupByCount(adminforth);
      } else {
        await this.cleanupByTime(adminforth);
      }
    } catch (err) {
      console.error('AutoRemovePlugin runCleanup error:', err);
    }
  }

  private async cleanupByCount(adminforth: IAdminForth) {
    const limit = parseHumanNumber(this.options.maxItems!);
    const resource = adminforth.resource(this.resource.resourceId);

    const allRecords = await resource.list([], null, null, [Sorts.ASC(this.options.createdAtField)]);
    if (allRecords.length <= limit) return;

    const toDelete = allRecords.slice(0, allRecords.length - limit).slice(0, this.options.maxDeletePerRun);
    for (const r of toDelete) {
      await resource.delete(r[this.resource.columns.find(c => c.primaryKey)!.name]);
      console.log(`AutoRemovePlugin: deleted record ${r[this.resource.columns.find(c => c.primaryKey)!.name]} due to count-based limit`);
    }
  }

  private async cleanupByTime(adminforth: IAdminForth) {
    const maxAgeMs = parseDuration(this.options.maxAge!);
    const threshold = Date.now() - maxAgeMs;
    const resource = adminforth.resource(this.resource.resourceId);

    const allRecords = await resource.list([], null, null, [Sorts.ASC(this.options.createdAtField)]);
    const toDelete = allRecords
      .filter(r => new Date(r[this.options.createdAtField]).getTime() < threshold)
      .slice(0, this.options.maxDeletePerRun);

    for (const r of toDelete) {
      await resource.delete(r[this.resource.columns.find(c => c.primaryKey)!.name]);
      console.log(`AutoRemovePlugin: deleted record ${r[this.resource.columns.find(c => c.primaryKey)!.name]} due to time-based limit`);
    }
  }

  setupEndpoints(server: IHttpServer) {
    server.endpoint({
      method: 'POST',
      path: `/plugin/${this.pluginInstanceId}/cleanup`,
      handler: async () => {
        try {
          await this.runCleanup(this.adminforth);
          return { ok: true };
        } catch (err) {
          return { ok: false, error: err instanceof Error ? err.message : String(err) };
        }
      }
    });
  }
}
