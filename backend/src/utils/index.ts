export const getDaysDifference = (
  date1: Date | string,
  date2: Date | string,
): number => {
  const date1Obj = typeof date1 === "string" ? new Date(date1) : date1;
  const date2Obj = typeof date2 === "string" ? new Date(date2) : date2;
  const MILLISECONDS_IN_DAY = 24 * 60 * 60 * 1000;
  const differenceInMilliseconds = date1Obj.getTime() - date2Obj.getTime();
  return Math.floor(differenceInMilliseconds / MILLISECONDS_IN_DAY);
};
