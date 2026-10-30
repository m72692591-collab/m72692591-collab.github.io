// Live topics reuse exact authored text without moving classic sections or
// cloning IDs, forms, canvases or controls that would lose their handlers.
export function createSectionScreen(detail) {
  const live = detail.closest('.next-live');
  const screen = document.createElement('div');
  screen.className = 'architect-page';
  screen.hidden = true;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'architect-page-close';
  close.textContent = 'Вернуться к карусели';
  const layout = document.createElement('button');
  layout.type = 'button';
  layout.className = 'architect-page-layout';
  const toolbar = document.createElement('div');
  toolbar.className = 'architect-page-toolbar';
  toolbar.append(close, layout);
  const content = document.createElement('div');
  content.className = 'architect-topic-content';
  screen.append(toolbar, content);
  detail.append(screen);
  let modal = false, hiddenBranches = [], bodyOverflow = null;
  const savedAttributes = new Map(['role', 'aria-modal', 'aria-label', 'tabindex'].map(name => [name, detail.getAttribute(name)]));

  function releaseModal() {
    if (!modal) return;
    modal = false;
    hiddenBranches.forEach(([node, inert]) => { node.inert = inert; });
    hiddenBranches = [];
    savedAttributes.forEach((value, name) => value === null ? detail.removeAttribute(name) : detail.setAttribute(name, value));
    if (bodyOverflow.value) document.body.style.setProperty('overflow', bodyOverflow.value, bodyOverflow.priority);
    else document.body.style.removeProperty('overflow');
    bodyOverflow = null;
  }
  function present() {
    if (screen.hidden) return;
    detail.dataset.pagePresented = 'true';
    if (live?.dataset.pageLayout !== 'full' || modal) return;
    modal = true;
    detail.inert = false;
    detail.setAttribute('role', 'dialog');
    detail.setAttribute('aria-modal', 'true');
    detail.setAttribute('aria-label', content.querySelector('.architect-topic-title')?.textContent || 'МАЭСТРО BUSINESS');
    detail.setAttribute('tabindex', '-1');
    // Keep the dialog's entire ancestor path active; save each sibling's prior state.
    for (let branch = detail; branch.parentElement; branch = branch.parentElement) {
      for (const sibling of branch.parentElement.children) {
        if (sibling !== branch && sibling instanceof HTMLElement) {
          hiddenBranches.push([sibling, sibling.inert]);
          sibling.inert = true;
        }
      }
      if (branch.parentElement === document.body) break;
    }
    bodyOverflow = {value: document.body.style.getPropertyValue('overflow'), priority: document.body.style.getPropertyPriority('overflow')};
    document.body.style.overflow = 'hidden';
    close.focus({preventScroll:true});
  }
  function closePage({focus = true} = {}) {
    restore();
    detail.inert = false;
    detail.scrollTop = 0;
    detail.dispatchEvent(new CustomEvent('architect:section-close', {bubbles:true}));
    if (focus) document.getElementById('architect-select')?.focus({preventScroll:true});
  }
  layout.addEventListener('click', () => detail.dispatchEvent(new CustomEvent('architect:layout-request', {
    bubbles:true, detail:{layout:live?.dataset.pageLayout === 'full' ? 'side' : 'full'}
  })));
  document.addEventListener('keydown', event => {
    if (screen.hidden || live?.dataset.pageLayout !== 'full') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      closePage();
    } else if (event.key === 'Tab' && modal) {
      const focusable = [...detail.querySelectorAll('a[href],button,input,select,textarea,summary,[tabindex]')]
        .filter(node => !node.disabled && node.tabIndex >= 0 && !node.closest('[inert]') && node.getClientRects().length);
      const first = focusable[0], last = focusable.at(-1);
      if (!first) { event.preventDefault(); detail.focus({preventScroll:true}); }
      else if (event.shiftKey && (document.activeElement === first || !detail.contains(document.activeElement))) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || !detail.contains(document.activeElement))) { event.preventDefault(); first.focus(); }
    }
  });
  // Includes cloned product links, the common CTA and links created by the consultant.
  detail.addEventListener('click', event => {
    if (event.target.closest?.('a[href="#lead"]') && live?.dataset.pageLayout === 'full') closePage({focus:false});
  });
  window.addEventListener('maestro:lead-request', () => {
    if (live?.dataset.pageLayout === 'full') closePage({focus:false});
  });
  window.addEventListener('maestro:consultant-closed', () => {
    if (modal) close.focus({preventScroll:true});
  });

  function element(tag, className, text) {
    const node = document.createElement(tag);
    node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function keepInterest(item) {
    const input = document.getElementById('interest');
    if (input && [...input.options].some(option => option.value === item.interest)) input.value = item.interest;
  }
  function bindLink(link, item) {
    link.addEventListener('click', () => {
      keepInterest(item);
      const href = link.getAttribute('href');
      if (href?.startsWith('#') && href !== '#lead') {
        document.querySelector('button[data-next-mode="classic"]')?.click();
      }
    });
    return link;
  }
  function action(href, label, item, primary = false) {
    const link = element('a', `architect-topic-link${primary ? ' architect-topic-link-primary' : ''}`, label);
    link.href = href;
    return bindLink(link, item);
  }
  function copyText(source, className, item) {
    const copy = source.cloneNode(true);
    copy.className = className;
    [copy, ...copy.querySelectorAll('*')].forEach(node => {
      node.removeAttribute('id');
      node.removeAttribute('style');
      node.removeAttribute('aria-labelledby');
      node.removeAttribute('aria-describedby');
      for (const attribute of [...node.attributes]) if (attribute.name.startsWith('on')) node.removeAttribute(attribute.name);
    });
    copy.querySelectorAll('form,input,button,select,textarea,canvas,script').forEach(node => node.remove());
    copy.querySelectorAll('a[href]').forEach(link => bindLink(link, item));
    return copy;
  }
  function sourceSection(id) {
    const section = document.getElementById(id);
    return section?.tagName === 'SECTION' && section.parentElement?.tagName === 'MAIN' ? section : null;
  }
  function sourceCards(topic) {
    if (topic.collection) return [...(sourceSection(topic.collection.section)?.querySelectorAll(topic.collection.selector) || [])];
    return (topic.cards || []).map(spec => [...(sourceSection(spec.section)?.querySelectorAll(spec.selector || '.grid3 > .card') || [])]
      .find(card => card.querySelector('h3,strong,b')?.textContent.trim() === spec.heading)).filter(Boolean);
  }
  function renderCard(source, item) {
    const card = element('section', 'architect-topic-card');
    const heading = source.querySelector('h3,strong,b');
    const image = source.querySelector('img[src]');
    if (image) {
      const media = element('img', 'architect-topic-image');
      media.src = image.getAttribute('src');
      media.alt = image.getAttribute('alt') || '';
      media.loading = 'lazy';
      media.decoding = 'async';
      card.append(media);
    }
    if (heading) card.append(element('h3', 'architect-topic-card-title', heading.textContent));
    const price = source.querySelector('.money');
    if (price) card.append(element('div', 'architect-topic-price', price.textContent));
    const paragraphs = [...source.querySelectorAll(':scope > p')];
    paragraphs.forEach(paragraph => {
      // Link-only paragraphs become actions; authored prose is copied exactly.
      if (paragraph.children.length && [...paragraph.childNodes].every(node => node.nodeType === 3 ? !node.textContent.trim() : node.tagName === 'A')) return;
      card.append(copyText(paragraph, 'architect-topic-copy', item));
    });
    if (!paragraphs.length && !price) {
      const description = source.querySelector(':scope > span:not(.mini)');
      if (description) card.append(element('p', 'architect-topic-copy', description.textContent));
    }
    const list = source.querySelector(':scope > ul');
    if (list) card.append(copyText(list, 'architect-topic-list', item));
    const tags = source.querySelector('.tags');
    if (tags) {
      const labels = element('div', 'architect-topic-tags');
      tags.querySelectorAll('.tag').forEach(tag => labels.append(element('span', 'architect-topic-tag', tag.textContent)));
      card.append(labels);
    }
    const links = source.matches('a[href]') ? [source] : [...source.querySelectorAll(':scope > a[href], :scope > p > a[href]')];
    if (links.length) {
      const actions = element('div', 'architect-topic-card-actions');
      links.forEach(link => actions.append(action(link.getAttribute('href'), source === link ? link.querySelector('.mini')?.textContent || heading?.textContent : link.textContent, item)));
      card.append(actions);
    }
    return card;
  }
  function restore({preserveLayout = false} = {}) {
    releaseModal();
    content.replaceChildren();
    screen.hidden = true;
    delete detail.dataset.sectionOpen;
    delete detail.dataset.pagePresented;
    if (!preserveLayout && live) live.dataset.pageLayout = 'side';
  }
  close.addEventListener('click', () => closePage());
  return {
    show(item) {
      restore({preserveLayout:true});
      if (!item?.topic) return;
      const topic = item.topic;
      const article = element('article', 'architect-topic');
      article.dataset.topic = item.id;
      const header = element('div', 'architect-topic-header');
      const icon = element('img', 'architect-topic-icon');
      icon.src = `assets/icons/${topic.icon}.svg`;
      icon.alt = '';
      icon.width = icon.height = 32;
      header.append(icon, element('span', 'architect-topic-kicker', 'МАЭСТРО BUSINESS'),
        element('h2', 'architect-topic-title', item.title), element('p', 'architect-topic-summary', item.description));
      article.append(header);
      const section = topic.collection && sourceSection(topic.collection.section);
      if (topic.intro) {
        const intro = section?.querySelector('.wrap > .lead');
        if (intro) article.append(copyText(intro, 'architect-topic-intro', item));
      }
      const grid = element('div', 'architect-topic-grid');
      sourceCards(topic).forEach(source => grid.append(renderCard(source, item)));
      article.append(grid);
      if (topic.note) {
        const note = section?.querySelector('.wrap > p:last-child');
        if (note) article.append(copyText(note, 'architect-topic-note', item));
      }
      if (topic.link) {
        const actions = element('div', 'architect-topic-actions');
        actions.append(action(topic.link.href, topic.link.label, item));
        article.append(actions);
      }
      content.append(article);
      screen.hidden = false;
      detail.dataset.sectionOpen = item.id;
      detail.scrollTop = 0;
      const full = live?.dataset.pageLayout === 'full';
      layout.textContent = full ? 'Рядом с Маэстро' : 'На весь экран';
      layout.setAttribute('aria-pressed', String(full));
    },
    restore,
    present
  };
}
