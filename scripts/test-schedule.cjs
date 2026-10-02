const assert = require('node:assert/strict')
const fs = require('node:fs')
const vm = require('node:vm')
const ts = require('typescript')

const source = fs.readFileSync('src/data.ts', 'utf8')
const javascript = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText
const dataModule = { exports: {} }
vm.runInNewContext(`(function(exports,module,require){${javascript}})(module.exports,module,require)`, { module: dataModule, require })

const {
  baseSchedule,
  createWeeklySchedule,
  employees,
  getAvailableEmployees,
  initialOverrides,
} = dataModule.exports

const ids = list => list.map(employee => employee.id)

// The date-specific absence never changes Sarah's permanent assignment.
assert.equal(baseSchedule.Friday[0].employee, 1)
const octoberWeek = createWeeklySchedule(initialOverrides, '2026-10-05', baseSchedule)
assert.equal(octoberWeek.Friday[0].employee, null)
assert.equal(octoberWeek.Friday[0].open, true)
assert.equal(octoberWeek.Friday[0].reason, 'Approved time off')

// Sarah is unavailable on October 9, while available, eligible coworkers remain candidates.
const fridayDayCandidates = getAvailableEmployees(employees, 'Day', '2026-10-09', initialOverrides)
assert.equal(ids(fridayDayCandidates).includes(1), false)
assert.equal(ids(fridayDayCandidates).includes(4), true)

// Coverage materializes only for October 9 and never mutates the base template.
const coveredOverrides = initialOverrides.map(override => ({ ...override, replacementEmployee: 4 }))
const coveredWeek = createWeeklySchedule(coveredOverrides, '2026-10-05', baseSchedule)
assert.equal(coveredWeek.Friday[0].employee, 4)
assert.equal(baseSchedule.Friday[0].employee, 1)
assert.equal(createWeeklySchedule(initialOverrides, '2026-10-12', baseSchedule).Friday[0].employee, 1)

// Status and eligibility are always enforced.
const inactiveJames = employees.map(employee => employee.id === 4 ? { ...employee, active: false } : employee)
assert.equal(ids(getAvailableEmployees(inactiveJames, 'Day', '2026-10-09', initialOverrides)).includes(4), false)
assert.equal(ids(fridayDayCandidates).includes(3), false)

// An all-day absence excludes the employee from every shift on that date only.
const allDayMarcus = [{
  date: '2026-10-09', shift: 'Day', unavailableEmployee: 2,
  reason: 'Approved time off', replacementEmployee: null, allDay: true,
}]
assert.equal(ids(getAvailableEmployees(employees, 'Day', '2026-10-09', allDayMarcus)).includes(2), false)
assert.equal(ids(getAvailableEmployees(employees, 'Evening', '2026-10-09', allDayMarcus)).includes(2), false)
assert.equal(ids(getAvailableEmployees(employees, 'Evening', '2026-10-10', allDayMarcus)).includes(2), true)

console.log('Schedule availability tests passed.')
