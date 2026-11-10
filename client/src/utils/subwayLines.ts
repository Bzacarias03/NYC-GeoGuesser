/**
 * Maps MTA line letters/numbers to their corresponding color class
 */
export const getLineColorClass = (line: string): string => {
  const trimmedLine = line.trim().toUpperCase();
  
  // Numbered lines
  if (['1', '2', '3'].includes(trimmedLine)) {
    return 'mta-red';
  }
  if (['4', '5', '6'].includes(trimmedLine)) {
    return 'mta-green';
  }
  if (trimmedLine === '7') {
    return 'mta-purple';
  }
  
  // Letter lines
  if (['A', 'C', 'E'].includes(trimmedLine)) {
    return 'mta-blue';
  }
  if (['B', 'D', 'F', 'M'].includes(trimmedLine)) {
    return 'mta-orange';
  }
  if (trimmedLine === 'G') {
    return 'mta-green-2';
  }
  if (['J', 'Z'].includes(trimmedLine)) {
    return 'mta-brown';
  }
  if (trimmedLine === 'L') {
    return 'mta-gray';
  }
  if (['N', 'Q', 'R', 'W'].includes(trimmedLine)) {
    return 'mta-yellow';
  }
  if (trimmedLine === 'S') {
    return 'mta-gray';
  }
  
  // Default to gray for unknown lines
  return 'mta-gray';
};
