document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll('div > div[class^="language-"]').forEach(code => {
      const lang = code.className.match(/language-(\w+)/);
      if (lang && lang[1]) {
        code.setAttribute("data-lang", lang[1]);
      }
    });
  });
  