import React from 'react';
import { AlertCircle, Music } from 'lucide-react';

interface MediaPreviewProps {
  category: string;
  content: string;
  filename: string;
  onDownloadFile?: () => void;
}

export const MediaPreview: React.FC<MediaPreviewProps> = ({
  category,
  content,
  filename,
  onDownloadFile,
}) => {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      {category === 'image' && (
        <div className="max-w-2xl max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl border border-white/10 p-2 glass-panel">
          <img
            src={content}
            alt={filename}
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
      )}

      {category === 'video' && (
        <div className="max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl border border-white/10 glass-panel">
          <video src={content} controls className="w-full h-auto rounded-xl" />
        </div>
      )}

      {category === 'audio' && (
        <div className="w-full max-w-md p-6 glass-panel rounded-2xl border border-white/10 space-y-4">
          <div className="p-4 bg-primaryColor-500/10 rounded-2xl border border-primaryColor-500/20 text-primaryColor-400 w-16 h-16 mx-auto flex items-center justify-center">
            <Music className="w-8 h-8" />
          </div>
          <h3 className="font-mono text-sm text-white font-semibold">{filename}</h3>
          <audio src={content} controls className="w-full" />
        </div>
      )}

      {category === 'binary' && (
        <div className="p-8 glass-panel rounded-2xl border border-white/10 max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-white">Binary / Unsupported File</h3>
          <p className="text-xs text-zinc-400 font-mono">
            This file cannot be previewed directly in the browser.
          </p>
          {onDownloadFile && (
            <button
              onClick={onDownloadFile}
              className="px-4 py-2 bg-primaryColor-600 hover:bg-primaryColor-500 text-white rounded-xl text-xs font-mono transition shadow-lg cursor-pointer"
            >
              Download Decrypted File
            </button>
          )}
        </div>
      )}
    </div>
  );
};
