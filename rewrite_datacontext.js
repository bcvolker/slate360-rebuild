const fs = require('fs');
let code = fs.readFileSync('components/site-walk/capture/DataContextView.tsx', 'utf8');

// Add imports for useEffect if missing
if (!code.includes('useEffect')) {
  code = code.replace(/import \{ useState \} from "react";/, 'import { useState, useEffect } from "react";');
}

// Add local state
code = code.replace(
  /const \[dictationState, setDictationState\] = useState/,
  `const [localLocation, setLocalLocation] = useState(currentLocation);
  const [localDetail, setLocalDetail] = useState(itemDetail);

  useEffect(() => {
    setLocalLocation(currentLocation);
  }, [currentLocation]);

  useEffect(() => {
    setLocalDetail(itemDetail);
  }, [itemDetail]);

  const handleLocationBlur = () => {
    if (localLocation !== currentLocation) {
      onLocationChange(localLocation);
    }
  };

  const handleDetailBlur = () => {
    if (localDetail !== itemDetail) {
      onItemDetailChange(localDetail);
    }
  };

  const [dictationState, setDictationState] = useState`
);

// Update inputs
code = code.replace(
  /value=\{currentLocation\}\s*onChange=\{\(e\) => onLocationChange\(e.target.value\)\}/g,
  `value={localLocation}\n                      onChange={(e) => setLocalLocation(e.target.value)}\n                      onBlur={handleLocationBlur}`
);

code = code.replace(
  /value=\{itemDetail\}\s*onChange=\{\(e\) => onItemDetailChange\(e.target.value\)\}/g,
  `value={localDetail}\n                    onChange={(e) => setLocalDetail(e.target.value)}\n                    onBlur={handleDetailBlur}`
);

// Update dictation insertion to modify local state instead of parent state if active
code = code.replace(
  /onItemDetailChange\(itemDetail \+ "\\n" \+ finalStr\);/g,
  `const updated = localDetail + "\\n" + finalStr;\n              setLocalDetail(updated);\n              onItemDetailChange(updated);`
);
code = code.replace(
  /onItemDetailChange\(finalStr\);/g,
  `setLocalDetail(finalStr);\n              onItemDetailChange(finalStr);`
);

// Update dictation logic for interim
code = code.replace(
  /const updated = itemDetail \+ " " \+ lastPhrase;\s*onItemDetailChange\(updated\);/,
  `const updated = localDetail + " " + lastPhrase;\n              setLocalDetail(updated);\n              onItemDetailChange(updated);`
);
code = code.replace(
  /onItemDetailChange\(lastPhrase\);/,
  `setLocalDetail(lastPhrase);\n              onItemDetailChange(lastPhrase);`
);

fs.writeFileSync('components/site-walk/capture/DataContextView.tsx', code);
