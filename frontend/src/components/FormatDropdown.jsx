import { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check } from 'lucide-react';
import { FORMATS, getAvailableOutputs } from '../constants/formats';
import './FormatDropdown.css';

export default function FormatDropdown({ selectedFormat, onSelectFormat, fileCategory, excludeFormat }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter formats based on category, rules, and search query
  const getFilteredFormats = () => {
    const list = [];
    const categories = ['image', 'video', 'document'];
    
    // Resolve allowed output extensions if excludeFormat is present
    const allowedExtensions = excludeFormat 
      ? getAvailableOutputs(excludeFormat)
      : null;

    categories.forEach(cat => {
      // Optional category level filter (e.g. only images or only videos)
      if (fileCategory && fileCategory !== 'all' && fileCategory !== cat) {
        return;
      }

      const items = FORMATS[cat] || [];
      const filtered = items.filter(f => {
        // Exclude current extension if it's set
        if (excludeFormat && f.ext === excludeFormat.toLowerCase()) {
          return false;
        }
        // Match against allowed targets if filters exist
        if (allowedExtensions && !allowedExtensions.includes(f.ext)) {
          return false;
        }
        // Match search query
        return f.ext.toLowerCase().includes(searchQuery.toLowerCase()) || 
               f.label.toLowerCase().includes(searchQuery.toLowerCase());
      });

      if (filtered.length > 0) {
        list.push({
          category: cat === 'document' ? 'DOCUMENT' : cat.toUpperCase(),
          formats: filtered
        });
      }
    });

    return list;
  };

  const handleSelect = (formatExt) => {
    onSelectFormat(formatExt);
    setIsOpen(false);
    setSearchQuery('');
  };

  const currentSelectionLabel = selectedFormat 
    ? selectedFormat.toUpperCase()
    : 'Select output format...';

  const groupedList = getFilteredFormats();
  const totalOptions = groupedList.reduce((acc, g) => acc + g.formats.length, 0);

  return (
    <div className="format-dropdown-container" ref={dropdownRef}>
      <button 
        type="button" 
        className={`format-dropdown-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="current-format-label">{currentSelectionLabel}</span>
        <ChevronDown size={16} className={`dropdown-arrow ${isOpen ? 'rotate' : ''}`} />
      </button>

      {isOpen && (
        <div className="format-dropdown-menu animate-slide-up">
          {/* Search bar */}
          <div className="dropdown-search-wrapper">
            <Search size={14} className="search-icon" />
            <input 
              type="text" 
              className="dropdown-search-input"
              placeholder="Search format..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          {/* List items */}
          <div className="dropdown-options-list" role="listbox">
            {groupedList.length === 0 ? (
              <div className="dropdown-no-results">No formats found</div>
            ) : (
              groupedList.map(group => (
                <div key={group.category} className="dropdown-group">
                  <div className="dropdown-group-header">{group.category}</div>
                  {group.formats.map(fmt => (
                    <div 
                      key={fmt.id} 
                      className={`dropdown-option ${selectedFormat === fmt.ext ? 'selected' : ''}`}
                      onClick={() => handleSelect(fmt.ext)}
                      role="option"
                      aria-selected={selectedFormat === fmt.ext}
                    >
                      <span>{fmt.label}</span>
                      {selectedFormat === fmt.ext && <Check size={14} className="check-icon" />}
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
