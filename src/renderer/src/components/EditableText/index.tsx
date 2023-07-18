import { useCallback, useRef, useState, forwardRef } from 'react';
import { Input } from 'antd';
import type { InputRef } from 'antd';

import './index.css';

interface Props {
  text: string;
  defaultText?: string;
  onChange: (text: string) => void;
}

export default function EditableText({ text, defaultText, onChange }: Props) {
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

  return (
    <div className="editable-text-container" ref={ref} onDoubleClick={onEdit}>
      {isPreview ? (
        value || defaultText
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
