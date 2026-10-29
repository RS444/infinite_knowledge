import React from 'react';
import { Search, X, ChevronsDown, ChevronsUp } from 'lucide-react';
import { Button } from '../ui/Button';
import './TreeFilter.css';

interface TreeFilterProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  totalConcepts: number;
  matchingConcepts: number;
}

export const TreeFilter: React.FC<TreeFilterProps> = ({
  searchQuery,
  onSearchChange,
  onExpandAll,
  onCollapseAll,
  totalConcepts,
  matchingConcepts,
}) => {
  return (
    <div className="tree-filter-bar">
      <div className="tree-search-wrapper">
        <Search size={15} className="tree-search-icon" />
        <input
          type="text"
          className="tree-search-input"
          placeholder="Filter concepts by name, keywords, or objective..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchQuery && (
          <button
            className="tree-search-clear"
            onClick={() => onSearchChange('')}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}
      </div>

      <div className="tree-actions-group">
        {searchQuery.trim() && (
          <span className="search-match-stat">
            {matchingConcepts} of {totalConcepts} concepts
          </span>
        )}

        <Button
          variant="ghost"
          size="sm"
          onClick={onExpandAll}
          leftIcon={<ChevronsDown size={14} />}
          title="Expand all topic groups"
        >
          Expand All
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onCollapseAll}
          leftIcon={<ChevronsUp size={14} />}
          title="Collapse all topic groups"
        >
          Collapse
        </Button>
      </div>
    </div>
  );
};
