import { joursEntre } from "../../domain/rules";
import { today } from "../../lib/format";

export { formatDate } from "../../lib/format";

/** Days from today until the given date (negative when past). */
export const joursAvant = (date: string) => joursEntre(today(), date);
