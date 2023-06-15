/* eslint-disable no-console */
import { getMetadata } from '../../scripts/lib-franklin.js';

export const SidekickState = {};

export function getReviewEnvFromHost(hostname) {
  if (hostname === 'localhost') {
    try {
      // eslint-disable-next-line no-param-reassign
      hostname = new URL(getMetadata('hlx:proxyUrl')).hostname;
    } catch (e) {
      console.error('Unable to get hostname from hlx:proxyUrl.');
      throw e;
    }
  }

  if (hostname.includes('.hlx.')) {
    // <ref>--<repo>--<owner>.hlx.<state>
    const [env, , state] = hostname.split('.');
    const splits = env.split('--');
    let review;
    if (splits.length === 4) review = splits.shift();
    const [ref, repo, owner] = splits;
    return {
      review, ref, repo, owner, state, domain: `hlx.${state}`, hlx: true,
    };
  }

  // <ref>--<repo>--<state>.franklin.edison.pfizer
  const hostSplit = hostname.split('.');
  const env = hostSplit[0];
  const domain = hostSplit.splice(1).join('.');
  const splits = env.split('--');
  let review;
  if (splits.length === 4) review = splits.shift();
  const [ref, repo, state] = splits;
  return {
    review, ref, repo, owner: 'pfizer', state, domain, hlx: false,
  };
}

export function getEnvURL(currentEnv, path, target) {
  const env = { ...currentEnv };
  if (target) {
    env.state = target.state;
    if (env.state !== 'reviews') {
      env.review = undefined;
    } else {
      env.review = target.review || env.review || 'default';
    }
  }

  if (env.hlx) {
    return `https://${env.review ? `${env.review}--` : ''}${env.ref}--${env.repo}--${env.owner}.hlx.${env.state}${path}`;
  }
  return `https://${env.review ? `${env.review}--` : ''}${env.ref}--${env.repo}--${env.state}.${env.domain}${path}`;
}

export function getReviewEnv() {
  const { hostname } = window.location;
  return getReviewEnvFromHost(hostname);
}

function getEndpoint(reviewId, verb) {
  const env = getReviewEnv();
  return getEnvURL(env, `/admin/${verb}`, { state: 'reviews', review: reviewId });
}

export async function getReviews() {
  const env = getReviewEnv();
  let adminURL = getEnvURL(env, `/admin/?ck=${Math.random()}`, { state: 'reviews' });
  if (!env.review) {
    adminURL = adminURL.replace('default--', '');
  }
  const resp = await fetch(adminURL, {
    cache: 'no-store',
  });
  const json = await resp.json();
  const reviews = json.data;
  reviews.forEach((review) => {
    review.pages = review.pages ? review.pages.split(',').map((p) => p.trim()) : [];
  });
  return (reviews);
}

async function getReview(reviewId) {
  const reviews = await getReviews();
  return reviews.find((e) => e.reviewId === reviewId);
}

async function isReviewOpen(reviewId) {
  const { status } = await getReview(reviewId);
  console.log(`${reviewId} status: ${status}`);
  return (status === 'open');
}

async function publishPageFromSnapshot(pathname, reviewId, env) {
  const snapshotEndpoint = `https://admin.hlx.page/snapshot/${env.owner}/${env.repo}/main/${reviewId}${pathname}?publish=true`;
  console.log(snapshotEndpoint);
  const snapshotResp = await fetch(snapshotEndpoint, {
    method: 'POST',
  });
  const snapshotText = await snapshotResp.text();
  console.log(snapshotText);
}

async function addPageToSnapshot(pathname, reviewId, env) {
  const snapshotEndpoint = `https://admin.hlx.page/snapshot/${env.owner}/${env.repo}/main/${reviewId}${pathname}`;
  console.log(snapshotEndpoint);
  const snapshotResp = await fetch(snapshotEndpoint, {
    method: 'POST',
  });
  const snapshotText = await snapshotResp.text();
  console.log(snapshotText);
}

export async function addPageToReview(page, reviewId) {
  const env = getReviewEnv();
  console.log(`Add ${page} to ${reviewId}`);
  console.log(env);
  if (isReviewOpen(reviewId)) {
    console.log('Adding to snapshot');
    const [pathname] = page.split('?');
    addPageToSnapshot(pathname, reviewId, env);
    const endpoint = getEndpoint(reviewId, 'add-page');
    const resp = await fetch(`${endpoint}?page=${encodeURIComponent(page)}`, {
      method: 'POST',
    });
    const text = await resp.text();
    console.log(text);
  } else {
    console.log('Review is not open');
  }
}

export async function removePageFromReview(page, reviewId) {
  const env = getReviewEnv();
  console.log(`Remove ${page} from ${reviewId}`);
  console.log(env);
  if (isReviewOpen(reviewId)) {
    console.log('Removing from snapshot');
    const [pathname] = page.split('?');
    const snapshotEndpoint = `https://admin.hlx.page/snapshot/${env.owner}/${env.repo}/main/${reviewId}${pathname}`;
    console.log(snapshotEndpoint);
    const snapshotResp = await fetch(snapshotEndpoint, {
      method: 'DELETE',
    });
    const snapshotText = await snapshotResp.text();
    console.log(snapshotText);

    const endpoint = getEndpoint(reviewId, 'remove-page');
    const resp = await fetch(`${endpoint}?page=${encodeURIComponent(pathname)}`, {
      method: 'POST',
    });
    const text = await resp.text();
    console.log(text);
  } else {
    console.log('Review is not open');
  }
}

export async function updateReview(pages, reviewId) {
  const env = getReviewEnv();
  console.log(`Update Review ${reviewId} with ${pages.length} pages`);
  console.log(pages);
  console.log(env);

  if (isReviewOpen(reviewId)) {
    console.log('Clearing Pages');
    const snapshotEndpoint = `https://admin.hlx.page/snapshot/${env.owner}/${env.repo}/main/${reviewId}/*`;
    console.log(snapshotEndpoint);
    const snapshotResp = await fetch(snapshotEndpoint, {
      method: 'DELETE',
    });
    const snapshotText = await snapshotResp.text();
    console.log(snapshotText);

    const pathnames = pages.map((page) => page.split('?')[0]);
    console.log(pathnames);
    for (let i = 0; i < pathnames.length; i += 1) {
      const pathname = pathnames[i];
      console.log('Adding to snapshot');
      console.log(pathname);
      // eslint-disable-next-line no-await-in-loop
      await addPageToSnapshot(pathname, reviewId, env);
    }

    const endpoint = getEndpoint(reviewId, '');
    const resp = await fetch(`${endpoint}?pages=${pages.join()}`, {
      method: 'POST',
    });
    const text = await resp.text();
    console.log(text);
  } else {
    console.log('Review is not open');
  }
}

export async function submitForReview(reviewId) {
  const env = getReviewEnv();
  console.log(`Submit Review ${reviewId}`);
  console.log(env);
  const endpoint = getEndpoint(reviewId, 'submit');
  const resp = await fetch(endpoint, {
    method: 'POST',
  });
  const text = await resp.text();
  console.log(text);
}

export async function openReview(reviewId, description) {
  const env = getReviewEnv();
  console.log(`Open Review ${reviewId}, ${description}`);
  console.log(env);
  const endpoint = getEndpoint(reviewId, '');
  const resp = await fetch(`${endpoint}?description=${description}`, {
    method: 'POST',
  });
  const text = await resp.text();
  console.log(text);
}

export async function rejectReview(reviewId) {
  const env = getReviewEnv();
  console.log(`Reject Review ${reviewId}`);
  console.log(env);
  const endpoint = getEndpoint(reviewId, 'reject');
  const resp = await fetch(endpoint, {
    method: 'POST',
  });
  const text = await resp.text();
  console.log(text);
}

export async function approveReview(reviewId) {
  const env = getReviewEnv();
  console.log(`Approve Review ${reviewId}`);
  console.log(env);

  const review = await getReview(reviewId);
  if (review && review.status === 'submitted') {
    console.log(review);
    const pathnames = review.pages.map((page) => page.split('?')[0]);
    console.log(pathnames);
    for (let i = 0; i < pathnames.length; i += 1) {
      const pathname = pathnames[i];
      console.log('Publishing from snapshot');
      console.log(pathname);
      // eslint-disable-next-line no-await-in-loop
      await publishPageFromSnapshot(pathname, reviewId, env);
    }

    console.log('Clearing Pages');
    const snapshotEndpoint = `https://admin.hlx.page/snapshot/${env.owner}/${env.repo}/main/${reviewId}/*`;
    console.log(snapshotEndpoint);
    const snapshotResp = await fetch(snapshotEndpoint, {
      method: 'DELETE',
    });
    const snapshotText = await snapshotResp.text();
    console.log(snapshotText);

    const endpoint = getEndpoint(reviewId, 'approve');
    const resp = await fetch(endpoint, {
      method: 'POST',
    });
    const text = await resp.text();
    console.log(text);
  } else {
    console.log('Review is not submitted');
  }
}
