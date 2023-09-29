import { getRenamingMenuItemIdFromLocal } from '@renderer/store/localstorage';

export const getPageTitleDom = (): HTMLElement | null | undefined => {
  return document
    .querySelector('.affine-default-page-block-title ')
    ?.querySelector('span[data-virgo-text]');
};

/**
 * HACK: show renaming status when menu tree item first created
 */
export const dbclickMenuTreeItemAfterCreate = () => {
  setTimeout(() => {
    const element = document.querySelector(
      `.menu-tree-item-child.${getRenamingMenuItemIdFromLocal()}`
    );

    const event = new MouseEvent('dblclick', {
      bubbles: true,
      cancelable: true,
      view: window
    });

    element?.dispatchEvent(event);

    console.debug('--- dbclick ---', element);
  }, 100);
};
