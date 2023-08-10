import { useCallback, useEffect, useRef, useState } from 'react';
import { Input, InputRef } from 'antd';
import { Palette, FileType } from 'lucide-react';
import { RevezoneFileType } from '@renderer/types/file';

import './index.css';

interface Props {
  text: string;
  defaultText?: string;
  extraText?: string;
  type?: RevezoneFileType;
  isPreview: boolean;
  onSave: (text: string) => void;
  onEdit: () => void;
}

export default function EditableText({
  isPreview = true,
  text,
  defaultText,
  type,
  extraText,
  onSave,
  onEdit
}: Props) {
  const [value, setValue] = useState(text);
  const inputRef = useRef<InputRef>(null);

  const _onChange = useCallback((e) => {
    setValue(e.target.value);
  }, []);

  const _onSave = useCallback(
    (e) => {
      console.log('_onSave', e);
      e.stopPropagation();
      e.preventDefault();
      onSave(value);
    },
    [value]
  );

  const _onEdit = useCallback(
    (e) => {
      e.stopPropagation();
      onEdit();
    },
    [isPreview]
  );

  useEffect(() => {
    if (isPreview) return;

    setTimeout(() => {
      console.log('_onEdit', inputRef);
      inputRef.current?.focus();
      // scroll the focused input element into view
      document.querySelector('.revezone-menu-container')?.scrollIntoView();
    }, 0);
  }, [isPreview]);

  const getMark = useCallback((type) => {
    switch (type) {
      case 'note':
        return <FileType className="w-4 mr-2" />;
      case 'board':
        return <Palette className="w-4 mr-2" />;
    }
    return null;
  }, []);

  return (
    <div className="editable-text-container flex items-center" onDoubleClick={_onEdit}>
      {isPreview ? (
        <div title={value} className="flex items-center justify-between w-full">
          <div className="leading-4">
            <p className="text-ellipsis overflow-hidden">{value || defaultText}</p>
            {extraText ? (
              <p className="text-slate-400 leading-4 text-xs mt-1">{extraText}</p>
            ) : null}
          </div>
          <p className="flex items-center">{getMark(type)}</p>
        </div>
      ) : (
        <Input
          ref={inputRef}
          defaultValue={value}
          onChange={_onChange}
          onBlur={_onSave}
          onPressEnter={_onSave}
        />
      )}
    </div>
  );
}
