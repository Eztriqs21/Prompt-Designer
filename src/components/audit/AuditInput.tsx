import { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe, GitBranch, Upload, X, FileText } from 'lucide-react';
import { useReducedMotionSafe } from '../../hooks/useReducedMotionSafe';
import { transitionFast } from '../../motion/presets';
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
  const reducedMotion = useReducedMotionSafe();
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
      <div className="flex gap-1 p-1 rounded-xl bg-white/[0.03] border border-white/[0.06]">
        {(Object.keys(TAB_CONFIG) as InputTab[]).map((tab) => {
          const TabIcon = TAB_CONFIG[tab].icon;
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTabChange(tab)}
              disabled={disabled}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                isActive
                  ? 'bg-white/[0.08] text-white border border-white/[0.1]'
                  : 'text-white/40 hover:text-white/60 hover:bg-white/[0.04]'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              <TabIcon className="w-4 h-4" />
              <span className="hidden sm:inline">{TAB_CONFIG[tab].label}</span>
            </button>
          );
        })}
      </div>

      {/* Input Area */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={reducedMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
          transition={reducedMotion ? { duration: 0 } : transitionFast}
        >
          {activeTab === 'files' ? (
            /* File Upload Zone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all duration-200 ${
                isDragOver
                  ? 'border-indigo-400/60 bg-indigo-500/[0.06]'
                  : 'border-white/[0.1] bg-white/[0.02] hover:border-white/[0.2] hover:bg-white/[0.04]'
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
              <Upload className={`w-8 h-8 mx-auto mb-3 ${isDragOver ? 'text-indigo-400' : 'text-white/30'}`} />
              <p className="text-sm text-white/50 mb-1">
                {isDragOver ? 'Drop files here' : 'Drag & drop files or click to browse'}
              </p>
              <p className="text-[11px] text-white/25">
                HTML, CSS, JS, TS, JSON, images, fonts, or zip bundles
              </p>
            </div>
          ) : (
            /* URL / GitHub Input */
            <div className="space-y-2">
              <p className="text-[12px] text-white/40">{config.description}</p>
              <input
                type="url"
                value={source}
                onChange={(e) => onSourceChange(e.target.value)}
                placeholder={config.placeholder}
                disabled={disabled}
                className="w-full bg-white/[0.04] border border-white/[0.08] rounded-xl px-4 py-3 text-[13px] text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:ring-2 focus:ring-indigo-500/40 transition-all duration-200 disabled:opacity-50"
              />
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {/* File List */}
      {activeTab === 'files' && files.length > 0 && (
        <div className="space-y-2">
          <p className="text-[12px] text-white/40">
            {files.length} file{files.length !== 1 ? 's' : ''} selected
          </p>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {files.map((file, index) => (
              <div
                key={`${file.name}-${index}`}
                className="flex items-center gap-2 py-1.5 px-3 rounded-lg bg-white/[0.03] border border-white/[0.06]"
              >
                <FileText className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <span className="text-[12px] text-white/60 truncate flex-1">{file.name}</span>
                <span className="text-[10px] text-white/25 shrink-0">
                  {(file.size / 1024).toFixed(1)}KB
                </span>
                <button
                  onClick={(e) => { e.stopPropagation(); removeFile(index); }}
                  disabled={disabled}
                  className="p-0.5 text-white/30 hover:text-red-400 transition-colors disabled:opacity-50"
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
