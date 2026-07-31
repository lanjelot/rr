import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import moment from 'moment';
import type { Event } from "./data";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function capitalizeWords(str: string): string {
  return str
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function formatDate(
  date: string,
  fmt: string = "ddd D MMM",
): string {
  return moment.parseZone(date).format(fmt);
}

export function isFutureEvent(
  event: Event
): boolean {
  // return true;
  return moment().isSameOrBefore(moment(event.finish_at));
}

export function isHappeningNow(
  event: Event
): boolean {
  return moment().isBetween(moment(event.start_at), moment(event.finish_at));
}

export function isThisWeek(
  event: Event
): boolean {
  return moment().isSame(moment(event.start_at), 'isoWeek');
}

export function isNextWeek(
  event: Event
): boolean {
  return moment().add(1, 'week').isSame(moment(event.start_at), 'isoWeek');
}

export function eventDate(
  event: Event
): string {
  const isMultiDay = (new Date(event.finish_at).getTime() - new Date(event.start_at).getTime()) >= 24 * 60 * 60 * 1000;
  if (!isMultiDay) return formatDate(event.start_at);

  const sameMonth = moment(event.start_at).isSame(moment(event.finish_at), 'month');
  const startFmt = sameMonth ? "ddd D" : "ddd D MMM";
  return `${formatDate(event.start_at, startFmt)} - ${formatDate(event.finish_at)}`;
}

export function isMultiDay(
  event: Event
): boolean {
  return (new Date(event.finish_at).getTime() - new Date(event.start_at).getTime()) >= 24 * 60 * 60 * 1000;
}

export function eventDay(
  event: Event
): string {
  const multiDay = isMultiDay(event)
  if (!multiDay) return formatDate(event.start_at, "ddd");

  return `${formatDate(event.start_at, "ddd")} - ${formatDate(event.finish_at, "ddd")}`;
}

export function formatTime(date: string, suffix: string = ""): string {
  const fmt = moment(date).minutes() === 0 ? "ha" : "h:mma";
  return formatDate(date, `${fmt}${suffix}`);
}

export function eventTime(
  event: Event
): string {
  if (!isMultiDay(event)) return `${formatTime(event.start_at)} - ${formatTime(event.finish_at)}`;

  return `${formatTime(event.start_at, " (ddd)")} - ${formatTime(event.finish_at, " (ddd)")}`;
}