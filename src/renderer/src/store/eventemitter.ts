import EventEmitter from 'event-emitter';

export const events = {
  WORKSPACE_LOADED: 'workspace_loaded',
  FORCE_UPDATE_EDITOR: 'force_update_editor'
};

export const emitter = new EventEmitter();
