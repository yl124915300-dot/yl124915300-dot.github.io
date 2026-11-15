import { socialChatURL, socialSource, topics } from './topics.js?v=8';

const source = socialSource(location.search);
if (source) {
  for (const link of document.querySelectorAll('a[data-topic]')) {
    if (Object.hasOwn(topics, link.dataset.topic)) link.href = socialChatURL(source, link.dataset.topic);
  }
  for (const link of document.querySelectorAll('a[data-guide]')) {
    if (Object.hasOwn(topics, link.dataset.guide)) link.search = new URLSearchParams({ entry: source });
  }
}
