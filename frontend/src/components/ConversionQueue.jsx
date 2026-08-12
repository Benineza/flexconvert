import { useState } from 'react';
import { Play, Download, Trash2, RefreshCw, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatBytes, downloadFile } from '../utils/fileUtils';
import { conversionService } from '../services/conversionService';
import FileCard from './FileCard';
import FormatDropdown from './FormatDropdown';
import './ConversionQueue.css';

export default function ConversionQueue({ queue, onRemove, onUpdateItem, onClear }) {
  const [globalFormat, setGlobalFormat] = useState('');
  const [isConverting, setIsConverting] = useState(false);

  // Check queue statistics
  const totalCount = queue.length;
  const completedCount = queue.filter(item => item.status === 'completed').isActive || queue.filter(item => item.status === 'completed').length;
  const convertingCount = queue.filter(item => item.status === 'converting').length;
  const failedCount = queue.filter(item => item.status === 'failed').length;
  const idleCount = queue.filter(item => item.status === 'idle').length;

  const isAllCompleted = totalCount > 0 && completedCount === totalCount;
  const isAnyConverted = queue.some(item => item.status === 'completed' && item.result);

  // Apply a selected format to all files in the queue
  const handleApplyGlobalFormat = (format) => {
    setGlobalFormat(format);
    queue.forEach(item => {
      if (item.status === 'idle') {
        onUpdateItem(item.id, { targetFormat: format });
      }
    });
  };

  // Convert a single queue item
  const convertItem = async (item) => {
    const formatToUse = item.targetFormat || globalFormat;
    
    if (!formatToUse) {
      onUpdateItem(item.id, { error: 'Please select an output format.' });
      return;
    }

    onUpdateItem(item.id, { 
      status: 'converting', 
      progress: 0, 
      error: null 
    });

    try {
      const result = await conversionService.convert(
        item.file, 
        formatToUse, 
        (percent) => {
          onUpdateItem(item.id, { progress: percent });
        }
      );
      
      onUpdateItem(item.id, { 
        status: 'completed', 
        result,
        progress: 100 
      });
    } catch (err) {
      onUpdateItem(item.id, { 
        status: 'failed', 
        error: err.message || 'Conversion failed.' 
      });
    }
  };

  // Trigger conversion for all idle/failed files in the queue
  const handleConvertAll = async () => {
    // Validate that every file has a format
    const missingFormat = queue.some(item => !item.targetFormat && !globalFormat);
    if (missingFormat) {
      alert('Please select an output format for all files or choose a global format.');
      return;
    }

    setIsConverting(true);
    
    // Process items in parallel
    const conversionPromises = queue
      .filter(item => item.status === 'idle' || item.status === 'failed')
      .map(item => convertItem(item));

    await Promise.all(conversionPromises);
    setIsConverting(false);
  };

  // Triggers browser download for a single converted file
  const handleDownloadItem = (item) => {
    if (item.status === 'completed' && item.result) {
      downloadFile(item.result.blob, item.result.filename);
    }
  };

  // Trigger sequential browser downloads for all converted files
  const handleDownloadAll = () => {
    queue.forEach(item => {
      if (item.status === 'completed' && item.result) {
        handleDownloadItem(item);
      }
    });
  };

  // Compute aggregate progress of the batch
  const getBatchProgress = () => {
    if (totalCount === 0) return 0;
    const totalProgress = queue.reduce((acc, item) => acc + (item.progress || 0), 0);
    return Math.round(totalProgress / totalCount);
  };

  const aggregateProgress = getBatchProgress();

  return (
    <div className="conversion-queue-section">
      {/* Queue Toolbar Control Panel */}
      <div className="queue-toolbar">
        <div className="queue-info-summary">
          <Layers size={18} className="queue-summary-icon" />
          <span className="queue-summary-text">
            <strong>{totalCount}</strong> {totalCount === 1 ? 'file' : 'files'} selected 
            {completedCount > 0 && ` (${completedCount} converted)`}
          </span>
        </div>

        {totalCount > 0 && !isAllCompleted && !isConverting && (
          <div className="queue-global-actions">
            <span className="global-action-label">Convert all to:</span>
            <div className="dropdown-wrapper-global">
              <FormatDropdown
                selectedFormat={globalFormat}
                onSelectFormat={handleApplyGlobalFormat}
                fileCategory="all" // Allow mixed formats to pick their relevant type
              />
            </div>
          </div>
        )}

        <div className="queue-buttons-group">
          {isAnyConverted && (
            <button 
              className="btn btn-secondary btn-sm" 
              onClick={handleDownloadAll}
              title="Download all converted files"
            >
              <Download size={14} /> Download All
            </button>
          )}

          {totalCount > 0 && !isConverting && (
            <button 
              className="btn btn-danger btn-sm" 
              onClick={onClear}
              title="Clear all files from queue"
            >
              <Trash2 size={14} /> Clear Queue
            </button>
          )}
        </div>
      </div>

      {/* Aggregate progress bar shown during active conversions */}
      {isConverting && (
        <div className="aggregate-progress-banner animate-fade-in">
          <div className="progress-banner-header">
            <span>Processing your files...</span>
            <strong>{aggregateProgress}%</strong>
          </div>
          <div className="progress-bar-track">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${aggregateProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* Batch Completed Banner */}
      {isAllCompleted && (
        <div className="batch-completed-banner animate-slide-up">
          <div className="completed-banner-text">
            <CheckCircle2 className="banner-success-icon" size={20} />
            <div>
              <strong>Conversion finished successfully!</strong>
              <p>All {totalCount} files have been processed and are ready for download.</p>
            </div>
          </div>
          <div className="completed-banner-actions">
            <button className="btn btn-primary btn-sm" onClick={handleDownloadAll}>
              <Download size={14} /> Download All
            </button>
            <button className="btn btn-secondary btn-sm" onClick={onClear}>
              <RefreshCw size={14} /> Convert More
            </button>
          </div>
        </div>
      )}

      {/* Cards List container */}
      <div className="queue-list-container">
        {queue.map(item => (
          <FileCard
            key={item.id}
            item={item}
            onRemove={onRemove}
            onSelectFormat={(id, fmt) => onUpdateItem(id, { targetFormat: fmt })}
            onDownload={handleDownloadItem}
          />
        ))}
      </div>

      {/* Convert Trigger button at the bottom */}
      {totalCount > 0 && !isAllCompleted && (
        <div className="queue-convert-trigger-bar animate-fade-in">
          <button 
            className="btn btn-primary btn-lg btn-convert-all"
            onClick={handleConvertAll}
            disabled={isConverting}
          >
            {isConverting ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Converting {convertingCount}/{totalCount}...
              </>
            ) : (
              <>
                <Play size={18} fill="currentColor" /> Convert {totalCount} {totalCount === 1 ? 'File' : 'Files'}
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
