/* eslint-disable no-console */
import {
  SidekickState,
  addPageToReview,
  getReviewEnv,
  getEnvURL,
  getReviews,
  approveReview,
  rejectReview,
  submitForReview,
  updateReview,
} from './review-actions.js';

function loading(button, isLoading) {
  if (isLoading) {
    button.classList.add('loading');
    button.disabled = true;
  } else {
    button.disabled = false;
    button.classList.remove('loading');
  }
}

async function getReviewStatus() {
  const reviews = await getReviews();
  if (reviews.length === 1 && reviews[0].reviewId === 'default') return reviews[0].status;
  return ('open');
}

async function getPageReview() {
  const reviews = await getReviews();
  console.log(reviews);
  const review = reviews.find((r) => r.pages.find((p) => p.split('?')[0] === window.location.pathname));
  return review;
}

async function getPageStatus() {
  const review = await getPageReview();
  if (review) return review.status;
  return '';
}

async function getOpenReviews() {
  const reviews = await getReviews();
  return reviews.filter((r) => r.status === 'open');
}

function getPageParams() {
  const params = new URLSearchParams();
  document.querySelectorAll('form[data-config-token]').forEach((e) => {
    params.append('form', e.dataset.configToken);
  });
  const search = params.toString();
  if (search) return (`?${search}`);
  return '';
}

async function addReviewToEnvSelector(shadowRoot) {
  const env = getReviewEnv();
  const reviews = await getReviews();
  const fc = shadowRoot.querySelector('.feature-container');
  const envSwitcher = fc.querySelector('.env');
  const dc = fc.querySelector('.env .dropdown-container');

  const createButton = (text) => {
    const button = document.createElement('button');
    button.title = text;
    button.tabindex = '0';
    button.textContent = text;
    button.addEventListener('click', () => {
      if (text === 'Development') {
        window.location.href = `http://localhost:3000${window.location.pathname}`;
      } else if (text === 'Preview') {
        window.location.href = getEnvURL(env, window.location.pathname, { state: 'page' });
      } else if (text === 'Review') {
        window.location.href = getEnvURL(env, window.location.pathname, { state: 'reviews', review: reviews.length > 0 ? reviews[0].reviewId : null });
      } else if (text === 'Live') {
        window.location.href = getEnvURL(env, window.location.pathname, { state: 'live' });
      } else if (text === 'Production') {
        const canonical = button.getAttribute('data-canonical');
        window.location.href = canonical;
      } else if (text === 'Content Drive') {
        const { folders } = SidekickState.status.edit;
        const drive = folders[folders.length - 1].url;
        window.location.href = drive;
      }
    });
    return (button);
  };

  if (fc.querySelector('.env.hlx-sk-hidden')) {
    envSwitcher.classList.remove('hlx-sk-hidden');
    const toggle = fc.querySelector('.env .dropdown-toggle');
    if (env.state === 'reviews') {
      toggle.textContent = 'Review';
    }
    const states = ['Development', 'Preview', 'Live', 'Production'];
    dc.textContent = '';
    states.forEach((state) => {
      let advancedOnly = false;
      let disabled = false;
      // special handling for reviews state
      if (state.toLowerCase() === 'review') {
        // disable review button
        disabled = true;
      }
      if (state.toLowerCase() === 'development') {
        // todo for production: check if sidekick config contains host
        advancedOnly = true;
      }

      const className = `plugin ${state.toLowerCase()}`;
      let pluginDiv = dc.querySelector(className);
      if (!pluginDiv) {
        pluginDiv = document.createElement('div');
        pluginDiv.className = className;
        pluginDiv.append(createButton(state));
        dc.append(pluginDiv);
      }
      if (advancedOnly) {
        pluginDiv.classList.add('hlx-sk-advanced-only');
      } else {
        pluginDiv.classList.remove('hlx-sk-advanced-only');
      }
      const button = pluginDiv.querySelector('button');
      if (state.toLowerCase() === 'production') {
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical && canonical.href) {
          button.setAttribute('data-canonical', canonical.href);
        } else {
          disabled = true;
        }
      }

      button.disabled = disabled;
    });
  }
  // review button
  if (!dc.querySelector('.review') && reviews.length > 0 && env.state !== 'reviews') {
    const reviewDiv = document.createElement('div');
    const live = dc.querySelector('.live');
    live.before(reviewDiv);
    reviewDiv.className = 'review plugin';
    reviewDiv.append(createButton('Review'));
  }

  // remove confusing current env button
  const pressed = dc.querySelector('button.pressed');
  if (pressed) {
    pressed.remove();
  }

  // add Content Drive link
  const drive = dc.querySelector('.drive');
  if (!drive && SidekickState?.status?.edit) {
    const driveDiv = document.createElement('div');
    dc.append(driveDiv);
    driveDiv.className = 'drive plugin';
    driveDiv.append(createButton('Content Drive'));
  } else if (drive && !SidekickState?.status?.edit) {
    drive.remove();
  }
}

async function previewMode(sk) {
  const plugins = sk.shadowRoot.querySelector('.plugin-container');
  let div = plugins.querySelector('.plugin.move-to-review');
  if (!div) {
    div = document.createElement('div');
    div.className = 'plugin move-to-review';
    const button = document.createElement('button');
    button.textContent = 'Loading Review Status...';
    loading(button, true);
    div.append(button);
    plugins.append(div);
  }
  const button = div.querySelector('button');

  const setReviewStatus = (pageStatus, reviewStatus) => {
    loading(button, false);
    const authorized = SidekickState.status.status !== 401;
    let statusText;

    if (reviewStatus === 'submitted') {
      button.classList.add('submitted');
      button.disabled = true;
      if (pageStatus === 'submitted') {
        statusText = 'Submitted for Review';
      } else {
        statusText = 'Review locked';
      }
    } else if (pageStatus === 'open') {
      statusText = 'Update in Review';
      button.classList.add('ready');
      button.disabled = !authorized;
    } else if (pageStatus === '') {
      statusText = 'Move to Review';
      button.disabled = !authorized;
    }

    button.innerHTML = `${statusText}`;
  };

  const updateReviewStatus = async () => {
    const pageStatus = await getPageStatus();
    const reviewStatus = await getReviewStatus();

    setReviewStatus(pageStatus, reviewStatus);

    return { pageStatus, reviewStatus };
  };

  try {
    let { pageStatus } = await updateReviewStatus();

    button.addEventListener('click', async () => {
      loading(button, true);
      const openReviews = await getOpenReviews();
      if (openReviews.length === 1 && (pageStatus === '' || pageStatus === 'open')) {
        const search = getPageParams();
        await addPageToReview(window.location.pathname + search, openReviews[0].reviewId);
        pageStatus = (await updateReviewStatus()).pageStatus;
      }
      loading(button, false);
    });
  } catch (e) {
    button.setAttribute('disabled', '');
    button.title = 'Failed to Connect to Review Service';
    button.textContent = '(Network Error)';
  }
}

let dialogIsOpened = false;
async function openManifest(sk, editMode) {
  dialogIsOpened = true;
  console.log('STATE', SidekickState);
  const { status } = SidekickState;
  const env = getReviewEnv();
  const reviews = await getReviews();
  console.log(reviews);
  console.log(env);
  const review = reviews.find((r) => r.reviewId === env.review);

  const disabled = (status && status.live && status.live.permissions
    && status.live.permissions.includes('write')) ? '' : ' disabled';

  const dialog = document.createElement('dialog');
  dialog.className = 'hlx-dialog';
  const edit = review.status === 'open' ? `<div class="hlx-edit-manifest hlx-edit-hide"><button id="hlx-edit-manifest">Edit Pages in Change Log</button><textarea wrap="off" rows="10">${review.pages.map((path) => `https://${env.ref}--${env.repo}--${env.owner}.hlx.page${path}`).join('\n')}</textarea><button id="hlx-update-manifest">Update Change Log</button></div>` : '';
  const buttons = review.status === 'open' ? '<button id="hlx-submit">Submit for Review</button>' : `<button${disabled} id="hlx-approve">Approve and Publish</button> <button${disabled} id="hlx-reject">Reject Review</button>`;
  const pages = review.pages.map((path) => `<p class="hlx-row"><a href="${path}">${getEnvURL(env, path.split('?')[0], { state: 'reviews' })}</a></p>`);
  dialog.innerHTML = `
    <form method="dialog">
      <button class="hlx-close-button">X</button>
    </form>
    <h3>Change Log for Site in ${review.reviewId} Review (${review.status === 'open' ? 'Prepare For Review' : 'Submitted For Review'})</h3>
    <p>${buttons}</p>
    ${pages.join('')}
    ${edit}
  `;
  const editManifest = dialog.querySelector('#hlx-edit-manifest');
  if (editManifest) {
    const toEditMode = () => {
      editManifest.parentElement.classList.remove('hlx-edit-hide');
      editManifest.parentElement.classList.add('hlx-edit-show');
    };
    editManifest.addEventListener('click', () => {
      toEditMode();
    });
    if (editMode) {
      toEditMode();
    }
  }
  const update = dialog.querySelector('#hlx-update-manifest');
  if (update) {
    update.addEventListener('click', async () => {
      loading(update, true);
      const ta = dialog.querySelector('textarea');
      ta.disabled = true;
      const taPages = ta.value.split('\n').filter((line) => !!line).map((line) => {
        console.log(`line:${line}`);
        const url = new URL(line, window.location.href);
        return (url.pathname + url.search);
      });
      await updateReview(taPages, review.reviewId, env);
      ta.disabled = false;
      loading(update, false);
      dialog.close();
      dialogIsOpened = false;
    });
  }

  const verbs = [{ id: 'reject', f: rejectReview }, { id: 'approve', f: approveReview }, { id: 'submit', f: submitForReview }];

  verbs.forEach((verb) => {
    const button = dialog.querySelector(`#hlx-${verb.id}`);
    if (button) {
      button.addEventListener('click', async () => {
        loading(button, true);
        await verb.f(review.reviewId);
        loading(button, true);
        dialog.close();
        dialogIsOpened = false;
        if (verb.id === 'approve') {
          window.location.href = `https://${env.ref}--${env.repo}--${env.owner}.hlx.live${window.location.pathname}`;
        } else {
          window.location.hash = '#openReview';
          window.location.reload();
        }
      });
    }
  });

  dialog.addEventListener('close', () => {
    dialogIsOpened = false;
  });

  sk.shadowRoot.append(dialog);
  dialog.showModal();
}

async function reviewMode(features, sk) {
  const reviewPlugin = sk.shadowRoot.querySelector('.plugin.move-to-review');
  if (reviewPlugin) {
    reviewPlugin.remove();
  }
  const reviewStatus = await getReviewStatus();
  console.log(reviewStatus);
  let div = sk.shadowRoot.querySelector('.review-status-badge');
  if (!div) {
    div = document.createElement('div');
    div.className = 'review-status-badge';
    features.prepend(div);
    div.addEventListener('click', () => {
      if (!dialogIsOpened) {
        openManifest(sk);
      }
    });
  }
  if (reviewStatus === 'open') {
    div.className = 'review-status-badge open';
    div.innerHTML = '<span class="badge-unlocked"></span><span>Prepare for Review</span>';
  }
  if (reviewStatus === 'submitted') {
    div.className = 'review-status-badge submitted';
    div.innerHTML = '<span class="badge-locked"></span><span>Review Submitted</span>';
  }
  div.classList.add('plugin');

  if (window.location.hash === '#openReview') {
    // window.location.hash = ''leaves the # character in the url
    // updating history allows to remove the hash but also the # character
    window.history.pushState('', document.title, `${window.location.pathname}${window.location.search}`);
    openManifest(sk, true);
  }
}

async function decorateSidekick(sk) {
  const env = getReviewEnv();
  const { state } = env;
  const features = sk.shadowRoot.querySelector('.feature-container');

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = '/tools/sidekick/review.css';

  sk.shadowRoot.append(link);

  if (state === 'page') previewMode(sk);
  if (state === 'reviews') reviewMode(features, sk);
  addReviewToEnvSelector(sk.shadowRoot);
}

let lastStatus = null;
function initReviewLayer(sk) {
  const checkSidekickStatus = (data) => {
    if (data.status === lastStatus) return;
    lastStatus = data.status;
    SidekickState.status = data;
    decorateSidekick(sk);
  };

  sk.addEventListener('statusfetched', ({ detail }) => {
    checkSidekickStatus(detail.data);
  });

  const status = sk.getAttribute('status');
  if (status) {
    checkSidekickStatus(JSON.parse(status));
  }
}

(() => {
  if (window.location.pathname.startsWith('/.snapshots/')) {
    if (!window.location.search.includes('suppress')) {
      window.location.pathname = `${window.location.pathname.split('/').slice(3).join('/')}`;
    }
  }

  const sk = document.querySelector('helix-sidekick');
  if (sk) {
    console.log('Sidekick found = initReviewLayer');
    initReviewLayer(sk);
  } else {
    // wait for sidekick to be loaded
    console.log('Sidekick NOT found = listener');
    document.addEventListener('helix-sidekick-ready', () => {
      console.log('helix-sidekick-ready = initReviewLayer');
      initReviewLayer(document.querySelector('helix-sidekick'));
    }, { once: true });
  }
})();
