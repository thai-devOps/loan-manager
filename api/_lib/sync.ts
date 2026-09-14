import {
  ensureInterestSchedules,
  refreshScheduleStatuses,
} from "./calculations";
import { loansCol, schedulesCol } from "./mongo";

export async function syncAllSchedules() {
  const loans = await (await loansCol()).find({ status: "ACTIVE" }).toArray();
  const schedCol = await schedulesCol();

  for (const loan of loans) {
    const existing = await schedCol.find({ loanId: loan.id }).toArray();
    const newOnes = ensureInterestSchedules(loan, existing).map((s) => ({
      ...s,
      _id: s.id,
    }));
    const refreshed = refreshScheduleStatuses([...existing, ...newOnes]);

    if (newOnes.length > 0) {
      await schedCol.insertMany(newOnes);
    }
    for (const s of refreshed) {
      const old = existing.find((e) => e.id === s.id);
      if (old && old.status !== s.status) {
        await schedCol.updateOne({ id: s.id }, { $set: { status: s.status } });
      }
    }
  }
}
