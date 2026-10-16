import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { MonopolyGame } from './game.js';
import { SQUARES, GROUPS, TOKENS, fmt } from './data.js';
import './style.css';

const $ = (selector) => document.querySelector(selector);
const gameRoot = $('#world');
let game = new MonopolyGame(2);
let scene, camera, renderer, controls, boardGroup, tokenMeshes = [], squareMeshes = [], houseMeshes = [];
let selectedCount = 2, gameStarted = false, isLite = false, soundOn = false, cameraMode = 0, animating = false;
let lastTime = 0, toastTimer, hoverIndex = null;
const raycaster = new THREE.Raycaster(), pointer = new THREE.Vector2();
const mat = (color, roughness = .68, metalness = .04) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const COLORS = { felt: '#1b3930', edge: '#142820', gold: '#d6b56e', cream: '#f3ecd9', ink: '#18251f' };

function initThree() {
  scene = new THREE.Scene(); scene.background = new THREE.Color('#101a17'); scene.fog = new THREE.Fog('#101a17', 20, 38);
  const initialAspect = gameRoot.clientWidth / Math.max(1, gameRoot.clientHeight);
  camera = new THREE.PerspectiveCamera(initialAspect < .82 ? 39 : 34, initialAspect, .1, 100);
  camera.position.set(initialAspect < .82 ? 10.5 : 10.5, initialAspect < .82 ? 20.5 : 15.5, initialAspect < .82 ? 15.8 : 13.2);
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8)); renderer.setSize(gameRoot.clientWidth, gameRoot.clientHeight);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap; renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.1; gameRoot.appendChild(renderer.domElement);
  controls = new OrbitControls(camera, renderer.domElement); controls.target.set(0, 0, 0); controls.enableDamping = true; controls.dampingFactor = .055; controls.minDistance = 12; controls.maxDistance = 26; controls.maxPolarAngle = Math.PI * .48; controls.minPolarAngle = .22;
  scene.add(new THREE.HemisphereLight('#e5f0d9', '#15271f', 2.0));
  const key = new THREE.DirectionalLight('#ffe6b1', 3.5); key.position.set(-7, 14, 9); key.castShadow = true; key.shadow.mapSize.set(2048, 2048); key.shadow.camera.left = -14; key.shadow.camera.right = 14; key.shadow.camera.top = 14; key.shadow.camera.bottom = -14; scene.add(key);
  const rim = new THREE.DirectionalLight('#6a9f9a', 1.3); rim.position.set(9, 7, -8); scene.add(rim);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), mat('#101a17', 1)); floor.rotation.x = -Math.PI / 2; floor.position.y = -0.75; floor.receiveShadow = true; scene.add(floor);
  boardGroup = new THREE.Group(); scene.add(boardGroup); buildBoard(); buildTokens();
  renderer.domElement.addEventListener('pointermove', onPointerMove); renderer.domElement.addEventListener('pointerdown', onPointerDown);
  window.addEventListener('resize', onResize); animate();
}

function roundedRectShape(w, h, r) {
  const s = new THREE.Shape(); s.moveTo(-w/2+r, -h/2); s.lineTo(w/2-r, -h/2); s.quadraticCurveTo(w/2, -h/2, w/2, -h/2+r); s.lineTo(w/2, h/2-r); s.quadraticCurveTo(w/2, h/2, w/2-r, h/2); s.lineTo(-w/2+r, h/2); s.quadraticCurveTo(-w/2, h/2, -w/2, h/2-r); s.lineTo(-w/2, -h/2+r); s.quadraticCurveTo(-w/2, -h/2, -w/2+r, -h/2); return s;
}
function canvasTexture(draw, width = 512, height = 256) {
  const c = document.createElement('canvas'); c.width = width; c.height = height; const ctx = c.getContext('2d'); draw(ctx, width, height);
  const texture = new THREE.CanvasTexture(c); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}
function textTexture(square, index) {
  return canvasTexture((ctx, w, h) => {
    ctx.clearRect(0, 0, w, h); ctx.fillStyle = '#f4edda'; ctx.fillRect(0, 0, w, h);
    if (square.group) { ctx.fillStyle = GROUPS[square.group].color; ctx.fillRect(0, 0, w, 36); }
    ctx.fillStyle = '#202a23'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const name = square.name.toUpperCase(); const words = name.split(' '); let lines = [];
    let line = ''; for (const word of words) { const test = line ? `${line} ${word}` : word; if (test.length > 14 && line) { lines.push(line); line = word; } else line = test; } if (line) lines.push(line);
    const fontSize = square.name.length > 16 ? 20 : square.name.length > 11 ? 23 : 28;
    ctx.font = `700 ${fontSize}px Arial, sans-serif`; lines.slice(0, 3).forEach((part, i) => ctx.fillText(part, w/2, h/2 - (lines.length-1)*14 + i*28));
    if (square.price) { ctx.font = '600 22px Arial, sans-serif'; ctx.fillStyle = '#6b746b'; ctx.fillText('$' + square.price, w/2, h - 28); }
    if (square.type === 'chance') { ctx.fillStyle = '#d6b56e'; ctx.font = '700 46px Arial'; ctx.fillText('✳', w/2, h/2 - 4); }
    if (square.type === 'chest') { ctx.fillStyle = '#8baf9a'; ctx.font = '700 42px Arial'; ctx.fillText('▣', w/2, h/2 - 3); }
  }, 512, 220);
}
function squarePosition(index) {
  // Standard Monopoly numbering: GO is bottom-right, then counter-clockwise.
  const edge = 10, corner = 2.45, step = 1.55;
  if (index >= 0 && index <= 10) return { x: edge - corner - (index === 0 ? 0 : (index === 10 ? 0 : (index-1)*step)), z: edge, rot: Math.PI };
  if (index >= 11 && index <= 20) return { x: -edge, z: edge - corner - (index-11)*step, rot: -Math.PI/2 };
  if (index >= 21 && index <= 30) return { x: -edge + corner + (index === 30 ? 0 : (index-21)*step), z: -edge, rot: 0 };
  return { x: edge, z: -edge + corner + (index-31)*step, rot: Math.PI/2 };
}
function boardIndexPosition(index) {
  const edge = 9.15, inset = 7.2, step = 1.8;
  if (index === 0) return { x: edge, z: edge };
  if (index >= 1 && index <= 9) return { x: inset - (index-1)*step, z: edge };
  if (index === 10) return { x: -edge, z: edge };
  if (index >= 11 && index <= 19) return { x: -edge, z: inset - (index-11)*step };
  if (index === 20) return { x: -edge, z: -edge };
  if (index >= 21 && index <= 29) return { x: -inset + (index-21)*step, z: -edge };
  if (index === 30) return { x: edge, z: -edge };
  return { x: edge, z: -inset + (index-31)*step };
}
function buildBoard() {
  const base = new THREE.Mesh(new THREE.BoxGeometry(20.8, .55, 20.8), [mat('#142820'), mat('#142820'), mat('#142820'), mat('#244a3c'), mat('#142820'), mat('#142820')]); base.position.y = -.08; base.castShadow = true; base.receiveShadow = true; boardGroup.add(base);
  const felt = new THREE.Mesh(new THREE.BoxGeometry(16.1, .08, 16.1), mat('#1c4537', .9)); felt.position.y = .25; felt.receiveShadow = true; boardGroup.add(felt);
  const centerPlate = new THREE.Mesh(new THREE.BoxGeometry(10.6, .08, 6.2), mat('#e9e0c8', .95)); centerPlate.position.set(0, .32, 0); centerPlate.rotation.y = -.15; boardGroup.add(centerPlate);
  const centerTexture = canvasTexture((ctx, w, h) => {
    ctx.fillStyle = '#e9e0c8'; ctx.fillRect(0,0,w,h); ctx.strokeStyle = '#d6b56e'; ctx.lineWidth = 7; ctx.strokeRect(18,18,w-36,h-36);
    ctx.textAlign = 'center'; ctx.fillStyle = '#1b3930'; ctx.font = '800 54px Georgia'; ctx.fillText('MONOPOLY', w/2, h/2 - 12);
    ctx.font = '600 18px Arial'; ctx.fillStyle = '#6d7b6d'; ctx.fillText('THE CITY IS YOURS', w/2, h/2 + 30);
    ctx.font = '700 23px Arial'; ctx.fillStyle = '#bd9a51'; ctx.fillText('✦  EST. 1935  ✦', w/2, h/2 + 72);
  }, 1024, 512);
  const center = new THREE.Mesh(new THREE.PlaneGeometry(10.6, 5.2), new THREE.MeshBasicMaterial({ map: centerTexture })); center.rotation.x = -Math.PI/2; center.position.set(0, .39, 0); boardGroup.add(center);
  // Corner and edge tiles are modeled as beveled-looking layered blocks.
  SQUARES.forEach((square, index) => {
    const pos = boardIndexPosition(index); const corner = [0,10,20,30].includes(index); const w = corner ? 2.45 : 1.57; const d = corner ? 2.45 : 1.57;
    const geometry = new THREE.BoxGeometry(w, .28, d); const tile = new THREE.Mesh(geometry, mat('#d8cfb5', .84)); tile.position.set(pos.x, .34, pos.z); tile.castShadow = true; tile.receiveShadow = true; tile.userData.index = index; boardGroup.add(tile);
    const stripeColor = square.group ? GROUPS[square.group].color : square.type === 'tax' ? '#b95e50' : square.type === 'chance' ? '#d6b56e' : square.type === 'chest' ? '#7eaa8e' : '#b7b49c';
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(corner ? .2 : .18, .08, d-.12), mat(stripeColor)); stripe.position.set(pos.x, .52, pos.z); stripe.rotation.y = index >= 11 && index <= 20 ? Math.PI/2 : index >= 31 ? Math.PI/2 : 0; boardGroup.add(stripe);
    const texture = textTexture(square, index); const label = new THREE.Mesh(new THREE.PlaneGeometry(corner ? 1.92 : 1.22, corner ? 1.3 : .9), new THREE.MeshBasicMaterial({ map: texture, transparent: false, side: THREE.DoubleSide }));
    label.rotation.x = -Math.PI/2; label.rotation.z = index >= 11 && index <= 20 ? Math.PI/2 : index >= 21 && index <= 30 ? Math.PI : index >= 31 ? -Math.PI/2 : 0;
    label.position.set(pos.x, .515, pos.z); boardGroup.add(label);
    const outline = new THREE.Mesh(new THREE.BoxGeometry(w+.08, .035, d+.08), new THREE.MeshBasicMaterial({ color: '#d6b56e', transparent: true, opacity: 0 })); outline.position.set(pos.x, .53, pos.z); outline.userData.index = index; boardGroup.add(outline); squareMeshes[index] = { tile, stripe, label, outline, pos };
  });
  // Subtle city-grid marks make the center feel like a tabletop world, not a flat board.
  for (let i = -4; i <= 4; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(15.7, .008, .012), new THREE.MeshBasicMaterial({ color: '#9fc1a7', transparent: true, opacity: .1 })); line.position.set(0, .31, i*1.7); boardGroup.add(line);
  }
  const ring = new THREE.Mesh(new THREE.BoxGeometry(21.1, .06, 21.1), new THREE.MeshBasicMaterial({ color: '#d6b56e', wireframe: true, transparent: true, opacity: .38 })); ring.position.y = -.28; boardGroup.add(ring);
}
function emojiTexture(emoji, color) {
  return canvasTexture((ctx, w, h) => { ctx.clearRect(0,0,w,h); ctx.fillStyle = color; ctx.beginPath(); ctx.arc(w/2,h/2,Math.min(w,h)*.43,0,Math.PI*2); ctx.fill(); ctx.strokeStyle = '#f4edda'; ctx.lineWidth = 7; ctx.stroke(); ctx.font = '100px "Apple Color Emoji", "Segoe UI Emoji", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(emoji,w/2,h/2+3); }, 256, 256);
}
function buildTokens() {
  tokenMeshes = game.players.map((player) => {
    const group = new THREE.Group(); const base = new THREE.Mesh(new THREE.CylinderGeometry(.26,.31,.12,28), mat(player.color, .38, .2)); base.position.y = .7; base.castShadow = true; group.add(base);
    const marker = new THREE.Mesh(new THREE.CylinderGeometry(.08,.17,.45,16), mat(player.color, .3, .25)); marker.position.y = .96; marker.castShadow = true; group.add(marker);
    const sprite = new THREE.Mesh(new THREE.PlaneGeometry(.68,.68), new THREE.MeshBasicMaterial({ map: emojiTexture(player.token.icon, player.color), transparent: true, side: THREE.DoubleSide, depthWrite: false })); sprite.position.y = 1.3; sprite.rotation.x = -.1; group.add(sprite);
    scene.add(group); return { group, sprite, playerId: player.id, phase: Math.random()*Math.PI*2 };
  });
  positionTokens();
}
function positionTokens() {
  tokenMeshes.forEach((token, i) => {
    const player = game.players[token.playerId], pos = boardIndexPosition(player.position); const offset = (i - (game.players.length-1)/2) * .31;
    token.group.position.set(pos.x + offset, .1, pos.z + (i%2 ? .17 : -.17));
    token.group.visible = !player.bankrupt;
  });
}
function animate(time = 0) {
  requestAnimationFrame(animate); const dt = Math.min((time-lastTime)/1000 || 0, .05); lastTime = time;
  if (controls) controls.update();
  tokenMeshes.forEach((t) => { t.phase += dt*2.1; t.group.position.y = .1 + Math.sin(t.phase)*.035; t.sprite.lookAt(camera.position); });
  renderer.render(scene, camera);
}
function onResize() {
  if (!renderer || !camera) return; const w = gameRoot.clientWidth || window.innerWidth, h = gameRoot.clientHeight || window.innerHeight;
  const aspect = w / h;
  camera.aspect = aspect; camera.fov = aspect < .82 ? 39 : 34; camera.updateProjectionMatrix();
  renderer.setSize(w,h); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.8));
}
function onPointerMove(event) {
  const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX-rect.left)/rect.width)*2-1; pointer.y = -((event.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera); const hits = raycaster.intersectObjects(boardGroup.children.filter(o => o.userData.index !== undefined), false);
  const idx = hits.length ? hits[0].object.userData.index : null;
  if (idx !== hoverIndex) { hoverIndex = idx; squareMeshes.forEach((m,i) => { m.outline.material.opacity = i === idx ? .95 : 0; }); if (idx != null) showHover(idx,event.clientX,event.clientY); else $('#hover-card').classList.add('hidden'); }
}
function onPointerDown(event) {
  if (!gameStarted || animating) return; const rect = renderer.domElement.getBoundingClientRect(); pointer.x = ((event.clientX-rect.left)/rect.width)*2-1; pointer.y = -((event.clientY-rect.top)/rect.height)*2+1;
  raycaster.setFromCamera(pointer,camera); const hits = raycaster.intersectObjects(boardGroup.children.filter(o => o.userData.index !== undefined), false);
  if (hits.length) { const idx = hits[0].object.userData.index; updatePropertyPanel(idx); }
}
function showHover(index,x,y) {
  const s = SQUARES[index], st = game.houses[index], card = $('#hover-card'); card.innerHTML = `<span class="hover-color" style="background:${s.group ? GROUPS[s.group].color : '#d6b56e'}"></span><div><b>${s.name}</b><small>${st.owner == null ? (s.price ? fmt(s.price)+' · available' : s.type.toUpperCase()) : 'Owned by '+game.players[st.owner].name}</small></div>`;
  card.style.left = `${Math.min(Math.max(18,x-gameRoot.getBoundingClientRect().left+14),gameRoot.clientWidth-225)}px`; card.style.top = `${Math.max(80,y-gameRoot.getBoundingClientRect().top-45)}px`; card.classList.remove('hidden');
}
function animateMove(steps, done) {
  const player = game.player, start = player.position, destination = game.pending?.destination ?? (start+steps)%40; animating = true; $('#roll-button').disabled = true;
  let n = 0; const walk = () => { n++; player.position = (start+n)%40; if (n === 1 && player.position < start) { player.cash += 200; game.say(`${player.name} passed GO and collected $200.`, 'good'); }
    positionTokens(); tokenMeshes[game.current]?.group.scale.setScalar(1.12); setTimeout(() => tokenMeshes.forEach(t=>t.group.scale.setScalar(1)), 140);
    if (n < steps) setTimeout(walk, 135); else { player.position = destination; positionTokens(); game.pending = null; animating = false; $('#roll-button').disabled = false; game.resolveSquare(); if (done) done(); renderUI(); }
  }; setTimeout(walk, 100);
}
function setText(id, value) { const el = document.getElementById(id); if (el) el.textContent = value; }
function renderPlayers() {
  $('#player-list').innerHTML = game.players.map((p,i) => { const stats = game.stats(p); return `<button class="player-row ${i===game.current?'active':''} ${p.bankrupt?'bankrupt':''}" data-player="${i}"><span class="player-avatar" style="--player-color:${p.color}">${p.token.icon}</span><span class="player-info"><b>${p.name}</b><small>${p.bankrupt?'BANKRUPT':p.jailed?'IN JAIL':i===game.current?'YOUR TURN':`${stats.properties} properties`}</small></span><span class="player-cash">${fmt(p.cash)}</span><span class="player-row-dot"></span></button>`; }).join('');
  $('#player-list').querySelectorAll('[data-player]').forEach(el=>el.addEventListener('click',()=>{ const p=game.players[Number(el.dataset.player)]; if (p) showToast(`${p.name}: ${fmt(p.cash)} cash · ${p.properties.length} properties`); }));
}
function renderFeed() {
  $('#activity-feed').innerHTML = game.log.slice(0,7).map((item,i)=>`<div class="feed-item ${item.kind}"><span class="feed-mark">${item.kind==='good'?'↗':item.kind==='bad'?'↘':'·'}</span><div><p>${item.message}</p><small>${item.time}</small></div></div>`).join(''); setText('feed-count',String(game.log.length).padStart(2,'0'));
}
function updatePropertyPanel(index = game.player.position) {
  const s = SQUARES[index], st = game.houses[index]; setText('property-name',s.name); setText('property-subtitle',s.subtitle || (s.group ? `${GROUPS[s.group].label} set` : s.type === 'tax' ? 'City dues' : s.type.replace('gojail','jail').toUpperCase()));
  setText('property-kind',s.type === 'property' ? 'PROPERTY' : s.type.toUpperCase().replace('GOJAIL','GO TO JAIL')); setText('property-price',s.price ? fmt(s.price) : s.amount ? fmt(s.amount) : '—'); setText('property-rent',s.rent != null ? (st.owner == null ? fmt(s.rent) : fmt(game.calculateRent(index))) : '—'); setText('property-owner',st.owner == null ? 'BANK' : game.players[st.owner].name);
  $('#property-color').style.background = s.group ? GROUPS[s.group].color : s.type==='chance' ? '#d6b56e' : s.type==='chest' ? '#7eaa8e' : '#9da895';
  const extra = st.owner == null ? (s.price ? 'Available to acquire. A strong portfolio starts one block at a time.' : s.type==='tax' ? 'Pay the city and keep moving.' : 'A classic square on your route through the city.') : `${st.houses} houses${st.hotel?' · 1 hotel':''}${st.mortgaged?' · mortgaged':''} · ${st.owner===game.current?'You own this block':'Property held by '+game.players[st.owner].name}`;
  setText('property-extra',extra);
}
function renderContextActions() {
  const el = $('#context-actions'); el.innerHTML = ''; const p = game.player;
  if (game.phase === 'buy') { el.append(actionButton(`BUY FOR ${fmt(game.square.price)}`,()=>{ game.buy(); renderUI(); },'secondary')); el.append(actionButton('LEAVE IT',()=>{game.auctionPass();renderUI();},'quiet')); }
  else if (game.phase === 'endturn' || game.phase === 'action') { el.append(actionButton(game.lastRoll[0]===game.lastRoll[1] && !p.jailed && game.doubles<3 ? 'ROLL AGAIN ↗' : 'END TURN ↗',()=>{game.endTurn();renderUI();},'secondary')); }
  if (p.jailed) el.append(actionButton('PAY $50 BAIL',()=>{if(game.payBail())renderUI();else showToast('You need $50 to pay bail.');},'quiet'));
  if (game.phase === 'won') el.append(actionButton('PLAY AGAIN',()=>resetGame(), 'secondary'));
}
function actionButton(label,fn,style='secondary') { const b=document.createElement('button'); b.className=`context-button ${style}`; b.textContent=label; b.addEventListener('click',fn); return b; }
function renderUI() {
  const p=game.player, s=game.square, stats=game.stats(p); setText('phase-label',game.phase==='ready'?'READY':game.phase.toUpperCase()); setText('turn-number',`${String(game.turn).padStart(2,'0')} / ∞`); setText('turn-token',p.token.icon); $('#turn-token').style.background=p.color; setText('turn-name',p.name); setText('turn-status',p.bankrupt?'Bankrupt':p.jailed?`In Jail · ${p.jailTurns}/3 turns`:game.phase==='ready'?'Ready to roll':game.phase==='buy'?'Purchase decision':s.name);
  setText('wallet-value',fmt(p.cash)); setText('property-count',String(p.properties.length).padStart(2,'0')); setText('net-worth',fmt(stats.netWorth)); setText('doubles-count',`DOUBLES ${game.doubles}/3`); setText('dice-total',game.lastRoll.join(' + ')); $('#die-one').innerHTML=`<span>${['⚀','⚁','⚂','⚃','⚄','⚅'][game.lastRoll[0]-1]}</span>`; $('#die-two').innerHTML=`<span>${['⚀','⚁','⚂','⚃','⚄','⚅'][game.lastRoll[1]-1]}</span>`;
  const ready=game.phase==='ready'||game.phase==='jailed'; $('#roll-button').disabled=!ready||animating; $('#roll-button').classList.toggle('disabled',!ready||animating); setText('roll-button', ready ? (p.jailed?'TRY YOUR LUCK':'ROLL DICE') : game.phase==='buy'?'CHOOSE YOUR MOVE':game.phase==='won'?'CITY CONQUERED':'MOVE IN PROGRESS');
  setText('action-title',game.phase==='buy'?'A new asset.':game.phase==='won'?'You own the city.':p.jailed?'Three turns to freedom.':game.phase==='endturn'?'Move complete.':'Roll the dice.'); setText('action-copy',game.phase==='buy'?`${s.name} is on the market for ${fmt(s.price)}. Make it yours?`:game.phase==='won'?`${game.winner?.name||p.name} is the last player standing.`:p.jailed?`Pay $50 bail or try for doubles. You have ${3-p.jailTurns} turn(s) before bail is due.`:game.phase==='endturn'?'Your move is on the board. Keep the momentum going.':'The city is open. Let the dice choose your next move.');
  renderPlayers(); renderFeed(); renderContextActions(); updatePropertyPanel(); positionTokens();
  setText('bottom-message',game.log[0]?.message||'The city is yours to explore.');
  if (game.phase==='won') showDialog(`<div class="modal-eyebrow">✦ GAME OVER</div><h2>${game.winner.name} owns the city.</h2><p>Every block, every deal, every roll led here.</p><button class="primary-action" id="win-restart"><span>PLAY ANOTHER ROUND</span><span>↗</span></button>`,'win');
}
function showToast(message) { const toast=$('#toast'); toast.textContent=message; toast.classList.add('visible'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>toast.classList.remove('visible'),2600); }
function showDialog(html, type='info') { $('#dialog-content').innerHTML=html; $('#dialog-backdrop').classList.remove('hidden'); if(type==='win') $('#win-restart')?.addEventListener('click',resetGame); }
function closeDialog() { $('#dialog-backdrop').classList.add('hidden'); }
function resetGame() { game=new MonopolyGame(selectedCount); tokenMeshes.forEach(t=>scene.remove(t.group)); buildTokens(); gameStarted=true; $('#modal-backdrop').classList.add('hidden'); closeDialog(); renderUI(); controls.target.set(0,0,0); }
function startGame() { game=new MonopolyGame(selectedCount); tokenMeshes.forEach(t=>scene.remove(t.group)); buildTokens(); gameStarted=true; $('#modal-backdrop').classList.add('hidden'); setText('phase-label','READY'); renderUI(); showToast('The table is ready. Roll when you are.'); }
function setupPreview() { $('#setup-preview').innerHTML=Array.from({length:selectedCount},(_,i)=>`<div class="setup-person"><span style="--player-color:${TOKENS[i].color}">${TOKENS[i].icon}</span><div><b>${['You','Maya','Tobi','Zara'][i]}</b><small>${i===0?'PLAYER 01':'LOCAL PLAYER '+String(i+1).padStart(2,'0')}</small></div><i></i></div>`).join(''); }

$('#setup-player-count').addEventListener('click',e=>{const b=e.target.closest('[data-count]');if(!b)return;selectedCount=Number(b.dataset.count);$('#setup-player-count').querySelectorAll('button').forEach(x=>x.classList.toggle('selected',x===b));setupPreview();});
$('#start-game').addEventListener('click',startGame);
$('#roll-button').addEventListener('click',()=>{
  if(animating)return; const result=game.roll(); if(!result){showToast('Finish your current move first.');return;}
  $('#die-one').classList.add('rolling');$('#die-two').classList.add('rolling');$('#dice-burst').classList.toggle('hidden',!result.doubles); setTimeout(()=>{$('#die-one').classList.remove('rolling');$('#die-two').classList.remove('rolling');$('#dice-burst').classList.add('hidden');},720);
  setText('dice-total',`${result.a} + ${result.b}`); $('#die-one').innerHTML=`<span>${['⚀','⚁','⚂','⚃','⚄','⚅'][result.a-1]}</span>`;$('#die-two').innerHTML=`<span>${['⚀','⚁','⚂','⚃','⚄','⚅'][result.b-1]}</span>`;
  if(result.jailed){renderUI();return;} if(result.steps){animateMove(result.steps);}
  else renderUI();
});
$('#camera-toggle').addEventListener('click',()=>{cameraMode=(cameraMode+1)%3; const views=[[10.5,15.5,13.2],[0,21,.1],[-14,13,5]]; camera.position.set(...views[cameraMode]); controls.target.set(0,0,0); showToast(['Orbit view','Top-down view','Street-side view'][cameraMode]);});
$('#zoom-in').addEventListener('click',()=>{camera.position.multiplyScalar(.9);controls.update();}); $('#zoom-out').addEventListener('click',()=>{camera.position.multiplyScalar(1.1);controls.update();}); $('#reset-camera').addEventListener('click',()=>{camera.position.set(10.5,15.5,13.2);controls.target.set(0,0,0);controls.update();});
$('#sound-toggle').addEventListener('click',()=>{soundOn=!soundOn;$('#sound-toggle').classList.toggle('active',soundOn);showToast(soundOn?'Sound effects enabled':'Sound effects muted');});
$('#help-toggle').addEventListener('click',()=>showDialog(`<div class="modal-eyebrow">THE QUICK GUIDE</div><h2>Buy smart. Build evenly.</h2><div class="guide-list"><p><b>01 / Roll</b><span>Roll two dice and move around the 40-square board. Passing GO earns $200.</span></p><p><b>02 / Buy</b><span>Buy unowned streets, railroads, and utilities when you land on them.</span></p><p><b>03 / Collect</b><span>Charge rent when opponents land on your property. Complete a color set to build houses.</span></p><p><b>04 / Survive</b><span>Chance, Community Chest, taxes, jail, and deals can change the whole game.</span></p></div><button class="primary-action" id="guide-close"><span>GOT IT</span><span>↗</span></button>`));
$('#trade-button').addEventListener('click',()=>openTrade());
$('#manage-button').addEventListener('click',()=>openPortfolio());
$('#rules-button').addEventListener('click',()=>$('#help-toggle').click());
$('#dialog-close').addEventListener('click',closeDialog);$('#dialog-backdrop').addEventListener('click',e=>{if(e.target===$('#dialog-backdrop'))closeDialog();});
document.addEventListener('click',e=>{if(e.target.id==='guide-close')closeDialog();});
function openPortfolio() {
  const p=game.player; const owned=p.properties;
  const list=owned.length?owned.map(i=>{const s=SQUARES[i],st=game.houses[i];return `<div class="portfolio-item"><span class="portfolio-swatch" style="background:${s.group?GROUPS[s.group].color:'#d6b56e'}"></span><div><b>${s.name}</b><small>${st.houses} houses${st.hotel?' · hotel':''}${st.mortgaged?' · mortgaged':''}</small></div><div class="portfolio-actions">${s.type==='property'&&!st.hotel?`<button data-build="${i}">+ HOUSE</button>`:''}<button data-mortgage="${i}">${st.mortgaged?'REDEEM':'MORTGAGE'}</button></div></div>`;}).join(''):'<p class="empty-state">No properties yet. Roll, explore, and claim your first block.</p>';
  showDialog(`<div class="modal-eyebrow">YOUR PORTFOLIO</div><h2>Assets & development.</h2><p class="dialog-lede">Available cash: <b>${fmt(p.cash)}</b></p><div class="portfolio-list">${list}</div><button class="primary-action" id="portfolio-close"><span>BACK TO TABLE</span><span>↗</span></button>`);
  $('#dialog-content').querySelectorAll('[data-build]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.build);if(game.build(i)){showToast('House built. Rent potential increased.');openPortfolio();renderUI();}else showToast('You need the full color set and enough cash to build.');}));
  $('#dialog-content').querySelectorAll('[data-mortgage]').forEach(b=>b.addEventListener('click',()=>{const i=Number(b.dataset.mortgage),ok=game.houses[i].mortgaged?game.unmortgage(i):game.mortgage(i);if(ok){openPortfolio();renderUI();}else showToast('This asset cannot be mortgaged right now.');})); $('#portfolio-close').addEventListener('click',closeDialog);
}
function openTrade() {
  const p=game.player, others=game.players.filter(x=>x.id!==p.id&&!x.bankrupt); if(!others.length){showToast('No trading partners available.');return;}
  const other=others[0]; const yours=p.properties.map(i=>`<option value="${i}">${SQUARES[i].name}</option>`).join(''); const theirs=other.properties.map(i=>`<option value="${i}">${SQUARES[i].name}</option>`).join('');
  showDialog(`<div class="modal-eyebrow">MAKE A DEAL</div><h2>Trade the city.</h2><p class="dialog-lede">Propose a property swap with ${other.name}. Positive cash means they pay you.</p><div class="trade-form"><label>TRADE PARTNER<select id="trade-partner">${others.map(o=>`<option value="${o.id}">${o.name} · ${fmt(o.cash)}</option>`).join('')}</select></label><label>YOU GIVE<select id="trade-give"><option value="">No property</option>${yours}</select></label><label>YOU RECEIVE<select id="trade-receive"><option value="">No property</option>${theirs}</select></label><label>CASH TO YOU<input id="trade-cash" type="number" value="0" step="25" /></label></div><button class="primary-action" id="trade-submit"><span>COMPLETE TRADE</span><span>↗</span></button>`);
  $('#trade-submit').addEventListener('click',()=>{const partner=Number($('#trade-partner').value),give=$('#trade-give').value===''?null:Number($('#trade-give').value),receive=$('#trade-receive').value===''?null:Number($('#trade-receive').value),cash=Number($('#trade-cash').value||0);if(game.trade(partner,give,receive,cash)){closeDialog();renderUI();showToast('Trade completed. The board has shifted.');}else showToast('Trade rejected: check ownership and cash balances.');});
}

setupPreview(); initThree(); renderUI();
