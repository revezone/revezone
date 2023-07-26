import { Menu, MenuItem } from 'electron';

export const registerAppMenu = () => {
  const helpSubMenuItems = [
    new MenuItem({
      label: 'Twitter',
      click: () => {
        const { shell } = require('electron');
        shell.openExternal('https://twitter.com/TheReveNote');
      }
    }),
    new MenuItem({
      label: 'Github',
      click: () => {
        const { shell } = require('electron');
        shell.openExternal('https://github.com/revenote/revenote');
      }
    })
  ];

  const menu = Menu.getApplicationMenu();

  if (menu) {
    menu.items = menu?.items.map((item) => {
      if (item.role === 'help') {
        helpSubMenuItems.forEach((_item) => {
          item.submenu?.insert(0, _item);
        });
      }
      return item;
    });
  }

  Menu.setApplicationMenu(menu);
};
