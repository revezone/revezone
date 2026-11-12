import { theme as antdTheme } from 'antd';
import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    fontSize: 13,
    colorPrimary: '#0284c7'
  },
  components: {
    Tabs: {
      itemSelectedColor: '#075985',
      itemHoverColor: '#075985',
      inkBarColor: '#075985'
    }
  }
};

export const darkTheme: ThemeConfig = {
  algorithm: antdTheme.darkAlgorithm,
  token: {
    ...theme.token,
    colorBgBase: '#151c27',
    colorBgContainer: '#1a2431',
    colorBgElevated: '#202c3c',
    colorBorder: '#344357',
    colorBorderSecondary: '#344357',
    colorPrimary: '#17688b',
    colorLink: '#99d4fa',
    colorLinkHover: '#c4eaff',
    colorTextBase: '#e5edf7',
    colorText: '#e5edf7',
    colorTextSecondary: '#a8b7ca'
  },
  components: {
    Tabs: {
      itemSelectedColor: '#99d4fa',
      itemHoverColor: '#c4eaff',
      inkBarColor: '#99d4fa'
    },
    Radio: {
      colorPrimary: '#8bccf6',
      colorPrimaryHover: '#bce3fc',
      colorBorder: '#738ba4',
      controlOutline: '#8bccf6'
    }
  }
};
