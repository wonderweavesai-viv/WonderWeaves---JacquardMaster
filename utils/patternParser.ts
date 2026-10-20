
export const parsePatternString = (patternStr: string, colorMap: { [key: string]: string }): string[] => {
  const result: string[] = [];
  const regex = /(\d+)([A-Z])/gi;
  let match;

  // Ensure the whole string is made of valid segments, allowing whitespace
  const validationRegex = /^(\s*(\d+)([A-Z])\s*)*$/i;
  if (!validationRegex.test(patternStr)) {
    return []; // Return empty array for invalid format
  }

  while ((match = regex.exec(patternStr)) !== null) {
    const count = parseInt(match[1], 10);
    const letter = match[2].toUpperCase();
    const color = colorMap[letter];

    if (color) {
      for (let i = 0; i < count; i++) {
        result.push(color);
      }
    } else {
        // If color not in map, we still push a placeholder to keep length correct
        for (let i = 0; i < count; i++) {
            result.push('#888888');
        }
    }
  }

  return result;
};

export const getTotalThreads = (patternStr: string): number => {
    const regex = /(\d+)([A-Z])/gi;
    let match;
    let total = 0;
    while ((match = regex.exec(patternStr)) !== null) {
        total += parseInt(match[1], 10);
    }
    return total;
};

export const expandPatternString = (patternStr: string): string[] => {
    const result: string[] = [];
    const regex = /(\d+)([A-Z])/gi;
    let match;

    const validationRegex = /^(\s*(\d+)([A-Z])\s*)*$/i;
    if (!validationRegex.test(patternStr)) return [];

    while ((match = regex.exec(patternStr)) !== null) {
        const count = parseInt(match[1], 10);
        const letter = match[2].toUpperCase();
        for (let i = 0; i < count; i++) {
            result.push(letter);
        }
    }
    return result;
};

export const compressPatternString = (chars: string[]): string => {
    if (chars.length === 0) return "";
    let result = "";
    let count = 0;
    let currentChar = chars[0];

    for (let i = 0; i < chars.length; i++) {
        if (chars[i] === currentChar) {
            count++;
        } else {
            result += `${count}${currentChar}`;
            currentChar = chars[i];
            count = 1;
        }
    }
    result += `${count}${currentChar}`;
    return result;
};
