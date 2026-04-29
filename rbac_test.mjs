import { writeFileSync } from 'fs';
import http from 'http';

const BASE = 'http://localhost:3000/api';
const results = [];
let PASS = 0, FAIL = 0;

function log(id, status, expected, actual, detail) {
  results.push({ id, status, expected: String(expected), actual: String(actual), detail });
  if (status === 'PASS') { PASS++; console.log(`  \x1b[32mPASS\x1b[0m [${id}] ${detail}`); }
  else { FAIL++; console.log(`  \x1b[31mFAIL\x1b[0m [${id}] Exp: ${expected} | Got: ${actual} | ${detail}`); }
}

function api(method, token, path, bodyObj) {
  return new Promise((resolve) => {
    const url = new URL(BASE + path);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    };
    if (token) opts.headers['Authorization'] = `Bearer ${token}`;

    const req = http.request(opts, (res) => {
      let data = '';
      res.on('data', (c) => data += c);
      res.on('end', () => {
        let json;
        try { json = JSON.parse(data); } catch { json = null; }
        resolve({ status: res.statusCode, body: json, raw: data });
      });
    });
    req.on('error', (e) => resolve({ status: 0, body: null, raw: e.message }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, body: null, raw: 'timeout' }); });
    if (bodyObj && method !== 'GET') req.write(JSON.stringify(bodyObj));
    req.end();
  });
}

function decodeJWT(token) {
  try {
    const payload = token.split('.')[1];
    const padded = payload + '='.repeat((4 - payload.length % 4) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString());
  } catch { return {}; }
}

async function run() {
  console.log('\x1b[36m=== LOGIN ===\x1b[0m');
  const OT = (await api('POST', '', '/auth/login', { email: 'owner@acme.com', password: 'password123' })).body?.accessToken || '';
  const AT = (await api('POST', '', '/auth/login', { email: 'admin@acme.com', password: 'password123' })).body?.accessToken || '';
  const MT = (await api('POST', '', '/auth/login', { email: 'manager@acme.com', password: 'password123' })).body?.accessToken || '';
  const MeT = (await api('POST', '', '/auth/login', { email: 'member@acme.com', password: 'password123' })).body?.accessToken || '';
  const VT = (await api('POST', '', '/auth/login', { email: 'viewer@acme.com', password: 'password123' })).body?.accessToken || '';

  const OID = decodeJWT(OT).sub, AID = decodeJWT(AT).sub, MID = decodeJWT(MT).sub, MeID = decodeJWT(MeT).sub, VID = decodeJWT(VT).sub;
  console.log(`Owner=${OID}\nAdmin=${AID}\nManager=${MID}\nMember=${MeID}\nViewer=${VID}`);

  if (!OT || !AT || !MT || !MeT || !VT) { console.error('LOGIN FAILED'); process.exit(1); }

  const profile = (await api('GET', OT, '/auth/me')).body;
  const ENG = profile.memberships.find(m => m.orgSlug === 'acme-engineering').orgId;
  const PRD = profile.memberships.find(m => m.orgSlug === 'acme-product').orgId;
  console.log(`Eng=${ENG}\nProd=${PRD}`);

  const T = {};

  // ═══════════════════════════════════════════
  console.log('\n\x1b[36m═══ PHASE 1: CREATE ═══\x1b[0m');
  // ═══════════════════════════════════════════

  async function createTest(id, role, token, title, vis, assigneeId, priority, category, dueAt, expected) {
    const body = { title: `[${role}]${title}`, orgId: ENG, visibility: vis, priority: priority || 'MEDIUM', status: 'TODO' };
    if (assigneeId) body.assigneeId = assigneeId;
    if (category) body.category = category;
    if (dueAt) body.dueAt = dueAt;
    const r = await api('POST', token, '/tasks', body);
    T[id] = r.body?.id || '';
    const ok = r.status === expected && (expected >= 400 || T[id]);
    log(id, ok ? 'PASS' : 'FAIL', expected, r.status, `${role}>${vis}${assigneeId ? '>assignee' : ''} ${T[id] ? 'id=' + T[id].slice(0, 8) : ''} ${r.body?.message || ''}`);
  }

  await createTest('C-O-PUB', 'Owner', OT, 'Public', 'PUBLIC', null, 'HIGH', 'Test', null, 201);
  await createTest('C-O-PRIV', 'Owner', OT, 'Private', 'PRIVATE', null, 'MEDIUM', 'Test', null, 201);
  await createTest('C-O-ASGN', 'Owner', OT, 'AsgnMember', 'ASSIGNED_ONLY', MeID, 'LOW', 'Test', null, 201);
  await createTest('C-A-PUB', 'Admin', AT, 'Public', 'PUBLIC', null, 'CRITICAL', 'Security', null, 201);
  await createTest('C-A-PRIV', 'Admin', AT, 'Private', 'PRIVATE', null, 'MEDIUM', 'Test', null, 201);
  await createTest('C-M-PUB', 'Manager', MT, 'Public', 'PUBLIC', null, 'HIGH', 'Backend', '2026-05-15T00:00:00Z', 201);
  await createTest('C-M-ASGN', 'Manager', MT, 'ToMember', 'PUBLIC', MeID, 'MEDIUM', null, null, 201);
  await createTest('C-M-ASGN-V', 'Manager', MT, 'AsgnViewer', 'ASSIGNED_ONLY', VID, 'LOW', null, null, 201);
  await createTest('C-ME-PUB', 'Member', MeT, 'Public', 'PUBLIC', null, 'MEDIUM', 'Frontend', null, 201);
  await createTest('C-ME-SELF', 'Member', MeT, 'Self', 'PUBLIC', MeID, 'LOW', null, null, 201);
  await createTest('C-ME-OTHER', 'Member', MeT, 'Other', 'PUBLIC', AID, 'LOW', null, null, 403);
  await createTest('C-ME-PRIV', 'Member', MeT, 'Private', 'PRIVATE', null, 'MEDIUM', null, null, 201);
  await createTest('C-V', 'Viewer', VT, 'NoCreate', 'PUBLIC', null, 'LOW', null, null, 403);
  await createTest('C-XORG', 'Member', MeT, 'XOrg', 'PUBLIC', null, 'LOW', null, null, 403);

  // ═══════════════════════════════════════════
  console.log('\n\x1b[36m═══ PHASE 2: READ / VISIBILITY ═══\x1b[0m');
  // ═══════════════════════════════════════════

  async function readMatrix(prefix, taskId, expectations) {
    console.log(`\n\x1b[36m--- ${prefix} (id=${taskId?.slice(0, 8)}...) ---\x1b[0m`);
    const map = { Owner: OT, Admin: AT, Mgr: MT, Member: MeT, Viewer: VT };
    for (const [role, expected] of Object.entries(expectations)) {
      const r = await api('GET', map[role], `/tasks/${taskId}`);
      const ok = r.status === expected;
      const leak = (!ok && expected === 404 && r.status === 200) ? ' ***LEAK***' : '';
      log(`${prefix}-${role}`, ok ? 'PASS' : 'FAIL', expected, r.status, `${role} reads ${prefix}${leak}`);
    }
  }

  await readMatrix('R-PUB-O', T['C-O-PUB'], { Owner: 200, Admin: 200, Mgr: 200, Member: 200, Viewer: 200 });
  await readMatrix('R-PRIV-O', T['C-O-PRIV'], { Owner: 200, Admin: 200, Mgr: 200, Member: 404, Viewer: 404 });
  await readMatrix('R-ASGN-O', T['C-O-ASGN'], { Owner: 200, Admin: 200, Mgr: 200, Member: 200, Viewer: 404 });
  await readMatrix('R-PUB-A', T['C-A-PUB'], { Owner: 200, Admin: 200, Mgr: 200, Member: 200, Viewer: 200 });
  await readMatrix('R-PRIV-A', T['C-A-PRIV'], { Owner: 200, Admin: 200, Mgr: 200, Member: 404, Viewer: 404 });
  await readMatrix('R-PUB-M', T['C-M-PUB'], { Owner: 200, Admin: 200, Mgr: 200, Member: 200, Viewer: 200 });
  await readMatrix('R-ASGN-M', T['C-M-ASGN-V'], { Owner: 200, Admin: 200, Mgr: 200, Member: 404, Viewer: 200 });
  await readMatrix('R-PRIV-ME', T['C-ME-PRIV'], { Owner: 200, Admin: 200, Mgr: 200, Member: 200, Viewer: 404 });
  await readMatrix('R-PUB-ME', T['C-ME-PUB'], { Owner: 200, Admin: 200, Mgr: 200, Member: 200, Viewer: 200 });

  // Cross-org
  console.log('\n\x1b[36m--- Cross-org Product ---\x1b[0m');
  const prodR = await api('POST', OT, '/tasks', { title: 'ProdTask', orgId: PRD, visibility: 'PUBLIC', priority: 'LOW', status: 'TODO' });
  const PT = prodR.body?.id;
  console.log(`Product task id=${PT?.slice(0, 8)}`);
  await readMatrix('R-XORG', PT, { Owner: 200, Admin: 404, Mgr: 404, Member: 404, Viewer: 404 });

  // List checks
  console.log('\n\x1b[36m--- List visibility checks ---\x1b[0m');
  const vList = await api('GET', VT, `/tasks?orgId=${ENG}&limit=100`);
  const vPriv = (vList.body?.items || []).filter(t => t.visibility === 'PRIVATE').length;
  log('R-LIST-V-PRIV', vPriv === 0 ? 'PASS' : 'FAIL', 0, vPriv,
    vPriv === 0 ? 'Viewer no PRIVATE in list' : 'Viewer sees PRIVATE ***LEAK***');

  const vAsgnOther = (vList.body?.items || []).filter(t => t.visibility === 'ASSIGNED_ONLY' && t.assigneeId !== VID).length;
  log('R-LIST-V-ASGN', vAsgnOther === 0 ? 'PASS' : 'FAIL', 0, vAsgnOther,
    vAsgnOther === 0 ? 'Viewer only own ASSIGNED_ONLY' : 'Viewer sees others ASSIGNED_ONLY ***LEAK***');

  const mList = await api('GET', MeT, `/tasks?orgId=${ENG}&limit=100`);
  const mOthPriv = (mList.body?.items || []).filter(t => t.visibility === 'PRIVATE' && t.createdById !== MeID).length;
  log('R-LIST-ME-PRIV', mOthPriv === 0 ? 'PASS' : 'FAIL', 0, mOthPriv,
    mOthPriv === 0 ? 'Member only own PRIVATE' : 'Member sees others PRIVATE ***LEAK***');

  const mAsgnOther = (mList.body?.items || []).filter(t => t.visibility === 'ASSIGNED_ONLY' && t.assigneeId !== MeID).length;
  log('R-LIST-ME-ASGN', mAsgnOther === 0 ? 'PASS' : 'FAIL', 0, mAsgnOther,
    mAsgnOther === 0 ? 'Member only assigned ASSIGNED_ONLY' : 'Member sees unassigned ASSIGNED_ONLY ***LEAK***');

  // ═══════════════════════════════════════════
  console.log('\n\x1b[36m═══ PHASE 3: UPDATE ═══\x1b[0m');
  // ═══════════════════════════════════════════

  async function updateTest(id, token, taskId, body, expected, detail) {
    const r = await api('PATCH', token, `/tasks/${taskId}`, body);
    log(id, r.status === expected ? 'PASS' : 'FAIL', expected, r.status, `${detail} ${r.body?.message || ''}`);
  }

  await updateTest('U1', OT, T['C-A-PUB'], { title: 'Updated by Owner', priority: 'CRITICAL' }, 200, 'Owner updates Admin Public');
  await updateTest('U2', AT, T['C-O-PUB'], { title: 'Updated by Admin' }, 200, 'Admin updates Owner Public');
  await updateTest('U3', MT, T['C-ME-PUB'], { status: 'IN_PROGRESS' }, 200, 'Manager updates Member Public');
  await updateTest('U4', MeT, T['C-ME-PUB'], { title: 'Member updated own' }, 200, 'Member updates own Public');
  await updateTest('U5', MeT, T['C-M-ASGN'], { status: 'IN_PROGRESS' }, 200, 'Member updates assigned task');
  await updateTest('U6', MeT, T['C-A-PUB'], { title: 'Hack' }, 404, 'Member updates Admin unassigned');
  await updateTest('U7', VT, T['C-O-PUB'], { title: 'Hack' }, 404, 'Viewer updates');
  await updateTest('U8', MT, T['C-A-PRIV'], { priority: 'HIGH' }, 200, 'Manager updates Admin Private');
  await updateTest('U9', MeT, T['C-O-PRIV'], { title: 'Hack' }, 404, 'Member updates Owner Private');
  await updateTest('U10', MeT, T['C-ME-PUB'], { assigneeId: AID }, 403, 'Member reassigns to other');
  await updateTest('U11', MT, T['C-M-PUB'], { assigneeId: VID }, 200, 'Manager reassigns to Viewer');
  await updateTest('U12', OT, T['C-ME-SELF'], { visibility: 'PRIVATE' }, 200, 'Owner changes Member task to PRIVATE');

  // ═══════════════════════════════════════════
  console.log('\n\x1b[36m═══ PHASE 4: DELETE ═══\x1b[0m');
  // ═══════════════════════════════════════════

  const MD = (await api('POST', MeT, '/tasks', { title: 'MeDel', orgId: ENG, visibility: 'PUBLIC', priority: 'LOW', status: 'TODO' })).body?.id;
  const AD = (await api('POST', AT, '/tasks', { title: 'AdDel', orgId: ENG, visibility: 'PUBLIC', priority: 'LOW', status: 'TODO' })).body?.id;
  const MgD = (await api('POST', MT, '/tasks', { title: 'MgDel', orgId: ENG, visibility: 'PUBLIC', assigneeId: MeID, priority: 'LOW', status: 'TODO' })).body?.id;

  async function deleteTest(id, token, taskId, expected, detail) {
    const r = await api('DELETE', token, `/tasks/${taskId}`);
    log(id, r.status === expected ? 'PASS' : 'FAIL', expected, r.status, `${detail} ${r.body?.message || ''}`);
  }

  await deleteTest('D1', OT, AD, 200, 'Owner deletes Admin task');
  await deleteTest('D2', MeT, MD, 200, 'Member deletes own task');
  await deleteTest('D3', MeT, MgD, 404, 'Member deletes assigned-not-created');
  await deleteTest('D4', VT, T['C-O-PUB'], 404, 'Viewer deletes');
  await deleteTest('D5', MT, T['C-ME-PUB'], 200, 'Manager deletes Member Public');
  await deleteTest('D6', AT, T['C-O-PUB'], 200, 'Admin deletes Owner Public');
  await deleteTest('D7', MeT, AD, 404, 'Double delete');

  // ═══════════════════════════════════════════
  console.log('\n\x1b[36m═══ PHASE 5: COMMENTS ═══\x1b[0m');
  // ═══════════════════════════════════════════

  const CT = (await api('POST', AT, '/tasks', { title: 'CmtTest', orgId: ENG, visibility: 'PUBLIC', priority: 'LOW', status: 'TODO' })).body?.id;

  async function commentTest(id, token, taskId, comment, expected, detail) {
    const r = await api('POST', token, `/tasks/${taskId}/comments`, { comment });
    log(id, r.status === expected ? 'PASS' : 'FAIL', expected, r.status, `${detail} ${r.body?.message || ''}`);
  }

  async function activityTest(id, token, taskId, expected, detail) {
    const r = await api('GET', token, `/tasks/${taskId}/activity`);
    log(id, r.status === expected ? 'PASS' : 'FAIL', expected, r.status, `${detail} ${r.body?.message || ''}`);
  }

  await commentTest('CM1', MeT, CT, 'Member comment', 201, 'Member comments on Public');
  await commentTest('CM2', VT, CT, 'Viewer comment', 403, 'Viewer comments on Public');
  await commentTest('CM3', MeT, T['C-O-PRIV'], 'Leak', 404, 'Member comments on invisible');
  await commentTest('CM4', OT, T['C-O-PRIV'], 'Owner comment', 201, 'Owner comments on own Private');
  await activityTest('CM5', VT, CT, 200, 'Viewer reads activity on Public');
  await activityTest('CM6', MeT, T['C-O-ASGN'], 200, 'Member reads activity on assigned');
  await activityTest('CM7', MeT, T['C-O-PRIV'], 404, 'Member reads activity invisible');

  // ═══════════════════════════════════════════
  console.log('\n\x1b[36m═══════════════════════════════════════\x1b[0m');
  console.log(`\x1b[32mPASS: ${PASS}\x1b[0m  \x1b[31mFAIL: ${FAIL}\x1b[0m  Total: ${PASS + FAIL}`);
  if (FAIL > 0) {
    console.log('\n\x1b[31m=== FAILURES ===\x1b[0m');
    results.filter(r => r.status === 'FAIL').forEach(r =>
      console.log(`  [${r.id}] Exp: ${r.expected} | Got: ${r.actual} | ${r.detail}`)
    );
  }

  writeFileSync('D:/Code/RBAC/rbac_results.txt', results.map(r =>
    `[${r.id}] ${r.status} | Exp: ${r.expected} | Got: ${r.actual} | ${r.detail}`
  ).join('\n'));
  console.log('\nResults saved to rbac_results.txt');
}

run().catch(e => console.error('FATAL:', e));
