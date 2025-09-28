'use client';

import { useState } from 'react';
import MediaViewer from './MediaViewer';
import Modal from './ui/Modal';

type Props = {
  id: string;
  title: string;
};

export default function MobileViewerLauncher({ id, title }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={`Open ${title} preview`}
        onClick={() => setOpen(true)}
        className="w-64 h-48 rounded-lg shadow-md overflow-hidden border border-slate-200 cursor-pointer hover:shadow-lg transition-shadow"
      >
        <MediaViewer id={id} title={title} thumbnail={true} />
      </button>
      <Modal open={open} onClose={() => setOpen(false)} label={`${title} preview`}>
        <div className="w-full h-[70vh] rounded-lg overflow-hidden border border-slate-200">
          <MediaViewer id={id} title={title} />
        </div>
      </Modal>
    </>
  );
}
