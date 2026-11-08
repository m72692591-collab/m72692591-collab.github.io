// One readable service explanation for the classic directory and the live screen.
export function createServiceStory(item) {
  const details = item.details;
  const story = document.createElement('section');
  story.className = 'maestro-service-story';
  story.dataset.service = item.id;
  if (!details) return story;
  const node = (tag, className, text) => {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  const intro = node('div', 'service-intro');
  const figure = node('figure', 'service-visual');
  const image = node('img', 'service-image');
  image.src = details.image.src;
  image.alt = details.image.alt;
  image.loading = 'lazy';
  image.decoding = 'async';
  figure.append(image);
  intro.append(figure, node('p', 'service-lead', details.lead));
  story.append(intro);

  const choices = node('section', 'service-choices');
  choices.append(node('h3', 'service-section-title', ['cases','pricing','documents'].includes(item.id) ? 'Что полезно знать' : 'С какой задачей можно обратиться'));
  const offers = node('div', 'service-offers');
  for (const offer of details.offers) {
    const card = node('article', 'service-offer');
    card.append(node('h4', 'service-offer-title', offer.title), node('p', 'service-copy', offer.text));
    offers.append(card);
  }
  choices.append(offers);
  story.append(choices);

  const process = node('section', 'service-process');
  process.append(node('h3', 'service-section-title', 'Как будем работать с вами'));
  const steps = node('ol', 'service-steps');
  details.steps.forEach((step, index) => {
    const row = node('li', 'service-step');
    const number = node('span', 'service-step-number', String(index + 1).padStart(2, '0'));
    number.setAttribute('aria-hidden', 'true');
    const copy = node('div', 'service-step-copy');
    copy.append(node('h4', 'service-step-title', step.title), node('p', 'service-copy', step.text));
    row.append(number, copy);
    steps.append(row);
  });
  process.append(steps);
  story.append(process);

  const result = node('section', 'service-result');
  result.append(node('h3', 'service-section-title', ['cases','documents'].includes(item.id) ? 'На что обратить внимание' : 'Что останется у вас после работы'));
  const list = node('ul', 'service-deliverables');
  details.deliverables.forEach(text => list.append(node('li', '', text)));
  result.append(list);
  story.append(result);

  const start = node('section', 'service-start');
  start.append(node('h3', 'service-section-title', 'С чего начнём'), node('p', 'service-copy', details.preparation));
  const action = node('a', 'service-cta', details.question);
  action.href = '#lead';
  action.addEventListener('click', () => {
    const field = document.getElementById('interest');
    if (field && [...field.options].some(option => option.value === item.interest)) field.value = item.interest;
    window.dispatchEvent(new CustomEvent('maestro:lead-request'));
  });
  start.append(action);
  story.append(start);
  return story;
}
