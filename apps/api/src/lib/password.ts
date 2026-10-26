import bcrypt from 'bcryptjs'
import { randomInt } from 'node:crypto'

const COST = 10

export const hashPassword = (plain: string) => bcrypt.hash(plain, COST)
export const verifyPassword = (plain: string, hash: string) => bcrypt.compare(plain, hash)

// Без похожих символов (0/O, 1/l/I), чтобы пароль было легко продиктовать или переписать
const ALPHABET = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generatePassword(length = 10): string {
  let out = ''
  for (let i = 0; i < length; i++) out += ALPHABET[randomInt(ALPHABET.length)]
  return out
}
