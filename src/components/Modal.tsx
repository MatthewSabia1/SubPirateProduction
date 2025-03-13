import React, { useEffect, useCallback } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  disableBackdropClick?: boolean;
}

function Modal({ isOpen, onClose, children, disableBackdropClick = false }: ModalProps) {
  // Memoize the ESC key handler to maintain consistent reference across renders
  const handleEscKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleEscKey);
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscKey);
      // Restore body scrolling when modal is closed
      document.body.style.overflow = '';
    };
  }, [isOpen, handleEscKey]);

  // Memoize the backdrop click handler
  const handleBackdropClick = useCallback(() => {
    if (!disableBackdropClick) {
      onClose();
    }
  }, [disableBackdropClick, onClose]);

  // Memoize the stop propagation handler
  const handleModalClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clicks inside the modal from closing it
  }, []);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="fixed inset-0 bg-black/70 backdrop-blur-sm"
        onClick={handleBackdropClick}
      />
      <div 
        className="relative z-50 w-full max-w-md bg-[#111111] rounded-lg shadow-xl max-h-[90vh] overflow-y-auto"
        onClick={handleModalClick}
      >
        {children}
      </div>
    </div>
  );
}

export default Modal;