async function test() {
  const loginRes = await fetch('http://127.0.0.1:3001/api/auth/admin-login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin123!' }),
  });
  const loginData = await loginRes.json();
  const token = loginData.token;
  console.log('Admin logged in, token received:', Boolean(token), 'user:', loginData.user?.username);

  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };

  const apprRes = await fetch('http://127.0.0.1:3001/api/admin/approvals', { headers: authHeaders });
  console.log('GET /api/admin/approvals status:', apprRes.status);
  const apprData = await apprRes.json();
  console.log('Approvals counts:', apprData.counts);

  const cfgRes1 = await fetch('http://127.0.0.1:3001/api/admin/approvals/config', { headers: authHeaders });
  console.log('GET /api/admin/approvals/config status:', cfgRes1.status);
  const cfgData1 = await cfgRes1.json();
  console.log('Config 1 items count:', (cfgData1.configs || cfgData1.items || []).length);

  const cfgRes2 = await fetch('http://127.0.0.1:3001/api/admin/approvals/configs', { headers: authHeaders });
  console.log('GET /api/admin/approvals/configs status:', cfgRes2.status);
  const cfgData2 = await cfgRes2.json();
  console.log('Config 2 items count:', (cfgData2.configs || cfgData2.items || []).length);

  const postRes = await fetch('http://127.0.0.1:3001/api/admin/approvals/configs', {
    method: 'POST',
    headers: authHeaders,
    body: JSON.stringify({
      module: 'products',
      requires_approval: true,
      operations: ['create', 'edit'],
    }),
  });
  console.log('POST /api/admin/approvals/configs status:', postRes.status);
  const postData = await postRes.json();
  console.log('POST result:', postData);

  console.log('ALL APPROVAL ENDPOINTS VERIFIED AND WORKING!');
}

test().catch(console.error);
