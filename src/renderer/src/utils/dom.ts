export const getPageTitleDom = (): HTMLElement | null | undefined => {
  return document
    .querySelector('.affine-default-page-block-title ')
    ?.querySelector('span[data-virgo-text]');
};

/**
 * the hack method to update blocksuite editor title dom
 * fix the problem that not rerender after rename page block's title prop
 * @param title string
 */
export const hackUpdateTitleDom = (title) => {
  setTimeout(() => {
    const titleDom = getPageTitleDom();

    if (titleDom) {
      titleDom.innerHTML = title;
    }
  }, 0);
};

export const getPageTitleFromDom = (): string => {
  const titleDom = getPageTitleDom();

  return titleDom?.innerHTML || '';
};
