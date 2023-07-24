import { useCallback, useRef, useState } from 'react';
import { Input, Tag } from 'antd';

import './index.css';
import { RevenoteFileType } from '@renderer/types/file';

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

  const onBlur = useCallback(() => {
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
      case 'markdown':
        return 'md';
      case 'canvas':
        return 'cv';
    }
    return null;
  }, []);

  return (
    <div className="editable-text-container" ref={ref} onDoubleClick={onEdit}>
      {isPreview ? (
        <p className="flex justify-between">
          <span>{value || defaultText}</span>
          <span>
            <Tag bordered={false}>{getMark(type)}</Tag>
          </span>
        </p>
      ) : (
        <Input
          defaultValue={value}
          onChange={onInnerChange}
          onBlur={onBlur}
          onPressEnter={() => setIsPreview(true)}
        />
      )}
    </div>
  );
}
