type Size = 'small' | 'middle' | 'large';

interface Props {
  className?: string;
  size?: Size;
  url?: string;
  onClick?: () => void;
}

const getTextSizeName = (size: Size) => {
  switch (size) {
    case 'small':
      return 'text-xl';
    case 'middle':
      return 'text-3xl';
    case 'large':
      return 'text-5xl';
  }
};

const getImageSizeName = (size: Size) => {
  switch (size) {
    case 'small':
      return 'w-6 h-6 mr-0.5';
    case 'middle':
      return 'w-10 h-10 mr-75';
    case 'large':
      return 'w-16 h-16 mr-1';
  }
};

export default function Logo({ size = 'small', className = '', url, onClick }: Props) {
  return (
    <div
      className={`flex items-center text-xl font-mono cursor-pointer ${getTextSizeName(
        size
      )} ${className}`}
      onClick={() => {
        onClick?.();
        url && window.open(url);
      }}
    >
      <img
        className={getImageSizeName(size)}
        src="https://img.alicdn.com/imgextra/i2/O1CN01Ei2rTp1x7sUnWKWj3_!!6000000006397-2-tps-720-720.png"
        alt=""
      />
      <span
        className={`tracking-wider bg-clip-text text-transparent text-sky-500 bg-gradient-to-r 
      from-sky-300 to-sky-600 decoration-cyan-100 underline-offset-2  underline font-semibold 
      ${getTextSizeName(size)}`}
      >
        evezone
      </span>
    </div>
  );
}
