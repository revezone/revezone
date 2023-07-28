import { useCallback, useRef, useState } from 'react';
import { Input } from 'antd';
import { Palette, FileType } from 'lucide-react';
import { RevenoteFileType } from '@renderer/types/file';

import './index.css';

interface Props {
  text: string;
  defaultText?: string;
  extraText?: string;
  type?: RevenoteFileType;
  onChange: (text: string) => void;
}

export default function EditableText({ text, defaultText, type, extraText, onChange }: Props) {
  const [isPreview, setIsPreview] = useState(true);
  const [value, setValue] = useState(text);
  const ref = useRef<HTMLDivElement>(null);

  const onInnerChange = useCallback((e) => {
    setValue(e.target.value);
  }, []);

  const onSave = useCallback(() => {
    setIsPreview(true);
    onChange(value);
  }, [value]);

  const onEdit = useCallback(() => {
    setIsPreview(!isPreview);

    setTimeout(() => {
      const input = ref.current?.querySelector('input') as HTMLInputElement;
      input?.focus();
    }, 0);
  }, [isPreview]);

  const getMark = useCallback((type) => {
    switch (type) {
      case 'note':
        return <FileType className="w-4 h-4 mr-2" />;
      case 'board':
        return <Palette className="w-4 h-4 mr-2" />;
    }
    return null;
  }, []);

  return (
    <div className="editable-text-container flex items-center" ref={ref} onDoubleClick={onEdit}>
      {isPreview ? (
        <div title={value} className="flex items-center justify-between w-full">
          <div className="leading-4">
            <p className="text-ellipsis overflow-hidden">{value || defaultText}</p>
            {extraText ? (
              <p className="text-slate-400 leading-4 text-xs mt-1">{extraText}</p>
            ) : null}
          </div>
          <p>{getMark(type)}</p>
        </div>
      ) : (
        <Input
          defaultValue={value}
          onChange={onInnerChange}
          onBlur={onSave}
          onPressEnter={onSave}
        />
      )}
    </div>
  );
}
