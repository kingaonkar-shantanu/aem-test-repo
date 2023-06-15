import { getMetadata } from './lib-franklin.js';

class Analytics {
  constructor(manager) {
    this.manager = manager;
    this.globals = {};
    this.data = {};
  }

  async loadGlobalAnalytics(url = '/global/analytics.json') {
    const resp = await fetch(url);
    const json = await resp.json();
    this.globals = json.data.map((row) => row.Key);
    const dataArray = json.data
      .filter((row) => row.Value !== '')
      .map((row) => [row.Key, row.Value]);
    this.setData(Object.fromEntries(dataArray));
  }

  /* eslint-disable class-methods-use-this */
  getPageUrl() {
    const { host, protocol } = document.location;
    let { pathname } = document.location;
    pathname = pathname !== '/' ? pathname : '';
    const urlSegments = [protocol, '//', host, pathname];
    return urlSegments.join('');
  }

  getGlobalOverrides() {
    const data = {};
    this.globals.forEach((key) => {
      const value = getMetadata(key);
      if (value) {
        data[key] = value;
      }
    });
    return data;
  }

  loadPageAnalyticsData() {
    const defaults = {};
    defaults['Page Name'] = document.title;
    defaults['Page URL'] = this.getPageUrl();
    const overrides = this.getGlobalOverrides();
    this.setData({ ...defaults, ...overrides });
  }

  setData(data) {
    this.data = { ...this.data, ...data };
  }

  async initialize(defaults, url) {
    this.setData(defaults);
    if (!this.manager.endpoint) return;
    await this.loadGlobalAnalytics(url);
    this.loadPageAnalyticsData();
    window.pfAnalyticsData = window.pfAnalyticsData || {};
    window.pfAnalyticsData = {
      pfPage: this.data,
    };
  }
}

export default Analytics;
