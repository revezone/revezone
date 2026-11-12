import EventEmitter from 'event-emitter';

export const events = {
  WORKSPACE_LOADED: 'workspace_loaded',
  FORCE_UPDATE_EDITOR: 'force_update_editor',
  SWITCH_FONT_FAMILY: 'switch_font_family',
  OPEN_AGENT_MODEL_SETTINGS: 'open_agent_model_settings',
  AGENT_MODEL_SETTINGS_SAVED: 'agent_model_settings_saved'
};

// @ts-ignore
export const emitter = new EventEmitter();
