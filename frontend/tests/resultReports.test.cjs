const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const Module = require('node:module')
const ts = require('typescript')

function load(file) {
  const source = fs.readFileSync(file, 'utf8')
  const js = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020}}).outputText
  const mod = new Module(file, module)
  mod._compile(js, file)
  return mod.exports
}
const reports = load('src/lib/resultReports.ts')
const { printResultReport } = load('src/lib/printReport.ts')
const text = report => report.sections.flatMap(s => s.paragraphs).join('\n')

test('blast report retains labels, scope, evidence and limits', () => {
  const report = reports.blastReport({run_id:'run', fact_label:'Customers', fact_key:'customers', old_value:'50', new_value:'65', affected_count:1,
    scope_note:'Limited scope', scope:{items_scanned:1, claims_extracted:2, limits:['Not comprehensive'], items_not_scanned:[{title:'Skipped', reason:'no_version'}], scanned_items:[]},
    affected:[{match_type:'possible', title:'Page', channel:'web', status:'draft', registered_state:'none', stale_text:'50 customers', match_method:'offline_lexical'}]})
  assert.equal(report.runId, 'run')
  for (const expected of ['POSSIBLE', '50 customers', 'offline_lexical', 'Not comprehensive', 'Skipped', 'not a compliance certificate']) assert.ok(text(report).includes(expected))
  assert.match(text(reports.blastReport({fact_label:'A', fact_key:'a', affected_count:0, affected:[]})), /does not establish/)
})

test('red team includes stable and unstable evidence, demo and missing decisions disclosure', () => {
  const f = {finding_type:'possible', persona:'Legal Eagle', severity:'high', stable:true, issue:'Review', citations:[{kind:'passage', version:null, quote:'actual quote'}]}
  const report = reports.redTeamReport({run_id:'r', mode:'demo', metrics:{model:'stub', ungrounded_drops:1}, findings:[f], unstable_findings:[{...f, stable:false, issue:'unstable issue'}]}, 'Page')
  for (const expected of ['actual quote', 'unstable issue', 'demo', 'Current human decisions are not included', 'not legal advice']) assert.ok(text(report).includes(expected))
})

test('rule reports include observations, saved labels and issue decisions', () => {
  const checker = reports.checkerReport({run_id:'r', rule_key:'R-04', note:'limited', checker_misses:1, cases:[{text:'example', intended_label:'fail', observed:'pass', checker_miss:true, rationale:'reason'}]})
  assert.match(text(checker), /checker miss/)
  const review = reports.humanReviewReport({run_id:'r', rule_key:'R-01', note:'review', cases:[{text:'example', axis:'source_example', intended_label:'fail', human_label:'pass'}]})
  assert.match(text(review), /human label: pass/)
  const chaos = reports.chaosReport({run_id:'r', rule_key:'R-01', mode:'demo', cases_count:1, ambiguous_count:1}, [{text:'case', axis:'tone', intended_label:'fail', verdicts:['pass'], is_ambiguous:true, human_label:'borderline'}], [{description:'issue', status:'accepted'}])
  assert.match(text(chaos), /human label: borderline/)
  assert.match(text(chaos), /Human decision: accepted/)
})

test('print renderer inserts untrusted content as text and invokes print', () => {
  let printed = false, afterPrint
  function node(tag) { return {tag, children:[], style:{}, textContent:'', appendChild(child){this.children.push(child)}, remove(){this.removed = true}} }
  const doc = {head:node('head'), body:node('body'), createElement:node}
  const win = {focus(){}, print(){printed=true}, addEventListener(event, cb){if(event === 'afterprint') afterPrint=cb}}
  const frame = Object.assign(node('iframe'), {contentDocument:doc, contentWindow:win})
  global.document = {body:node('body'), createElement:() => frame}
  const malicious = '<img src=x onerror=alert(1)>'
  printResultReport({title:'Report',runId:'id',sections:[{heading:'Finding',paragraphs:[malicious]}]})
  assert.equal(printed, true)
  assert.equal(doc.body.children[1].children[1].textContent, malicious)
  assert.equal(doc.body.children[1].children[1].children.length, 0)
  afterPrint()
  assert.equal(frame.removed, true)
  delete global.document
})

test('print renderer removes frame if printing is unavailable', () => {
  const frame = {style:{}, remove(){this.removed = true}, contentDocument:null, contentWindow:null}
  global.document = {body:{appendChild(){}},createElement:() => frame}
  assert.throws(() => printResultReport({title:'t', runId:'r', sections:[]}), /unavailable/)
  assert.equal(frame.removed, true)
  delete global.document
})
