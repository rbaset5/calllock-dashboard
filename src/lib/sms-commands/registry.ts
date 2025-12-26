import type { CommandHandler, CommandContext, CommandResult } from './types';
import { subscriptionCommands } from './commands/subscription';
import { leadStatusCommands } from './commands/lead-status';
import { noteCommands } from './commands/notes';
import { bookingCommands } from './commands/booking';
import { snoozeCommands } from './commands/snooze';
import { jobActionCommands } from './commands/job-actions';
import { helpCommands } from './commands/help';

/**
 * All registered command handlers, sorted by priority
 */
const allCommands: CommandHandler[] = [
  ...subscriptionCommands,
  ...leadStatusCommands,
  ...noteCommands,
  ...bookingCommands,
  ...snoozeCommands,
  ...jobActionCommands,
  ...helpCommands,
].sort((a, b) => a.priority - b.priority);

/**
 * Find the first matching command handler for the given SMS body
 */
export function findHandler(bodyUpper: string, bodyOriginal: string): CommandHandler | null {
  for (const handler of allCommands) {
    if (handler.match(bodyUpper, bodyOriginal)) {
      return handler;
    }
  }
  return null;
}

/**
 * Execute a command based on the SMS body
 * Returns the result or null if no handler matched
 */
export async function executeCommand(ctx: CommandContext): Promise<CommandResult | null> {
  const handler = findHandler(ctx.bodyUpper, ctx.body);

  if (!handler) {
    console.log(`No handler found for SMS from ${ctx.from}: ${ctx.body}`);
    return null;
  }

  console.log(`Executing command '${handler.name}' for SMS from ${ctx.from}`);

  try {
    return await handler.execute(ctx);
  } catch (error) {
    console.error(`Error executing command '${handler.name}':`, error);
    return {
      success: false,
      message: 'An error occurred processing your request.',
    };
  }
}

/**
 * Get all registered command handlers (for testing/debugging)
 */
export function getAllCommands(): CommandHandler[] {
  return allCommands;
}
