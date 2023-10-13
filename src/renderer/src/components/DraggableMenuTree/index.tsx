import {
  ControlledTreeEnvironment,
  Tree,
  TreeItem,
  TreeItemIndex,
  DraggingPosition,
  DraggingPositionBetweenItems,
  DraggingPositionItem
} from 'react-complex-tree';
import { useCallback, useEffect } from 'react';
import { Dropdown } from 'antd';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import type { RevezoneFile, RevezoneFileTree, RevezoneFolder } from '@renderer/types/file';
import { useAtom } from 'jotai';
import { focusItemAtom, selectedKeysAtom } from '@renderer/store/jotai';
import { Folder, MoreVertical, Palette, FileType } from 'lucide-react';
import useFileTreeContextMenu from '@renderer/hooks/useFileTreeContextMenu';
import useFileTree from '@renderer/hooks/useFileTree';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';
import useCurrentFile from '@renderer/hooks/useCurrentFile';
import useOpenKeys from '@renderer/hooks/useOpenKeys';
import useDeleteFile from '@renderer/hooks/useDeleteFile';
import {
  getRenamingMenuItemIdFromLocal,
  setRenamingMenuItemIdToLocal
} from '@renderer/store/localstorage';
import useDeleteFolder from '@renderer/hooks/useDeleteFolder';

import 'react-complex-tree/lib/style-modern.css';
import './index.css';
import { TldrawIcon } from '@renderer/icons';

export default function DraggableMenuTree() {
  const [selectedKeys, setSelectedKeys] = useAtom(selectedKeysAtom);
  const [focusItem, setFocusItem] = useAtom(focusItemAtom);
  const { fileTree, getFileTree } = useFileTree();
  const { openKeys, addOpenKeys, removeOpenKey } = useOpenKeys();
  const {
    updateTabJsonModelWhenCurrentFileChanged,
    renameTabName,
    model: tabModel
  } = useTabJsonModel();
  const { updateCurrentFile } = useCurrentFile();
  const { deleteFile } = useDeleteFile();
  const { deleteFolder } = useDeleteFolder();

  useEffect(() => {
    getFileTree();
  }, []);

  const { getFileTreeContextMenu, getDeleteFileModal } = useFileTreeContextMenu({
    deleteFile,
    deleteFolder
  });

  const onExpandItem = useCallback(
    (item: TreeItem) => {
      addOpenKeys([item.data.id]);
    },
    [openKeys]
  );

  const onCollapseItem = useCallback(
    (item: TreeItem<RevezoneFolder | RevezoneFile>) => {
      removeOpenKey(item.data.id);
    },
    [openKeys]
  );

  const onSelectItems = useCallback(
    async (items: TreeItemIndex[]) => {
      if (items.length === 1 && (items[0] as string).startsWith('file_')) {
        const file = fileTree[items[0]].data as RevezoneFile;

        await updateCurrentFile(file);

        updateTabJsonModelWhenCurrentFileChanged(file, tabModel);
      } else {
        setSelectedKeys(items as string[]);
      }
    },
    [fileTree, tabModel]
  );

  const onFocusItem = useCallback((item: TreeItem) => {
    setFocusItem(item.data.id);
  }, []);

  const onRenameItem = useCallback(
    async (item: TreeItem<RevezoneFile | RevezoneFolder>, name: string) => {
      setRenamingMenuItemIdToLocal('');

      await fileTreeIndexeddbStorage.updateFileOrFolderName(item.data, name);

      if (!item.isFolder) {
        await renameTabName(item.data.id, name, tabModel);
      }

      getFileTree();
    },
    [tabModel]
  );

  const clearTargetInChildren = useCallback((itemIds: string[], fileTree: RevezoneFileTree) => {
    // remove target from all children
    Object.keys(fileTree).forEach((key) => {
      fileTree[key].children = fileTree[key].children?.filter(
        (child) => !itemIds.includes(String(child))
      );
    });

    return fileTree;
  }, []);

  const onDropBetweenItems = useCallback(
    async (
      items: TreeItem<RevezoneFile | RevezoneFolder>[],
      target: DraggingPositionBetweenItems,
      fileTree: RevezoneFileTree
    ) => {
      const oldFileTree = JSON.parse(JSON.stringify(fileTree));

      const itemIds: string[] = items.map((item) => item.data.id).filter((id) => !!id);

      fileTree = clearTargetInChildren(itemIds, fileTree);

      const children = fileTree[target.parentItem].children || [];

      const newChildren = [
        ...children.slice(0, target.childIndex),
        ...itemIds,
        ...children.slice(target.childIndex)
      ];

      fileTree[target.parentItem].children = newChildren;

      await fileTreeIndexeddbStorage.updateFileTree(fileTree);

      window.api?.dragAndDrop(items, target.parentItem, oldFileTree);

      getFileTree();
    },
    []
  );

  const onDropItem = useCallback(
    async (
      items: TreeItem<RevezoneFile | RevezoneFolder>[],
      target: DraggingPositionItem,
      fileTree: RevezoneFileTree
    ) => {
      const oldFileTree = JSON.parse(JSON.stringify(fileTree));

      const itemIds: string[] = items.map((item) => item.data.id).filter((id) => !!id);
      fileTree = clearTargetInChildren(itemIds, fileTree);

      const children = fileTree[target.targetItem].children || [];
      const newChildren = [...itemIds, ...children];

      fileTree[target.targetItem].children = newChildren;

      await fileTreeIndexeddbStorage.updateFileTree(fileTree);

      window.api?.dragAndDrop(items, target.targetItem, oldFileTree);

      getFileTree();
    },
    []
  );

  const onDrop = useCallback(
    async (items: TreeItem<RevezoneFile | RevezoneFolder>[], target: DraggingPosition) => {
      switch (target.targetType) {
        case 'between-items':
          onDropBetweenItems(items, target, fileTree);
          break;
        case 'item':
          onDropItem(items, target, fileTree);
          break;
        case 'root':
          break;
      }
    },
    [fileTree]
  );

  return (
    <div className="revezone-menu-container w-[calc(100%-2rem)]">
      <div className="menu-list border-slate-100 px-1 pt-2">
        <ControlledTreeEnvironment
          items={fileTree}
          getItemTitle={(item) => `${item.data.name}`}
          viewState={{
            ['revezone-file-tree']: {
              selectedItems: selectedKeys,
              expandedItems: openKeys,
              focusedItem: focusItem
            }
          }}
          canDragAndDrop={true}
          canDropOnFolder={true}
          canReorderItems={true}
          canRename={true}
          canSearch={true}
          onSelectItems={onSelectItems}
          onExpandItem={onExpandItem}
          onCollapseItem={onCollapseItem}
          onFocusItem={onFocusItem}
          onDrop={onDrop}
          onRenameItem={onRenameItem}
          renderTreeContainer={({ children, containerProps }) => (
            <div {...containerProps}>{children}</div>
          )}
          renderItemsContainer={({ children, containerProps }) => (
            <ul {...containerProps}>{children}</ul>
          )}
          renderItem={({ item, depth, children, title, context, arrow }) => {
            const InteractiveComponent = context.isRenaming ? 'div' : 'button';
            const type = context.isRenaming ? undefined : 'button';

            return (
              <li {...context.itemContainerWithChildrenProps} className="rct-tree-item-li">
                <div
                  {...context.itemContainerWithoutChildrenProps}
                  style={{ paddingLeft: `${(depth + 1) * 0.5}rem` }}
                  className={[
                    'rct-tree-item-title-container',
                    item.isFolder && 'rct-tree-item-title-container-isFolder',
                    context.isSelected && 'rct-tree-item-title-container-selected',
                    context.isExpanded && 'rct-tree-item-title-container-expanded',
                    context.isFocused && 'rct-tree-item-title-container-focused',
                    context.isDraggingOver && 'rct-tree-item-title-container-dragging-over',
                    context.isSearchMatching && 'rct-tree-item-title-container-search-match'
                  ].join(' ')}
                >
                  {arrow}
                  <InteractiveComponent
                    // @ts-ignore
                    type={type}
                    {...context.interactiveElementProps}
                    className="rct-tree-item-button flex justify-between items-center"
                  >
                    <Dropdown
                      trigger={['contextMenu']}
                      menu={{
                        items: getFileTreeContextMenu(
                          item.data,
                          context,
                          !!item.isFolder,
                          tabModel,
                          fileTree,
                          selectedKeys
                        )
                      }}
                    >
                      <div
                        className={`flex items-center flex-1 menu-tree-item-child w-11/12 ${item.data.id}`}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingMenuItemIdToLocal(item.data.id);
                          context.startRenamingItem();
                        }}
                        onBlur={(e) => {
                          e.stopPropagation();

                          if (getRenamingMenuItemIdFromLocal()) {
                            const target = e.target as HTMLInputElement;
                            onRenameItem(item, target.value);
                          }
                        }}
                      >
                        <div className="flex items-center">
                          {item.isFolder ? <Folder className="w-4 h-4" /> : null}
                          {item.data.type === 'note' ? <FileType className="w-4 h-4" /> : null}
                          {item.data.type === 'board' ? <Palette className="w-4 h-4" /> : null}
                          {item.data.type === 'tldraw' ? <TldrawIcon className="w-3 h-3" /> : null}
                        </div>
                        <div className="ml-2 truncate pr-2 text-sm">{title}</div>
                      </div>
                    </Dropdown>
                    <Dropdown
                      trigger={['click']}
                      menu={{
                        items: getFileTreeContextMenu(
                          item.data,
                          context,
                          !!item.isFolder,
                          tabModel,
                          fileTree,
                          selectedKeys
                        )
                      }}
                    >
                      <div
                        className="w-8 h-6 flex items-center justify-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreVertical className="w-3 h-3 cursor-pointer text-gray-500" />
                      </div>
                    </Dropdown>
                  </InteractiveComponent>
                </div>
                {children}
              </li>
            );
          }}
        >
          <Tree treeId="revezone-file-tree" rootItem="root" treeLabel="FileTree" />
        </ControlledTreeEnvironment>
      </div>
      {getDeleteFileModal(tabModel)}
    </div>
  );
}
