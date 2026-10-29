// Reuse the actual classic section, preserving IDs, links and event handlers.
// A marker restores its original position when changing direction or mode.
export function createSectionScreen(detail) {
  const screen = document.createElement('div');
  screen.className = 'architect-page';
  screen.hidden = true;
  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'architect-page-close';
  close.textContent = 'Свернуть материалы';
  const content = document.createElement('div');
  screen.append(close, content);
  detail.append(screen);
  let section = null, marker = null;
  function restore() {
    if (section && marker) {
      marker.replaceWith(section);
      section.classList.remove('architect-screen-section');
    }
    section = marker = null;
    screen.hidden = true;
    delete detail.dataset.sectionOpen;
  }
  close.addEventListener('click', () => {
    restore();
    detail.scrollTop = 0;
    detail.querySelector('#next-open')?.focus({preventScroll:true});
  });
  return {
    show(item) {
      restore();
      if (!item?.href?.startsWith('#')) return;
      const target = document.getElementById(item.href.slice(1));
      if (!target || target.tagName !== 'SECTION' || target.parentElement?.tagName !== 'MAIN') return;
      marker = document.createComment('MAESTRO section return point');
      target.before(marker);
      section = target;
      section.classList.add('architect-screen-section');
      content.append(section);
      screen.hidden = false;
      detail.dataset.sectionOpen = item.id;
      detail.scrollTop = 0;
    },
    restore
  };
}
