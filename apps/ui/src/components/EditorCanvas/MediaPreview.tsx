import React, { useState } from 'react';
import { AlertCircle, Music, RefreshCw } from 'lucide-react';
import { FileTreeBuilder } from '../../utils/FileTreeBuilder';

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
  const [imgError, setImgError] = useState(false);

  // Robust category fallback based on file extension
  const detectedCategory = FileTreeBuilder.detectCategory(filename);
  const isImage = (category === 'image' || detectedCategory === 'image') && !imgError;
  const isVideo = category === 'video' || detectedCategory === 'video';
  const isAudio = category === 'audio' || detectedCategory === 'audio';

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      {isImage && (
        <div className="max-w-2xl max-h-[70vh] rounded-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 p-2 glass-panel">
          <img
            src={content}
            alt={filename}
            onError={() => setImgError(true)}
            className="w-full h-full object-contain rounded-xl"
          />
        </div>
      )}

      {isVideo && (
        <div className="max-w-3xl w-full rounded-2xl overflow-hidden shadow-2xl border border-black/10 dark:border-white/10 glass-panel">
          <video src={content} controls className="w-full h-auto rounded-xl" />
        </div>
      )}

      {isAudio && (
        <div className="w-full max-w-md p-6 glass-panel rounded-2xl border border-black/10 dark:border-white/10 space-y-4">
          <div className="p-4 bg-primaryColor-500/10 rounded-2xl border border-primaryColor-500/20 text-primaryColor-600 dark:text-primaryColor-400 w-16 h-16 mx-auto flex items-center justify-center">
            <Music className="w-8 h-8" />
          </div>
          <h3 className="font-mono text-sm text-zinc-900 dark:text-white font-semibold">{filename}</h3>
          <audio src={content} controls className="w-full" />
        </div>
      )}

      {!isImage && !isVideo && !isAudio && (
        <div className="p-8 glass-panel rounded-2xl border border-black/10 dark:border-white/10 max-w-md space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-400 mx-auto" />
          <h3 className="text-base font-bold text-zinc-900 dark:text-white">
            {imgError ? 'Image Load Error' : 'Binary / Unsupported File'}
          </h3>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 font-mono">
            {imgError
              ? 'Could not render this image in the browser.'
              : 'This file cannot be previewed directly in the browser.'}
          </p>
          {imgError && (
            <button
              onClick={() => setImgError(false)}
              className="px-3 py-1.5 rounded-lg bg-black/5 dark:bg-white/10 hover:bg-black/10 dark:hover:bg-white/20 text-xs font-mono text-zinc-700 dark:text-zinc-300 transition flex items-center gap-1.5 mx-auto cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
          )}
          {onDownloadFile && (
            <button
              onClick={onDownloadFile}
              className="px-4 py-2 bg-primaryColor-600 hover:bg-primaryColor-500 text-white rounded-xl text-xs font-mono transition shadow-lg cursor-pointer block mx-auto"
            >
              Download Decrypted File
            </button>
          )}
        </div>
      )}
    </div>
  );
};
