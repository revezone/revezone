import { Button } from 'antd';

export default function StoragePathSetting() {
  return (
    <div>
      <Button
        onClick={() => {
          window.api.customStoragePath();
        }}
      >
        Choose Path
      </Button>
    </div>
  );
}
