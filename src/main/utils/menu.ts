import { Menu } from 'electron';

export const registerAppMenu = () => {
  const template = [
    {
      role: 'help',
      submenu: [
        {
          label: 'Github',
          click: () => {
            const { shell } = require('electron');
            shell.openExternal('https://github.com/revenote/revenote');
          }
        },
        {
          label: 'Twitter',
          click: () => {
            const { shell } = require('electron');
            shell.openExternal('https://twitter.com/TheReveNote');
          }
        }
      ]
    }
  ];

  // @ts-ignore
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
};
