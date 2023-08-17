import EventEmitter from 'event-emitter';

export const events = {
  WORKSPACE_LOADED: 'workspace_loaded',
  FORCE_UPDATE_EDITOR: 'force_update_editor',
  SWITCH_FONT_FAMILY: 'switch_font_family'
};

export const emitter = new EventEmitter();
