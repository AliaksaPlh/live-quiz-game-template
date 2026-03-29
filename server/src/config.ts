export const BASE_POINTS = 1000;

export const getPort = (): number => {
  const raw = process.env.PORT;
  if (raw === undefined || raw === '') return 3000;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : 3000;
};
