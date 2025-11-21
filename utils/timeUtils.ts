
export const calculateDuration = (start: string, end: string): number => {
  if (!start || !end) return 0;
  const [startH, startM] = start.split(':').map(Number);
  const [endH, endM] = end.split(':').map(Number);
  
  const startDate = new Date(0, 0, 0, startH, startM);
  const endDate = new Date(0, 0, 0, endH, endM);
  
  let diff = endDate.getTime() - startDate.getTime();
  if (diff < 0) return 0; // Assume same day or handle appropriately, returning 0 for safety if end < start
  
  return diff / (1000 * 60); // minutes
};

export const formatMinutesToTime = (totalMinutes: number): string => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = Math.floor(totalMinutes % 60);
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
};

export const calculateWorkHours = (
  start: string, 
  end: string, 
  lunchStart: string, 
  lunchEnd: string,
  extraStart?: string,
  extraEnd?: string
): string => {
  const totalDuration = calculateDuration(start, end);
  const lunchDuration = calculateDuration(lunchStart, lunchEnd);
  const extraDuration = (extraStart && extraEnd) ? calculateDuration(extraStart, extraEnd) : 0;
  
  // Total = (Fim - Inicio) - Almoço + Hora Extra
  const netMinutes = Math.max(0, totalDuration - lunchDuration + extraDuration);
  return formatMinutesToTime(netMinutes);
};
