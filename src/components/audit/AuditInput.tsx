import { useState, useRef, useCallback } from 'react';
import { Globe, GitBranch, Upload, X, FileText } from 'lucide-react';
import Card from '../ui/Card';
import SegmentedControl from '../ui/SegmentedControl';
import TextInput from '../ui/TextInput';
import type { AuditInputType } from '../../types';

type InputTab = 'url' | 'github' | 'files';

interface AuditInputProps {
  inputType: AuditInputType;
  source: string;
  files: File[];
  onInputTypeChange: (type: AuditInputType) => void;
  onSourceChange: (source: string) => void;
  onFilesChange: (files: File[]) => void;
  disabled?: boolean;
}

const INPUT_OPTIONS: { value: InputTab; label: string }[] = [
  { value: 'url', label: 'URL' },
  { value: 'github', label: 'GitHub' },
  { value: 'files', label: 'Files' },
];

const TAB_CONFIG: Record<InputTab, { label: string; icon: typeof Globe; description: string; placeholder: string }> = {
  url: {
    label: 'Website URL',
    icon: Globe,
    description: 'Paste a live URL to analyze its rendered pages and source.',
    placeholder: 'https://example.com',
  },
  github: {
    label: 'GitHub Repo',
    icon: GitBranch,
    description: 'Provide a repository to audit code, build, and run checks.',
    placeholder: 'https://github.com/user/repo',
  },
  files: {
    label: 'Upload Files',
    icon: Upload,
    description: 'Upload HTML, CSS, JS files or a zip bundle.',
    placeholder: '',
  },
};

const CONTEXT_HINTS: Record<InputTab, string> = {
  url: 'Paste a live URL to analyze its rendered pages and source.',
  github: 'Provide a repository to audit code, build, and run checks.',
  files: 'Upload HTML, JS, or CSS to audit without a live server.',
};

const ALLOWED_EXTENSIONS = '.html,.htm,.css,.js,.ts,.jsx,.tsx,.json,.svg,.png,.jpg,.jpeg,.gif,.ico,.woff,.woff2,.ttf,.eot,.md,.txt,.zip';

export default function AuditInput({
  inputType,
  source,
  files,
  onInputTypeChange,
  onSourceChange,
  onFilesChange,
  disabled,
}: AuditInputProps) {
  const activeTab: InputTab =
    inputType === 'github' ? 'github' : inputType === 'files' || inputType === 'bundle' ? 'files' : 'url';
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSegmentChange = useCallback(
    (tab: InputTab) => {
      const typeMap: Record<InputTab, AuditInputType> = { url: 'url', github: 'github', files: 'files' };
      onInputTypeChange(typeMap[tab]);
      onSourceChange('');
      onFilesChange([]);
    },
    [onInputTypeChange, onSourceChange, onFilesChange]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const droppedFiles = Array.from(e.dataTransfer.files);
      if (droppedFiles.length > 0) {
        onFilesChange([...files, ...droppedFiles]);
        onInputTypeChange('bundle');
      }
    },
    [files, onFilesChange, onInputTypeChange]
  );

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = Array.from(e.target.files || []);
      if (selected.length > 0) {
        onFilesChange([...files, ...selected]);
        onInputTypeChange('bundle');
      }
    },
    [files, onFilesChange, onInputTypeChange]
  );

  const removeFile = useCallback(
    (index: number) => {
      const updated = files.filter((_, i) => i !== index);
      onFilesChange(updated);
      if (updated.length === 0) {
        onInputTypeChange('files');
      }
    },
    [files, onFilesChange, onInputTypeChange]
  );

  const config = TAB_CONFIG[activeTab];

  return (
    <Card className="space-y-4">
      <SegmentedControl options={INPUT_OPTIONS} value={activeTab} onChange={handleSegmentChange} />

      {activeTab === 'files' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-md border-2 border-dashed p-8 text-center transition-colors duration-150 ${
            isDragOver
              ? 'border-accent-orange bg-accent-orange/5'
              : 'border-secondary-borderGray bg-secondary-darkSurface hover:border-accent-orange/40'
          } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={ALLOWED_EXTENSIONS}
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragOver ? 'text-accent-orange' : 'text-secondary-midGray/40'}`} />
          <p className="text-body text-secondary-midGray mb-1">
            {isDragOver ? 'Drop files here' : 'Drag & drop files or click to upload'}
          </p>
          <p className="text-small text-secondary-midGray/60">HTML, CSS, JS, TS, JSON, images, fonts, or zip bundles</p>
        </div>
      ) : (
        <TextInput
          type={activeTab === 'url' ? 'url' : 'text'}
          value={source}
          onChange={(e) => onSourceChange(e.target.value)}
          placeholder={config.placeholder}
          disabled={disabled}
          label={config.description}
        />
      )}

      {/* File list */}
      {activeTab === 'files' && files.length > 0 && (
        <div className="space-y-2">
          <p className="text-small text-secondary-midGray">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 py-1.5 px-3 rounded-sm bg-primary-dark border border-secondary-borderGray"
              >
                <FileText className="w-3.5 h-3.5 text-secondary-midGray/40 shrink-0" />
                <span className="text-small text-primary-light truncate flex-1">{file.name}</span>
                <span className="text-small text-secondary-midGray shrink-0">{(file.size / 1024).toFixed(1)}KB</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile(index);
                  }}
                  disabled={disabled}
                  className="p-0.5 text-secondary-midGray hover:text-semantic-dangerRed transition-colors disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="text-small text-secondary-midGray">{CONTEXT_HINTS[activeTab]}</p>
    </Card>
  );
}
