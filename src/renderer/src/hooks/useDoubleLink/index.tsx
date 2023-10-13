import { useCallback } from 'react';
import useCurrentFile from '@renderer/hooks/useCurrentFile';
import useTabJsonModel from '@renderer/hooks/useTabJsonModel';
import { getFileIdOrNameFromLink } from '@renderer/utils/file';
import { NonDeletedExcalidrawElement } from 'revemate/es/Revedraw/types';
import { fileTreeAtom } from '@renderer/store/jotai';
import { useAtom } from 'jotai';
import { RevezoneFile } from '@renderer/types/file';

export default function useDoubleLink(outerJump: boolean) {
  const [fileTree] = useAtom(fileTreeAtom);

  const { updateCurrentFile } = useCurrentFile();
  const { model: tabModel, updateTabJsonModelWhenCurrentFileChanged } = useTabJsonModel();

  const onLinkOpen = useCallback(
    async (elementOrLink: NonDeletedExcalidrawElement | string, event?: Event) => {
      if (event) {
        event.preventDefault();
      }

      const link = typeof elementOrLink === 'string' ? elementOrLink : elementOrLink.link;

      const fileIdOrNameInRevezone = link && getFileIdOrNameFromLink(link);

      if (fileIdOrNameInRevezone) {
        let file: RevezoneFile | undefined = fileTree[fileIdOrNameInRevezone].data as RevezoneFile;

        if (!file) {
          file = Object.values(fileTree).find((item) => item.data.name === fileIdOrNameInRevezone)
            ?.data as RevezoneFile;
        }

        if (file) {
          await updateCurrentFile(file);

          updateTabJsonModelWhenCurrentFileChanged(file, tabModel);
        }
      } else {
        if (outerJump) {
          link && window.open(link);
        }
      }
    },
    [fileTree, tabModel]
  );

  return { onLinkOpen, tabModel, fileTree };
}
