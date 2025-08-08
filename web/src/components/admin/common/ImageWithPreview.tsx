import React from 'react';
import { Image } from 'antd';

interface ImageWithPreviewProps {
  src: string;
  width?: number | string;
  height?: number | string;
  alt?: string;
  style?: React.CSSProperties;
}

const ImageWithPreview: React.FC<ImageWithPreviewProps> = ({ src, ...props }) => {
  const isSvg = src.endsWith('.svg');

  if (isSvg) {
    return <img src={src} {...props} />;
  }

  return <Image src={src} {...props} />;
};

export default ImageWithPreview;