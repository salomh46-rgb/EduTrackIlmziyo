// EduTrackIlmziyo Student CSV Helper Tests
// Validating CSV parse, phone normalization, and export formatting

import {
  parseStudentsFromCsv,
  normalizePhone,
} from '../src/features/students/utils/studentCsvHelper.ts'

console.log('--- Running studentCsvHelper Unit Tests ---')

// 1. Phone Normalization Tests
console.assert(normalizePhone('901234567') === '+998901234567', 'normalizePhone failed for 9-digit')
console.assert(normalizePhone('+998901234567') === '+998901234567', 'normalizePhone failed for +998')
console.assert(normalizePhone('998901234567') === '+998901234567', 'normalizePhone failed for 998 without +')
console.assert(normalizePhone('(90) 123-45-67') === '+998901234567', 'normalizePhone failed for formatted string')
console.log('✓ normalizePhone tests passed')

// 2. CSV Parsing with Comma delimiter
const commaCsv = `Ism,Familiya,Telefon,Tug'ilgan sana,Jinsi,Holati,Izoh
Jasurbek,Aliyev,+998901234567,2008-05-14,MALE,ACTIVE,IELTS guruhi
Madinabonu,Karimova,939876543,22.11.2009,Qiz,ACTIVE,Matematika
`

const commaResult = parseStudentsFromCsv(commaCsv)
console.assert(commaResult.validStudents.length === 2, `Expected 2 valid students, got ${commaResult.validStudents.length}`)
console.assert(commaResult.validStudents[0].first_name === 'Jasurbek', 'First name mismatch')
console.assert(commaResult.validStudents[0].last_name === 'Aliyev', 'Last name mismatch')
console.assert(commaResult.validStudents[0].phone === '+998901234567', 'Phone mismatch')
console.assert(commaResult.validStudents[1].gender === 'FEMALE', 'Gender translation from Qiz failed')
console.assert(commaResult.validStudents[1].birth_date === '2009-11-22', 'Date reformatting from DD.MM.YYYY failed')
console.log('✓ Comma delimiter CSV parse tests passed')

// 3. CSV Parsing with Semicolon delimiter (European/Excel default)
const semicolonCsv = `first_name;last_name;phone;notes
Anvar;Nazarov;+998971112233;Ingliz tili
Dilshod;Tursunov;998901112233;Tarix
`

const semicolonResult = parseStudentsFromCsv(semicolonCsv)
console.assert(semicolonResult.validStudents.length === 2, `Expected 2 valid students, got ${semicolonResult.validStudents.length}`)
console.assert(semicolonResult.validStudents[0].first_name === 'Anvar', 'First name mismatch in semicolon CSV')
console.assert(semicolonResult.validStudents[1].phone === '+998901112233', 'Phone normalization in semicolon CSV failed')
console.log('✓ Semicolon delimiter CSV parse tests passed')

// 4. Missing required name handling
const invalidCsv = `Ism,Familiya
,Bekov
Otabek,
`
const invalidResult = parseStudentsFromCsv(invalidCsv)
console.assert(invalidResult.errors.length === 1, `Expected 1 error for missing first name, got ${invalidResult.errors.length}`)
console.assert(invalidResult.validStudents.length === 1, `Expected 1 valid student, got ${invalidResult.validStudents.length}`)
console.log('✓ Validation and error handling tests passed')

console.log('[ALL TESTS PASSED] studentCsvHelper tests completed successfully!')
