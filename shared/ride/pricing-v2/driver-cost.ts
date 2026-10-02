export function calculateDriverCostV2(params: {
  pricingDurationMinutes: number;
  driverHourlyRate: number;
  waitingHours?: number;
  waitingHourlyRate?: number;
}): {
  drivingHours: number;
  waitingHours: number;
  drivingCost: number;
  waitingCost: number;
  total: number;
} {
  const drivingHours = Math.max(0, params.pricingDurationMinutes) / 60;
  const waitingHours = Math.max(0, Number(params.waitingHours) || 0);
  const driverRate = Math.max(0, Number(params.driverHourlyRate) || 0);
  const waitRate = Math.max(0, Number(params.waitingHourlyRate) || 0);
  const drivingCost = drivingHours * driverRate;
  const waitingCost = waitingHours * waitRate;
  return {
    drivingHours,
    waitingHours,
    drivingCost,
    waitingCost,
    total: drivingCost + waitingCost,
  };
}
