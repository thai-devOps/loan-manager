/**
 * Dexie schema version history for Loan Manager.
 *
 * Version 1
 * - borrowers: id, name, phone
 * - loans: id, borrowerId, status
 * - interestSchedules: id, loanId, dueDate, status
 * - transactions: id, loanId, type, transactionDate
 *
 * Future migrations should be added via `db.version(n).stores(...)`
 * in database.ts and documented here.
 */
export const CURRENT_DB_VERSION = 1;
