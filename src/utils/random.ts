import { TestEngineConfiguration } from 'shared/types/settings';
import { DataType } from 'shared/types/testing';
import { v4 as uuidv4 } from 'uuid';

export function generateRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomString = '';
  for (let i = 0; i < length; i++) randomString += characters[Math.floor(Math.random() * characters.length)];

  return randomString;
}

export function generateRandomNumber(min: number, max: number): number {
  if (Number.isInteger(min) && Number.isInteger(max)) return Math.floor(Math.random() * (max - min + 1)) + min;

  return parseFloat((Math.random() * (max - min) + min).toFixed(2));
}

function generateRandomEmail(domain: string, usernameLength: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let username = '';
  for (let i = 0; i < usernameLength; i++) username += characters[Math.floor(Math.random() * characters.length)];

  return `${username}@${domain}`;
}

/** A new random value for a random type (e.g. randomInt), from the given settings; `null` for any other type. */
export function generateRandomValue(dataType: DataType, settings: TestEngineConfiguration): string | number | null {
  if (dataType === 'randomString') return generateRandomString(settings.randomString.length);
  if (dataType === 'randomInt') return generateRandomNumber(settings.randomInt.min, settings.randomInt.max);
  if (dataType === 'randomEmail') return generateRandomEmail(settings.email.domain, settings.randomEmail.length);
  if (dataType === 'randomGuid') return uuidv4();

  return null;
}
