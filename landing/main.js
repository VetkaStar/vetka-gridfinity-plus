(() => {
  const links = window.LANDING_LINKS || {};
  const mappings = {
    'generator-link': links.generator,
    'github-link': links.github,
    'profile-github-link': links.profileGithub,
    'youtube-link': links.youtube,
    'boosty-link': links.boosty
  };
  for (const [className, url] of Object.entries(mappings)) {
    document.querySelectorAll(`.${className}`).forEach(link => {
      if (url) { link.href = url; link.removeAttribute('aria-disabled'); }
      else { link.removeAttribute('href'); link.setAttribute('aria-disabled', 'true'); }
    });
  }
  const generator = links.generator || '';
  const local = /^https?:\/\/(localhost|127\.0\.0\.1)(:|\/|$)/i.test(generator);
  const status = document.getElementById('link-status');
  const notes = [];
  if (local) notes.push('Сейчас генератор открывается локально.');
  if (!generator) notes.push('Адрес генератора ещё не указан.');
  if (!links.github) notes.push('Адрес репозитория ещё не указан.');
  status.textContent = notes.join(' ');
  status.hidden = !notes.length;
})();
