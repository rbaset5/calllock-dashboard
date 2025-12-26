// Types
export type {
  CommandContext,
  CommandResult,
  CommandHandler,
  LeadContext,
  SmsLogEntry,
} from './types';

// Helpers
export {
  getLeadContext,
  updateAlertContextStatus,
  addNoteToLead,
  twimlResponse,
  logSms,
  logSmsWithReply,
  normalizePhone,
} from './helpers';

// Registry
export { findHandler, executeCommand, getAllCommands } from './registry';

// Individual command groups (for testing)
export { subscriptionCommands } from './commands/subscription';
export { leadStatusCommands } from './commands/lead-status';
export { noteCommands } from './commands/notes';
export { bookingCommands } from './commands/booking';
export { snoozeCommands } from './commands/snooze';
export { jobActionCommands } from './commands/job-actions';
export { helpCommands } from './commands/help';
