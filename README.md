# AdminForth Auto Remove Plugin

<img src="https://img.shields.io/badge/License-MIT-blue.svg" alt="License: MIT" /> <img src="https://woodpecker.devforth.io/api/badges/3848/status.svg" alt="Build Status" /> <a href="https://www.npmjs.com/package/@adminforth/auto-remove"><img src="https://img.shields.io/npm/dm/@adminforth/auto-remove" alt="npm downloads" /></a> <a href="https://www.npmjs.com/package/@adminforth/auto-remove"><img src="https://img.shields.io/npm/v/@adminforth/auto-remove" alt="npm version" /></a>

[![Ask AI](https://tluma.ai/badge)](https://tluma.ai/ask-ai/devforth/adminforth)

This plugin removes records from resources based on **count-based** or **time-based** rules.

## Features

- Remove old records automatically from AdminForth resources.
- Support both count-based and time-based cleanup rules.
- Keep logs, demo data, and temporary entities under control.
- Run cleanup on a configurable schedule.

## Documentation

Full setup and configuration guide:

[AdminForth Auto Remove Documentation](https://adminforth.dev/docs/tutorial/Plugins/auto-remove/)

## About AdminForth

AdminForth is an open-source, agent-first admin framework for building robust admin panels and back-office applications faster.

## Related links

- [AdminForth website](https://adminforth.dev)
- [npm package](https://www.npmjs.com/package/@adminforth/auto-remove)
- [More AdminForth plugins](https://adminforth.dev/docs/tutorial/ListOfPlugins/)
- [Built by DevForth](https://devforth.io)

It is designed for cleaning up:

* old records
* logs
* demo/test data
* temporary entities

---

## Installation

To install the plugin:

```ts
npm install @adminforth/auto-remove
```

Import it into your resource:
```ts
import AutoRemovePlugin from '../../plugins/adminforth-auto-remove/index.js';
```

## Plugin Options

```ts
export interface PluginOptions {
 createdAtField: string;

  /**
   * - count-based: Delete items > keepAtLeast
   * - time-based: Delete age > deleteOlderThan
   */
  mode: AutoRemoveMode;

  /**
   * for count-based mode (100', '1k', '10k', '1m')
   */
  keepAtLeast?: HumanNumber;

  /**
   * Minimum number of items to always keep in count-based mode.
   * This acts as a safety threshold together with `keepAtLeast`.
   * Example formats: '100', '1k', '10k', '1m'.
   * 
   * Validation ensures that minItemsKeep <= keepAtLeast. 
  */
  minItemsKeep?: HumanNumber;

  /**
   * Max age of item for time-based mode ('1d', '7d', '1mo', '1y')
   */
  deleteOlderThan?: HumanDuration;

  /**
   * Interval for running cleanup (e.g. '1h', '1d')
   * Default '1d'
   */
  interval?: HumanDuration;
}
```
---

## Usage
To use the plugin, add it to your resource file. Here's an example:

for count-based mode
```ts
new AutoRemovePlugin({
        createdAtField: 'created_at',   
        mode: 'count-based',            
        keepAtLeast: '200',                  
        interval: '1mo',                  
        minItemsKeep: '180',       
      }),
```

for time-based mode
```ts
new AutoRemovePlugin({
        createdAtField: 'created_at',
        mode: 'time-based',
        deleteOlderThan: '3mo',
        interval: '1mo',  
      }),
```

---

## Result
After running **AutoRemovePlugin**, old or excess records are deleted automatically:

- **Count-based mode:** keeps the newest `keepAtLeast` records, deletes older ones.  
  Example: `keepAtLeast = 500` → table with 650 records deletes 150 oldest.

- **Time-based mode:** deletes records older than `deleteOlderThan`.  
  Example: `deleteOlderThan = '7d'` → removes records older than 7 days.

- **Manual cleanup:** `POST /plugin/{pluginInstanceId}/cleanup`, returns `{ "ok": true }`.

Logs show how many records were removed per run.