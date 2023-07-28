import { ReactNode, useEffect, useState } from 'react';
import { emitter, events } from '../../store/eventemitter';
import { workspaceLoadedAtom } from '../../store/jotai';
import { useAtom } from 'jotai';

interface Props {
  children: ReactNode;
}

export default function WorkspaceLoaded(props: Props) {
  const [workspaceLoaded, setWorkspaceLoaded] = useAtom(workspaceLoadedAtom);

  useEffect(() => {
    emitter.on(events.WORKSPACE_LOADED, () => {
      setWorkspaceLoaded(true);
    });
  }, []);

  return workspaceLoaded ? props.children : null;
}
