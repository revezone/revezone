import {
  ControlledTreeEnvironment,
  Tree,
  TreeItem,
  TreeItemIndex,
  DraggingPosition,
  DraggingPositionBetweenItems,
  DraggingPositionItem
} from 'react-complex-tree';
import { useCallback, useEffect, useMemo } from 'react';
import { Dropdown } from 'antd';
import { useTranslation } from 'react-i18next';
import { fileTreeIndexeddbStorage } from '@renderer/store/fileTreeIndexeddb';
import type { RevezoneFile, RevezoneFileTree, RevezoneFolder } from '@renderer/types/file';
import { useAtom } from 'jotai';
import { focusItemAtom, selectedKeysAtom } from '@renderer/store/jotai';
import { FileText, Folder, MoreHorizontal, Spline } from 'lucide-react';
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

interface Props {
  searchQuery: string;
  noSearchResults: string;
  label: string;
}

function FileIcon({ item }: { item: TreeItem<RevezoneFile | RevezoneFolder> }) {
  if (item.isFolder) return <Folder size={16} aria-hidden="true" />;
  if (item.data.type === 'board') return <Spline size={16} aria-hidden="true" />;
  if (item.data.type === 'tldraw') return <TldrawIcon className="w-4 h-4" />;
  return <FileText size={16} aria-hidden="true" />;
}

export default function DraggableMenuTree({ searchQuery, noSearchResults, label }: Props) {
  const { t } = useTranslation();
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
  const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
  const matchingFiles = useMemo(
    () =>
      normalizedQuery
        ? Object.values(fileTree).filter(
            (item) => !item.isFolder && item.data.name.toLocaleLowerCase().includes(normalizedQuery)
          )
        : [],
    [fileTree, normalizedQuery]
  );

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
      const item = items.length === 1 ? fileTree[items[0]] : undefined;
      if (item && !item.isFolder) {
        const file = item.data as RevezoneFile;

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
      if (!name.trim()) return;

      await fileTreeIndexeddbStorage.updateFileOrFolderName(item.data, name);
      const updatedTree = await getFileTree();
      const savedName = updatedTree?.[item.data.id]?.data.name;

      if (!item.isFolder && savedName) {
        renameTabName(item.data.id, savedName, tabModel);
      }
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

      window.api?.dragAndDrop(items, String(target.parentItem), oldFileTree);

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

      window.api?.dragAndDrop(items, String(target.targetItem), oldFileTree);

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

  if (normalizedQuery) {
    return (
      <div className="revezone-menu-container rz-file-tree">
        <div className="menu-list">
          {matchingFiles.length === 0 ? (
            <p className="rz-file-search-empty" role="status">
              {noSearchResults}
            </p>
          ) : (
            <ul className="rz-file-search-results" aria-label={label}>
              {matchingFiles.map((item) => (
                <li key={item.index}>
                  <button
                    type="button"
                    className="rz-file-search-result"
                    aria-current={selectedKeys.includes(item.data.id) ? 'true' : undefined}
                    title={item.data.name}
                    onClick={() => void onSelectItems([item.index])}
                  >
                    <FileIcon item={item} />
                    <span>{item.data.name}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="revezone-menu-container rz-file-tree">
      <div className="menu-list">
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
          renderRenameInput={({ formProps, inputProps, inputRef, submitButtonRef }) => (
            <form {...formProps} className="rct-tree-item-renaming-form">
              <input {...inputProps} ref={inputRef} className="rct-tree-item-renaming-input" />
              <input
                ref={submitButtonRef}
                type="submit"
                className="rct-tree-item-renaming-submit-button"
                value={t('confirm.yes')}
                onClick={(event) => event.stopPropagation()}
              />
            </form>
          )}
          renderTreeContainer={({ children, containerProps }) => (
            <div {...containerProps}>{children}</div>
          )}
          renderItemsContainer={({ children, containerProps }) => (
            <ul {...containerProps}>{children}</ul>
          )}
          renderItem={({ item, depth, children, title, context, arrow }) => {
            const InteractiveComponent = context.isRenaming ? 'div' : 'button';
            const type = context.isRenaming ? undefined : 'button';
            const menuItems = getFileTreeContextMenu(
              item.data,
              context,
              !!item.isFolder,
              tabModel,
              fileTree,
              selectedKeys
            );

            return (
              <li {...context.itemContainerWithChildrenProps} className="rct-tree-item-li">
                <div
                  {...context.itemContainerWithoutChildrenProps}
                  style={{ paddingLeft: `${10 + depth * 14}px` }}
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
                  {item.isFolder && arrow}
                  <InteractiveComponent
                    // @ts-ignore
                    type={type}
                    {...context.interactiveElementProps}
                    className="rct-tree-item-button"
                    title={context.isRenaming ? undefined : item.data.name}
                  >
                    <Dropdown trigger={['contextMenu']} menu={{ items: menuItems }}>
                      <div
                        className={`menu-tree-item-child ${item.data.id}`}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenamingMenuItemIdToLocal(item.data.id);
                          context.startRenamingItem();
                        }}
                        onBlur={(e) => {
                          e.stopPropagation();
                          if (e.relatedTarget && e.currentTarget.contains(e.relatedTarget)) return;

                          if (
                            context.isRenaming &&
                            e.target instanceof HTMLInputElement &&
                            getRenamingMenuItemIdFromLocal() === item.data.id
                          ) {
                            void onRenameItem(item, e.target.value);
                          }
                        }}
                      >
                        <FileIcon item={item} />
                        <div className="rz-file-tree-name">{title}</div>
                      </div>
                    </Dropdown>
                  </InteractiveComponent>
                  {!context.isRenaming && (
                    <Dropdown trigger={['click']} menu={{ items: menuItems }}>
                      <button
                        type="button"
                        className="rz-file-tree-actions"
                        tabIndex={context.isFocused ? 0 : -1}
                        aria-haspopup="menu"
                        aria-label={`${t('operation.fileActions', 'File actions')}: ${
                          item.data.name
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal size={16} aria-hidden="true" />
                      </button>
                    </Dropdown>
                  )}
                </div>
                {children}
              </li>
            );
          }}
        >
          <Tree treeId="revezone-file-tree" rootItem="root" treeLabel={label} />
        </ControlledTreeEnvironment>
      </div>
      {getDeleteFileModal(tabModel)}
    </div>
  );
}
