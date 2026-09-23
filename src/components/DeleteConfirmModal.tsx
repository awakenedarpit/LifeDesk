import React from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-inverse-surface/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-surface-container-lowest border border-surface-container-high w-full max-w-sm rounded-2xl p-5 shadow-2xl flex flex-col gap-3">
        <div className="flex items-center gap-2.5 text-error">
          <div className="w-8 h-8 rounded-full bg-error-container text-on-error-container flex items-center justify-center flex-shrink-0">
            <span className="material-symbols-outlined text-[18px]">warning</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface font-semibold">
            {title}
          </h3>
        </div>

        <p className="font-body-md text-body-md text-on-surface-variant">
          {message}
        </p>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            className="flex-1 h-10 rounded-lg bg-surface-container-high text-on-surface font-label-md text-label-md hover:bg-surface-container transition-colors"
            onClick={onCancel}
          >
            Cancel
          </button>
          <button
            type="button"
            className="flex-1 h-10 rounded-lg bg-error text-on-error font-label-md text-label-md font-semibold hover:bg-opacity-90 transition-opacity"
            onClick={onConfirm}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};
