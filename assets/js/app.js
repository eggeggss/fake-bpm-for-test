/*
  BPM 模擬系統前端腳本
  - 僅使用 LocalStorage 模擬登入、資料、流程
  - 使用者資訊、待簽核、表單中心等
*/
(function(){
  const KEY_USER = 'bpm_user';
  const KEY_DATA = 'bpm_data_v2';

  // 預設資料
  const defaultUser = {
    account:'rogerroan', name:'Roger Roan', dept:'資訊部', title:'系統管理員', email:'rogerroan@example.com', phone:'02-1234-5678',
    avatar:`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent('rogerroan')}`
  };

  const formsMeta = [
    { id:'leave', name:'請假單', icon:'sun', color:'warning', tags:['HR','假勤'], quick:true },
    { id:'trip', name:'出差單', icon:'airplane', color:'primary', tags:['差旅','費用'], quick:true },
    { id:'ot', name:'加班單', icon:'clock-history', color:'info', tags:['HR','假勤'], quick:true },
    { id:'entry', name:'入廠申請單', icon:'shield-lock', color:'success', tags:['安環','訪客'], quick:true },
  ];

  // 模擬幾筆待簽核
  function seedData(){
    const now = Date.now();
    const demo = {
      inbox:[
        { id:'A'+(now-1), form:'leave', subject:'年假 2 天', applicant:'張大華', dept:'製造部', date:'2026/04/03', status:'pending', payload:{type:'年假', start:'2026-04-10T09:00', end:'2026-04-11T18:00', reason:'家庭旅遊'}} ,
        { id:'A'+(now-2), form:'trip', subject:'上海出差 3 日', applicant:'李小美', dept:'業務部', date:'2026/04/02', status:'pending', payload:{dest:'上海', start:'2026-04-15', end:'2026-04-17', purpose:'拜訪客戶、簽約', costs:[{item:'交通',amt:8000},{item:'住宿',amt:6000},{item:'日支',amt:3000}]}} ,
        { id:'A'+(now-3), form:'ot', subject:'專案上線支援 4hr', applicant:'王小明', dept:'資訊部', date:'2026/04/01', status:'pending', payload:{date:'2026-04-09', hours:4, kind:'平日', desc:'夜間上線監控'}} ,
      ],
      news:[
        { title:'系統上線公告', time:'2026-04-01', content:'BPM 模擬系統 v1.0 上線囉！' },
        { title:'表單優化', time:'2026-04-05', content:'新增入廠申請單欄位提示與檢核。' }
      ]
    };
    localStorage.setItem(KEY_DATA, JSON.stringify(demo));
  }

  function getData(){
    const raw = localStorage.getItem(KEY_DATA);
    if(!raw){ seedData(); return getData(); }
    try { return JSON.parse(raw); } catch(e){ seedData(); return getData(); }
  }

  function setData(data){ localStorage.setItem(KEY_DATA, JSON.stringify(data)); }

  // 簡易 Router
  function switchPage(name){
    $('.page-view').addClass('d-none');
    $('#page-' + name).removeClass('d-none');
    $('.navbar .nav-link').removeClass('active');
    $(`.navbar .nav-link[data-page="${name}"]`).addClass('active');
  }

  // 共用：建立 badge
  function badge(text, color){
    return `<span class="badge rounded-pill bg-${color}">${text}</span>`;
  }

  // 登入邏輯
  function initLogin(){
    // 若已有登入，用戶直接導到主頁
    const user = JSON.parse(localStorage.getItem(KEY_USER) || 'null');
    if(user){ location.href = 'main.html'; return; }

    $('#togglePwd').on('click', function(){
      const inp = $('#password')[0];
      inp.type = inp.type === 'password' ? 'text' : 'password';
      $(this).find('i').toggleClass('bi-eye bi-eye-slash');
    });

    $('#quickFill').on('click', function(){
      $('#account').val('rogerroan');
      $('#password').val('1234');
    });

    $('#loginForm').on('submit', function(e){
      e.preventDefault();
      const account = $('#account').val().trim();
      const pwd = $('#password').val().trim();
      if(account!=='rogerroan' || pwd!=='1234'){
        alert('帳號或密碼錯誤');
        return;
      }
      const name = 'Roger Roan';
      const user = {
        ...defaultUser,
        account,
        name,
        avatar:`https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(account)}`
      };
      localStorage.setItem(KEY_USER, JSON.stringify(user));
      if(!localStorage.getItem(KEY_DATA)) seedData();
      // 小動畫
      $('.card').addClass('animate__animated animate__pulse');
      setTimeout(()=> location.href='main.html', 350);
    });
  }

  // 主頁初始化
  function initMain(){
    const user = JSON.parse(localStorage.getItem(KEY_USER) || 'null');
    if(!user){ location.href = 'index.html'; return; }

    const data = getData();

    // Header
    $('#avatar').attr('src', user.avatar);
    $('#userName').text(user.name);
    $('#userDept').text(`${user.dept} / ${user.title}`);

    // 使用者資訊卡
    $('#userInfo').html(`
      <div class="kv"><div class="k">姓名</div><div class="v">${user.name}</div></div>
      <div class="kv"><div class="k">帳號</div><div class="v">${user.account}</div></div>
      <div class="kv"><div class="k">部門</div><div class="v">${user.dept}</div></div>
      <div class="kv"><div class="k">職稱</div><div class="v">${user.title}</div></div>
      <div class="kv"><div class="k">Email</div><div class="v">${user.email}</div></div>
      <div class="kv"><div class="k">電話</div><div class="v">${user.phone}</div></div>
    `);

    // Notif 顯示待簽數
    $('#notifCnt').text((data.inbox||[]).filter(x=>x.status==='pending').length);

    // 快速動作
    const $qa = $('#quickActions');
    formsMeta.filter(f=>f.quick).forEach(f=>{
      const html = `
        <div class="col-6 col-md-3">
          <button class="btn btn-outline-light w-100 form-launch"
                  data-form="${f.id}">
            <i class="bi bi-${f.icon} me-1"></i> ${f.name}
          </button>
        </div>`;
      $qa.append(html);
    });

    // 我的待簽核（儀表板簡版）
    const $inboxList = $('#inboxList').empty();
    if(data.inbox.length===0){
      $inboxList.append(`<div class="text-secondary small">目前沒有待簽核</div>`);
    }
    data.inbox.slice(0,5).forEach(item=>{
      const form = formsMeta.find(f=>f.id===item.form);
      const icon = form ? form.icon : 'file-earmark-text';
      const html = `
        <a href="#" class="list-group-item list-group-item-action d-flex align-items-center justify-content-between">
          <div class="d-flex align-items-center gap-3">
            <div class="logo-badge small"><i class="bi bi-${icon}"></i></div>
            <div>
              <div class="fw-bold">${item.subject}</div>
              <div class="small text-secondary">${item.applicant} ・ ${item.dept} ・ ${item.date}</div>
            </div>
          </div>
          <span class="status pending">待簽</span>
        </a>`;
      $inboxList.append(html);
    });

    // 公告
    const $news = $('#news').empty();
    data.news.forEach(n=>{
      $news.append(`<li class="mb-2"><div class="fw-semibold">${n.title}</div><div class="small text-secondary">${n.time}｜${n.content}</div></li>`);
    });

    // 待簽核頁 - 表格
    // 初始渲染清單（帶分頁/排序）改由 applyAndRender 內處理，這裡不直接呼叫 renderInboxTable

    // 表單中心 - 卡片
    renderFormCenter('all');

    // 綁定事件
    $('.nav-link[data-page]').on('click', function(){
      const p = $(this).data('page');
      switchPage(p);
    });

    $('#btnLogout').on('click', function(){
      localStorage.removeItem(KEY_USER);
      location.href='index.html';
    });

    let state = { page:1, size:10, sortField:'date', sortDir:'desc', kw:'' };

    function applyAndRender(){
      const d = getData();
      let rows = d.inbox.slice();
      if(state.kw){
        const kw = state.kw.toLowerCase();
        rows = rows.filter(it=> Object.values(it).join(' ').toLowerCase().includes(kw));
      }
      rows.sort((a,b)=>{
        const f = state.sortField;
        const av = a[f]||''; const bv = b[f]||'';
        let cmp = 0;
        if(f==='date') cmp = (new Date(av)) - (new Date(bv));
        else cmp = (''+av).localeCompare(''+bv, 'zh-Hant');
        return state.sortDir==='asc'? cmp : -cmp;
      });
      const total = rows.length;
      const pages = Math.max(1, Math.ceil(total/state.size));
      state.page = Math.min(state.page, pages);
      const start = (state.page-1)*state.size;
      const pageRows = rows.slice(start, start+state.size);
      renderInboxTable(pageRows);
      // Pager render
      $('#inboxPager').html(`
        <div>共 ${total} 筆，頁數 ${state.page}/${pages}</div>
        <div class="btn-group btn-group-sm">
          <button class="btn btn-outline-light" id="pgFirst" ${state.page===1?'disabled':''}><i class="bi bi-skip-start"></i></button>
          <button class="btn btn-outline-light" id="pgPrev" ${state.page===1?'disabled':''}><i class="bi bi-caret-left"></i></button>
          <button class="btn btn-outline-light" id="pgNext" ${state.page===pages?'disabled':''}><i class="bi bi-caret-right"></i></button>
          <button class="btn btn-outline-light" id="pgLast" ${state.page===pages?'disabled':''}><i class="bi bi-skip-end"></i></button>
        </div>`);
      $('#pgFirst').off().on('click', ()=>{ state.page=1; applyAndRender(); });
      $('#pgPrev').off().on('click', ()=>{ if(state.page>1){ state.page--; applyAndRender(); } });
      $('#pgNext').off().on('click', ()=>{ state.page++; applyAndRender(); });
      $('#pgLast').off().on('click', ()=>{ state.page=pages; applyAndRender(); });
    }

    // 初次渲染
    applyAndRender();

    // 支援外部要求重繪（例如審核完成或送單後）
    $(document).on('bpm:refreshInbox', function(){
      applyAndRender();
      $('#notifCnt').text(pendingCount());
    });

    // 事件
    $('#searchInbox').on('input', function(){
      state.kw = $(this).val();
      state.page = 1; applyAndRender();
    });

    $('#sortField').on('change', function(){ state.sortField = $(this).val(); state.page=1; applyAndRender(); });
    $('#sortDir').on('click', function(){ state.sortDir = state.sortDir==='asc'?'desc':'asc'; $(this).find('i').toggleClass('bi-sort-down-alt bi-sort-down'); applyAndRender(); });
    $('#pageSize').on('change', function(){ state.size = +$(this).val(); state.page=1; applyAndRender(); });

    $('#btnBatchApprove').on('click', function(){ batchAction('approve'); });
    $('#btnBatchReject').on('click', function(){ batchAction('reject'); });

    function batchAction(act){
      const ids = $('.row-select:checked').map((i,el)=> $(el).data('id')).get();
      if(ids.length===0) return;
      // 開啟明細 Modal 做統一意見
      openViewModal(ids[0], act, ids);
    }

    $('.filter-btn').on('click', function(){
      $('.filter-btn').removeClass('active');
      $(this).addClass('active');
      const f = $(this).data('filter');
      renderFormCenter(f);
    });

    $(document).on('click', '.form-launch', function(){
      const id = $(this).data('form');
      openFormModal(id);
    });

    $('#btnSubmitForm').on('click', function(){
      const id = $('#formModal').data('formId');
      const payload = collectFormData(id);
      if(!payload){ return; }
      // 存成待簽核一筆
      const d = getData();
      d.inbox.unshift({
        id: 'N'+Date.now(),
        form: id,
        subject: genSubject(id, payload),
        applicant: user.name,
        dept: user.dept,
        date: new Date().toISOString().slice(0,10),
        status:'pending',
        payload,
        history:[{time:new Date().toLocaleString(), user:user.name, action:'建立', comment:'申請建立'}]
      });
      setData(d);
      const fmInst = bootstrap.Modal.getInstance(document.getElementById('formModal'));
      if(fmInst) fmInst.hide();
      // 刷新頁面
      location.reload();
    });
  }

  function renderInboxTable(rows){
    const $wrap = $('#inboxTable');
    if(!rows || rows.length===0){ $wrap.html('<div class="text-secondary small">沒有資料</div>'); return; }
    const thead = `
      <thead><tr>
        <th style="width:150px"><input class="form-check-input me-2" type="checkbox" id="selectAll"> 單號</th><th>類型</th><th>主旨</th><th>申請人</th><th>部門</th><th>日期</th><th>狀態</th><th>動作</th>
      </tr></thead>`;
    const tbody = rows.map(r=>{
      const fm = formsMeta.find(f=>f.id===r.form);
      const type = fm ? fm.name : r.form;
      const ckDisabled = r.status!=='pending' ? 'disabled title="僅待簽可勾選"' : '';
      const actions = r.status==='pending'
        ? `<div class="btn-group btn-group-sm">
             <button class="btn btn-outline-success" data-act="approve" data-id="${r.id}"><i class="bi bi-check2"></i></button>
             <button class="btn btn-outline-danger" data-act="reject" data-id="${r.id}"><i class="bi bi-x"></i></button>
           </div>`
        : `<button class="btn btn-sm btn-outline-secondary view-detail" data-id="${r.id}"><i class="bi bi-eye"></i></button>`;
      return `<tr>
        <td><input class="form-check-input row-select me-2" type="checkbox" data-id="${r.id}" ${ckDisabled}> ${r.id}</td>
        <td>${type}</td>
        <td><a href="#" class="link-primary text-decoration-none view-detail" data-id="${r.id}">${r.subject}</a></td>
        <td>${r.applicant}</td>
        <td>${r.dept}</td>
        <td>${r.date}</td>
        <td><span class="status ${r.status}">${r.status==='pending'?'待簽':r.status}</span></td>
        <td>${actions}</td>
      </tr>`;
    }).join('');

    $wrap.html(`<table class="table table-hover align-middle">${thead}<tbody>${tbody}</tbody></table>`);

    // 全選
    $('#selectAll').on('change', function(){
      const ck = this.checked; $('.row-select').prop('checked', ck).trigger('change');
    });

    // 明細檢視
    $wrap.find('.view-detail').on('click', function(e){
      e.preventDefault();
      const id = $(this).data('id');
      openViewModal(id);
    });

    // 綁定審核動作（個別）
    $wrap.find('[data-act]').on('click', function(){
      const id = $(this).data('id');
      const act = $(this).data('act');
      openViewModal(id, act); // 直接打開 Modal 並帶入動作
    });

    // 勾選事件，控制批次按鈕
    $('.row-select').on('change', function(){
      const any = $('.row-select:checked').length>0;
      $('#btnBatchApprove, #btnBatchReject').prop('disabled', !any);
    });
  }

  function renderFormCenter(filter){
    const $fc = $('#formCenter').empty();
    const list = formsMeta.filter(f=> filter==='all' ? true : f.id===filter);
    list.forEach(f=>{
      const html = `
        <div class="col-12 col-sm-6 col-lg-3">
          <div class="card form-card h-100">
            <div class="card-body d-flex flex-column">
              <div class="d-flex align-items-center mb-2">
                <div class="logo-badge small me-2"><i class="bi bi-${f.icon}"></i></div>
                <h6 class="mb-0">${f.name}</h6>
                <div class="ms-auto">${badge('可使用', 'success')}</div>
              </div>
              <div class="mb-2">
                ${f.tags.map(t=>`<span class='tag'>#${t}</span>`).join(' ')}
              </div>
              <div class="mt-auto d-grid">
                <button class="btn btn-outline-primary form-launch" data-form="${f.id}"><i class="bi bi-pencil-square me-1"></i> 立即填寫</button>
              </div>
            </div>
          </div>
        </div>`;
      $fc.append(html);
    });
  }

  function openFormModal(id){
    const meta = formsMeta.find(f=>f.id===id);
    if(!meta) return;
    $('#formModalLabel').text(meta.name);
    $('#formModal').data('formId', id);

    const body = buildFormBody(id);
    $('#formModalBody').html(body);
    new bootstrap.Modal(document.getElementById('formModal')).show();

    // 表單動態：計算請假時數、出差費用總額
    if(id==='leave'){
      const $f = $('#form-leave');
      const $hint = $('<div class="form-text text-info mt-0" id="leaveHours">時數：-- 小時</div>');
      $f.find('[name=end]').closest('.col-md-4').append($hint);
      $f.on('change input', function(){
        const s = new Date($f.find('[name=start]').val());
        const e = new Date($f.find('[name=end]').val());
        if(e-s>0){ $hint.text(`時數：${Math.round((e-s)/36e5)} 小時`);} else { $hint.text('時數：-- 小時'); }
      });
    }
    if(id==='trip'){
      const $f = $('#form-trip');
      const costs = `
        <div class="col-12">
          <label class="form-label">費用明細</label>
          <div class="row g-2" id="costRows">
            <div class="col-md-4"><input class="form-control" name="cost_item_1" placeholder="項目：交通"></div>
            <div class="col-md-3"><input type="number" min="0" class="form-control" name="cost_amt_1" placeholder="金額"></div>
            <div class="col-md-5"><input class="form-control" name="cost_note_1" placeholder="備註"></div>
          </div>
          <div class="d-flex justify-content-between mt-2">
            <div class="text-info" id="costTotal">合計：0</div>
            <button class="btn btn-sm btn-outline-light" type="button" id="addCost"><i class="bi bi-plus"></i> 新增一列</button>
          </div>
        </div>`;
      $f.append(costs);
      const recalc = ()=>{
        let sum=0; $f.find('[name^=cost_amt_]').each((i,el)=> sum += (+el.value||0));
        $('#costTotal').text(`合計：${sum.toLocaleString()}`);
      };
      $f.on('input','[name^=cost_amt_]', recalc);
      $('#addCost').on('click', function(){
        const idx = $('#costRows .col-md-4').length + 1;
        $('#costRows').append(`
          <div class="col-md-4"><input class="form-control" name="cost_item_${idx}" placeholder="項目"></div>
          <div class="col-md-3"><input type="number" min="0" class="form-control" name="cost_amt_${idx}" placeholder="金額"></div>
          <div class="col-md-5"><input class="form-control" name="cost_note_${idx}" placeholder="備註"></div>`);
      });
    }
    if(id==='ot'){
      const $f = $('#form-ot');
      const tip = '<div class="form-text">若選「假日/國定假日」，請依規定填報補休或加班費。</div>';
      $f.find('[name=kind]').closest('.col-md-4').append(tip);
    }
    if(id==='entry'){
      const $f = $('#form-entry');
      const extra = `
        <div class="col-md-4">
          <label class="form-label">車號</label>
          <input type="text" class="form-control" name="carno" placeholder="選填">
        </div>
        <div class="col-md-4">
          <label class="form-label">攜帶設備</label>
          <input type="text" class="form-control" name="devices" placeholder="如：筆電、相機">
        </div>
        <div class="col-md-4">
          <label class="form-label">被訪者</label>
          <input type="text" class="form-control" name="host" placeholder="如：張三/資訊部">
        </div>
        <div class="col-12">
          <label class="form-label">安全教育</label>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" name="safety" value="一般">
            <label class="form-check-label">一般</label>
          </div>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" name="safety" value="動火">
            <label class="form-check-label">動火</label>
          </div>
          <div class="form-check form-check-inline">
            <input class="form-check-input" type="checkbox" name="safety" value="高空">
            <label class="form-check-label">高空</label>
          </div>
        </div>`;
      $f.append(extra);
    }
  }

  function buildFormBody(id){
    switch(id){
      case 'leave':
        return `
          <form id="form-leave" class="row g-3">
            <div class="col-md-4">
              <label class="form-label">假別</label>
              <select class="form-select" name="type" required>
                <option value="年假">年假</option>
                <option value="事假">事假</option>
                <option value="病假">病假</option>
                <option value="補休">補休</option>
              </select>
            </div>
            <div class="col-md-4">
              <label class="form-label">開始</label>
              <input type="datetime-local" class="form-control" name="start" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">結束</label>
              <input type="datetime-local" class="form-control" name="end" required>
            </div>
            <div class="col-12">
              <label class="form-label">事由</label>
              <input type="text" class="form-control" name="reason" placeholder="簡述請假事由" required>
            </div>
            <div class="col-md-6">
              <label class="form-label">是否整天</label>
              <select class="form-select" name="fullday" required>
                <option value="是">是</option>
                <option value="否">否</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">附件（示意）</label>
              <input type="file" class="form-control" name="attach" accept="image/*,application/pdf">
            </div>
          </form>`;
      case 'trip':
        return `
          <form id="form-trip" class="row g-3">
            <div class="col-md-6">
              <label class="form-label">目的地</label>
              <input type="text" class="form-control" name="dest" placeholder="例如：上海" required>
            </div>
            <div class="col-md-3">
              <label class="form-label">開始日期</label>
              <input type="date" class="form-control" name="start" required>
            </div>
            <div class="col-md-3">
              <label class="form-label">結束日期</label>
              <input type="date" class="form-control" name="end" required>
            </div>
            <div class="col-12">
              <label class="form-label">目的</label>
              <textarea class="form-control" rows="2" name="purpose" placeholder="出差目的" required></textarea>
            </div>
            <div class="col-md-4">
              <label class="form-label">交通預算</label>
              <input type="number" min="0" class="form-control" name="budget_trans" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">住宿預算</label>
              <input type="number" min="0" class="form-control" name="budget_hotel" value="0">
            </div>
            <div class="col-md-4">
              <label class="form-label">日支預算</label>
              <input type="number" min="0" class="form-control" name="budget_misc" value="0">
            </div>
          </form>`;
      case 'ot':
        return `
          <form id="form-ot" class="row g-3">
            <div class="col-md-4">
              <label class="form-label">日期</label>
              <input type="date" class="form-control" name="date" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">時數</label>
              <input type="number" min="1" max="12" class="form-control" name="hours" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">性質</label>
              <select class="form-select" name="kind" required>
                <option value="平日">平日</option>
                <option value="假日">假日</option>
                <option value="國定假日">國定假日</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">類型</label>
              <select class="form-select" name="type" required>
                <option value="補休">補休</option>
                <option value="加班費">加班費</option>
              </select>
            </div>
            <div class="col-md-6">
              <label class="form-label">主管知會</label>
              <input type="text" class="form-control" name="notify" placeholder="例如：部門主管姓名">
            </div>
            <div class="col-12">
              <label class="form-label">說明</label>
              <input type="text" class="form-control" name="desc" placeholder="加班內容" required>
            </div>
          </form>`;
      case 'entry':
        return `
          <form id="form-entry" class="row g-3">
            <div class="col-md-6">
              <label class="form-label">訪客姓名</label>
              <input type="text" class="form-control" name="visitor" required>
            </div>
            <div class="col-md-6">
              <label class="form-label">公司/單位</label>
              <input type="text" class="form-control" name="company" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">到訪日期</label>
              <input type="date" class="form-control" name="date" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">時間</label>
              <input type="time" class="form-control" name="time" required>
            </div>
            <div class="col-md-4">
              <label class="form-label">接待部門</label>
              <input type="text" class="form-control" name="dept" value="資訊部" required>
            </div>
            <div class="col-12">
              <label class="form-label">事由</label>
              <input type="text" class="form-control" name="reason" placeholder="簡述入廠目的" required>
            </div>
          </form>`;
    }
  }

  function collectFormData(id){
    const $form = $(`#form-${id}`);
    if($form.length===0){ alert('未找到表單'); return null; }
    // HTML5 驗證
    if(!$form[0].checkValidity()){
      $form[0].reportValidity();
      return null;
    }
    const data = {};
    $form.serializeArray().forEach(({name, value})=>{
      if(name==='safety'){
        (data[name]||(data[name]=[])).push(value);
      }else if(name.startsWith('cost_amt_')){
        (data.costs||(data.costs=[]));
      }
      data[name]= data[name] || value;
    });
    // 彙整出差費用表格
    if(id==='trip'){
      const costs=[]; const items=$form.find('[name^=cost_item_]');
      items.each((i,el)=>{
        const idx = el.name.split('_').pop();
        const item = el.value?.trim(); const amt = +($form.find(`[name=cost_amt_${idx}]`).val()||0);
        const note = $form.find(`[name=cost_note_${idx}]`).val()||'';
        if(item || amt>0 || note){ costs.push({item, amt, note}); }
      });
      data.costs = costs;
    }
    return data;
  }

  function genSubject(id, p){
    switch(id){
      case 'leave': return `${p.type} ${formatRange(p.start, p.end)}${p.fullday==='是'?'（整天）':''}`;
      case 'trip': {
        const total = (p.costs||[]).reduce((s,c)=> s+(+c.amt||0), 0);
        return `${p.dest} 出差 ${p.start}~${p.end}，預估費用${total?(' '+total.toLocaleString()):''}`;
      }
      case 'ot': return `${p.date} 加班 ${p.hours} 小時(${p.kind}/${p.type||'補休'})`;
      case 'entry': return `${p.visitor}(${p.company}) ${p.date} ${p.time} 入廠`;
    }
    return '新申請';
  }

  function formatRange(s, e){
    if(!s || !e) return '';
    const ds = s.replace('T',' '), de = e.replace('T',' ');
    return `${ds} ~ ${de}`;
  }

  // 明細檢視 + 歷程 + 審核
  function openViewModal(id, act, batchIds){
    const d = getData();
    const item = d.inbox.find(x=>x.id===id);
    if(!item) return;
    const fm = formsMeta.find(f=>f.id===item.form);

    // 明細區
    $('#viewModalLabel').text(`${fm?fm.name:item.form}｜${item.id}`);
    $('#viewDetail').html(renderPayload(item));

    // 歷程
    const hist = item.history||[];
    const $hist = $('#historyList').empty();
    if(hist.length===0) $hist.append('<li class="list-group-item">無歷程</li>');
    hist.forEach(h=>{
      $hist.append(`<li class="list-group-item d-flex justify-content-between">
        <div><span class="badge badge-soft me-2">${h.action}</span>${h.comment||''}</div>
        <div class="text-secondary small">${h.time}｜${h.user||''}</div>
      </li>`);
    });

    // 清空意見
    $('#reviewComment').val('');

    const modal = new bootstrap.Modal(document.getElementById('viewModal'));
    modal.show();

    // 帶入動作
    if(act==='approve' || act==='reject'){
      $('#reviewComment').attr('placeholder', act==='approve' ? '同意意見（可留空）' : '退回原因（可留空）');
      // 聚焦意見框
      setTimeout(()=> $('#reviewComment').focus(), 250);
    }

    // 綁定同意/退回
    $('#btnApprove').off().on('click', ()=> finalize('approved'));
    $('#btnReject').off().on('click', ()=> finalize('rejected'));

    function finalize(status){
      const comment = $('#reviewComment').val().trim();
      const ids = batchIds && batchIds.length? batchIds : [item.id];
      const now = new Date().toLocaleString();
      ids.forEach(xid=>{
        const it = d.inbox.find(z=>z.id===xid);
        if(!it) return;
        it.status = status;
        const actLabel = status==='approved' ? '同意' : '退回';
        (it.history||(it.history=[])).push({time:now, user:getUser().name, action: actLabel, comment});
      });
      setData(d);
      modal.hide();
      // 重新套用清單查詢/分頁與通知
      $(document).trigger('bpm:refreshInbox');
    }
  }

  function renderPayload(item){
    const p = item.payload||{};
    switch(item.form){
      case 'leave': return `
        <div class="row g-2">
          <div class="col-md-3"><div class="kv"><div class="k">假別</div><div class="v">${p.type||''}</div></div></div>
          <div class="col-md-5"><div class="kv"><div class="k">區間</div><div class="v">${formatRange(p.start||'', p.end||'')}</div></div></div>
          <div class="col-md-2"><div class="kv"><div class="k">整天</div><div class="v">${p.fullday||''}</div></div></div>
          <div class="col-md-2"><div class="kv"><div class="k">申請人</div><div class="v">${item.applicant}</div></div></div>
          <div class="col-12"><div class="kv"><div class="k">事由</div><div class="v">${p.reason||''}</div></div></div>
        </div>`;
      case 'trip': return `
        <div class="row g-2">
          <div class="col-md-3"><div class="kv"><div class="k">目的地</div><div class="v">${p.dest||''}</div></div></div>
          <div class="col-md-5"><div class="kv"><div class="k">期間</div><div class="v">${p.start||''} ~ ${p.end||''}</div></div></div>
          <div class="col-md-4"><div class="kv"><div class="k">目的</div><div class="v">${p.purpose||''}</div></div></div>
          <div class="col-12 mt-2">
            <div class="fw-bold mb-1">費用明細</div>
            ${(p.costs||[]).length? '<ul class="list-group list-group-flush">'+(p.costs||[]).map(c=>`<li class='list-group-item d-flex justify-content-between'><span>${c.item||'-'}</span><span>${(+c.amt||0).toLocaleString()}</span></li>`).join('')+'</ul>':'<div class="text-secondary small">無</div>'}
          </div>
        </div>`;
      case 'ot': return `
        <div class="row g-2">
          <div class="col-md-3"><div class="kv"><div class="k">日期</div><div class="v">${p.date||''}</div></div></div>
          <div class="col-md-3"><div class="kv"><div class="k">時數</div><div class="v">${p.hours||''}</div></div></div>
          <div class="col-md-3"><div class="kv"><div class="k">性質</div><div class="v">${p.kind||''}</div></div></div>
          <div class="col-md-3"><div class="kv"><div class="k">類型</div><div class="v">${p.type||''}</div></div></div>
          <div class="col-12"><div class="kv"><div class="k">說明</div><div class="v">${p.desc||''}</div></div></div>
        </div>`;
      case 'entry': return `
        <div class="row g-2">
          <div class="col-md-3"><div class="kv"><div class="k">訪客</div><div class="v">${p.visitor||''}</div></div></div>
          <div class="col-md-3"><div class="kv"><div class="k">公司</div><div class="v">${p.company||''}</div></div></div>
          <div class="col-md-3"><div class="kv"><div class="k">日期</div><div class="v">${p.date||''}</div></div></div>
          <div class="col-md-3"><div class="kv"><div class="k">時間</div><div class="v">${p.time||''}</div></div></div>
          <div class="col-md-4"><div class="kv"><div class="k">接待部門</div><div class="v">${p.dept||''}</div></div></div>
          <div class="col-md-8"><div class="kv"><div class="k">事由</div><div class="v">${p.reason||''}</div></div></div>
          <div class="col-md-4"><div class="kv"><div class="k">車號</div><div class="v">${p.carno||''}</div></div></div>
          <div class="col-md-4"><div class="kv"><div class="k">設備</div><div class="v">${p.devices||''}</div></div></div>
          <div class="col-md-4"><div class="kv"><div class="k">被訪者</div><div class="v">${p.host||''}</div></div></div>
          <div class="col-12"><div class="kv"><div class="k">安全教育</div><div class="v">${Array.isArray(p.safety)? p.safety.join('、') : ''}</div></div></div>
        </div>`;
    }
    return '<div class="text-secondary">無內容</div>';
  }

  function getUser(){ return JSON.parse(localStorage.getItem(KEY_USER)||'null'); }
  function pendingCount(){ const d=getData(); return (d.inbox||[]).filter(x=>x.status==='pending').length; }

  // 啟動點
  $(function(){
    const page = window.__BPM_PAGE__;
    if(page==='login') initLogin();
    if(page==='main') initMain();
  });
})();
