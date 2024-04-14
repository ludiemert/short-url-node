import postgres from 'postgres'

export const sql = postgres('postgresql://postgres:sql123@localhost:5432/shortlinks')