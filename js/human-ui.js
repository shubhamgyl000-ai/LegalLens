(() => {
  const css = document.querySelector('link[href="css/style.css"]');
  if (css) css.setAttribute("href", "css/style.css?v=human");
  document.documentElement.setAttribute("data-human-ui", "true");
})();