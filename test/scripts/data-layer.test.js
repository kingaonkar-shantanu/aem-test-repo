/* eslint-disable no-unused-expressions */
/* global describe before it */

import { expect } from '@esm-bundle/chai';
import { readFile } from '@web/test-runner-commands';
import AdobeLaunch from '../../scripts/adobe-launch.js';
import Analytics from '../../scripts/analytics.js';

let manager;
let analytics;

document.body.innerHTML = await readFile({ path: './dummy.html' });
document.head.innerHTML = await readFile({ path: './head.html' });

describe('data layer methods', () => {
  before(async () => {
    manager = new AdobeLaunch();
    manager.endpoint = 'foo';
    analytics = new Analytics(manager);
    await analytics.initialize({
      platform: 'franklin',
      contentType: 'Website',
    }, '/test/fixtures/analytics.json');
  });

  it('Sets a non-prod analytics endpoint', async () => {
    const expectedKeys = [
      'platform',
      'contentType',
      'Page URL',
      'Page Name',
    ];
    expect(window.pfAnalyticsData).to.have.key('pfPage');
    expect(window.pfAnalyticsData.pfPage).to.include.keys(expectedKeys);
    expect(window.pfAnalyticsData.pfPage.platform).to.equal('franklin');
    expect(window.pfAnalyticsData.pfPage.contentType).to.equal('Website');
  });

  it('should not include global values', async () => {
    expect(window.pfAnalyticsData.pfPage).to.include.keys(['Audience', 'Audience Specialty', 'Brand']);
  });

  it('should not include empty values', async () => {
    expect(window.pfAnalyticsData.pfPage).to.not.include.keys(['Primary Message']);
  });

  it('should include default page specific values', async () => {
    expect(window.pfAnalyticsData.pfPage).to.include.keys(['Page URL', 'Page Name']);
    expect(window.pfAnalyticsData.pfPage['Page URL']).to.equal('http://localhost:2000');
    expect(window.pfAnalyticsData.pfPage['Page Name']).to.equal('Foo');
  });

  it('should include user-defined page values overrides from metadata', async () => {
    const expectedKeys = [
      'Audience',
      'Audience Specialty',
      'Brand',
      'All Brands',
      'Business Unit',
      'Content platform',
      'Primary Country',
      'Therapeutic Area',
    ];
    expect(window.pfAnalyticsData.pfPage).to.include.keys(expectedKeys);
    expect(window.pfAnalyticsData.pfPage).to.not.include.keys(['Page Only']);
  });

  it('should exlude blank page level values', async () => {
    expect(window.pfAnalyticsData.pfPage['Primary Country']).to.equal('Primary Country Value - Global Level');
  });

  it('should override global values with page level', async () => {
    expect(window.pfAnalyticsData.pfPage['Content platform']).to.equal('Content platform Value - Page Level');
  });

  it('should not override global values when page level is not set', async () => {
    expect(window.pfAnalyticsData.pfPage['Therapeutic Area']).to.equal('Therapeutic Area - Global Level');
  });
});
