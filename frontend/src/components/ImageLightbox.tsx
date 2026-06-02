import React from 'react';
import { useI18n } from '../lib/useI18n';
import '../styles/ImageLightbox.css';

interface ImageLightboxProps {
  images: string[];
  initialIndex: number;
  title?: string;
  onClose: () => void;
}

const ImageLightbox: React.FC<ImageLightboxProps> = ({ images, initialIndex, title, onClose }) => {
  const { tp } = useI18n();
  const [index, setIndex] = React.useState(initialIndex);

  React.useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  React.useEffect(() => {
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
      if (event.key === 'ArrowRight') {
        setIndex((prev) => (prev + 1) % images.length);
      }
      if (event.key === 'ArrowLeft') {
        setIndex((prev) => (prev - 1 + images.length) % images.length);
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [images.length, onClose]);

  if (!images.length) return null;

  return (
    <div className="lightbox-backdrop" onClick={onClose} role="button" tabIndex={0}>
      <div
        className="lightbox-panel"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={tp('Property image viewer')}
      >
        <button type="button" className="lightbox-close" onClick={onClose}>{tp('Close')}</button>
        <div className="lightbox-main">
          <button
            type="button"
            className="lightbox-nav"
            onClick={() => setIndex((prev) => (prev - 1 + images.length) % images.length)}
            disabled={images.length < 2}
          >
            {tp('Prev')}
          </button>
          <img src={images[index]} alt={`${title || tp('Property image')} ${index + 1}`} />
          <button
            type="button"
            className="lightbox-nav"
            onClick={() => setIndex((prev) => (prev + 1) % images.length)}
            disabled={images.length < 2}
          >
            {tp('Next')}
          </button>
        </div>
        <p className="lightbox-meta">
          {title ? `${title} - ` : ''}
          {index + 1} / {images.length}
        </p>
        <div className="lightbox-thumbs">
          {images.map((image, imageIndex) => (
            <button
              key={`${image}-${imageIndex}`}
              type="button"
              className={`lightbox-thumb ${index === imageIndex ? 'active' : ''}`}
              onClick={() => setIndex(imageIndex)}
            >
              <img src={image} alt={`${tp('Thumbnail')} ${imageIndex + 1}`} />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ImageLightbox;
