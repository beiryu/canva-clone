import { useState } from "react";
import { Search, X } from "lucide-react";

import { Input } from "@/components/ui/input";

interface ImageSearchInputProps {
  // Fired on Enter (and on clear), not on every keystroke.
  onSearch: (value: string) => void;
  placeholder?: string;
}

export const ImageSearchInput = ({
  onSearch,
  placeholder = "Search photos...",
}: ImageSearchInputProps) => {
  const [value, setValue] = useState("");

  const handleClear = () => {
    setValue("");
    onSearch("");
  };

  return (
    <div className="relative mb-4">
      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
      <Input
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onSearch(value);
          }
        }}
        placeholder={placeholder}
        className="h-9 pl-8 pr-8"
      />
      {value.length > 0 && (
        <button
          type="button"
          onClick={handleClear}
          aria-label="Clear search"
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition"
        >
          <X className="size-4" />
        </button>
      )}
    </div>
  );
};
