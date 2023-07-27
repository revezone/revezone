import { useCallback, useRef, useState } from 'react';
import { Input } from 'antd';
import { Palette, FileType } from 'lucide-react';
import { RevenoteFileType } from '@renderer/types/file';

import './index.css';

interface Props {
  text: string;
  defaultText?: string;
  type?: RevenoteFileType;
  onChange: (text: string) => void;
}

export default function EditableText({ text, defaultText, type, onChange }: Props) {
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
    <div className="editable-text-container" ref={ref} onDoubleClick={onEdit}>
      {isPreview ? (
        <p className="flex justify-between items-center">
          <span>{value || defaultText}</span>
          {getMark(type)}
        </p>
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
