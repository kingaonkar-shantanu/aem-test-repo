/* global describe it */
import { expect } from '@esm-bundle/chai';
import { getReviewEnvFromHost, getEnvURL } from '../tools/sidekick/review-actions.js';

describe('Review actions', () => {
  it('getReviewEnvFromHost and getEnvURL', async () => {
    const test = (host, expected) => {
      const actual = getReviewEnvFromHost(host);
      expect(actual).to.deep.equal(expected);

      const url = getEnvURL(actual, '/foo/bar');
      expect(url).to.equal(`https://${host}/foo/bar`);
    };

    test('branch-name--franklintest--pfizer.hlx.page', {
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'page',
      review: undefined,
      domain: 'hlx.page',
      hlx: true,
    });

    test('branch-name--franklintest--pfizer.hlx.live', {
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'live',
      review: undefined,
      domain: 'hlx.live',
      hlx: true,
    });

    test('default--branch-name--franklintest--pfizer.hlx.reviews', {
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'reviews',
      review: 'default',
      domain: 'hlx.reviews',
      hlx: true,
    });

    test('branch-name--franklintest--page.franklin.edison.pfizer', {
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'page',
      review: undefined,
      domain: 'franklin.edison.pfizer',
      hlx: false,
    });

    test('branch-name--franklintest--live.franklin.edison.pfizer', {
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'live',
      review: undefined,
      domain: 'franklin.edison.pfizer',
      hlx: false,
    });

    test('default--branch-name--franklintest--reviews.franklin.edison.pfizer', {
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'reviews',
      review: 'default',
      domain: 'franklin.edison.pfizer',
      hlx: false,
    });
  });

  it('getEnvURL', async () => {
    const test = (currentEnv, target, expected) => {
      const url = getEnvURL(currentEnv, '/foo/bar', target);
      expect(url).to.equal(`${expected}/foo/bar`);
    };

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'page',
      review: undefined,
      domain: 'hlx.page',
      hlx: true,
    }, { state: 'live' }, 'https://branch-name--franklintest--pfizer.hlx.live');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'page',
      review: undefined,
      domain: 'hlx.page',
      hlx: true,
    }, { state: 'reviews' }, 'https://default--branch-name--franklintest--pfizer.hlx.reviews');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'page',
      review: undefined,
      domain: 'hlx.page',
      hlx: true,
    }, { state: 'reviews', review: 'another-review-id' }, 'https://another-review-id--branch-name--franklintest--pfizer.hlx.reviews');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'live',
      review: undefined,
      domain: 'hlx.live',
      hlx: true,
    }, { state: 'page' }, 'https://branch-name--franklintest--pfizer.hlx.page');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'live',
      review: undefined,
      domain: 'hlx.live',
      hlx: true,
    }, { state: 'reviews' }, 'https://default--branch-name--franklintest--pfizer.hlx.reviews');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'reviews',
      review: 'default',
      domain: 'hlx.reviews',
      hlx: true,
    }, { state: 'page' }, 'https://branch-name--franklintest--pfizer.hlx.page');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'reviews',
      review: 'default',
      domain: 'hlx.reviews',
      hlx: true,
    }, { state: 'live' }, 'https://branch-name--franklintest--pfizer.hlx.live');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'page',
      review: undefined,
      domain: 'franklin.edison.pfizer',
      hlx: false,
    }, { state: 'live' }, 'https://branch-name--franklintest--live.franklin.edison.pfizer');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'page',
      review: undefined,
      domain: 'franklin.edison.pfizer',
      hlx: false,
    }, { state: 'reviews' }, 'https://default--branch-name--franklintest--reviews.franklin.edison.pfizer');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'live',
      review: undefined,
      domain: 'franklin.edison.pfizer',
      hlx: false,
    }, { state: 'page' }, 'https://branch-name--franklintest--page.franklin.edison.pfizer');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'live',
      review: undefined,
      domain: 'franklin.edison.pfizer',
      hlx: false,
    }, { state: 'reviews', review: 'some-review-id' }, 'https://some-review-id--branch-name--franklintest--reviews.franklin.edison.pfizer');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'reviews',
      review: 'default',
      domain: 'franklin.edison.pfizer',
      hlx: false,
    }, { state: 'page' }, 'https://branch-name--franklintest--page.franklin.edison.pfizer');

    test({
      ref: 'branch-name',
      repo: 'franklintest',
      owner: 'pfizer',
      state: 'reviews',
      review: 'default',
      domain: 'franklin.edison.pfizer',
      hlx: false,
    }, { state: 'live' }, 'https://branch-name--franklintest--live.franklin.edison.pfizer');
  });
});
