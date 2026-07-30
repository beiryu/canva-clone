import { useEffect, useState } from "react";
import { Minus, Plus } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface FontSizeInputProps {
  value: number;
  onChange: (value: number) => void;
}

export const FontSizeInput = ({ value, onChange }: FontSizeInputProps) => {
  // Buffered separately from `value` so the field can go through an empty/
  // partial state while typing (e.g. clearing "32" to type "48") without
  // ever committing NaN to the fabric object.
  const [text, setText] = useState(String(value));

  useEffect(() => {
    setText(String(value));
  }, [value]);

  const commit = (next: number) => {
    setText(String(next));
    onChange(next);
  };

  const increment = () => commit(value + 1);
  const decrement = () => commit(Math.max(1, value - 1));

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    setText(raw);

    const parsed = parseInt(raw, 10);

    if (!Number.isNaN(parsed) && parsed > 0) {
      onChange(parsed);
    }
  };

  const handleBlur = () => {
    // Reverts an empty/invalid buffer back to the last committed value
    // instead of leaving the input stuck on blank text.
    if (parseInt(text, 10) !== value) {
      setText(String(value));
    }
  };

  return (
    <div className="flex items-center">
      <Button
        onClick={decrement}
        variant="outline"
        className="p-2 rounded-r-none border-r-0"
        size="icon"
      >
        <Minus className="size-4" />
      </Button>
      <Input
        onChange={handleChange}
        onBlur={handleBlur}
        value={text}
        className="w-[50px] h-8 focus-visible:ring-offset-0 focus-visible:ring-0 rounded-none"
      />
      <Button
        onClick={increment}
        variant="outline"
        className="p-2 rounded-l-none border-l-0"
        size="icon"
      >
        <Plus className="size-4" />
      </Button>
    </div>
  );
};
