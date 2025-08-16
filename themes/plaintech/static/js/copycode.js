(() => {
  // Progressive enhancement: only run if Clipboard API is supported
  if (!('clipboard' in navigator)) return;
  const CODE_SELECTOR = '.code-block';

  function enhance(block) {
    const button = block.querySelector('.copy-btn');
    const codeEl = block.querySelector('pre > code');
    if (!button || !codeEl) return;

    // Improve button accessibility
    button.setAttribute('aria-live', 'polite');

    button.addEventListener('click', async () => {
      try {
        const text = codeEl.innerText;
        await navigator.clipboard.writeText(text);
        const original = button.querySelector('.copy-label');
        if (original) {
          const oldText = original.textContent;
          original.textContent = 'Copied';
          button.classList.add('copied');
          setTimeout(() => {
            original.textContent = oldText || 'Copy';
            button.classList.remove('copied');
          }, 1600);
        }
      } catch (err) {
        // Fallback UI on failure
        button.querySelector('.copy-label')?.insertAdjacentText('afterend', ' (press Cmd/Ctrl+C)');
      }
    });
  }

  const blocks = document.querySelectorAll(CODE_SELECTOR);
  blocks.forEach(enhance);

  // If content is swapped dynamically in future, observe mutations lightly
  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes?.forEach((n) => {
        if (n.nodeType === 1 && n.matches?.(CODE_SELECTOR)) enhance(n);
      });
    }
  });
  observer.observe(document.documentElement, { subtree: true, childList: true });
})();
