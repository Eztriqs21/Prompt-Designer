import { useState, useRef, useCallback } from 'react';
import { Globe, GitBranch, Upload, X, FileText } from 'lucide-react';
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

const TAB_CONFIG: Record<InputTab, { label: string; icon: typeof Globe; description: string; placeholder: string }> = {
  url: {
    label: 'Website URL',
    icon: Globe,
    description: 'Enter a public website URL to audit',
    placeholder: 'https://example.com',
  },
  github: {
    label: 'GitHub Repo',
    icon: GitBranch,
    description: 'Enter a public GitHub repository URL',
    placeholder: 'https://github.com/user/repo',
  },
  files: {
    label: 'Upload Files',
    icon: Upload,
    description: 'Upload HTML, CSS, JS files or a zip bundle',
    placeholder: '',
  },
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
  const [activeTab, setActiveTab] = useState<InputTab>(
    inputType === 'github' ? 'github' : inputType === 'files' || inputType === 'bundle' ? 'files' : 'url'
  );
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTabChange = useCallback((tab: InputTab) => {
    setActiveTab(tab);
    const typeMap: Record<InputTab, AuditInputType> = { url: 'url', github: 'github', files: 'files' };
    onInputTypeChange(typeMap[tab]);
    onSourceChange('');
    onFilesChange([]);
  }, [onInputTypeChange, onSourceChange, onFilesChange]);

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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length > 0) {
      onFilesChange([...files, ...droppedFiles]);
      onInputTypeChange('bundle');
    }
  }, [files, onFilesChange, onInputTypeChange]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    if (selected.length > 0) {
      onFilesChange([...files, ...selected]);
      onInputTypeChange('bundle');
    }
  }, [files, onFilesChange, onInputTypeChange]);

  const removeFile = useCallback((index: number) => {
    const updated = files.filter((_, i) => i !== index);
    onFilesChange(updated);
    if (updated.length === 0) {
      onInputTypeChange('files');
    }
  }, [files, onFilesChange, onInputTypeChange]);

  const config = TAB_CONFIG[activeTab];

  return (
    <div className="space-y-4">
      {/* Tab Selector */}
      <div className="flex gap-1 p-1 rounded-md bg-surface-alt border border-border-soft">
        {(Object.keys(TAB_CONFIG) as InputTab[]).map((tab) => {
          const TabIcon = TAB_CONFIG[tab].icon;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              disabled={disabled}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-md text-sm font-medium transition-colors duration-150 ${
                isActive
                  ? 'bg-surface-base text-ink-primary border border-border-soft'
                  : 'text-ink-muted hover:text-ink-primary hover:bg-surface-base'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <TabIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{TAB_CONFIG[tab].label}</span>
            </button>
          );
        })}
      </div>

      {/* Input Area */}
      {activeTab === 'files' ? (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-md border-2 border-dashed p-8 text-center transition-colors duration-150 ${
            isDragOver
              ? 'border-accent-info/60 bg-accent-info/5'
              : 'border-border-soft bg-surface-alt hover:border-ink-muted/30 hover:bg-surface-alt'
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
          <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragOver ? 'text-accent-info' : 'text-ink-muted/40'}`} />
          <p className="text-sm text-ink-muted mb-1">
            {isDragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
          </p>
          <p className="text-xs text-ink-muted/60">
            HTML, CSS, JS, TS, JSON, images, fonts, or zip bundles
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">{config.description}</p>
          <input
            type="url"
            value={source}
            onChange={(e) => onSourceChange(e.target.value)}
            placeholder={config.placeholder}
            disabled={disabled}
            className="w-full bg-surface-base border border-border-soft rounded-md px-4 py-3 text-sm text-ink-primary placeholder:text-ink-muted focus:outline-none focus:border-ink-muted/40 transition-colors disabled:opacity-50"
          />
        </div>
      )}

      {/* File List */}
      {activeTab === 'files' && files.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-ink-muted">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 py-1.5 px-3 rounded-md bg-surface-alt border border-border-soft"
              >
                <FileText className="w-3.5 h-3.5 text-ink-muted/40 shrink-0" />
                <span className="text-xs text-ink-primary truncate flex-1">{file.name}</span>
                <span className="text-xs text-ink-muted shrink-0">
                  {(file.size / 1024).toFixed(1)}KB
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  disabled={disabled}
                  className="p-0.5 text-ink-muted hover:text-accent-error transition-colors disabled:opacity-50"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
