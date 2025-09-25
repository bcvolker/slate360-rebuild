'use client';

type Props = { id: string };

export default function MediaViewer({ id }: Props) {
  let message = 'Content Coming Soon';
  if (id === 'hero' || id === 'bim-studio') message = '3D Model Viewer Coming Soon';
  if (id === 'tour-builder' || id === 'tours' || id === 'tour') message = '360° Photo Coming Soon';

  return (
    <div className="flex aspect-video w-full items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
      {message}
    </div>
  );
}
