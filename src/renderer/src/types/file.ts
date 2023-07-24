export interface RevenoteFolder {
  id: string;
  name: string;
  gmtCreate: string;
  gmtModified: string;
}

export interface RevenoteFolderFileMapping {
  folderId: string;
  fileId: string;
  gmtCreate: string;
  gmtModified: string;
}

export type RevenoteFileType = 'markdown' | 'canvas';

export interface RevenoteFile {
  id: string;
  name: string;
  type: RevenoteFileType;
  gmtCreate: string;
  gmtModified: string;
}

export interface RevenoteFolder {
  id: string;
  name: string;
  gmtCreate: string;
  gmtModified: string;
}

export type FileTreeItem = RevenoteFolder & { children: RevenoteFile[] };

export type FileTree = FileTreeItem[];
