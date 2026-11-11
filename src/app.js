const grid = document.querySelector('#bin-grid');
const countText = document.querySelector('#visible-count');
const picker = document.querySelector('#count-picker');
const disabledInput = document.querySelector('#show-disabled');
const failureInput = document.querySelector('#show-failure');
const dataModeInput = document.querySelector('#data-mode');
const toggle = document.querySelector('#demo-toggle');
const controls = document.querySelector('#demo-controls');
const params = new URLSearchParams(location.search);
const requestedCount = Number(params.get('count'));
// Existing demo controls share this state. Screen cards are a pure view of it.
const state = {
  occupiedCount: Number.isFinite(requestedCount) && requestedCount >= 1 ? Math.min(8, Math.floor(requestedCount)) : 8,
  showDisabled: params.get('disabled') === '1',
  showFailure: params.get('failure') !== '0',
  dataMode: params.get('data') === 'historical' ? 'historical' : 'design',
};
let fixture;
let loading = false;
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
}
function viewOrders() {
  return fixture.orders.map((order, index) => {
    const design = state.dataMode === 'design';
    const items = design && index < 2 ? [{...fixture.orders[0].items[0]}] : order.items;
    return {
      ...order, items,
      platform: design && index === 1 ? '淘宝' : order.platform,
      seq: design && index === 0 ? 74 : design && index === 1 ? 28 : order.seq,
      number: design && state.occupiedCount === 2 && index === 1 ? 3 : index + 1,
      state: index === 1 ? 'sorting' : index === 5 && state.showFailure ? 'failed' : 'ready',
      medicineAsset: !design && index === 1 ? 3 : index + 1,
    };
  });
}
function receipt() {
  return '<div class="receipt"><img class="receipt-paper" src="./assets/ui/receipt.svg" alt="" /><span class="receipt-text">请取小票</span></div>';
}
function binCard(order) {
  const paused = order.state === 'paused';
  const failed = order.state === 'failed';
  const sorting = order.state === 'sorting';
  const count = order.items.reduce((sum, item) => sum + item.qty, 0);
  const status = paused ? '暂停使用' : failed ? '请勿取走，异常订单！' : sorting ? '分拣中' : '可取货';
  const items = order.items.map(item => `${item.name} ${item.qty}件`).join('，');
  const identity = paused ? '' : `${order.platform}#${order.seq}`;
  const accessibleLabel = `${order.number}号框${identity ? '，'+identity : ''}，${status}${paused ? '' : '，共'+count+'件，'+items}`;
  return `<article class="bin-card" data-bin-id="${order.number}" data-state="${order.state}" aria-label="${escapeHtml(accessibleLabel)}">
    <img class="tray-body" src="./assets/ui/${failed || paused ? 'tray-gray.png' : 'tray.png'}" alt="" />
    ${paused ? '' : receipt()}
    ${paused ? '' : `<div class="medicine-visual" title="${escapeHtml(items)}"><img src="./assets/medicines/order-${order.medicineAsset}.png" alt="${escapeHtml(items)}" /></div>`}
    ${failed ? '<img class="chains" src="./assets/ui/chains.png" alt="交叉锁链和挂锁" />' : ''}
    <div class="identity-rail">
      ${paused ? '' : `<span class="platform-tag ${order.platform === '淘宝' ? 'taobao' : 'meituan'}">${escapeHtml(identity)}</span>`}
      <span class="bin-number" aria-label="${order.number}号框">${order.number}</span>
    </div>
    <div class="front-label">
      ${failed ? '<p class="exception-copy">请勿取走，<br />异常订单！</p>' : paused ? '<p class="paused-label">暂停使用</p>' : `<p class="status-label"><img class="status-icon" src="./assets/ui/${sorting ? 'sorting' : 'check'}.svg" alt="" />${sorting ? '分拣中...' : '可取货'}</p><p class="piece-count">共${count}件</p>`}
    </div>
  </article>`;
}
function render() {
  if (!fixture) return;
  const count = state.showDisabled ? Math.min(state.occupiedCount, 7) : state.occupiedCount;
  const cards = viewOrders().slice(0, count);
  if (state.showDisabled) cards.push({number:8,state:'paused',items:[]});
  grid.dataset.count = cards.length;
  grid.innerHTML = cards.map(binCard).join('');
  grid.setAttribute('aria-busy','false');
  countText.textContent = `展示${cards.length}个框，其中${count}个有订单${state.showDisabled ? '，8号框暂停使用' : ''}`;
  picker.querySelectorAll('button').forEach(button => {
    const active = Number(button.dataset.count) === state.occupiedCount;
    button.classList.toggle('selected', active);
    button.setAttribute('aria-pressed', String(active));
  });
  disabledInput.checked = state.showDisabled;
  failureInput.checked = state.showFailure;
  dataModeInput.value = state.dataMode;
  document.querySelector('#fixture-note').textContent = state.dataMode === 'design'
    ? '当前为 Figma 稿示例。框位、状态与待分拣列表用于演示。'
    : '叁悦广场店 2026-11-09 历史订单；平台、流水号、药品及数量为历史数据，框位和状态为演示。';
  const url = new URL(location.href);
  url.searchParams.set('count', state.occupiedCount);
  state.showDisabled ? url.searchParams.set('disabled','1') : url.searchParams.delete('disabled');
  state.showFailure ? url.searchParams.delete('failure') : url.searchParams.set('failure','0');
  state.dataMode === 'historical' ? url.searchParams.set('data','historical') : url.searchParams.delete('data');
  history.replaceState(null,'',url);
}
function setCount(count) {
  state.occupiedCount = count;
  if (count === 8) state.showDisabled = false;
  render();
}
function closeControls() {
  controls.hidden = true;
  toggle.setAttribute('aria-expanded','false');
}
for (let count=1;count<=8;count++) {
  const button=document.createElement('button');
  button.type='button';button.textContent=count;button.dataset.count=count;
  button.setAttribute('aria-label',`${count}个有订单的框`);
  button.addEventListener('click',()=>setCount(count));picker.append(button);
}
disabledInput.addEventListener('change',()=>{
  state.showDisabled=disabledInput.checked;
  if(state.showDisabled&&state.occupiedCount===8)state.occupiedCount=7;
  render();
});
failureInput.addEventListener('change',()=>{state.showFailure=failureInput.checked;render();});
dataModeInput.addEventListener('change',()=>{state.dataMode=dataModeInput.value;render();});
toggle.addEventListener('click',()=>{controls.hidden=!controls.hidden;toggle.setAttribute('aria-expanded',String(!controls.hidden));});
document.querySelector('#demo-close').addEventListener('click',()=>{closeControls();toggle.focus();});
document.addEventListener('keydown',event=>{
  if(event.key==='Escape'){closeControls();return;}
  if(/^[1-8]$/.test(event.key)&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&!['INPUT','SELECT','TEXTAREA'].includes(event.target.tagName)&&!document.querySelector('#help-dialog').open)setCount(Number(event.key));
});
document.querySelector('#fullscreen').addEventListener('click',async()=>{
  const button=document.querySelector('#fullscreen');
  try {
    if(document.fullscreenElement)await document.exitFullscreen();
    else {closeControls();await document.querySelector('.guide-screen').requestFullscreen();}
  } catch {button.textContent='当前浏览器不支持全屏';}
});
document.addEventListener('fullscreenchange',()=>{document.querySelector('#fullscreen').textContent=document.fullscreenElement?'退出全屏':'全屏预览';});
const help=document.querySelector('#help-dialog');
document.querySelector('#help-open').addEventListener('click',()=>{closeControls();if(!help.open)help.showModal();});
for(const id of ['help-close','help-done'])document.getElementById(id).addEventListener('click',()=>help.close());
help.addEventListener('close',()=>document.querySelector('#help-open').focus());
help.addEventListener('click',event=>{if(event.target===help){const r=help.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)help.close();}});
document.querySelector('#waiting-list').innerHTML=Array.from({length:6},()=>'<li>美团#09</li>').join('');
async function loadFixture() {
  if(loading)return;
  loading=true;grid.setAttribute('aria-busy','true');
  try {
    const response=await fetch('./data/orders.json');
    if(!response.ok)throw new Error('订单数据未加载');
    const data=await response.json();
    if(!Array.isArray(data.orders)||data.orders.length<8)throw new Error('订单示例不完整');
    fixture=data;render();
  } catch {
    grid.setAttribute('aria-busy','false');
    grid.innerHTML='<div class="load-error" role="alert"><p>订单示例加载失败，请重试</p><button type="button" id="retry-load">重新加载</button></div>';
    document.querySelector('#retry-load').addEventListener('click',loadFixture);
  } finally {loading=false;}
}
loadFixture();
