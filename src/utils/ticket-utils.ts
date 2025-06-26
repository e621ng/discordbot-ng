import { Ticket, TicketPhrase } from '../types';

function friendlyPhrase(phrase: string): string {
  switch (phrase) {
    case 'underage porn':
    case 'child porn':
    case 'cp':
      return 'Code Red';
    default:
      return phrase;
  }
}

export function shouldAlert(ticketPhrase: TicketPhrase, ticket: Ticket): { alert: boolean, match?: string } {
  if (!(ticketPhrase.phrase.startsWith('/') && ticketPhrase.phrase.endsWith('/'))) {
    if (ticket.reason.toLowerCase().includes(ticketPhrase.phrase.toLowerCase())) {
      return { alert: true, match: friendlyPhrase(ticketPhrase.phrase) };
    } else {
      return { alert: false };
    }
  } else {
    try {
      const regex = new RegExp(ticketPhrase.phrase.substring(1, ticketPhrase.phrase.length - 2), 'i');

      const regexMatch = regex.exec(ticket.reason);

      if (regexMatch) {
        return { alert: true, match: `${friendlyPhrase(regexMatch[0])} (RegEx match: \`${ticketPhrase.phrase}\`)` };
      } else {
        return { alert: false };
      }
    } catch (e) {
      console.error(e);

      return { alert: false };
    }
  }
}