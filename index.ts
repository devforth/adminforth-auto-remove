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
      if (!this.options.keepAtLeast) {
        throw new Error('keepAtLeast is required for count-based mode');
      }
      if (this.options.minItemsKeep && parseHumanNumber(this.options.minItemsKeep) > parseHumanNumber(this.options.keepAtLeast)) {
        throw new Error(
          `Option "minItemsKeep" (${this.options.minItemsKeep}) cannot be greater than "keepAtLeast" (${this.options.keepAtLeast}). Please set "minItemsKeep" less than or equal to "maxItems`
        );
      }
    }
    if (this.options.mode === 'time-based' && !this.options.deleteOlderThan) {
      throw new Error('deleteOlderThan is required for time-based mode');
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
    const limit = parseHumanNumber(this.options.keepAtLeast!);
    const resource = adminforth.resource(this.resource.resourceId);

    const allRecords = await resource.list([], null, null, [Sorts.ASC(this.options.createdAtField)]);
    if (allRecords.length <= limit) return;

    const toDelete = allRecords.slice(0, allRecords.length - limit);

    const itemsPerDelete = 100;

    for (let i = 0; i < toDelete.length; i += itemsPerDelete) {
      const deletePackage = toDelete.slice(i, i + itemsPerDelete);
      await Promise.all(
        deletePackage.map(r => resource.delete(r[this.resource.columns.find(c => c.primaryKey)!.name]))
      );
    }

    console.log(`AutoRemovePlugin: deleted ${toDelete.length} records due to count-based limit`);
  }

  private async cleanupByTime(adminforth: IAdminForth) {
    const maxAgeMs = parseDuration(this.options.deleteOlderThan!);
    const threshold = Date.now() - maxAgeMs;
    const resource = adminforth.resource(this.resource.resourceId);

    const allRecords = await resource.list([], null, null, [Sorts.ASC(this.options.createdAtField)]);
    const toDelete = allRecords.filter(r => new Date(r[this.options.createdAtField]).getTime() < threshold);

    const itemsPerDelete = 100;

    for (let i = 0; i < toDelete.length; i += itemsPerDelete) {
      const deletePackage = toDelete.slice(i, i + itemsPerDelete);

      await Promise.all(
        deletePackage.map(r => resource.delete(r[this.resource.columns.find(c => c.primaryKey)!.name]))
      );

    console.log(
      `AutoRemovePlugin: deleted ${deletePackage.length} records due to time-based limit`
    );
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
